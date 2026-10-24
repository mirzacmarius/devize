import type { BaseNorm } from "./norm";
import {
  adezivC2TE,
  adezivC2TES1,
  adezivGips,
  cherestea,
  chit,
  chitEpoxidic,
  cuie,
  dulgher,
  faianta,
  faiantar,
  gletIpsos,
  gresie,
  lacatus,
  masinaTaiatPlaci,
  material,
  montatorGips,
  necalificat,
  pietrar,
  profilFaianta,
  silicon,
  siliconSanitar,
  smallMaterials,
} from "./resources";

const category = "Placaje";

const faiantaMare = material("Faianță format mare, de la 30 × 60 cm", "mp", 75);
const mozaic = material("Mozaic din sticlă pe plasă", "mp", 160);
const adezivAlb = material(
  "Adeziv alb flexibil pentru mozaic și piatră",
  "kg",
  2.6,
);
const piatraPerete = material(
  "Plăci din piatră naturală pentru pereți",
  "mp",
  240,
);
const impregnant = material("Impregnant pentru piatră naturală", "l", 60);
const piatraDecorativa = material(
  "Piatră decorativă din beton pentru placaje",
  "mp",
  95,
);
const placuteCaramida = material("Plăcuțe de cărămidă aparentă", "mp", 110);
const mortarRostuire = material(
  "Mortar de rostuire pentru zidărie aparentă",
  "kg",
  2,
);
const profilTreapta = material(
  "Profil de treaptă din aluminiu antiderapant",
  "m",
  32,
);
const trepteGranit = material(
  "Trepte din granit de 3 cm, cu contratreaptă",
  "m",
  380,
);
const glafPiatra = material(
  "Glaf interior din marmură sau granit, 3 cm",
  "m",
  180,
);
const panouHpl = material(
  "Panou HPL compact pentru fațade ventilate, 8 mm",
  "mp",
  280,
);
const placaFibrociment = material(
  "Plăci din fibrociment pentru fațade, 8 mm",
  "mp",
  165,
);
const structuraFatada = material(
  "Structură din aluminiu pentru fațade ventilate",
  "mp",
  110,
);
const nituriInox = material(
  "Nituri și șuruburi inox pentru fațade",
  "buc",
  1.2,
);
const lambriuTermotratat = material(
  "Lambriu din lemn termotratat pentru fațade",
  "mp",
  150,
);
const surubInoxFatada = material(
  "Șurub inox pentru fațade din lemn",
  "buc",
  0.5,
);
const lambriuInterior = material(
  "Lambriu din lemn pentru pereți interiori",
  "mp",
  55,
);
const panouri3d = material("Panouri decorative 3D din gips", "mp", 95);

export const placaje: BaseNorm[] = [
  {
    code: "DV-PLC-01",
    category,
    title: "Placaj din faianță pe pereți, lipită cu adeziv flexibil",
    unit: "mp",
    includes:
      "Trasarea, lipirea plăcilor, profilele de colț, tăieturile și decupajele pentru instalații, rostuirea și curățarea.",
    excludes: "Hidroizolația; siliconul la colțuri și la obiectele sanitare.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      faianta(1.07),
      adezivC2TE(4.5),
      chit(0.4),
      profilFaianta(0.3),
      smallMaterials(2),
      faiantar(1),
      necalificat(0.25),
      masinaTaiatPlaci(0.06),
    ],
  },
  {
    code: "DV-PLC-02",
    category,
    title:
      "Etanșarea cu silicon sanitar a colțurilor și a racordurilor la obiectele sanitare",
    unit: "m",
    includes: "Curățarea rostului, aplicarea și netezirea siliconului.",
    measurement: "Lungimea rosturilor etanșate.",
    resources: [siliconSanitar(0.12), faiantar(0.06)],
  },
  {
    code: "DV-PLC-03",
    category,
    title:
      "Placaj din faianță de format mare, de la 30 × 60 cm, cu adeziv deformabil și sistem de nivelare",
    unit: "mp",
    includes:
      "Trasarea, lipirea plăcilor cu sistem de nivelare, profilele de colț, tăieturile și decupajele pentru instalații, rostuirea și curățarea.",
    excludes: "Hidroizolația; siliconul la colțuri și la obiectele sanitare.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      faiantaMare(1.08),
      adezivC2TES1(5),
      chit(0.3),
      profilFaianta(0.3),
      smallMaterials(2),
      faiantar(1.2),
      necalificat(0.3),
      masinaTaiatPlaci(0.08),
    ],
  },
  {
    code: "DV-PLC-04",
    category,
    title:
      "Placaj din gresie porțelanată pe pereți, cu adeziv deformabil și sistem de nivelare",
    unit: "mp",
    includes:
      "Trasarea, lipirea plăcilor cu adeziv deformabil și sistem de nivelare, profilele de colț, tăieturile și decupajele, rostuirea și curățarea.",
    excludes: "Hidroizolația; siliconul la colțuri și la obiectele sanitare.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      gresie(1.08),
      adezivC2TES1(5.5),
      chit(0.3),
      profilFaianta(0.3),
      smallMaterials(2),
      faiantar(1.25),
      necalificat(0.3),
      masinaTaiatPlaci(0.08),
    ],
  },
  {
    code: "DV-PLC-05",
    category,
    title:
      "Placaj din mozaic de sticlă pe plasă, cu adeziv alb și chit epoxidic",
    unit: "mp",
    includes:
      "Trasarea, lipirea foilor de mozaic cu adeziv alb, presarea, tăieturile, rostuirea cu chit epoxidic și curățarea.",
    excludes: "Hidroizolația; egalizarea suportului.",
    measurement: "Suprafața placată.",
    resources: [
      mozaic(1.05),
      adezivAlb(4),
      chitEpoxidic(1.2),
      faiantar(2),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-PLC-06",
    category,
    title: "Rostuirea placajelor cu chit epoxidic, în locul chitului de ciment",
    unit: "mp",
    includes:
      "Curățarea rosturilor, aplicarea chitului epoxidic, emulsionarea și spălarea resturilor.",
    measurement: "Suprafața placajului rostuit.",
    resources: [chitEpoxidic(0.5), faiantar(0.35)],
  },
  {
    code: "DV-PLC-07",
    category,
    title:
      "Placaj din plăci de piatră naturală pe pereți interiori, cu adeziv alb, impregnat",
    unit: "mp",
    includes:
      "Trasarea, lipirea plăcilor cu adeziv alb, tăieturile, rostuirea, curățarea și impregnarea pietrei.",
    excludes: "Egalizarea suportului; ancorarea mecanică a plăcilor grele.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      piatraPerete(1.05),
      adezivAlb(6),
      chit(0.3),
      impregnant(0.1),
      smallMaterials(2),
      faiantar(1.6),
      necalificat(0.4),
      masinaTaiatPlaci(0.1),
    ],
  },
  {
    code: "DV-PLC-08",
    category,
    title:
      "Placaj din piatră decorativă din beton pe pereți exteriori, lipit și rostuit",
    unit: "mp",
    includes:
      "Lipirea plăcilor cu adeziv deformabil, tăieturile, rostuirea cu mortar și curățarea.",
    excludes: "Schela; impregnarea.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      piatraDecorativa(1.05),
      adezivC2TES1(6),
      mortarRostuire(3),
      faiantar(1.3),
      necalificat(0.35),
    ],
  },
  {
    code: "DV-PLC-09",
    category,
    title: "Placaj din plăcuțe de cărămidă aparentă, lipit și rostuit",
    unit: "mp",
    includes:
      "Trasarea rândurilor, lipirea plăcuțelor cu adeziv deformabil, tăieturile, rostuirea cu mortar și curățarea.",
    excludes: "Schela la exterior; impregnarea.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      placuteCaramida(1.05),
      adezivC2TES1(5),
      mortarRostuire(4),
      faiantar(1.4),
      necalificat(0.35),
    ],
  },
  {
    code: "DV-PLC-10",
    category,
    title: "Placarea soclului cu gresie porțelanată, cu adeziv deformabil",
    unit: "mp",
    includes:
      "Lipirea plăcilor cu adeziv deformabil, tăieturile, rostuirea cu chit flexibil și curățarea.",
    excludes: "Hidroizolația și termoizolația soclului.",
    measurement: "Suprafața soclului placat.",
    resources: [
      gresie(1.06),
      adezivC2TES1(5.5),
      chit(0.4),
      faiantar(1.1),
      necalificat(0.3),
      masinaTaiatPlaci(0.08),
    ],
  },
  {
    code: "DV-PLC-11",
    category,
    title:
      "Placarea treptelor cu gresie porțelanată, cu contratreaptă și profil antiderapant",
    unit: "m",
    includes:
      "Tăierea plăcilor pentru treaptă și contratreaptă, lipirea cu adeziv deformabil, profilul de treaptă, rostuirea și curățarea.",
    excludes: "Egalizarea treptelor de beton; plinta scării.",
    measurement: "Lungimea treptelor placate.",
    resources: [
      gresie(0.5),
      adezivC2TES1(2.5),
      chit(0.2),
      profilTreapta(1.05),
      faiantar(0.9),
      necalificat(0.2),
      masinaTaiatPlaci(0.08),
    ],
  },
  {
    code: "DV-PLC-12",
    category,
    title:
      "Trepte din granit de 3 cm cu contratrepte, montate pe scări de beton",
    unit: "m",
    includes:
      "Egalizarea treptei de beton, așezarea treptei și a contratreptei în adeziv alb, rostuirea și curățarea.",
    excludes: "Plinta scării; balustrada.",
    measurement: "Lungimea treptelor montate.",
    resources: [
      trepteGranit(1.02),
      adezivAlb(6),
      chit(0.1),
      pietrar(1.2),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-PLC-13",
    category,
    title: "Glaf interior din marmură sau granit de 3 cm, montat",
    unit: "m",
    includes:
      "Egalizarea suportului, așezarea glafului în adeziv alb, la nivel, și etanșarea cu silicon pe contur.",
    measurement: "Lungimea glafului.",
    resources: [glafPiatra(1.02), adezivAlb(1.5), silicon(0.1), pietrar(0.6)],
  },
  {
    code: "DV-PLC-14",
    category,
    title:
      "Fațadă ventilată cu panouri HPL de 8 mm, pe structură din aluminiu, cu nituri",
    unit: "mp",
    includes:
      "Montarea consolelor și a profilelor de aluminiu la planeitate, debitarea și găurirea panourilor, fixarea lor cu nituri colorate, rosturile deschise.",
    excludes: "Schela; termoizolația și folia de difuzie din spatele placării.",
    measurement: "Suprafața fațadei placate, fără goluri.",
    resources: [
      panouHpl(1.1),
      structuraFatada(1),
      nituriInox(12),
      lacatus(1.2),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-PLC-15",
    category,
    title:
      "Fațadă ventilată cu plăci din fibrociment de 8 mm, pe structură din aluminiu",
    unit: "mp",
    includes:
      "Montarea consolelor și a profilelor de aluminiu la planeitate, debitarea și găurirea plăcilor, fixarea lor cu nituri colorate, rosturile deschise.",
    excludes: "Schela; termoizolația și folia de difuzie din spatele placării.",
    measurement: "Suprafața fațadei placate, fără goluri.",
    resources: [
      placaFibrociment(1.1),
      structuraFatada(1),
      nituriInox(12),
      lacatus(1.2),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-PLC-16",
    category,
    title:
      "Placarea fațadei cu lambriu din lemn termotratat, pe șipci, cu șuruburi inox",
    unit: "mp",
    includes:
      "Șipcile de ventilare fixate de perete, montarea lamelelor cu rost și șuruburi inox, tăieturile la margini și la goluri.",
    excludes: "Schela; termoizolația și folia de difuzie; uleierea lemnului.",
    measurement: "Suprafața fațadei placate, fără goluri.",
    resources: [
      lambriuTermotratat(1.1),
      cherestea(0.006),
      surubInoxFatada(20),
      dulgher(0.9),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-PLC-17",
    category,
    title: "Lambriu din lemn pe pereți interiori, pe șipci",
    unit: "mp",
    includes:
      "Șipcile fixate de perete la nivel, montarea lambriului cu cuie sau cleme, profilele de margine și de colț.",
    excludes: "Lăcuirea sau lazurarea.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      lambriuInterior(1.1),
      cherestea(0.004),
      cuie(0.05),
      dulgher(0.6),
      necalificat(0.15),
    ],
  },
  {
    code: "DV-PLC-18",
    category,
    title: "Panouri decorative 3D din gips, lipite și chituite, gata de vopsit",
    unit: "mp",
    includes:
      "Trasarea, lipirea panourilor cu adeziv, chituirea rosturilor cu glet și șlefuirea lor.",
    excludes: "Vopsirea.",
    measurement: "Suprafața placată.",
    resources: [
      panouri3d(1.05),
      adezivGips(2),
      gletIpsos(0.5),
      montatorGips(0.9),
      necalificat(0.15),
    ],
  },
];
