import type { ReceptionData, StatementData } from "./input";

// A made-up Deviz under execution for tests: an apartment's demolition and
// tiling and a terrace's waterproofing, in its second Situație de lucrări.
// Norms, names and prices are invented.

const firm = {
  name: "Constructor Exemplu SRL",
  cui: "12345678",
  address: "Str. Fabricii 10, Cluj-Napoca",
  phone: "0712 345 678",
  email: "office@exemplu.ro",
};

const client = {
  name: "Ana Popescu",
  address: "Str. Exemplu 1, Cluj-Napoca",
};

const estimate = {
  number: 142,
  revision: 2,
  title: "Renovare apartament",
  siteAddress: "Str. Exemplu 1, ap. 4",
  county: "Cluj",
};

const markups = { cam: 2.25, indirect: 10, profit: 5, vat: 21 };

export function sampleStatement(): StatementData {
  return {
    estimate,
    firm,
    client,
    guarantee: { percent: 5, method: "retention" },
    statement: {
      number: 2,
      status: "approved",
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      date: "2026-12-01",
      notes: "Gresia din baie se montează după livrarea obiectelor sanitare.",
      markups,
      retention: 78.25,
      approvedBy: "Ana Popescu",
      approvedAt: Date.UTC(2026, 11, 3, 10, 0, 0),
    },
    rows: [
      {
        position: 1,
        group: "1 Apartament · 01 Demolări",
        code: "DX01",
        title: "Desfacerea pardoselii din parchet, cu evacuarea molozului",
        unit: "mp",
        unitCost: { material: 0, labor: 10.5, equipment: 6.5, transport: 0 },
        laborHours: 0.35,
        contractQuantity: 42.5,
        previousQuantity: 0,
        quantity: 42.5,
        attachment: [
          { label: "Living", count: 1, length: 5, width: 4.5, deduct: false },
          { label: "Hol", count: 1, length: 4, width: 5, deduct: false },
        ],
      },
      {
        position: 2,
        group: "1 Apartament · 02 Finisaje",
        code: "FX10",
        title: "Placare cu gresie porțelanată 60x60 cm",
        unit: "mp",
        unitCost: { material: 80, labor: 25, equipment: 0, transport: 2 },
        laborHours: 1.2,
        contractQuantity: 18.25,
        previousQuantity: 10,
        quantity: 5,
        attachment: [
          {
            label: "Bucătărie",
            count: 1,
            length: 3,
            width: 2.2,
            deduct: false,
          },
          { label: "Gol ușă", count: 1, length: 1, width: 1, deduct: true },
        ],
      },
      {
        position: 3,
        group: "2 Terasă · 03 Hidroizolații",
        code: "HX02",
        title: "Hidroizolație cu membrană bituminoasă, două straturi",
        unit: "mp",
        unitCost: { material: 30, labor: 12, equipment: 0, transport: 0 },
        laborHours: 0.6,
        contractQuantity: 20,
        previousQuantity: 20,
        quantity: 2,
        attachment: [],
      },
    ],
  };
}

export function sampleReception(
  kind: ReceptionData["reception"]["kind"] = "completion",
): ReceptionData {
  return {
    estimate,
    firm,
    client,
    value: 3873.5,
    vatRate: 21,
    completion:
      kind === "final" ? { number: "12", date: "2026-12-15" } : undefined,
    reception: {
      kind,
      number: kind === "final" ? "7" : "12",
      date: kind === "final" ? "2028-12-20" : "2026-12-15",
      place: "Cluj-Napoca",
      contract: { number: "45", date: "2026-10-01" },
      permit: {
        number: "120",
        date: "2026-09-10",
        issuer: "Primăria Cluj-Napoca",
        validUntil: "2027-09-10",
      },
      executionStart: "2026-10-05",
      executionEnd: "2026-11-30",
      committeeStart: "2026-12-14",
      committeeEnd: "2026-12-15",
      warrantyMonths: 24,
      people: [
        { name: "Ana Popescu", role: "president", organization: "beneficiar" },
        { name: "Ion Ionescu", role: "member", organization: "proiectant" },
        { name: "Maria Pop", role: "secretary" },
        { name: "Vasile Georgescu", role: "executant" },
        { name: "Dan Mureșan", role: "supervisor", organization: "DS 1234" },
      ],
      findings:
        "Lucrările sunt executate conform proiectului; la terasă lipsește o gură de scurgere.",
      objections: [
        {
          text: "Montarea gurii de scurgere la terasă",
          deadline: "2027-01-15",
        },
      ],
      decision: "admitted",
      measures: "Remedierea obiecțiunilor în termenul stabilit.",
      copies: 3,
    },
  };
}
