import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { roundLei } from "../estimates/recap";
import { devizFor } from "../offers/test.helper";
import type { TestConvex } from "../test.helper";

// A Deviz whose Ofertă the client accepted, for a firm with everything an
// invoice needs. Made-up, like every test fixture.

/** Ana's firm, filled in as an invoice wants it, with Ion's accepted Ofertă. */
export async function billedDeviz(
  t: TestConvex,
  fields: { client?: { kind: "company"; name: string; cui: string } } = {},
) {
  const deviz = await devizFor(t);
  const { firm, estimateId } = deviz;
  const organizationId = firm.organizationId;
  await firm.as.mutation(api.accounts.organizations.update, {
    organizationId,
    cui: "RO2816464",
    tradeRegister: "J12/1234/2020",
    address: "Str. Fabricii 10, Cluj-Napoca",
    county: "Cluj",
    email: "office@anaconstruct.ro",
    vatPayer: true,
  });
  await firm.as.mutation(api.invoices.settings.save, {
    organizationId,
    iban: "RO49AAAA1B31007593840000",
    bank: "Banca Exemplu",
    shareCapital: 200,
    paymentTermDays: 30,
    vatOnCollection: true,
    footer: "Mulțumim!",
  });
  let clientId: Id<"clients"> | undefined;
  if (fields.client) {
    clientId = await firm.as.mutation(api.accounts.clients.create, {
      organizationId,
      ...fields.client,
    });
    await firm.as.mutation(api.estimates.estimates.update, {
      estimateId,
      clientId,
    });
  }
  const { token } = await firm.as.mutation(api.offers.offers.create, {
    estimateId,
    depositPercent: 30,
  });
  await t.mutation(api.offers.public.accept, {
    token,
    name: fields.client?.name ?? "Ion Popescu",
  });
  const billing = await firm.as.query(api.invoices.invoices.forEstimate, {
    estimateId,
  });
  const acceptedNet = billing.accepted?.net ?? 0;
  return {
    ...deviz,
    organizationId,
    clientId,
    acceptedNet,
    advanceNet: roundLei(acceptedNet * 0.3),
  };
}

/** Ion's address and CNP, which his card lacks and the XML wants. */
export const ionAtHome = {
  address: "Bd. Unirii 5",
  city: "Sector 3",
  county: "bucuresti",
  cui: "1900101123456",
};

/** The advance invoice of the accepted Ofertă, issued as DVZ-0001. */
export async function issuedAdvance(t: TestConvex) {
  const deviz = await billedDeviz(t);
  const { firm, estimateId } = deviz;
  const advanceId = await firm.as.mutation(
    api.invoices.invoices.createAdvance,
    {
      estimateId,
    },
  );
  await firm.as.mutation(api.invoices.invoices.update, {
    invoiceId: advanceId,
    buyer: ionAtHome,
  });
  await firm.as.mutation(api.invoices.invoices.issue, { invoiceId: advanceId });
  return { ...deviz, advanceId };
}
