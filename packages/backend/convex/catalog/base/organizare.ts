import type { BaseNorm } from "./norm";
import {
  autoutilitara,
  bandaHartie,
  betonC8,
  cartonProtectie,
  cherestea,
  cuie,
  dulgher,
  electrician,
  equipment,
  foliePolietilena,
  generator,
  instalator,
  labor,
  material,
  necalificat,
  robinetSferic,
  smallMaterials,
  surubAutofiletant,
  tablaZincata,
  topometrist,
  transportAgabaritic,
} from "./resources";

const category = "Organizare de șantier și diverse";

// Împrejmuiri, containere, branșamente provizorii, protecții, transporturi
// manuale, curățenie, trasare, pază și echipament de protecție.

const panouMobil = equipment(
  "Panou mobil de împrejmuire din plasă zincată cu picior, chirie pe o lună",
  "m",
  9,
);
const containerSantier = equipment(
  "Container de șantier de 6 m, chirie pe o lună",
  "buc",
  900,
);
const toaleta = equipment(
  "Toaletă ecologică, chirie pe o lună cu vidanjare săptămânală",
  "buc",
  450,
);
const tablouSantier = material(
  "Tablou de șantier IP65 cu prize și protecții",
  "buc",
  1500,
);
const cabluSantier = material("Cablu flexibil H07RN-F 5 × 6 mm²", "m", 32);
const tevaPehd32 = material("Țeavă PEHD Ø32 PN10 pentru branșament", "m", 6);
const fitingCompresiune = material(
  "Fiting de compresiune pentru PEHD Ø32",
  "buc",
  25,
);
const apometru = material("Apometru DN20 cu racorduri", "buc", 180);
const consumabile = material("Consumabile de curățenie", "set", 45);
const panouIdentificare = material(
  "Panou de identificare a investiției, 1,5 × 1 m, imprimat",
  "buc",
  450,
);
const tarusi = material("Țăruși din lemn și vopsea de marcaj", "set", 60);
const agentPaza = labor("Agent de pază", 25);
const echipamentProtectie = material(
  "Echipament individual de protecție pentru un lucrător (cască, vestă, bocanci, mănuși, ochelari)",
  "set",
  350,
);

export const organizare: BaseNorm[] = [
  {
    code: "DV-ORG-01",
    category,
    title:
      "Împrejmuire provizorie de șantier cu panouri mobile din plasă zincată, cu montare, chirie o lună și demontare",
    unit: "m",
    includes:
      "Aducerea panourilor, așezarea picioarelor, legarea panourilor cu cleme, chiria pe o lună și demontarea.",
    measurement: "Lungimea împrejmuirii, pentru fiecare lună.",
    resources: [panouMobil(1), necalificat(0.15)],
  },
  {
    code: "DV-ORG-02",
    category,
    title: "Împrejmuire provizorie din tablă pe stâlpi de lemn, 2 m înălțime",
    unit: "m",
    includes:
      "Baterea stâlpilor, montarea riglelor și a tablei cu șuruburi, poarta cuprinsă proporțional, demontarea la final.",
    measurement: "Lungimea împrejmuirii.",
    resources: [
      tablaZincata(2.1),
      cherestea(0.012),
      cuie(0.1),
      surubAutofiletant(10),
      dulgher(0.4),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-ORG-03",
    category,
    title:
      "Container de șantier de 6 m pentru birou sau vestiar, chirie pe o lună",
    unit: "buc",
    includes:
      "Chiria containerului echipat cu instalație electrică pentru o lună.",
    excludes: "Aducerea și ridicarea (DV-ORG-04).",
    measurement: "Numărul de containere, pentru fiecare lună.",
    resources: [containerSantier(1)],
  },
  {
    code: "DV-ORG-04",
    category,
    title:
      "Aducerea și ridicarea unui container de șantier, cu camion cu macara",
    unit: "buc",
    includes:
      "Transportul dus și întors, descărcarea pe suporți nivelați și încărcarea la final.",
    measurement: "Numărul de containere.",
    resources: [transportAgabaritic(4), necalificat(1)],
  },
  {
    code: "DV-ORG-05",
    category,
    title: "Toaletă ecologică, chirie pe o lună cu vidanjare săptămânală",
    unit: "buc",
    includes: "Aducerea, chiria, vidanjarea săptămânală și ridicarea.",
    measurement: "Numărul de toalete, pentru fiecare lună.",
    resources: [toaleta(1)],
  },
  {
    code: "DV-ORG-06",
    category,
    title:
      "Racord electric provizoriu de șantier: tablou de șantier cu prize și protecții și 25 m de cablu",
    unit: "set",
    includes:
      "Montarea tabloului de șantier pe suport, cablul de alimentare de până la 25 m de la punctul de racord, legarea la pământ, verificarea.",
    excludes: "Contractul cu distribuitorul și blocul de măsură.",
    measurement: "Numărul de racorduri.",
    resources: [
      tablouSantier(1),
      cabluSantier(25),
      smallMaterials(2),
      electrician(6),
      necalificat(2),
    ],
  },
  {
    code: "DV-ORG-07",
    category,
    title:
      "Racord provizoriu de apă de șantier, cu 20 m de țeavă, apometru și cișmea",
    unit: "set",
    includes:
      "Țeava PEHD de până la 20 m pozată la suprafață sau în șanț mic, fitingurile, apometrul, robineții și cișmeaua.",
    excludes: "Contractul cu furnizorul de apă.",
    measurement: "Numărul de racorduri.",
    resources: [
      tevaPehd32(20),
      fitingCompresiune(4),
      apometru(1),
      robinetSferic(2),
      smallMaterials(2),
      instalator(5),
      necalificat(3),
    ],
  },
  {
    code: "DV-ORG-08",
    category,
    title: "Protejarea pardoselilor cu carton ondulat și bandă",
    unit: "mp",
    includes:
      "Așezarea cartonului, lipirea rosturilor cu bandă, scoaterea la final.",
    measurement: "Suprafața protejată.",
    resources: [cartonProtectie(1.05), bandaHartie(0.6), necalificat(0.05)],
  },
  {
    code: "DV-ORG-09",
    category,
    title:
      "Protejarea tâmplăriei, a mobilierului și a obiectelor cu folie și bandă",
    unit: "mp",
    includes:
      "Acoperirea cu folie, fixarea cu bandă de hârtie, scoaterea la final.",
    measurement: "Suprafața protejată.",
    resources: [foliePolietilena(1.1), bandaHartie(1.2), necalificat(0.05)],
  },
  {
    code: "DV-ORG-10",
    category,
    title:
      "Transportul manual al materialelor pe verticală, pe scări, pentru un etaj",
    unit: "t",
    includes:
      "Încărcarea, urcarea sau coborârea pe scări cu un etaj și descărcarea.",
    measurement: "Masa transportată, înmulțită cu numărul de etaje.",
    resources: [necalificat(2.5)],
  },
  {
    code: "DV-ORG-11",
    category,
    title: "Transportul manual al materialelor pe orizontală, până la 50 m",
    unit: "t",
    includes:
      "Încărcarea în roabă sau pe cărucior, transportul și descărcarea.",
    measurement: "Masa transportată.",
    resources: [necalificat(1.2)],
  },
  {
    code: "DV-ORG-12",
    category,
    title:
      "Încărcarea și descărcarea manuală a materialelor din mijlocul de transport",
    unit: "t",
    includes: "Încărcarea sau descărcarea și stivuirea la locul de depozitare.",
    measurement: "Masa manipulată.",
    resources: [necalificat(0.8)],
  },
  {
    code: "DV-ORG-13",
    category,
    title: "Transportul materialelor cu autoutilitara de 3,5 t",
    unit: "km",
    includes: "Cursa cu autoutilitara, cu șofer și combustibil.",
    excludes: "Încărcarea și descărcarea (DV-ORG-12).",
    measurement: "Distanța parcursă, dus și întors.",
    resources: [autoutilitara(1)],
  },
  {
    code: "DV-ORG-14",
    category,
    title:
      "Curățenie finală după lucrări, cu aspirare, spălare și ștergerea geamurilor",
    unit: "mp",
    includes:
      "Strângerea resturilor, aspirarea, spălarea pardoselilor, ștergerea tâmplăriei, a geamurilor și a obiectelor sanitare.",
    excludes: "Evacuarea molozului (categoria Demolări).",
    measurement: "Suprafața utilă curățată.",
    resources: [consumabile(0.01), necalificat(0.12)],
  },
  {
    code: "DV-ORG-15",
    category,
    title:
      "Panou de identificare a investiției, pe stâlpi din lemn în fundații de beton",
    unit: "buc",
    includes:
      "Săpătura gropilor, stâlpii, betonarea, montarea panoului imprimat, demontarea la final.",
    measurement: "Numărul de panouri.",
    resources: [
      panouIdentificare(1),
      cherestea(0.03),
      betonC8(0.1),
      smallMaterials(2),
      dulgher(1),
      necalificat(3),
    ],
  },
  {
    code: "DV-ORG-16",
    category,
    title: "Trasarea construcției și a axelor, cu repere, de către topometrist",
    unit: "buc",
    includes:
      "Preluarea reperelor, trasarea axelor și a conturului cu țăruși și repere, procesul-verbal de trasare.",
    measurement: "Numărul de obiecte trasate.",
    resources: [tarusi(1), topometrist(6), necalificat(2)],
  },
  {
    code: "DV-ORG-17",
    category,
    title: "Pază de șantier, pe oră de agent",
    unit: "ora",
    includes: "Paza șantierului de către un agent, cu registru de intrare.",
    measurement: "Numărul de ore de pază.",
    resources: [agentPaza(1)],
  },
  {
    code: "DV-ORG-18",
    category,
    title: "Generator electric de 5 kVA, pe oră, cu combustibil",
    unit: "ora",
    includes: "Funcționarea generatorului cu combustibil și întreținere.",
    measurement: "Numărul de ore de funcționare.",
    resources: [generator(1)],
  },
  {
    code: "DV-ORG-19",
    category,
    title: "Echipament individual de protecție pentru un lucrător",
    unit: "set",
    includes:
      "Cască, vestă reflectorizantă, bocanci cu bombeu, mănuși și ochelari de protecție, pentru un lucrător pe durata lucrării.",
    measurement: "Numărul de lucrători echipați.",
    resources: [echipamentProtectie(1)],
  },
];
