import { describe, expect, test } from "bun:test";
import type { Id } from "../_generated/dataModel";
import { emptyRecap } from "../estimates/recap";
import {
  type AssistantOffer,
  cleanAnswer,
  conversationText,
  offerContext,
} from "./prompt";

// A made-up Ofertă, shaped like what the link shows.
const objectId = "s1" as Id<"sections">;
const bathroomId = "s2" as Id<"sections">;
const extrasId = "s3" as Id<"sections">;
const premiumId = "v1" as Id<"variants">;

function offer(overrides: Partial<AssistantOffer> = {}): AssistantOffer {
  return {
    code: "DVZ-0007-R2",
    title: "Renovare baie",
    firm: { name: "Ana Construct SRL", phone: "0722 000 111" },
    description: "Baia de la etaj, refăcută complet.",
    siteAddress: "Str. Lalelelor 4",
    county: "Cluj",
    priceDate: "2026-10-21",
    message: "Vă mulțumim pentru încredere.",
    expiresAt: Date.UTC(2026, 10, 20, 10),
    depositPercent: 30,
    assistant: true,
    client: { name: "Ion Popescu" },
    markups: { cam: 2.25, indirect: 10, profit: 10, vat: 21 },
    sections: [
      {
        _id: extrasId,
        kind: "chapter",
        parentId: undefined,
        code: "3",
        name: "Diverse",
        position: 2,
      },
      {
        _id: bathroomId,
        kind: "chapter",
        parentId: objectId,
        code: "2",
        name: "Baie",
        position: 1,
      },
      {
        _id: objectId,
        kind: "object",
        parentId: undefined,
        code: "1",
        name: "Clădirea A",
        position: 1,
      },
    ],
    items: [
      {
        _id: "l3" as Id<"lineItems">,
        sectionId: extrasId,
        position: 1,
        code: "—",
        title: "Curățenie finală",
        unit: "buc",
        quantity: 1,
        unitPrice: 300,
        total: 300,
        materials: [],
        changes: [],
        optional: true,
        included: false,
      },
      {
        _id: "l1" as Id<"lineItems">,
        sectionId: bathroomId,
        position: 1,
        code: "DV-FAI-01",
        title: "Placare pereți cu faianță",
        unit: "mp",
        quantity: 24.5,
        unitPrice: 85.5,
        total: 2094.75,
        materials: ["Adeziv flexibil C2TE", "Faianță rectificată"],
        changes: [{ from: "Faianță", to: "Faianță rectificată" }],
        optional: false,
        included: true,
      },
    ],
    baseLabel: "Standard",
    baseTotal: 2900,
    variants: [
      {
        _id: premiumId,
        name: "Premium",
        tier: "premium",
        description: "Faianță rectificată, mai mare.",
        total: 3400,
      },
    ],
    choice: {
      variantId: premiumId,
      excludedItemIds: ["l3" as Id<"lineItems">],
      totals: {
        ...emptyRecap,
        material: 1500,
        labor: 594.75,
        cam: 13.38,
        direct: 2108.13,
        indirect: 210.81,
        profit: 231.89,
        subtotal: 2550.83,
        vat: 535.67,
        total: 3086.5,
      },
    },
    ...overrides,
  };
}

describe("the assistant's prompt", () => {
  test("the Ofertă reads like its page, in Romanian", () => {
    const text = offerContext(offer());
    expect(text).toContain("Firma: Ana Construct SRL");
    expect(text).toContain("Contactul firmei: telefon 0722 000 111");
    expect(text).toContain("Oferta: DVZ-0007-R2, „Renovare baie”");
    expect(text).toContain("Locul lucrării: Str. Lalelelor 4, județul Cluj");
    expect(text).toContain("Prețuri din: 21 octombrie 2026");
    expect(text).toContain("Oferta e valabilă până pe: 20 noiembrie 2026");
    expect(text).toContain(
      "Avans la acceptare: 30% din totalul cu TVA, adică 925,95 lei",
    );
    expect(text).toContain(
      "- Premium: 3.400,00 lei. Faianță rectificată, mai mare.",
    );
    expect(text).toContain("Clientul are aleasă acum varianta Premium.");
    expect(text).toContain(
      "- DV-FAI-01 Placare pereți cu faianță: 24,5 mp × 85,50 lei = 2.094,75 lei; în varianta aleasă: Faianță rectificată, în loc de Faianță; materiale: Adeziv flexibil C2TE, Faianță rectificată.",
    );
    // A work typed by hand shows no code; one left out says so.
    expect(text).toContain(
      "- Curățenie finală: 1 buc × 300,00 lei = 300,00 lei; lucrare opțională, lăsată deoparte de client: nu intră în total.",
    );
    expect(text).toContain("TVA 21%: 535,67 lei");
    expect(text).toContain("Total cu TVA: 3.086,50 lei");
    // Empty totals are left out.
    expect(text).not.toContain("Utilaje");
  });

  test("the works follow the Deviz's order, objects before their chapters", () => {
    const text = offerContext(offer());
    const bathroom = text.indexOf("Obiect 1 Clădirea A › Capitol 2 Baie:");
    const extras = text.indexOf("Capitol 3 Diverse:");
    expect(bathroom).toBeGreaterThan(0);
    expect(extras).toBeGreaterThan(bathroom);
    expect(text.indexOf("Placare pereți")).toBeGreaterThan(bathroom);
    expect(text.indexOf("Curățenie finală")).toBeGreaterThan(extras);
  });

  test("a firm without VAT says so", () => {
    const base = offer();
    const text = offerContext(
      offer({
        variants: [],
        choice: {
          ...base.choice,
          variantId: undefined,
          totals: { ...base.choice.totals, vat: 0, total: 2550.83 },
        },
      }),
    );
    expect(text).toContain(
      "Total: 2.550,83 lei (firma nu e plătitoare de TVA, deci nu adaugă TVA)",
    );
    expect(text).not.toContain("Variantele");
  });

  test("the earlier questions come before the new one, with the firm's replies", () => {
    const text = conversationText(
      "Ana Construct SRL",
      [
        {
          question: "Ce adeziv folosiți?",
          answer: "Adeziv flexibil C2TE.",
        },
        { question: "Când începeți?", reply: "Pe 3 noiembrie." },
      ],
      "Și cât durează?",
    );
    expect(text).toBe(
      [
        "<discutia>",
        "Clientul: Ce adeziv folosiți?",
        "Asistentul: Adeziv flexibil C2TE.",
        "Clientul: Când începeți?",
        "Ana Construct SRL (firma): Pe 3 noiembrie.",
        "</discutia>",
        "",
        "Întrebarea nouă a clientului:",
        "<intrebare>",
        "Și cât durează?",
        "</intrebare>",
      ].join("\n"),
    );
  });

  test("an answer is trimmed for the page", () => {
    expect(cleanAnswer("  Da.\n\n\n\nAșa scrie în ofertă.  ")).toBe(
      "Da.\n\nAșa scrie în ofertă.",
    );
    expect(cleanAnswer("a".repeat(2500))).toHaveLength(2000);
  });
});
