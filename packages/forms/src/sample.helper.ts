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

const firm = {
  name: "Constructor Exemplu SRL",
  cui: "12345678",
  tradeRegister: "J12/345/2020",
  address: "Str. Fabricii 10, Cluj-Napoca",
  county: "Cluj",
  phone: "0712 345 678",
  email: "office@exemplu.ro",
};

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
    firm,
    client: { name: "Ana Popescu", address: "Str. Exemplu 1, Cluj-Napoca" },
  };
}

const schoolSections: SectionInput[] = [
  {
    _id: "school",
    kind: "object",
    code: "01",
    name: "Corp școală",
    position: 1,
  },
  {
    _id: "earthworks",
    kind: "chapter",
    parentId: "school",
    name: "Terasamente",
    position: 2,
  },
  {
    _id: "structure",
    kind: "chapter",
    parentId: "school",
    name: "Structură de rezistență",
    position: 3,
  },
  {
    _id: "architecture",
    kind: "chapter",
    parentId: "school",
    name: "Arhitectură",
    position: 4,
  },
  {
    _id: "electrical",
    kind: "chapter",
    parentId: "school",
    name: "Instalații electrice",
    position: 5,
  },
  {
    _id: "boiler",
    kind: "chapter",
    parentId: "school",
    name: "Utilaje și echipamente tehnologice",
    position: 6,
  },
  {
    _id: "furniture",
    kind: "chapter",
    parentId: "school",
    name: "Dotări",
    position: 7,
  },
  {
    _id: "site",
    kind: "object",
    code: "02",
    name: "Organizare de șantier",
    position: 8,
  },
  {
    _id: "huts",
    kind: "chapter",
    parentId: "site",
    name: "Construcții provizorii",
    position: 9,
  },
  {
    _id: "utilities",
    kind: "chapter",
    name: "Branșamente utilități",
    position: 10,
  },
];

/**
 * A made-up tender for a school: works in every part of an object's Deviz,
 * equipment and furnishings, site organisation and a utility connection.
 */
export function schoolData(): ExportData {
  counter = 0;
  const lineItems = [
    lineItem({
      sectionId: "earthworks",
      code: "TX01",
      title: "Săpătură manuală în pământ, cu aruncarea pământului",
      unit: "mc",
      quantity: 12,
      resources: [
        {
          kind: "labor",
          name: "Muncitor necalificat",
          unit: "ora",
          quantity: 2.5,
          unitPrice: 30,
        },
      ],
    }),
    lineItem({
      sectionId: "structure",
      code: "CX02",
      title: "Beton C25/30 turnat în fundații, cu pompa",
      unit: "mc",
      quantity: 4.2,
      resources: [
        {
          kind: "material",
          name: "Beton C25/30",
          unit: "mc",
          quantity: 1.02,
          unitPrice: 420,
        },
        {
          kind: "labor",
          name: "Betonist",
          unit: "ora",
          quantity: 1.8,
          unitPrice: 40,
        },
        {
          kind: "equipment",
          name: "Pompă de beton",
          unit: "ora",
          quantity: 0.1,
          unitPrice: 250,
        },
      ],
    }),
    lineItem({
      sectionId: "architecture",
      code: "AX03",
      title: "Tencuială interioară cu mortar de var-ciment",
      unit: "mp",
      quantity: 85,
      resources: [
        {
          kind: "material",
          name: "Mortar var-ciment",
          unit: "kg",
          quantity: 18,
          unitPrice: 0.9,
          store: "dedeman",
        },
        {
          kind: "labor",
          name: "Tencuitor",
          unit: "ora",
          quantity: 0.6,
          unitPrice: 42,
        },
      ],
    }),
    lineItem({
      sectionId: "electrical",
      code: "EX04",
      title: "Montare corp de iluminat LED aplicat",
      unit: "buc",
      quantity: 24,
      resources: [
        {
          kind: "material",
          name: "Corp de iluminat LED 36 W",
          unit: "buc",
          quantity: 1,
          unitPrice: 89,
          store: "dedeman",
        },
        {
          kind: "labor",
          name: "Electrician",
          unit: "ora",
          quantity: 0.5,
          unitPrice: 50,
        },
      ],
    }),
    lineItem({
      sectionId: "boiler",
      code: "",
      title: "Centrală termică în condensare 35 kW",
      unit: "buc",
      quantity: 1,
      resources: [
        {
          kind: "material",
          name: "Centrală termică în condensare 35 kW",
          unit: "buc",
          quantity: 1,
          unitPrice: 6890,
          store: "hornbach",
        },
        {
          kind: "transport",
          name: "Transport la șantier",
          unit: "buc",
          quantity: 1,
          unitPrice: 150,
        },
      ],
    }),
    lineItem({
      sectionId: "furniture",
      code: "",
      title: "Bancă școlară pentru doi elevi",
      unit: "buc",
      quantity: 15,
      resources: [
        {
          kind: "material",
          name: "Bancă școlară",
          unit: "buc",
          quantity: 1,
          unitPrice: 419.99,
          store: "leroy_merlin",
        },
      ],
    }),
    lineItem({
      sectionId: "huts",
      code: "",
      title: "Container de birou pentru șantier",
      unit: "buc",
      quantity: 1,
      resources: [
        {
          kind: "material",
          name: "Container de birou",
          unit: "buc",
          quantity: 1,
          unitPrice: 3200,
        },
        {
          kind: "transport",
          name: "Transport cu trailerul",
          unit: "buc",
          quantity: 1,
          unitPrice: 300,
        },
      ],
    }),
    lineItem({
      sectionId: "utilities",
      code: "BX05",
      title: "Branșament de apă din țeavă PEHD De 32 mm",
      unit: "m",
      quantity: 18,
      resources: [
        {
          kind: "material",
          name: "Țeavă PEHD De 32 mm",
          unit: "m",
          quantity: 1.02,
          unitPrice: 14.5,
        },
        {
          kind: "labor",
          name: "Instalator",
          unit: "ora",
          quantity: 0.4,
          unitPrice: 40,
        },
      ],
    }),
  ];
  return {
    estimate: {
      number: 7,
      revision: 1,
      title: "Reabilitarea școlii gimnaziale din Exemplu",
      kind: "tender",
      priceDate: "2026-10-20",
      markups: { cam: 2.25, indirect: 10, profit: 5, vat: 21 },
      tender: { authority: "Comuna Exemplu", procedure: "CN1234567" },
    },
    sections: schoolSections,
    lineItems,
    firm,
    client: null,
  };
}
