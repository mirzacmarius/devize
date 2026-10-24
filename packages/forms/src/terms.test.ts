import { describe, expect, test } from "bun:test";
import { withdrawalDocument } from "./forms/withdrawal";
import { buildDocuments } from "./index";
import type { ExportData, ExportOptions } from "./input";
import type { Block, FormDocument } from "./model";
import { sampleData } from "./sample.helper";

// The client's Deviz with the Ofertă's terms: how it is paid, a consumer's
// rights and the record of the electronic signature; and the withdrawal form.

const options: ExportOptions = { withValues: true, date: "2026-10-24" };
// 2026-10-24 11:05 UTC, 14:05 in Bucharest.
const signedAt = Date.UTC(2026, 9, 24, 11, 5);
const DAY_MS = 24 * 60 * 60_000;

function withOffer(offer: ExportData["offer"]): ExportData {
  return { ...sampleData(), offer };
}

function texts(document: FormDocument | undefined): string[] {
  return (document?.blocks ?? []).flatMap((block: Block) =>
    block.type === "text" || block.type === "heading"
      ? [block.text]
      : block.type === "title"
        ? block.lines
        : [],
  );
}

function deviz(data: ExportData) {
  return buildDocuments(data, ["DEVIZ"], options)[0];
}

describe("the client's Deviz with the Ofertă's terms", () => {
  test("prints nothing more without them", () => {
    const words = texts(deviz(withOffer(null))).join("\n");
    expect(words).not.toContain("Condiții de plată");
    expect(words).not.toContain("OUG 34/2014");
    expect(words).not.toContain("Acceptare electronică");
  });

  test("prints the stages of payment with their amounts", () => {
    const document = deviz(
      withOffer({
        paymentSchedule: [
          { stage: "Avans", percent: 30, trigger: "signing" },
          { stage: "Materiale", amount: 1000, trigger: "start" },
          { stage: "Restul", percent: 50, trigger: "completion" },
        ],
      }),
    );
    expect(texts(document)).toContain("Condiții de plată");
    const table = document?.blocks.find(
      (block) =>
        block.type === "table" &&
        block.header?.[0]?.some((cell) => cell.text === "Etapa"),
    );
    if (table?.type !== "table") {
      throw new Error("expected the payment table");
    }
    const recap = document?.blocks.find(
      (block) =>
        block.type === "table" &&
        block.rows.some((row) =>
          row.cells.some((cell) => cell.text === "TOTAL cu TVA"),
        ),
    );
    if (recap?.type !== "table") {
      throw new Error("expected the Recapitulație");
    }
    const total =
      recap.rows
        .find((row) => row.cells.some((cell) => cell.text === "TOTAL cu TVA"))
        ?.cells.flatMap((cell) =>
          cell.value === undefined ? [] : [cell.value],
        )
        .at(-1) ?? 0;
    expect(total).toBeGreaterThan(0);
    expect(table.rows.map((row) => row.cells.map((cell) => cell.text))).toEqual(
      [
        ["Avans", "la semnarea ofertei", "30%", expect.any(String)],
        ["Materiale", "la începerea lucrărilor", "", expect.any(String)],
        ["Restul", "la recepția lucrărilor", "50%", expect.any(String)],
      ],
    );
    expect(table.rows.map((row) => row.cells[3]?.value)).toEqual([
      Math.round(total * 30) / 100,
      1000,
      Math.round(total * 50) / 100,
    ]);
  });

  test("tells a consumer their rights and records the signature", () => {
    const document = deviz(
      withOffer({
        consumer: true,
        signature: {
          name: "Ana Popescu",
          signedAt,
          contentHash: "ab".repeat(32),
          evidence: {
            userAgent: "Mozilla/5.0 (iPhone)",
            language: "ro-RO",
            timeZone: "Europe/Bucharest",
            screen: "390×844",
            address: "203.0.113.7",
          },
          earlyStart: true,
          withdrawalUntil: signedAt + 14 * DAY_MS,
        },
        confirmation: { email: "a***@exemplu.ro", sentAt: signedAt + 60_000 },
      }),
    );
    const words = texts(document).join("\n");
    expect(words).toContain("Informare pentru consumator (OUG 34/2014)");
    expect(words).toContain("14 zile de la acceptare");
    expect(words).toContain("Acceptare electronică");
    expect(words).toContain(
      "Semnată electronic de Ana Popescu, pe 24.10.2026, 14:05 (ora României)",
    );
    expect(words).toContain(`(SHA-256): ${"ab".repeat(32)}.`);
    expect(words).toContain("Adresa de rețea: 203.0.113.7.");
    expect(words).toContain("Browserul: Mozilla/5.0 (iPhone).");
    expect(words).toContain(
      "limba ro-RO, fusul orar Europe/Bucharest, ecran 390×844",
    );
    expect(words).toContain(
      "Confirmarea a fost trimisă pe email la a***@exemplu.ro, pe 24.10.2026, 14:06.",
    );
    expect(words).toContain(
      "a cerut începerea lucrărilor înainte de expirarea termenului de retragere; se poate retrage până pe 07.11.2026.",
    );
    // The beneficiary signs as the person who accepted, with the moment.
    const signatures = document?.blocks.find(
      (block) => block.type === "signatures",
    );
    if (signatures?.type !== "signatures") {
      throw new Error("expected the signatures");
    }
    expect(signatures.items[1]).toEqual({
      role: "Beneficiar,",
      name: "Ana Popescu",
      hint: "(semnat electronic pe 24.10.2026, 14:05)",
    });
  });

  test("the withdrawal form names the firm, the Ofertă and the consumer", () => {
    const data = withOffer({
      consumer: true,
      signature: { name: "Ana Popescu", signedAt },
    });
    const form = withdrawalDocument(data);
    expect(form).toMatchObject({
      id: "RETRAGERE",
      name: "Formular de retragere",
      label: "Anexa B, OUG 34/2014",
    });
    const words = texts(form).join("\n");
    expect(words).toContain("FORMULAR DE RETRAGERE");
    expect(words).toContain(`– Către: ${data.firm.name}`);
    expect(words).toContain(data.firm.email ?? "");
    expect(words).toContain(
      `lucrările din oferta DVZ-${String(data.estimate.number).padStart(4, "0")}`,
    );
    expect(words).toContain("– Comandate la data: 24.10.2026, 14:05");
    expect(words).toContain(
      "– Numele consumatorului/consumatorilor: Ana Popescu",
    );
    expect(words).toContain(
      "– Adresa consumatorului/consumatorilor: Str. Exemplu 1, Cluj-Napoca",
    );
    // Unsigned, with no client, the form leaves blanks to fill in.
    const blank = texts(withdrawalDocument({ ...sampleData(), client: null }));
    expect(blank.join("\n")).toContain("– Comandate la data: ......");
    expect(blank.join("\n")).toContain(
      "– Numele consumatorului/consumatorilor: ......",
    );
  });
});
