import { afterEach, describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { defaultModel } from "../ai/models";
import { emptyUsage } from "../ai/pricing";
import { setup, type TestConvex } from "../test.helper";
import { offerContext } from "./prompt";
import { QUESTIONS_PER_FIRM, QUESTIONS_PER_LINK } from "./questions";
import { devizFor, fakeResend, restoreEmail } from "./test.helper";

// The tests never reach the Claude API: without a key, the assistant fails
// before its first request, and the question goes to the firm. Answers are
// played through the assistant's internal steps, with made-up text.
delete process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  restoreEmail();
});

type Firm = Awaited<ReturnType<typeof devizFor>>["firm"];

async function linkFor(t: TestConvex, assistant?: boolean) {
  const deviz = await devizFor(t);
  const { offerId, token } = await deviz.firm.as.mutation(
    api.offers.offers.create,
    {
      estimateId: deviz.estimateId,
      optionalItems: [{ lineItemId: deviz.ceilingId, included: true }],
      ...(assistant === undefined ? {} : { assistant }),
    },
  );
  return { ...deviz, offerId, token };
}

/** A question the assistant is about to answer, as `ask` leaves it. */
async function answeringQuestion(
  t: TestConvex,
  firm: Firm,
  offerId: Id<"offers">,
  estimateId: Id<"estimates">,
  question: string,
) {
  return await t.run(async (ctx) => {
    const aiJobId = await ctx.db.insert("aiJobs", {
      kind: "offer_question",
      status: "queued",
      model: defaultModel,
      organizationId: firm.organizationId,
    });
    return await ctx.db.insert("offerQuestions", {
      organizationId: firm.organizationId,
      estimateId,
      offerId,
      question,
      choice: { excludedItemIds: [] },
      status: "answering",
      aiJobId,
    });
  });
}

async function settle(t: TestConvex) {
  await t.finishAllScheduledFunctions(() => {});
}

describe("offer questions", () => {
  test("with the assistant off, questions wait for the firm, which is emailed once", async () => {
    const t = setup();
    const sent = fakeResend();
    const { firm, offerId, token } = await linkFor(t, false);

    const firstId = await t.mutation(api.offers.questions.ask, {
      token,
      question: "  Când puteți începe lucrarea?  ",
    });
    await t.mutation(api.offers.questions.ask, {
      token,
      question: "Lucrați și sâmbăta?",
    });
    await settle(t);

    const asked = await t.query(api.offers.questions.forLink, { token });
    expect(asked.map((q) => [q.question, q.status])).toEqual([
      ["Când puteți începe lucrarea?", "waiting"],
      ["Lucrați și sâmbăta?", "waiting"],
    ]);
    // No AI ran: the firm has no job for it.
    const jobs = await t.run((ctx) => ctx.db.query("aiJobs").take(10));
    expect(jobs).toHaveLength(0);
    // One email until the firm replies.
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toEqual(["ana@example.com"]);
    expect(sent[0]?.subject).toBe(
      "Ion Popescu are o întrebare despre oferta DVZ-0001",
    );
    expect(sent[0]?.text).toContain("„Când puteți începe lucrarea?”");

    await firm.as.mutation(api.offers.questions.reply, {
      questionId: firstId,
      reply: "  Din 3 noiembrie, dacă acceptați oferta săptămâna aceasta.  ",
    });
    const [first] = await t.query(api.offers.questions.forLink, { token });
    expect(first?.status).toBe("answered");
    expect(first?.reply).toBe(
      "Din 3 noiembrie, dacă acceptați oferta săptămâna aceasta.",
    );
    // The firm sees who replied; the client's page doesn't.
    expect(first).not.toHaveProperty("repliedByName");
    const followed = await firm.as.query(api.offers.questions.forOffer, {
      offerId,
    });
    expect(followed[0]?.repliedByName).toBe("Ana");
    expect(followed[1]?.status).toBe("waiting");
  });

  test("the assistant's work is the firm's, and a failed answer goes to the firm", async () => {
    const t = setup();
    const sent = fakeResend();
    const { firm, ceilingId, token } = await linkFor(t);

    const questionId = await t.mutation(api.offers.questions.ask, {
      token,
      question: "Ce include prețul la tavanul fals?",
      excludedItemIds: [ceilingId],
    });
    const question = await t.run((ctx) =>
      ctx.db.get("offerQuestions", questionId),
    );
    expect(question?.status).toBe("answering");
    expect(question?.choice).toEqual({ excludedItemIds: [ceilingId] });
    // One question at a time.
    await expect(
      t.mutation(api.offers.questions.ask, { token, question: "Și gresia?" }),
    ).rejects.toThrow(/in_use/);

    // Without an API key the job fails, and the firm takes the question.
    await settle(t);
    const job = await t.run(async (ctx) => {
      const asked = await ctx.db.get("offerQuestions", questionId);
      return asked?.aiJobId ? await ctx.db.get("aiJobs", asked.aiJobId) : null;
    });
    expect(job).toMatchObject({
      kind: "offer_question",
      status: "failed",
      error: "missing_api_key",
      organizationId: firm.organizationId,
      // It counts toward the AI allowance of whoever sent the Ofertă.
      createdBy: firm.userId,
    });
    const [asked] = await t.query(api.offers.questions.forLink, { token });
    expect(asked?.status).toBe("waiting");
    expect(sent).toHaveLength(1);
  });

  test("the assistant reads the link as the client sees it, with the questions before", async () => {
    const t = setup();
    const { firm, offerId, estimateId, token } = await linkFor(t);
    const earlierId = await answeringQuestion(
      t,
      firm,
      offerId,
      estimateId,
      "Ce adeziv folosiți?",
    );
    await t.mutation(internal.offers.questions.begin, {
      questionId: earlierId,
    });
    await t.mutation(internal.offers.questions.saveAnswer, {
      questionId: earlierId,
      answer: "Adeziv flexibil C2TE, cum scrie la placarea cu faianță.",
      forFirm: false,
      usage: { ...emptyUsage, inputTokens: 1000, outputTokens: 200 },
    });

    const questionId = await answeringQuestion(
      t,
      firm,
      offerId,
      estimateId,
      "Cât costă faianța?",
    );
    const state = await t.mutation(internal.offers.questions.begin, {
      questionId,
    });
    if (!state) {
      throw new Error("no state");
    }
    expect(state.question).toBe("Cât costă faianța?");
    expect(state.history).toEqual([
      {
        question: "Ce adeziv folosiți?",
        answer: "Adeziv flexibil C2TE, cum scrie la placarea cu faianță.",
        reply: undefined,
      },
    ]);
    expect(state.offer).toMatchObject({
      code: "DVZ-0001",
      title: "Baie apartament",
      firm: { name: "Ana Construct SRL" },
      client: { name: "Ion Popescu" },
    });
    // Nothing the link doesn't show: no notes, no client contacts.
    const read = JSON.stringify(state);
    expect(read).not.toContain("Plătește greu");
    expect(read).not.toContain("Cantitate din releveu");
    expect(read).not.toContain("0722 123 456");
    const context = offerContext(state.offer);
    expect(context).toContain("Tavan fals din gips-carton: 6 mp");
    expect(context).toContain("Total cu TVA:");

    // The answered job is costed for the firm.
    const job = await t.run(async (ctx) => {
      const earlier = await ctx.db.get("offerQuestions", earlierId);
      return earlier?.aiJobId
        ? await ctx.db.get("aiJobs", earlier.aiJobId)
        : null;
    });
    expect(job?.status).toBe("succeeded");
    expect(job?.costUsd).toBeGreaterThan(0);
    const [earlier] = await t.query(api.offers.questions.forLink, { token });
    expect(earlier?.status).toBe("answered");
  });

  test("an answer that leaves the question to the firm shows, and the firm is asked", async () => {
    const t = setup();
    const sent = fakeResend();
    const { firm, offerId, estimateId, token } = await linkFor(t);
    const questionId = await answeringQuestion(
      t,
      firm,
      offerId,
      estimateId,
      "Puteți face o reducere?",
    );
    await t.mutation(internal.offers.questions.begin, { questionId });
    await t.mutation(internal.offers.questions.saveAnswer, {
      questionId,
      answer: "Doar Ana Construct SRL poate hotărî asta; îți răspunde aici.",
      forFirm: true,
      usage: emptyUsage,
    });
    await settle(t);
    const [asked] = await t.query(api.offers.questions.forLink, { token });
    expect(asked).toMatchObject({
      status: "waiting",
      answer: "Doar Ana Construct SRL poate hotărî asta; îți răspunde aici.",
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain("Asistentul i-a răspuns");

    // The firm's reply settles it; a late answer would change nothing.
    await firm.as.mutation(api.offers.questions.reply, {
      questionId,
      reply: "Vă putem face 5% dacă plătiți avansul săptămâna aceasta.",
    });
    const [replied] = await t.query(api.offers.questions.forLink, { token });
    expect(replied?.status).toBe("answered");
  });

  test("a question the assistant doesn't answer in time goes to the firm", async () => {
    const t = setup();
    const { firm, offerId, estimateId, token } = await linkFor(t);
    const questionId = await answeringQuestion(
      t,
      firm,
      offerId,
      estimateId,
      "Ce garanție dați?",
    );
    await t.mutation(internal.offers.questions.giveUp, { questionId });
    const [asked] = await t.query(api.offers.questions.forLink, { token });
    expect(asked?.status).toBe("waiting");
    // The answer coming after that is dropped.
    await t.mutation(internal.offers.questions.saveAnswer, {
      questionId,
      answer: "Oferta nu spune.",
      forFirm: false,
      usage: emptyUsage,
    });
    const [after] = await t.query(api.offers.questions.forLink, { token });
    expect(after?.status).toBe("waiting");
    expect(after?.answer).toBeUndefined();
  });

  test("only the client asks, briefly, while the link is open", async () => {
    const t = setup();
    const { firm, offerId, token } = await linkFor(t);
    await expect(
      firm.as.mutation(api.offers.questions.ask, {
        token,
        question: "Merge?",
      }),
    ).rejects.toThrow(/preview/);
    await expect(
      t.mutation(api.offers.questions.ask, { token, question: " " }),
    ).rejects.toThrow(/question/);
    await expect(
      t.mutation(api.offers.questions.ask, {
        token,
        question: "a".repeat(1001),
      }),
    ).rejects.toThrow(/question/);
    await expect(
      t.mutation(api.offers.questions.ask, {
        token: "nu-exista-un-asemenea-link-0000000",
        question: "Bună ziua?",
      }),
    ).rejects.toThrow(/not_found/);

    await firm.as.mutation(api.offers.offers.withdraw, { offerId });
    await expect(
      t.mutation(api.offers.questions.ask, { token, question: "Mai e?" }),
    ).rejects.toThrow(/locked/);
    expect(await t.query(api.offers.questions.forLink, { token })).toEqual([]);
  });

  test("another firm can't read or answer a link's questions", async () => {
    const t = setup();
    const { offerId, token } = await linkFor(t, false);
    const other = await devizFor(t, "Bogdan", "DV-FAI-02");
    const questionId = await t.mutation(api.offers.questions.ask, {
      token,
      question: "Cât durează?",
    });
    await expect(
      other.firm.as.query(api.offers.questions.forOffer, { offerId }),
    ).rejects.toThrow(/not_found/);
    await expect(
      other.firm.as.mutation(api.offers.questions.reply, {
        questionId,
        reply: "Două zile.",
      }),
    ).rejects.toThrow(/not_found/);
  });

  test("a link takes a day's questions, and a firm a day's answers", async () => {
    const t = setup();
    const { firm, offerId, estimateId, token } = await linkFor(t);
    await t.run(async (ctx) => {
      for (let i = 0; i < QUESTIONS_PER_LINK; i++) {
        await ctx.db.insert("offerQuestions", {
          organizationId: firm.organizationId,
          estimateId,
          offerId,
          question: `Întrebarea ${i + 1}`,
          choice: { excludedItemIds: [] },
          status: "answered",
        });
      }
    });
    await expect(
      t.mutation(api.offers.questions.ask, { token, question: "Încă una?" }),
    ).rejects.toThrow(/rate_limited/);

    // Another link of the same firm: the assistant has answered enough for
    // the firm today, so the question goes to the firm.
    const second = await firm.as.mutation(api.estimates.estimates.create, {
      organizationId: firm.organizationId,
      title: "Hol",
    });
    await firm.as.mutation(api.estimates.lineItems.addCustom, {
      estimateId: second,
      title: "Zugrăveli lavabile",
      unit: "mp",
      quantity: 40,
      resources: [
        {
          kind: "labor",
          name: "Zugrav",
          unit: "ora",
          quantity: 0.3,
          unitPrice: 35,
        },
      ],
    });
    const link = await firm.as.mutation(api.offers.offers.create, {
      estimateId: second,
    });
    await t.run(async (ctx) => {
      for (let i = QUESTIONS_PER_LINK; i < QUESTIONS_PER_FIRM; i++) {
        await ctx.db.insert("offerQuestions", {
          organizationId: firm.organizationId,
          estimateId,
          offerId,
          question: `Întrebarea ${i + 1}`,
          choice: { excludedItemIds: [] },
          status: "answered",
        });
      }
    });
    const questionId = await t.mutation(api.offers.questions.ask, {
      token: link.token,
      question: "Ce vopsea folosiți?",
    });
    const question = await t.run((ctx) =>
      ctx.db.get("offerQuestions", questionId),
    );
    expect(question?.status).toBe("waiting");
    expect(question?.aiJobId).toBeUndefined();
  });

  test("the assistant answers a day's questions across all the Oferte one person sent", async () => {
    const t = setup();
    const { firm, token } = await linkFor(t);
    // Answers to the Oferte the same person sent from another firm.
    const otherFirmId = await firm.as.mutation(
      api.accounts.organizations.create,
      { name: "Ana Renovări SRL" },
    );
    await t.run(async (ctx) => {
      for (let i = 0; i < QUESTIONS_PER_FIRM; i++) {
        await ctx.db.insert("aiJobs", {
          kind: "offer_question",
          status: "succeeded",
          model: defaultModel,
          organizationId: otherFirmId,
          createdBy: firm.userId,
        });
      }
    });
    const questionId = await t.mutation(api.offers.questions.ask, {
      token,
      question: "Ce gresie folosiți?",
    });
    const question = await t.run((ctx) =>
      ctx.db.get("offerQuestions", questionId),
    );
    expect(question?.status).toBe("waiting");
    expect(question?.aiJobId).toBeUndefined();
  });

  test("the firm turns the assistant off on a live link", async () => {
    const t = setup();
    const { firm, offerId, token } = await linkFor(t);
    await firm.as.mutation(api.offers.offers.setAssistant, {
      offerId,
      assistant: false,
    });
    const questionId = await t.mutation(api.offers.questions.ask, {
      token,
      question: "Cine face lucrarea?",
    });
    const question = await t.run((ctx) =>
      ctx.db.get("offerQuestions", questionId),
    );
    expect(question?.status).toBe("waiting");
    const view = await t.query(api.offers.public.view, { token });
    expect(view?.state === "open" && view.assistant).toBe(false);
  });

  test("deleting a Deviz deletes its questions", async () => {
    const t = setup();
    const { firm, estimateId, token } = await linkFor(t, false);
    await t.mutation(api.offers.questions.ask, {
      token,
      question: "Se poate mai ieftin?",
    });
    await firm.as.mutation(api.estimates.estimates.remove, { estimateId });
    await settle(t);
    const left = await t.run((ctx) => ctx.db.query("offerQuestions").take(10));
    expect(left).toHaveLength(0);
  });
});
