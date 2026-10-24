import { paginationOptsValidator } from "convex/server";
import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { cleanCui, optionalText } from "../accounts/identifiers";
import { roundLei } from "../estimates/recap";
import { requireFirmDoc, requireMember } from "../lib/access";
import { checkDate, romanianDate } from "../lib/dates";
import { appError, invalid, notFound } from "../lib/errors";
import { estimateCode } from "../offers/helpers";
import { addCalendarDays, efacturaDeadline } from "./deadline";
import {
  buyerSnapshot,
  cleanCounty,
  counts,
  DEFAULT_PAYMENT_TERM_DAYS,
  type InvoiceParty,
  invoiceCode,
  invoicesOf,
  MAX_CITY,
  MAX_DESCRIPTION,
  MAX_LINES,
  MAX_NAME,
  MAX_NOTES,
  MAX_POSTAL,
  MAX_STREET,
  mentionsOf,
  partyText,
  requireDraft,
  sameName,
  sellerSnapshot,
  settingsOf,
  textDate,
  textPercent,
} from "./helpers";
import {
  computeTotals,
  defaultCategory,
  type InvoiceLine,
  type InvoiceLineInput,
  priceLine,
} from "./money";
import { checkInvoice, hasErrors } from "./rules";
import { seriesFor } from "./settings";
import {
  buyerInput,
  invoiceLineInput,
  invoiceStatus,
  paymentMethod,
} from "./validators";

// Facturi: the advance a client pays on accepting an Ofertă, the final
// invoice for the works with the advance deducted, and the storno that
// reverses a wrong one. A draft is shaped on its page; issuing numbers and
// freezes it. The Situație de lucrări invoice is in statements.ts.

const MAX_PAYMENTS = 50;
const MAX_UNIT = 20;
const MAX_QUANTITY = 1_000_000_000;
const MAX_PRICE = 1_000_000_000;

/** The accepted Ofertă of a Deviz, with what the client accepted. */
async function acceptedOffer(ctx: QueryCtx, estimate: Doc<"estimates">) {
  const offers = await ctx.db
    .query("offers")
    .withIndex("by_estimateId", (q) => q.eq("estimateId", estimate._id))
    .order("desc")
    .take(20);
  const accepted = offers.find((offer) => offer.status === "accepted");
  if (!accepted?.choice) {
    return null;
  }
  return { offer: accepted, totals: accepted.choice.totals };
}

/** Where a Deviz stands with its invoices: what was accepted and what is billed. */
async function billingOf(ctx: QueryCtx, estimate: Doc<"estimates">) {
  const accepted = await acceptedOffer(ctx, estimate);
  const invoices = await invoicesOf(ctx, estimate._id);
  const settled = new Set(
    invoices
      .filter((invoice) => counts(invoice))
      .flatMap((invoice) => invoice.settlesInvoiceIds ?? []),
  );
  // Storno invoices take their original out through `stornoedBy`, so only
  // the others are summed.
  const invoicedNet = roundLei(
    invoices
      .filter((invoice) => counts(invoice) && invoice.kind !== "storno")
      .reduce((sum, invoice) => sum + invoice.totals.net, 0),
  );
  const openAdvances = invoices.filter(
    (invoice) =>
      invoice.kind === "advance" &&
      counts(invoice) &&
      !settled.has(invoice._id),
  );
  return { accepted, invoices, invoicedNet, openAdvances };
}

/** The invoice as lists show it. */
function summary(invoice: Doc<"invoices">) {
  return {
    _id: invoice._id,
    code:
      invoice.series !== undefined && invoice.number !== undefined
        ? invoiceCode(invoice.series, invoice.number)
        : null,
    kind: invoice.kind,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    buyerName: invoice.buyer.name,
    total: invoice.totals.total,
    net: invoice.totals.net,
    paidAmount: invoice.paidAmount,
    efactura: {
      status: invoice.efactura.status,
      deadline: invoice.efactura.deadline,
    },
    updatedAt: invoice.updatedAt,
  };
}

/** A firm's invoices, newest first, all or in one status. */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(invoiceStatus),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId);
    const status = args.status;
    const page = status
      ? await ctx.db
          .query("invoices")
          .withIndex("by_organizationId_and_status_and_updatedAt", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", status),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("invoices")
          .withIndex("by_organizationId_and_updatedAt", (q) =>
            q.eq("organizationId", args.organizationId),
          )
          .order("desc")
          .paginate(args.paginationOpts);
    const rows = [];
    for (const invoice of page.page) {
      const estimate = await ctx.db.get("estimates", invoice.estimateId);
      rows.push({
        ...summary(invoice),
        estimate: estimate
          ? {
              _id: estimate._id,
              code: estimateCode(estimate),
              title: estimate.title,
            }
          : null,
      });
    }
    return { ...page, page: rows };
  },
});

/**
 * A Deviz's invoices and what can still be billed: the advance the accepted
 * Ofertă asks for, and the rest of the accepted value.
 */
export const forEstimate = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const { doc: estimate } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const { accepted, invoices, invoicedNet, openAdvances } = await billingOf(
      ctx,
      estimate,
    );
    const acceptedNet = accepted?.totals.subtotal ?? null;
    const hasAdvance = invoices.some(
      (invoice) =>
        invoice.kind === "advance" &&
        (invoice.status === "draft" || counts(invoice)),
    );
    return {
      invoices: invoices.map(summary),
      accepted:
        accepted === null
          ? null
          : {
              net: accepted.totals.subtotal,
              total: accepted.totals.total,
              depositPercent: accepted.offer.depositPercent ?? null,
              decidedAt: accepted.offer.decidedAt ?? null,
            },
      invoicedNet,
      remainingNet:
        acceptedNet === null ? null : roundLei(acceptedNet - invoicedNet),
      // An advance is offered once, for the deposit the Ofertă asked.
      canAdvance:
        accepted !== null &&
        accepted.offer.depositPercent !== undefined &&
        !hasAdvance,
      // The final invoice: once accepted, while something is left to bill
      // and no final invoice is in the making.
      canFinal:
        accepted !== null &&
        !invoices.some(
          (invoice) =>
            invoice.kind === "final" &&
            (invoice.status === "draft" || counts(invoice)),
        ),
      openAdvances: openAdvances.length,
    };
  },
});

/** The invoice of a Situație de lucrări, for the statement's page. */
export const forStatement = query({
  args: { workStatementId: v.string() },
  handler: async (ctx, args) => {
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_workStatementId", (q) =>
        q.eq("workStatementId", args.workStatementId),
      )
      .take(10);
    const live = invoices.find(
      (invoice) => invoice.status !== "cancelled" && !invoice.stornoedBy,
    );
    if (!live) {
      return null;
    }
    const { doc } = await requireFirmDoc(ctx, "invoices", live._id);
    return summary(doc);
  },
});

/** One invoice, with what its page shows around it. */
export const get = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const { doc: invoice } = await requireFirmDoc(
      ctx,
      "invoices",
      args.invoiceId,
    );
    const estimate = await ctx.db.get("estimates", invoice.estimateId);
    const codeOf = async (id: Id<"invoices"> | undefined) => {
      const other = id ? await ctx.db.get("invoices", id) : null;
      return other
        ? {
            _id: other._id,
            code:
              other.series !== undefined && other.number !== undefined
                ? invoiceCode(other.series, other.number)
                : null,
            issueDate: other.issueDate,
            total: other.totals.total,
          }
        : null;
    };
    const settles = [];
    for (const id of invoice.settlesInvoiceIds ?? []) {
      const ref = await codeOf(id);
      if (ref) {
        settles.push(ref);
      }
    }
    const settings = await settingsOf(ctx, invoice.organizationId);
    const series = await ctx.db
      .query("invoiceSeries")
      .withIndex("by_organizationId_and_code", (q) =>
        q.eq("organizationId", invoice.organizationId),
      )
      .take(50);
    const { membership } = await requireMember(ctx, invoice.organizationId);
    return {
      ...invoice,
      code:
        invoice.series !== undefined && invoice.number !== undefined
          ? invoiceCode(invoice.series, invoice.number)
          : null,
      estimate: estimate
        ? {
            _id: estimate._id,
            code: estimateCode(estimate),
            title: estimate.title,
            status: estimate.status,
          }
        : null,
      stornoOf: await codeOf(invoice.stornoOf),
      stornoedBy: await codeOf(invoice.stornoedBy),
      settles,
      // What the issued invoice will state besides its lines.
      mentions: invoice.mentions ?? mentionsOf(settings),
      // The series a draft can be numbered in.
      seriesOptions: series
        .filter((row) => row.active)
        .map((row) => ({
          code: row.code,
          nextNumber: row.nextNumber,
          isDefault: row.isDefault,
        })),
      // Cancelling is for owners and admins; everything else for members.
      canCancel: membership.role !== "member",
      // Everything the e-Factura XML would lack, for the page's checks card.
      findings: checkInvoice(invoice),
    };
  },
});

/** The lines as the server keeps them, checked one by one. */
function cleanLines(
  inputs: readonly InvoiceLineInput[],
  sellerVatRegistered: boolean,
): InvoiceLine[] {
  if (inputs.length > MAX_LINES) {
    throw invalid("lines");
  }
  return inputs.map((input) => {
    const description = input.description.trim();
    if (!description || description.length > MAX_DESCRIPTION) {
      throw invalid("description");
    }
    const unit = input.unit.trim();
    if (!unit || unit.length > MAX_UNIT) {
      throw invalid("unit");
    }
    if (
      !Number.isFinite(input.quantity) ||
      input.quantity === 0 ||
      Math.abs(input.quantity) > MAX_QUANTITY
    ) {
      throw invalid("quantity");
    }
    if (
      !Number.isFinite(input.unitPrice) ||
      input.unitPrice < 0 ||
      input.unitPrice > MAX_PRICE
    ) {
      throw invalid("unitPrice");
    }
    if (
      !Number.isFinite(input.vatRate) ||
      input.vatRate < 0 ||
      input.vatRate > 100
    ) {
      throw invalid("vatRate");
    }
    return priceLine(
      {
        ...input,
        description,
        unit,
        quantity: Math.round(input.quantity * 10_000) / 10_000,
        unitPrice: Math.round(input.unitPrice * 10_000) / 10_000,
      },
      sellerVatRegistered,
    );
  });
}

/**
 * The buyer as the Deviz's last invoice named them, when it is still the
 * same client: the address and CNP corrected on one invoice carry over.
 */
async function latestBuyer(
  ctx: QueryCtx,
  estimate: Doc<"estimates">,
  client: Doc<"clients"> | null,
): Promise<InvoiceParty | undefined> {
  const previous = (await invoicesOf(ctx, estimate._id)).find((invoice) =>
    invoice.buyer.name.trim(),
  );
  if (!previous) {
    return undefined;
  }
  const same =
    !client ||
    (client.cui !== undefined && previous.buyer.cui === client.cui) ||
    sameName(previous.buyer.name, client.name);
  return same ? previous.buyer : undefined;
}

/** Starts a draft for a Deviz, with its firm and client as they stand now. */
export async function insertDraft(
  ctx: MutationCtx,
  estimate: Doc<"estimates">,
  userId: Id<"users">,
  fields: Pick<Doc<"invoices">, "kind"> &
    Partial<
      Pick<
        Doc<"invoices">,
        | "offerId"
        | "advancePercent"
        | "settlesInvoiceIds"
        | "stornoOf"
        | "workStatementId"
        | "period"
        | "notes"
        | "retention"
        | "buyer"
      >
    > & { lines: InvoiceLineInput[] },
): Promise<Id<"invoices">> {
  const firm = await ctx.db.get("organizations", estimate.organizationId);
  if (!firm) {
    throw notFound("organization");
  }
  const settings = await settingsOf(ctx, firm._id);
  const client = estimate.clientId
    ? await ctx.db.get("clients", estimate.clientId)
    : null;
  const seller = sellerSnapshot(firm, settings);
  const { lines: inputs, buyer: given, ...rest } = fields;
  const buyer =
    given ??
    (await latestBuyer(ctx, estimate, client)) ??
    buyerSnapshot(client);
  const lines = cleanLines(inputs, seller.vatRegistered);
  const now = Date.now();
  const issueDate = romanianDate(now);
  const days = settings?.paymentTermDays ?? DEFAULT_PAYMENT_TERM_DAYS;
  const invoiceId = await ctx.db.insert("invoices", {
    organizationId: firm._id,
    estimateId: estimate._id,
    status: "draft",
    issueDate,
    dueDate: addCalendarDays(issueDate, days),
    seller,
    buyer: buyer ?? buyerSnapshot(client),
    lines,
    totals: computeTotals(lines),
    payments: [],
    paidAmount: 0,
    efactura: { status: "not_sent", deadline: efacturaDeadline(issueDate) },
    createdBy: userId,
    updatedAt: now,
    ...rest,
  });
  // ANAF's register says whether the client is registered for VAT and where
  // its office is, so the XML names it right.
  if (given === undefined && client?.kind === "company" && client.cui) {
    await ctx.scheduler.runAfter(0, internal.invoices.anaf.checkBuyer, {
      invoiceId,
      updatedAt: now,
    });
  }
  return invoiceId;
}

/**
 * The advance invoice of an accepted Ofertă: the deposit it asked, as a
 * share of the accepted value without VAT, at the Deviz's VAT rate.
 */
export const createAdvance = mutation({
  args: {
    estimateId: v.id("estimates"),
    // The share of the accepted value, in percent; the Ofertă's deposit
    // when left out.
    percent: v.optional(v.number()),
  },
  returns: v.id("invoices"),
  handler: async (ctx, args) => {
    const { doc: estimate, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const accepted = await acceptedOffer(ctx, estimate);
    if (!accepted) {
      throw invalid("status");
    }
    const percent = args.percent ?? accepted.offer.depositPercent;
    if (
      percent === undefined ||
      !Number.isFinite(percent) ||
      percent <= 0 ||
      percent > 100
    ) {
      throw invalid("advancePercent");
    }
    const firm = await ctx.db.get("organizations", estimate.organizationId);
    const vatRate = firm?.vatPayer ? estimate.markups.vat : 0;
    const net = roundLei((accepted.totals.subtotal * percent) / 100);
    const decided = accepted.offer.decidedAt
      ? ` din ${textDate(romanianDate(accepted.offer.decidedAt))}`
      : "";
    return await insertDraft(ctx, estimate, userId, {
      kind: "advance",
      offerId: accepted.offer._id,
      advancePercent: Math.round(percent * 100) / 100,
      lines: [
        {
          description: `Avans ${textPercent(percent)} pentru lucrarea „${estimate.title}”, conform ofertei acceptate ${estimateCode(estimate)}${decided}`,
          unit: "buc",
          quantity: 1,
          unitPrice: net,
          vatRate,
          vatCategory: defaultCategory(vatRate, firm?.vatPayer ?? true),
        },
      ],
    });
  },
});

/**
 * The invoice for the works once they are done: the accepted value in one
 * line, less every advance already invoiced, each reversed on its own line
 * at the rate it was charged, as a Romanian invoice regularises an advance.
 */
export const createFinal = mutation({
  args: { estimateId: v.id("estimates") },
  returns: v.id("invoices"),
  handler: async (ctx, args) => {
    const { doc: estimate, userId } = await requireFirmDoc(
      ctx,
      "estimates",
      args.estimateId,
    );
    const { accepted, openAdvances } = await billingOf(ctx, estimate);
    if (!accepted) {
      throw invalid("status");
    }
    const firm = await ctx.db.get("organizations", estimate.organizationId);
    const vatRate = firm?.vatPayer ? estimate.markups.vat : 0;
    const decided = accepted.offer.decidedAt
      ? `, acceptat la ${textDate(romanianDate(accepted.offer.decidedAt))}`
      : "";
    const lines: InvoiceLineInput[] = [
      {
        description: `Lucrări de construcții „${estimate.title}”, conform devizului ${estimateCode(estimate)}${decided}`,
        unit: "buc",
        quantity: 1,
        unitPrice: accepted.totals.subtotal,
        vatRate,
        vatCategory: defaultCategory(vatRate, firm?.vatPayer ?? true),
      },
      ...openAdvances.flatMap((advance) => advanceReversal(advance)),
    ];
    return await insertDraft(ctx, estimate, userId, {
      kind: "final",
      offerId: accepted.offer._id,
      settlesInvoiceIds: openAdvances.map((advance) => advance._id),
      lines,
    });
  },
});

/** The lines that take an advance back, one per rate it was charged at. */
export function advanceReversal(advance: Doc<"invoices">): InvoiceLineInput[] {
  const code =
    advance.series !== undefined && advance.number !== undefined
      ? invoiceCode(advance.series, advance.number)
      : "";
  return advance.totals.byRate
    .filter((group) => group.net !== 0)
    .map((group) => ({
      description: `Storno avans factura ${code} din ${textDate(advance.issueDate)}`,
      unit: "buc",
      quantity: -1,
      unitPrice: Math.abs(group.net),
      vatRate: group.vatRate,
      vatCategory: group.vatCategory,
      settles: advance._id,
    }));
}

/**
 * A storno: the same lines with their quantities negated, so the two
 * invoices cancel out. The original shows the storno once it is issued.
 */
export const createStorno = mutation({
  args: { invoiceId: v.id("invoices"), reason: v.optional(v.string()) },
  returns: v.id("invoices"),
  handler: async (ctx, args) => {
    const { doc: original, userId } = await requireFirmDoc(
      ctx,
      "invoices",
      args.invoiceId,
    );
    if (!counts(original) || original.kind === "storno") {
      throw appError("locked", "storno");
    }
    const estimate = await ctx.db.get("estimates", original.estimateId);
    if (!estimate) {
      throw notFound("estimate");
    }
    const code =
      original.series !== undefined && original.number !== undefined
        ? invoiceCode(original.series, original.number)
        : "";
    const reason = optionalText(args.reason, 200);
    return await insertDraft(ctx, estimate, userId, {
      kind: "storno",
      stornoOf: original._id,
      buyer: original.buyer,
      notes: `Stornare factura ${code} din ${textDate(original.issueDate)}${reason ? `: ${reason}` : ""}`,
      lines: original.lines.map((line) => ({
        description: line.description,
        unit: line.unit,
        quantity: -line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        vatCategory: line.vatCategory,
        lineItemId: line.lineItemId,
      })),
    });
  },
});

/** The buyer as corrected on the draft's page. */
function cleanBuyer(
  current: InvoiceParty,
  input: Infer<typeof buyerInput>,
): InvoiceParty {
  const buyer = { ...current };
  if (input.name !== undefined) {
    buyer.name = partyText(input.name, MAX_NAME, "name") ?? "";
  }
  if (input.kind !== undefined) {
    buyer.kind = input.kind;
  }
  if (input.cui !== undefined) {
    const cui = optionalText(input.cui, 20);
    if (!cui) {
      buyer.cui = undefined;
    } else if (buyer.kind === "person") {
      if (!/^\d{13}$/.test(cui.replace(/\s/g, ""))) {
        throw invalid("cnp");
      }
      buyer.cui = cui.replace(/\s/g, "");
    } else {
      buyer.cui = cleanCui(cui);
    }
  }
  if (input.vatRegistered !== undefined) {
    buyer.vatRegistered = input.vatRegistered;
  }
  if (buyer.kind === "person") {
    buyer.vatRegistered = false;
  }
  if (input.tradeRegister !== undefined) {
    buyer.tradeRegister = optionalText(input.tradeRegister, 50);
  }
  if (input.address !== undefined) {
    buyer.address = partyText(input.address, MAX_STREET, "address");
  }
  if (input.city !== undefined) {
    buyer.city = partyText(input.city, MAX_CITY, "city");
  }
  if (input.county !== undefined) {
    buyer.county = cleanCounty(input.county);
  }
  if (input.postalCode !== undefined) {
    buyer.postalCode = partyText(input.postalCode, MAX_POSTAL, "postalCode");
  }
  if (input.email !== undefined) {
    buyer.email = optionalText(input.email, 200);
  }
  if (input.phone !== undefined) {
    buyer.phone = optionalText(input.phone, 50);
  }
  return buyer;
}

/** Changes a draft: its lines, dates, note, buyer or retention. */
export const update = mutation({
  args: {
    invoiceId: v.id("invoices"),
    lines: v.optional(v.array(invoiceLineInput)),
    issueDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    buyer: v.optional(buyerInput),
    retention: v.optional(
      v.union(v.object({ percent: v.number(), amount: v.number() }), v.null()),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { invoice } = await requireDraft(ctx, args.invoiceId);
    const patch: Partial<Doc<"invoices">> = {};
    if (args.lines !== undefined) {
      const lines = cleanLines(args.lines, invoice.seller.vatRegistered);
      for (const line of lines) {
        if (line.lineItemId) {
          const item = await ctx.db.get("lineItems", line.lineItemId);
          if (!item || item.estimateId !== invoice.estimateId) {
            throw notFound("lineItem");
          }
        }
        if (line.settles) {
          const settled = await ctx.db.get("invoices", line.settles);
          if (!settled || settled.estimateId !== invoice.estimateId) {
            throw notFound("invoice");
          }
        }
      }
      patch.lines = lines;
      patch.totals = computeTotals(lines);
      patch.settlesInvoiceIds = [
        ...new Set(
          lines.flatMap((line) => (line.settles ? [line.settles] : [])),
        ),
      ];
    }
    if (args.issueDate !== undefined) {
      patch.issueDate = checkDate(args.issueDate);
      patch.efactura = {
        ...invoice.efactura,
        deadline: efacturaDeadline(patch.issueDate),
      };
    }
    if (args.dueDate !== undefined) {
      patch.dueDate = checkDate(args.dueDate);
    }
    if (args.notes !== undefined) {
      patch.notes = optionalText(args.notes, MAX_NOTES);
    }
    if (args.buyer !== undefined) {
      patch.buyer = cleanBuyer(invoice.buyer, args.buyer);
    }
    if (args.retention !== undefined) {
      if (args.retention === null) {
        patch.retention = undefined;
      } else {
        const { percent, amount } = args.retention;
        if (
          !Number.isFinite(percent) ||
          percent < 0 ||
          percent > 100 ||
          !Number.isFinite(amount) ||
          amount < 0
        ) {
          throw invalid("retention");
        }
        patch.retention = { percent, amount: roundLei(amount) };
      }
    }
    await ctx.db.patch("invoices", invoice._id, {
      ...patch,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Deletes a draft. Issued invoices stay: a wrong one is reversed by a storno. */
export const remove = mutation({
  args: { invoiceId: v.id("invoices") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { invoice } = await requireDraft(ctx, args.invoiceId);
    await ctx.db.delete("invoices", invoice._id);
    return null;
  },
});

/**
 * Issues a draft: the firm as it stands now, the next number of the series,
 * the dates and the e-Factura deadline. Refused while the XML would lack
 * something ANAF requires, so the page shows what to fix first.
 */
export const issue = mutation({
  args: {
    invoiceId: v.id("invoices"),
    series: v.optional(v.string()),
    issueDate: v.optional(v.string()),
  },
  returns: v.object({ code: v.string() }),
  handler: async (ctx, args) => {
    const { invoice, userId } = await requireDraft(ctx, args.invoiceId);
    const firm = await ctx.db.get("organizations", invoice.organizationId);
    if (!firm) {
      throw notFound("organization");
    }
    const settings = await settingsOf(ctx, firm._id);
    const seller = sellerSnapshot(firm, settings);
    const today = romanianDate(Date.now());
    const issueDate = args.issueDate ? checkDate(args.issueDate) : today;
    if (issueDate > today) {
      throw invalid("issueDate");
    }
    const series = await seriesFor(ctx, firm._id, args.series);
    // Invoices of a series follow each other in time as in number.
    const previous = await ctx.db
      .query("invoices")
      .withIndex("by_organizationId_and_series_and_number", (q) =>
        q.eq("organizationId", firm._id).eq("series", series.code),
      )
      .order("desc")
      .first();
    if (previous && previous.issueDate > issueDate) {
      throw invalid("issueDate");
    }
    const days = settings?.paymentTermDays ?? DEFAULT_PAYMENT_TERM_DAYS;
    const dueDate =
      invoice.dueDate >= issueDate && invoice.issueDate === issueDate
        ? invoice.dueDate
        : addCalendarDays(issueDate, days);
    // Lines keep their categories; the seller's VAT standing may have
    // changed since the draft was made, which the checks then report.
    const candidate = {
      ...invoice,
      seller,
      issueDate,
      dueDate,
      lines: invoice.lines.map((line) => ({ ...line })),
    };
    if (hasErrors(checkInvoice(candidate))) {
      throw invalid("checks");
    }
    const number = series.nextNumber;
    await ctx.db.patch("invoiceSeries", series._id, { nextNumber: number + 1 });
    const now = Date.now();
    await ctx.db.patch("invoices", invoice._id, {
      status: "issued",
      series: series.code,
      number,
      issueDate,
      dueDate,
      seller,
      mentions: mentionsOf(settings),
      efactura: { ...invoice.efactura, deadline: efacturaDeadline(issueDate) },
      issuedBy: userId,
      issuedAt: now,
      updatedAt: now,
    });
    if (invoice.stornoOf) {
      const original = await ctx.db.get("invoices", invoice.stornoOf);
      if (original && original.organizationId === invoice.organizationId) {
        await ctx.db.patch("invoices", original._id, {
          stornoedBy: invoice._id,
          updatedAt: now,
        });
      }
    }
    return { code: invoiceCode(series.code, number) };
  },
});

/** An issued invoice payments can be recorded on. */
async function requirePayable(ctx: MutationCtx, invoiceId: Id<"invoices">) {
  const { doc: invoice } = await requireFirmDoc(ctx, "invoices", invoiceId);
  if (
    (invoice.status !== "issued" && invoice.status !== "paid") ||
    invoice.kind === "storno" ||
    invoice.totals.total <= 0
  ) {
    throw appError("locked", "invoice");
  }
  return invoice;
}

/** What the payments add up to, and whether that settles the invoice. */
function paymentState(
  invoice: Doc<"invoices">,
  payments: Doc<"invoices">["payments"],
) {
  const paidAmount = roundLei(
    payments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const paid = paidAmount + 0.005 >= invoice.totals.total;
  return {
    payments,
    paidAmount,
    paidAt: paid
      ? Math.max(...payments.map((p) => Date.parse(`${p.date}T12:00:00Z`)))
      : undefined,
    status: paid ? ("paid" as const) : ("issued" as const),
    updatedAt: Date.now(),
  };
}

/** Records a payment; the invoice is paid once they cover its total. */
export const addPayment = mutation({
  args: {
    invoiceId: v.id("invoices"),
    date: v.string(),
    // Lei; left out, what is still owed.
    amount: v.optional(v.number()),
    method: paymentMethod,
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invoice = await requirePayable(ctx, args.invoiceId);
    if (invoice.payments.length >= MAX_PAYMENTS) {
      throw invalid("payments");
    }
    const owed = roundLei(invoice.totals.total - invoice.paidAmount);
    const amount = roundLei(args.amount ?? owed);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_PRICE) {
      throw invalid("paymentAmount");
    }
    const payments = [
      ...invoice.payments,
      {
        date: checkDate(args.date),
        amount,
        method: args.method,
        note: optionalText(args.note, 200),
      },
    ];
    await ctx.db.patch(
      "invoices",
      invoice._id,
      paymentState(invoice, payments),
    );
    return null;
  },
});

/** Takes a payment back, by its position. */
export const removePayment = mutation({
  args: { invoiceId: v.id("invoices"), index: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invoice = await requirePayable(ctx, args.invoiceId);
    if (!invoice.payments[args.index]) {
      throw notFound("payment");
    }
    const payments = invoice.payments.filter((_, i) => i !== args.index);
    await ctx.db.patch(
      "invoices",
      invoice._id,
      paymentState(invoice, payments),
    );
    return null;
  },
});

/**
 * Cancels an issued invoice that never left the firm: not sent to ANAF and
 * unpaid. Its number stays taken, and the invoice stays on the list as
 * cancelled. Anything else is reversed by a storno instead.
 */
export const cancel = mutation({
  args: { invoiceId: v.id("invoices") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { doc: invoice } = await requireFirmDoc(
      ctx,
      "invoices",
      args.invoiceId,
      "admin",
    );
    if (
      invoice.status !== "issued" ||
      invoice.efactura.status !== "not_sent" ||
      invoice.payments.length > 0 ||
      invoice.stornoedBy !== undefined
    ) {
      throw appError("locked", "invoice");
    }
    const now = Date.now();
    await ctx.db.patch("invoices", invoice._id, {
      status: "cancelled",
      updatedAt: now,
    });
    if (invoice.kind === "storno" && invoice.stornoOf) {
      const original = await ctx.db.get("invoices", invoice.stornoOf);
      if (original?.stornoedBy === invoice._id) {
        await ctx.db.patch("invoices", original._id, {
          stornoedBy: undefined,
          updatedAt: now,
        });
      }
    }
    return null;
  },
});

/** Whether a Deviz has an issued invoice, which keeps it from being deleted. */
export async function hasIssuedInvoice(
  ctx: QueryCtx,
  estimateId: Id<"estimates">,
): Promise<boolean> {
  const invoices = await invoicesOf(ctx, estimateId);
  return invoices.some((invoice) => invoice.status !== "draft");
}

/** Deletes a deleted Deviz's draft invoices; returns how many. */
export async function deleteDraftInvoices(
  ctx: MutationCtx,
  estimateId: Id<"estimates">,
  limit: number,
): Promise<number> {
  if (limit <= 0) {
    return 0;
  }
  const drafts = (await invoicesOf(ctx, estimateId))
    .filter((invoice) => invoice.status === "draft")
    .slice(0, limit);
  for (const draft of drafts) {
    await ctx.db.delete("invoices", draft._id);
  }
  return drafts.length;
}

/**
 * Deletes the next batch of a deleted firm's invoices, issued ones included,
 * and returns how many; 0 means none is left. Its last member was warned and
 * offered the archive before deleting their account (ADR 0050).
 */
export async function deleteFirmInvoices(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  limit: number,
): Promise<number> {
  // An invoice keeps its lines and payments in its own row, so a batch is
  // kept well under what a transaction may read.
  const invoices = await ctx.db
    .query("invoices")
    .withIndex("by_organizationId_and_updatedAt", (q) =>
      q.eq("organizationId", organizationId),
    )
    .take(Math.min(limit, 50));
  for (const invoice of invoices) {
    if (invoice.efactura.responseStorageId) {
      await ctx.storage.delete(invoice.efactura.responseStorageId);
    }
    await ctx.db.delete("invoices", invoice._id);
  }
  return invoices.length;
}
