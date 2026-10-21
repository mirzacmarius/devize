import { unitCost } from "@devize/backend/convex/estimates/recap";
import type {
  ExportData,
  LineItemInput,
  ResourceInput,
  SectionInput,
} from "./input";

// A made-up Deviz for tests: an apartment and its terrace, with materials
// from several stores, percentages and a line outside every object. Norms,
// names and prices are invented.

type Resource = Omit<ResourceInput, "key">;

let counter = 0;

export function lineItem(
  fields: Pick<LineItemInput, "code" | "title" | "unit" | "quantity"> &
    Partial<Pick<LineItemInput, "sectionId" | "tenderRef">> & {
      resources: Resource[];
    },
): LineItemInput {
  counter += 1;
  const resources = fields.resources.map((resource, index) => ({
    ...resource,
    key: `r${index + 1}`,
  }));
  return {
    _id: `item${counter}`,
    position: counter,
    ...fields,
    resources,
    ...unitCost(resources),
  };
}

const sections: SectionInput[] = [
  {
    _id: "apartment",
    kind: "object",
    code: "1",
    name: "Apartament",
    position: 1,
  },
  {
    _id: "demolition",
    kind: "chapter",
    parentId: "apartment",
    code: "01",
    name: "Demolări",
    position: 2,
  },
  {
    _id: "finishes",
    kind: "chapter",
    parentId: "apartment",
    code: "02",
    name: "Finisaje",
    position: 3,
  },
  { _id: "terrace", kind: "object", code: "2", name: "Terasă", position: 4 },
  {
    _id: "waterproofing",
    kind: "chapter",
    parentId: "terrace",
    code: "03",
    name: "Hidroizolații",
    position: 5,
  },
];

export function sampleData(): ExportData {
  counter = 0;
  const lineItems = [
    lineItem({
      sectionId: "demolition",
      code: "DX01",
      title: "Desfacerea pardoselii din parchet, cu evacuarea molozului",
      unit: "mp",
      quantity: 42.5,
      resources: [
        {
          kind: "labor",
          name: "Muncitor necalificat",
          unit: "ora",
          quantity: 0.35,
          unitPrice: 30,
        },
        {
          kind: "equipment",
          name: "Container moloz 7 mc",
          unit: "buc",
          quantity: 0.01,
          unitPrice: 650,
        },
      ],
    }),
    lineItem({
      sectionId: "finishes",
      code: "FX10",
      title:
        "Placare cu gresie porțelanată 60x60 cm, lipită cu adeziv flexibil",
      unit: "mp",
      quantity: 18.25,
      resources: [
        {
          kind: "material",
          productId: "tiles",
          name: "Gresie porțelanată 60x60",
          unit: "mp",
          quantity: 1.05,
          unitPrice: 64.9,
          store: "dedeman",
        },
        {
          kind: "material",
          productId: "adhesive",
          name: "Adeziv flexibil C2TE",
          unit: "kg",
          quantity: 4.5,
          unitPrice: 2.15,
          store: "leroy_merlin",
        },
        {
          kind: "material",
          productId: "grout",
          name: "Chit de rosturi",
          unit: "kg",
          quantity: 0.4,
          unitPrice: 6.8,
          store: "dedeman",
        },
        {
          kind: "material",
          name: "Material mărunt",
          unit: "%",
          quantity: 2,
          unitPrice: 0,
        },
        {
          kind: "labor",
          name: "Faianțar",
          unit: "ora",
          quantity: 0.9,
          unitPrice: 45,
        },
        {
          kind: "transport",
          name: "Transport materiale",
          unit: "%",
          quantity: 2,
          unitPrice: 0,
        },
      ],
    }),
    lineItem({
      sectionId: "finishes",
      code: "FX20",
      title: "Zugrăveli lavabile interioare în două straturi, pe glet existent",
      unit: "mp",
      quantity: 120,
      resources: [
        {
          kind: "material",
          productId: "paint",
          name: "Vopsea lavabilă albă",
          unit: "l",
          quantity: 0.3,
          unitPrice: 18.5,
          store: "hornbach",
        },
        {
          kind: "material",
          productId: "primer",
          name: "Amorsă",
          unit: "l",
          quantity: 0.12,
          unitPrice: 14.2,
          store: "brico_depot",
        },
        {
          kind: "labor",
          name: "Zugrav",
          unit: "ora",
          quantity: 0.18,
          unitPrice: 40,
        },
      ],
    }),
    lineItem({
      sectionId: "waterproofing",
      code: "HX05",
      title: "Hidroizolație cu membrană bituminoasă lipită cu flacără",
      unit: "mp",
      quantity: 24,
      resources: [
        {
          kind: "material",
          productId: "membrane",
          name: "Membrană bituminoasă",
          unit: "mp",
          quantity: 1.15,
          unitPrice: 22.4,
          store: "dedeman",
        },
        {
          kind: "material",
          productId: "bitumen-primer",
          name: "Amorsă bituminoasă",
          unit: "kg",
          quantity: 0.3,
          unitPrice: 9.9,
        },
        {
          kind: "labor",
          name: "Izolator",
          unit: "ora",
          quantity: 0.25,
          unitPrice: 42,
        },
        {
          kind: "equipment",
          name: "Arzător cu gaz",
          unit: "ora",
          quantity: 0.1,
          unitPrice: 8,
        },
      ],
    }),
    lineItem({
      code: "",
      title: "Curățenie finală",
      unit: "mp",
      quantity: 60,
      resources: [
        {
          kind: "labor",
          name: "Muncitor necalificat",
          unit: "ora",
          quantity: 0.05,
          unitPrice: 30,
        },
      ],
    }),
  ];
  return {
    estimate: {
      number: 142,
      revision: 1,
      title: "Renovare apartament",
      kind: "private",
      priceDate: "2026-10-20",
      markups: { cam: 2.25, indirect: 10, profit: 5, vat: 21 },
      siteAddress: "Str. Exemplu 1, Cluj-Napoca",
      county: "Cluj",
    },
    sections,
    lineItems,
    firm: {
      name: "Constructor Exemplu SRL",
      cui: "12345678",
      tradeRegister: "J12/345/2020",
      address: "Str. Fabricii 10, Cluj-Napoca",
      county: "Cluj",
      phone: "0712 345 678",
      email: "office@exemplu.ro",
    },
    client: { name: "Ana Popescu", address: "Str. Exemplu 1, Cluj-Napoca" },
  };
}
