import type { BaseNorm } from "./norm";
import {
  aparatSpalat,
  diluant,
  emailAlchidic,
  grundAcrilic,
  grundAnticoroziv,
  grundFatada,
  lazura,
  material,
  necalificat,
  pompaAirless,
  smallMaterials,
  tapetar,
  vopseaFatada,
  vopseaLavabila,
  vopsitor,
  zugrav,
} from "./resources";

const category = "Zugrăveli și vopsitorii";

const vopseaClasa1 = material(
  "Vopsea lavabilă de interior rezistentă la spălare, clasa 1",
  "l",
  22,
);
const vopseaAntimucegai = material(
  "Vopsea lavabilă antimucegai pentru băi și bucătării",
  "l",
  24,
);
const vopseaSiliconica = material("Vopsea siliconică pentru fațade", "l", 32);
const tapet = material(
  "Tapet vinilic pe suport de hârtie sau fleece",
  "mp",
  45,
);
const adezivTapet = material("Adeziv pentru tapet", "kg", 28);
const tapetFibra = material("Tapet din fibră de sticlă", "mp", 18);
const grundLemn = material("Grund pentru lemn", "l", 30);
const vopseaLemn = material(
  "Vopsea acrilică pentru lemn, de exterior",
  "l",
  48,
);
const lacLemn = material("Lac acrilic pentru lemn, de interior", "l", 45);
const emailRadiatoare = material("Email pentru radiatoare", "kg", 42);
const vopseaTermospumanta = material(
  "Vopsea termospumantă pentru protecția la foc a oțelului",
  "kg",
  55,
);
const emailPoliuretanic = material("Email poliuretanic bicomponent", "kg", 65);
const grundZinc = material("Grund de aderență pentru tablă zincată", "l", 40);
const vopseaAcoperis = material("Vopsea pentru acoperișuri din tablă", "l", 36);
const stucco = material("Tencuială decorativă venețiană", "kg", 28);
const ceara = material(
  "Ceară de protecție pentru tencuieli decorative",
  "kg",
  60,
);
const vopseaEfect = material("Vopsea decorativă cu efect", "l", 55);
const decapant = material("Decapant pentru vopsele vechi", "kg", 35);

export const zugraveli: BaseNorm[] = [
  {
    code: "DV-ZUG-01",
    category,
    title:
      "Zugrăveli cu vopsea lavabilă pe pereți interiori, în două straturi, cu grund",
    unit: "mp",
    includes:
      "Protejarea pardoselii și a tâmplăriei, grunduirea, vopsirea în două straturi și curățarea.",
    excludes: "Gletul și reparațiile suportului.",
    measurement: "Suprafața vopsită, fără goluri.",
    resources: [
      grundAcrilic(0.12),
      vopseaLavabila(0.3),
      smallMaterials(3),
      zugrav(0.2),
      necalificat(0.03),
    ],
  },
  {
    code: "DV-ZUG-02",
    category,
    title: "Zugrăveli cu vopsea lavabilă pe tavane, în două straturi, cu grund",
    unit: "mp",
    includes:
      "Protejarea pardoselii și a pereților, grunduirea, vopsirea în două straturi și curățarea.",
    excludes: "Gletul și reparațiile suportului.",
    measurement: "Suprafața vopsită.",
    resources: [
      grundAcrilic(0.12),
      vopseaLavabila(0.3),
      smallMaterials(3),
      zugrav(0.25),
      necalificat(0.04),
    ],
  },
  {
    code: "DV-ZUG-03",
    category,
    title:
      "Vopsitorie cu vopsea lavabilă pentru fațade, în două straturi, cu grund",
    unit: "mp",
    includes:
      "Protejarea tâmplăriei, grunduirea și vopsirea tencuielii în două straturi.",
    excludes: "Schela de fațadă; reparațiile tencuielii.",
    measurement: "Suprafața vopsită, fără goluri.",
    resources: [
      grundFatada(0.15),
      vopseaFatada(0.35),
      smallMaterials(2),
      zugrav(0.25),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-ZUG-04",
    category,
    title:
      "Vopsitorie cu email alchidic pe confecții metalice, în două straturi, cu grund anticoroziv",
    unit: "mp",
    includes:
      "Curățarea ruginii cu peria de sârmă, desprăfuirea, grunduirea și vopsirea în două straturi.",
    measurement: "Suprafața vopsită, desfășurată.",
    resources: [
      grundAnticoroziv(0.12),
      emailAlchidic(0.2),
      diluant(0.03),
      smallMaterials(3),
      vopsitor(0.5),
    ],
  },
  {
    code: "DV-ZUG-05",
    category,
    title: "Lazurarea lemnului în două straturi",
    unit: "mp",
    includes:
      "Șlefuirea ușoară, desprăfuirea și aplicarea lazurii în două straturi.",
    measurement: "Suprafața lazurată, desfășurată.",
    resources: [lazura(0.2), smallMaterials(3), vopsitor(0.3)],
  },
  {
    code: "DV-ZUG-06",
    category,
    title:
      "Zugrăveli cu vopsea lavabilă rezistentă la spălare, clasa 1, pe pereți interiori, în două straturi, cu grund",
    unit: "mp",
    includes:
      "Protejarea pardoselii și a tâmplăriei, grunduirea, vopsirea în două straturi cu rola și curățarea.",
    excludes: "Gletul și reparațiile suportului.",
    measurement: "Suprafața vopsită, fără goluri.",
    resources: [
      grundAcrilic(0.12),
      vopseaClasa1(0.28),
      smallMaterials(3),
      zugrav(0.22),
      necalificat(0.03),
    ],
  },
  {
    code: "DV-ZUG-07",
    category,
    title:
      "Zugrăveli cu vopsea lavabilă antimucegai în băi și bucătării, în două straturi, cu grund",
    unit: "mp",
    includes:
      "Protejarea obiectelor sanitare și a placajelor, grunduirea, vopsirea în două straturi și curățarea.",
    excludes: "Tratamentul suprafețelor deja atacate de mucegai.",
    measurement: "Suprafața vopsită, fără goluri.",
    resources: [
      grundAcrilic(0.12),
      vopseaAntimucegai(0.3),
      smallMaterials(3),
      zugrav(0.22),
      necalificat(0.03),
    ],
  },
  {
    code: "DV-ZUG-08",
    category,
    title:
      "Zugrăveli de reîmprospătare cu vopsea lavabilă, un strat, pe suprafețe vopsite în stare bună",
    unit: "mp",
    includes:
      "Protejarea pardoselii și a tâmplăriei, spălarea petelor, vopsirea într-un strat și curățarea.",
    excludes: "Grundul; reparațiile gletului.",
    measurement: "Suprafața vopsită, fără goluri.",
    resources: [
      vopseaLavabila(0.15),
      smallMaterials(3),
      zugrav(0.12),
      necalificat(0.02),
    ],
  },
  {
    code: "DV-ZUG-09",
    category,
    title:
      "Vopsitorie cu vopsea siliconică pentru fațade, în două straturi, cu grund",
    unit: "mp",
    includes:
      "Protejarea tâmplăriei, grunduirea și vopsirea tencuielii în două straturi.",
    excludes: "Schela de fațadă; reparațiile tencuielii.",
    measurement: "Suprafața vopsită, fără goluri.",
    resources: [
      grundFatada(0.15),
      vopseaSiliconica(0.35),
      smallMaterials(2),
      zugrav(0.27),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-ZUG-10",
    category,
    title:
      "Zugrăveli aplicate mecanizat cu pompa airless, în două straturi, cu grund, pe suprafețe mari",
    unit: "mp",
    includes:
      "Protejarea completă a suprafețelor din jur, grunduirea, pulverizarea vopselei în două straturi și curățarea.",
    excludes: "Gletul și reparațiile suportului.",
    measurement: "Suprafața vopsită, fără goluri.",
    resources: [
      grundAcrilic(0.12),
      vopseaLavabila(0.33),
      smallMaterials(4),
      zugrav(0.1),
      necalificat(0.04),
      pompaAirless(0.02),
    ],
  },
  {
    code: "DV-ZUG-11",
    category,
    title: "Tapet vinilic, lipit, cu pregătirea suportului",
    unit: "mp",
    includes:
      "Grunduirea suportului, croirea și potrivirea modelului, lipirea fâșiilor cu rosturile cap la cap, tăieturile la margini.",
    excludes: "Gletul; îndepărtarea tapetului vechi.",
    measurement: "Suprafața tapetată, fără goluri.",
    resources: [
      tapet(1.12),
      adezivTapet(0.25),
      grundAcrilic(0.1),
      tapetar(0.45),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-ZUG-12",
    category,
    title: "Tapet din fibră de sticlă, lipit și vopsit în două straturi",
    unit: "mp",
    includes:
      "Lipirea tapetului cu adezivul lui, tăieturile la margini și vopsirea în două straturi cu vopsea lavabilă.",
    excludes: "Gletul.",
    measurement: "Suprafața tapetată, fără goluri.",
    resources: [
      tapetFibra(1.1),
      adezivTapet(0.3),
      vopseaLavabila(0.3),
      tapetar(0.4),
      zugrav(0.2),
    ],
  },
  {
    code: "DV-ZUG-13",
    category,
    title:
      "Vopsirea tâmplăriei din lemn cu vopsea acrilică, cu grund, în două straturi",
    unit: "mp",
    includes:
      "Șlefuirea, desprăfuirea, protejarea geamurilor și a feroneriei, grundul și două straturi de vopsea.",
    excludes: "Decaparea vopselei vechi.",
    measurement: "Suprafața vopsită, desfășurată pe ambele fețe.",
    resources: [
      grundLemn(0.12),
      vopseaLemn(0.25),
      smallMaterials(5),
      vopsitor(0.9),
    ],
  },
  {
    code: "DV-ZUG-14",
    category,
    title:
      "Lăcuirea lemnului la interior cu lac acrilic, în două straturi, cu șlefuire",
    unit: "mp",
    includes:
      "Șlefuirea, desprăfuirea, primul strat de lac, șlefuirea fină și al doilea strat.",
    measurement: "Suprafața lăcuită, desfășurată.",
    resources: [lacLemn(0.22), smallMaterials(4), vopsitor(0.4)],
  },
  {
    code: "DV-ZUG-15",
    category,
    title:
      "Vopsirea radiatoarelor cu email pentru radiatoare, cu grund pe zonele curățate",
    unit: "buc",
    includes:
      "Șlefuirea și desprăfuirea, grundul pe zonele cu rugină, două straturi de email, protejarea peretelui și a pardoselii.",
    measurement: "Numărul de radiatoare, de până la 1,5 m lungime.",
    resources: [
      emailRadiatoare(0.25),
      grundAnticoroziv(0.1),
      smallMaterials(5),
      vopsitor(1),
    ],
  },
  {
    code: "DV-ZUG-16",
    category,
    title:
      "Protecția la foc a structurilor metalice cu vopsea termospumantă, pentru 30 de minute, cu grund",
    unit: "mp",
    includes:
      "Curățarea și grundul anticoroziv, aplicarea vopselei termospumante cu pompa airless în straturi până la grosimea cerută, măsurarea grosimii.",
    excludes: "Stratul de finisaj colorat; schela.",
    measurement: "Suprafața desfășurată a profilelor protejate.",
    resources: [
      grundAnticoroziv(0.12),
      vopseaTermospumanta(1.2),
      vopsitor(0.5),
      pompaAirless(0.05),
    ],
  },
  {
    code: "DV-ZUG-17",
    category,
    title:
      "Vopsitorie cu email poliuretanic bicomponent pe confecții metalice, cu grund, în două straturi",
    unit: "mp",
    includes:
      "Curățarea și desprăfuirea, grundul anticoroziv și două straturi de email poliuretanic.",
    measurement: "Suprafața vopsită, desfășurată.",
    resources: [
      grundAnticoroziv(0.15),
      emailPoliuretanic(0.25),
      diluant(0.03),
      smallMaterials(3),
      vopsitor(0.55),
    ],
  },
  {
    code: "DV-ZUG-18",
    category,
    title:
      "Vopsirea acoperișurilor din tablă zincată, cu grund de aderență și două straturi de vopsea",
    unit: "mp",
    includes:
      "Spălarea cu presiune, curățarea ruginii, grundul de aderență și două straturi de vopsea pentru acoperișuri.",
    excludes: "Schela sau sistemul de ancorare.",
    measurement: "Suprafața vopsită, măsurată pe pantă.",
    resources: [
      grundZinc(0.1),
      vopseaAcoperis(0.3),
      vopsitor(0.3),
      necalificat(0.05),
      aparatSpalat(0.03),
    ],
  },
  {
    code: "DV-ZUG-19",
    category,
    title:
      "Tencuială decorativă venețiană (stucco), cu amorsă și ceară de protecție",
    unit: "mp",
    includes:
      "Amorsarea gletului, aplicarea tencuielii în două sau trei straturi cu gletiera inox, lustruirea și ceara de protecție.",
    excludes: "Gletul, care trebuie să fie fin și fără defecte.",
    measurement: "Suprafața decorată.",
    resources: [grundAcrilic(0.15), stucco(1), ceara(0.05), zugrav(0.9)],
  },
  {
    code: "DV-ZUG-20",
    category,
    title: "Vopsea decorativă cu efect, în două straturi, cu grund",
    unit: "mp",
    includes:
      "Grunduirea, aplicarea vopselei decorative în două straturi cu unealta cerută de efect și curățarea.",
    excludes: "Gletul.",
    measurement: "Suprafața decorată.",
    resources: [grundAcrilic(0.12), vopseaEfect(0.25), zugrav(0.5)],
  },
  {
    code: "DV-ZUG-21",
    category,
    title: "Decaparea vopselelor vechi de pe lemn sau metal, până la suport",
    unit: "mp",
    includes:
      "Aplicarea decapantului, răzuirea straturilor înmuiate, șlefuirea și curățarea suprafeței.",
    measurement: "Suprafața decapată, desfășurată.",
    resources: [decapant(0.4), smallMaterials(5), vopsitor(0.6)],
  },
  {
    code: "DV-ZUG-22",
    category,
    title: "Vopsirea țevilor și a instalațiilor aparente, cu grund și email",
    unit: "m",
    includes:
      "Curățarea și desprăfuirea țevii, grundul anticoroziv și două straturi de email.",
    measurement: 'Lungimea țevilor vopsite, până la 2" diametru.',
    resources: [grundAnticoroziv(0.03), emailAlchidic(0.05), vopsitor(0.12)],
  },
];
