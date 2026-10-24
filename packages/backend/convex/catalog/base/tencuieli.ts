import type { BaseNorm } from "./norm";
import {
  equipment,
  gletIpsos,
  masinaTencuit,
  material,
  necalificat,
  pompaAirless,
  profileTencuiala,
  smallMaterials,
  sprit,
  tencuialaCimentVar,
  tencuialaIpsos,
  tencuitor,
  zugrav,
} from "./resources";

const category = "Tencuieli și gleturi";

const mortarTencuiala = material(
  "Mortar de tencuială pe bază de var și ciment, uscat",
  "kg",
  0.45,
);
const tinci = material("Tinci, mortar fin de var și ciment", "kg", 0.6);
const gletCiment = material("Glet de ciment pentru exterior", "kg", 2.2);
const gletPasta = material("Glet de finisaj gata preparat", "kg", 4);
const gletMecanizat = material("Glet pentru aplicare mecanizată", "kg", 2);
const tencuialaAsanare = material(
  "Tencuială de asanare pentru ziduri umede",
  "kg",
  1.4,
);
const tencuialaTermo = material("Tencuială termoizolantă cu perlit", "kg", 2.5);
const plasaTencuieli = material(
  "Plasă din fibră de sticlă pentru tencuieli, 145 g/mp",
  "mp",
  2.8,
);
const masaSpacluCiment = material(
  "Masă de șpaclu pe bază de ciment pentru armare",
  "kg",
  1.2,
);
const rabit = material("Plasă de rabiț zincată", "mp", 9);
const bandaFisuri = material("Bandă de armare pentru fisuri", "m", 2);
const punteAderenta = material(
  "Punte de aderență pentru beton, înainte de tencuire",
  "kg",
  14,
);
const tencuialaIpsosManuala = material(
  "Tencuială de ipsos pentru aplicare manuală",
  "kg",
  1.1,
);
const discuriSlefuit = material("Discuri abrazive pentru șlefuit", "buc", 2);
const slefuitor = equipment("Șlefuitor cu girafă și aspirator", "ora", 8);

export const tencuieli: BaseNorm[] = [
  {
    code: "DV-TEN-01",
    category,
    title:
      "Tencuială mecanizată pe bază de ipsos de 1,5 cm, pe pereți interiori",
    unit: "mp",
    includes:
      "Montarea profilelor de ghidaj și a colțarelor, aplicarea mecanizată a tencuielii, nivelarea și netezirea ei.",
    excludes:
      "Amorsa pe suprafețele din beton; gletul; schela pentru înălțimi de peste 3 m.",
    measurement:
      "Suprafața tencuită, fără goluri, la care se adaugă glafurile.",
    resources: [
      tencuialaIpsos(15),
      profileTencuiala(0.5),
      tencuitor(0.35),
      necalificat(0.15),
      masinaTencuit(0.05),
    ],
  },
  {
    code: "DV-TEN-02",
    category,
    title:
      "Tencuială mecanizată pe bază de ciment și var de 2 cm, pe pereți interiori",
    unit: "mp",
    includes:
      "Montarea profilelor de ghidaj și a colțarelor, aplicarea mecanizată a tencuielii, nivelarea și driscuirea ei.",
    excludes: "Gletul; schela pentru înălțimi de peste 3 m.",
    measurement:
      "Suprafața tencuită, fără goluri, la care se adaugă glafurile.",
    resources: [
      tencuialaCimentVar(27),
      profileTencuiala(0.5),
      tencuitor(0.4),
      necalificat(0.2),
      masinaTencuit(0.06),
    ],
  },
  {
    code: "DV-TEN-03",
    category,
    title:
      "Tencuială exterioară pe bază de ciment și var de 2,5 cm, cu amorsă de aderență",
    unit: "mp",
    includes:
      "Aplicarea amorsei de aderență, montarea profilelor, aplicarea mecanizată a tencuielii, nivelarea și driscuirea ei.",
    excludes: "Schela de fațadă; finisajul decorativ.",
    measurement:
      "Suprafața tencuită, fără goluri, la care se adaugă glafurile.",
    resources: [
      sprit(4),
      tencuialaCimentVar(34),
      profileTencuiala(0.5),
      tencuitor(0.55),
      necalificat(0.25),
      masinaTencuit(0.07),
    ],
  },
  {
    code: "DV-TEN-04",
    category,
    title: "Glet de ipsos pe pereți și tavane, în două straturi, șlefuit",
    unit: "mp",
    includes:
      "Aplicarea gletului în două straturi, șlefuirea și desprăfuirea suprafeței, gata de vopsit.",
    excludes: "Reparațiile tencuielii; grundul și vopseaua.",
    measurement: "Suprafața gletuită, fără goluri.",
    resources: [
      gletIpsos(1.5),
      smallMaterials(3),
      zugrav(0.38),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-TEN-05",
    category,
    title:
      "Tencuială manuală de 2 cm cu mortar de var și ciment, pe pereți interiori, driscuită",
    unit: "mp",
    includes:
      "Șprițul de aderență, profilele de ghidaj și colțarele, aplicarea manuală a mortarului în două straturi, nivelarea și driscuirea.",
    excludes: "Gletul; schela pentru înălțimi de peste 3 m.",
    measurement:
      "Suprafața tencuită, fără goluri, la care se adaugă glafurile.",
    resources: [
      sprit(4),
      mortarTencuiala(30),
      profileTencuiala(0.3),
      tencuitor(0.75),
      necalificat(0.35),
    ],
  },
  {
    code: "DV-TEN-06",
    category,
    title:
      "Tencuială manuală de 1,5 cm cu mortar de var și ciment, pe tavane, driscuită",
    unit: "mp",
    includes:
      "Șprițul de aderență, aplicarea manuală a mortarului, nivelarea și driscuirea.",
    excludes: "Gletul; schela pentru înălțimi de peste 3 m.",
    measurement: "Suprafața tencuită.",
    resources: [
      sprit(4),
      mortarTencuiala(24),
      tencuitor(0.95),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-TEN-07",
    category,
    title: "Tencuială mecanizată pe bază de ipsos de 1 cm, pe tavane",
    unit: "mp",
    includes:
      "Amorsarea betonului, aplicarea mecanizată a tencuielii, nivelarea și netezirea ei.",
    excludes: "Gletul; schela pentru înălțimi de peste 3 m.",
    measurement: "Suprafața tencuită.",
    resources: [
      punteAderenta(0.2),
      tencuialaIpsos(13),
      tencuitor(0.45),
      necalificat(0.2),
      masinaTencuit(0.05),
    ],
  },
  {
    code: "DV-TEN-08",
    category,
    title: "Tinci de 3 mm pe tencuieli existente, driscuit fin",
    unit: "mp",
    includes:
      "Umezirea suportului, aplicarea tinciului și driscuirea lui fină, gata de glet sau de zugrăveală.",
    excludes: "Reparațiile tencuielii de dedesubt.",
    measurement: "Suprafața acoperită, fără goluri.",
    resources: [tinci(4.5), tencuitor(0.2), necalificat(0.08)],
  },
  {
    code: "DV-TEN-09",
    category,
    title:
      "Glet de ciment pe pereți exteriori și socluri, armat cu plasă, gata de vopsit",
    unit: "mp",
    includes:
      "Aplicarea gletului în două straturi, cu plasa din fibră de sticlă înglobată în primul, și șlefuirea.",
    excludes: "Schela; grundul și vopseaua.",
    measurement: "Suprafața gletuită, fără goluri.",
    resources: [
      gletCiment(5),
      plasaTencuieli(1.1),
      zugrav(0.45),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-TEN-10",
    category,
    title:
      "Glet de finisaj gata preparat, un strat, pe glet existent sau gips-carton, șlefuit",
    unit: "mp",
    includes:
      "Aplicarea gletului de finisaj în strat subțire, șlefuirea fină și desprăfuirea, gata de vopsit.",
    excludes: "Gletul de bază; grundul și vopseaua.",
    measurement: "Suprafața gletuită, fără goluri.",
    resources: [gletPasta(0.8), zugrav(0.18), necalificat(0.03)],
  },
  {
    code: "DV-TEN-11",
    category,
    title: "Glet aplicat mecanizat cu pompa airless, în două straturi, șlefuit",
    unit: "mp",
    includes:
      "Protejarea suprafețelor din jur, pulverizarea gletului în două straturi, întinderea cu gletiera, șlefuirea și desprăfuirea.",
    excludes: "Reparațiile tencuielii; grundul și vopseaua.",
    measurement: "Suprafața gletuită, fără goluri.",
    resources: [
      gletMecanizat(1.6),
      smallMaterials(3),
      zugrav(0.22),
      necalificat(0.06),
      pompaAirless(0.03),
    ],
  },
  {
    code: "DV-TEN-12",
    category,
    title: "Punte de aderență pe suprafețe de beton, înainte de tencuire",
    unit: "mp",
    includes:
      "Curățarea și desprăfuirea betonului, aplicarea punții de aderență cu bidineaua sau rola.",
    measurement: "Suprafața amorsată.",
    resources: [punteAderenta(0.25), tencuitor(0.06), necalificat(0.03)],
  },
  {
    code: "DV-TEN-13",
    category,
    title:
      "Armarea tencuielilor cu plasă din fibră de sticlă în masă de șpaclu de ciment",
    unit: "mp",
    includes:
      "Aplicarea masei de șpaclu, înglobarea plasei cu suprapuneri de 10 cm și netezirea stratului.",
    measurement: "Suprafața armată.",
    resources: [
      masaSpacluCiment(4),
      plasaTencuieli(1.1),
      tencuitor(0.25),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-TEN-14",
    category,
    title:
      "Plasă de rabiț pe suprafețe din lemn și pe îmbinările dintre materiale, înainte de tencuire",
    unit: "mp",
    includes:
      "Întinderea și fixarea plasei cu scoabe sau cuie, cu suprapuneri de 10 cm.",
    measurement: "Suprafața acoperită cu plasă.",
    resources: [rabit(1.1), smallMaterials(10), tencuitor(0.2)],
  },
  {
    code: "DV-TEN-15",
    category,
    title:
      "Tencuială de asanare de 2,5 cm pe ziduri umede, în două straturi, cu șpriț",
    unit: "mp",
    includes:
      "Șprițul în rețea, aplicarea tencuielii de asanare în două straturi și driscuirea ei aspră, gata de finisaj.",
    excludes: "Desfacerea tencuielii vechi; finisajul permeabil la vapori.",
    measurement: "Suprafața tencuită, fără goluri.",
    resources: [sprit(5), tencuialaAsanare(30), tencuitor(1), necalificat(0.4)],
  },
  {
    code: "DV-TEN-16",
    category,
    title:
      "Tencuială termoizolantă cu perlit de 4 cm pe pereți exteriori, armată cu plasă",
    unit: "mp",
    includes:
      "Șprițul de aderență, profilele, aplicarea mecanizată a tencuielii termoizolante în două straturi, masa de șpaclu cu plasa înglobată.",
    excludes: "Schela de fațadă; finisajul decorativ.",
    measurement:
      "Suprafața tencuită, fără goluri, la care se adaugă glafurile.",
    resources: [
      sprit(4),
      tencuialaTermo(16),
      profileTencuiala(0.3),
      masaSpacluCiment(4),
      plasaTencuieli(1.1),
      tencuitor(1.1),
      necalificat(0.4),
      masinaTencuit(0.08),
    ],
  },
  {
    code: "DV-TEN-17",
    category,
    title:
      "Reparații locale de tencuială, în petice de până la 0,5 mp, cu mortar de var și ciment",
    unit: "mp",
    includes:
      "Desfacerea tencuielii desprinse din jur, curățarea și umezirea suportului, șprițul, tencuiala în două straturi și racordarea la tencuiala existentă.",
    measurement: "Suprafața peticelor reparate, însumată.",
    resources: [
      sprit(4),
      mortarTencuiala(30),
      tencuitor(1.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-TEN-18",
    category,
    title:
      "Repararea fisurilor din glet și tencuială, cu bandă de armare și glet",
    unit: "m",
    includes:
      "Deschiderea fisurii în V, curățarea, umplerea cu glet, banda de armare înglobată și gletul de acoperire, șlefuit.",
    measurement: "Lungimea fisurilor reparate.",
    resources: [bandaFisuri(1.1), gletIpsos(0.3), zugrav(0.12)],
  },
  {
    code: "DV-TEN-19",
    category,
    title:
      "Șlefuirea mecanică a gleturilor cu aspirare, pentru finisaje de calitate",
    unit: "mp",
    includes:
      "Șlefuirea cu girafa cu aspirator, verificarea la lumină razantă și retușurile, desprăfuirea.",
    measurement: "Suprafața șlefuită, fără goluri.",
    resources: [discuriSlefuit(0.15), zugrav(0.08), slefuitor(0.08)],
  },
  {
    code: "DV-TEN-20",
    category,
    title:
      "Tencuială de ipsos aplicată manual, 1 cm, pentru suprafețe mici și reparații",
    unit: "mp",
    includes:
      "Amorsarea, aplicarea manuală a tencuielii de ipsos, nivelarea și netezirea ei.",
    excludes: "Gletul.",
    measurement: "Suprafața tencuită, fără goluri.",
    resources: [
      punteAderenta(0.2),
      tencuialaIpsosManuala(10),
      tencuitor(0.55),
      necalificat(0.15),
    ],
  },
];
