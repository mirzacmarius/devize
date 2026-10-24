import type { BaseNorm } from "./norm";
import {
  adezivPolistiren,
  amorsaBituminoasa,
  amorsaDecorativa,
  bandaFolii,
  barieraVapori,
  cherestea,
  cuie,
  dibluCui,
  dibluTermo,
  eps80,
  foliePolietilena,
  gazPropan,
  geotextil,
  izolator,
  masinaInsuflat,
  material,
  membranaSbs3,
  necalificat,
  plasaFatada,
  profilColtPlasa,
  smallMaterials,
  tencuialaDecorativa,
  vataBazaltica10,
  vataSticla5,
  vataSticla10,
  vataSticla15,
  xps5,
} from "./resources";

const category = "Termoizolații";

const epsGrafitat = material("Polistiren expandat grafitat, 10 cm", "mp", 32);
const eps15 = material("Polistiren expandat EPS 80, 15 cm", "mp", 37);
const eps5 = material("Polistiren expandat EPS 80, 5 cm", "mp", 13);
const eps3 = material("Polistiren expandat EPS 80, 3 cm", "mp", 9);
const eps100 = material("Polistiren expandat EPS 100, 10 cm", "mp", 30);
const xps10 = material("Polistiren extrudat XPS, 10 cm", "mp", 52);
const vataBazaltica15 = material(
  "Vată minerală bazaltică de fațadă, 15 cm",
  "mp",
  70,
);
const vataPardoseala = material(
  "Vată minerală bazaltică de pardoseală, 3 cm",
  "mp",
  20,
);
const vataInsuflata = material(
  "Vată minerală granulată pentru insuflare",
  "kg",
  4.5,
);
const celuloza = material("Celuloză pentru insuflare", "kg", 5);
const pir = material("Panou PIR cu folie de aluminiu, 10 cm", "mp", 75);
const spumaProiectata = material(
  "Spumă poliuretanică cu celule închise, 5 cm, pulverizată de echipa specializată, cu utilaj",
  "mp",
  130,
);
const adezivVata = material(
  "Adeziv și masă de șpaclu pentru vată bazaltică",
  "kg",
  1.4,
);
const dibluMetalicTermo = material(
  "Diblu cu cui metalic pentru termoizolații",
  "buc",
  1.1,
);
const tencuialaSiliconica = material(
  "Tencuială decorativă siliconică, 1,5 mm",
  "kg",
  9,
);
const mozaicSoclu = material(
  "Tencuială decorativă mozaicată pentru soclu",
  "kg",
  11,
);
const profilSoclu = material(
  "Profil de soclu din aluminiu cu picurător",
  "m",
  14,
);
const profilRacordTamplarie = material(
  "Profil de racord la tâmplărie cu plasă",
  "m",
  6,
);
const bandaPrecomprimata = material("Bandă precomprimată de etanșare", "m", 6);

export const termoizolatii: BaseNorm[] = [
  {
    code: "DV-TRM-01",
    category,
    title:
      "Termosistem (anvelopare) cu polistiren expandat EPS 80 de 10 cm și tencuială decorativă",
    unit: "mp",
    includes:
      "Pregătirea suportului, lipirea și diblarea plăcilor, șlefuirea, armarea cu plasă în masa de șpaclu, profilele de colț, amorsa și tencuiala decorativă.",
    excludes:
      "Schela de fațadă; profilul de soclu; glafurile și conturul golurilor de ferestre.",
    measurement:
      "Suprafața fațadei termoizolate, fără goluri; conturul golurilor se măsoară separat.",
    resources: [
      adezivPolistiren(10),
      eps80(1.05),
      dibluTermo(6),
      plasaFatada(1.1),
      profilColtPlasa(0.3),
      amorsaDecorativa(0.25),
      tencuialaDecorativa(2.5),
      smallMaterials(2),
      izolator(0.95),
      necalificat(0.35),
    ],
  },
  {
    code: "DV-TRM-02",
    category,
    title:
      "Termoizolație de 20 cm din vată minerală de sticlă pe planșeul podului",
    unit: "mp",
    includes:
      "Așezarea barierei de vapori cu îmbinările lipite, apoi a două straturi de vată cu rosturile decalate.",
    excludes: "Podinele de circulație.",
    measurement: "Suprafața izolată.",
    resources: [
      barieraVapori(1.1),
      bandaFolii(0.5),
      vataSticla10(2.1),
      izolator(0.3),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-TRM-03",
    category,
    title:
      "Termoizolație de 15 cm din vată minerală de sticlă între căpriori, cu barieră de vapori",
    unit: "mp",
    includes:
      "Tăierea și montarea vatei între căpriori, prinderea și lipirea barierei de vapori la interior.",
    excludes:
      "Placarea la interior; folia anticondens de deasupra căpriorilor.",
    measurement: "Suprafața acoperișului izolat, măsurată pe pantă.",
    resources: [
      vataSticla15(1.05),
      barieraVapori(1.1),
      bandaFolii(0.6),
      izolator(0.4),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-TRM-04",
    category,
    title: "Termoizolație de 5 cm din polistiren extrudat XPS sub șapă",
    unit: "mp",
    includes:
      "Așezarea plăcilor cu rosturi decalate și a foliei de separare de deasupra, cu petreceri de 10 cm.",
    excludes: "Hidroizolația plăcii; șapa.",
    measurement: "Suprafața izolată.",
    resources: [
      xps5(1.05),
      foliePolietilena(1.15),
      izolator(0.12),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-TRM-05",
    category,
    title:
      "Termosistem cu polistiren expandat grafitat de 10 cm și tencuială siliconică",
    unit: "mp",
    includes:
      "Pregătirea suportului, lipirea și diblarea plăcilor, șlefuirea, armarea cu plasă în masa de șpaclu, profilele de colț, amorsa și tencuiala siliconică.",
    excludes:
      "Schela de fațadă; profilul de soclu; glafurile și conturul golurilor de ferestre.",
    measurement:
      "Suprafața fațadei termoizolate, fără goluri; conturul golurilor se măsoară separat.",
    resources: [
      adezivPolistiren(10),
      epsGrafitat(1.05),
      dibluTermo(6),
      plasaFatada(1.1),
      profilColtPlasa(0.3),
      amorsaDecorativa(0.25),
      tencuialaSiliconica(2.5),
      smallMaterials(2),
      izolator(0.95),
      necalificat(0.35),
    ],
  },
  {
    code: "DV-TRM-06",
    category,
    title:
      "Termosistem cu vată minerală bazaltică de 10 cm și tencuială siliconică",
    unit: "mp",
    includes:
      "Pregătirea suportului, lipirea plăcilor pe toată suprafața și diblarea cu dibluri metalice, armarea cu plasă în masa de șpaclu, profilele de colț, amorsa și tencuiala siliconică.",
    excludes:
      "Schela de fațadă; profilul de soclu; glafurile și conturul golurilor de ferestre.",
    measurement:
      "Suprafața fațadei termoizolate, fără goluri; conturul golurilor se măsoară separat.",
    resources: [
      adezivVata(12),
      vataBazaltica10(1.05),
      dibluMetalicTermo(7),
      plasaFatada(1.1),
      profilColtPlasa(0.3),
      amorsaDecorativa(0.25),
      tencuialaSiliconica(2.5),
      smallMaterials(2),
      izolator(1.1),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-TRM-07",
    category,
    title:
      "Termosistem cu vată minerală bazaltică de 15 cm și tencuială siliconică",
    unit: "mp",
    includes:
      "Pregătirea suportului, lipirea plăcilor pe toată suprafața și diblarea cu dibluri metalice, armarea cu plasă în masa de șpaclu, profilele de colț, amorsa și tencuiala siliconică.",
    excludes:
      "Schela de fațadă; profilul de soclu; glafurile și conturul golurilor de ferestre.",
    measurement:
      "Suprafața fațadei termoizolate, fără goluri; conturul golurilor se măsoară separat.",
    resources: [
      adezivVata(12),
      vataBazaltica15(1.05),
      dibluMetalicTermo(7),
      plasaFatada(1.1),
      profilColtPlasa(0.3),
      amorsaDecorativa(0.25),
      tencuialaSiliconica(2.5),
      smallMaterials(2),
      izolator(1.15),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-TRM-08",
    category,
    title:
      "Termosistem cu polistiren expandat EPS 80 de 15 cm și tencuială decorativă",
    unit: "mp",
    includes:
      "Pregătirea suportului, lipirea și diblarea plăcilor, șlefuirea, armarea cu plasă în masa de șpaclu, profilele de colț, amorsa și tencuiala decorativă.",
    excludes:
      "Schela de fațadă; profilul de soclu; glafurile și conturul golurilor de ferestre.",
    measurement:
      "Suprafața fațadei termoizolate, fără goluri; conturul golurilor se măsoară separat.",
    resources: [
      adezivPolistiren(10),
      eps15(1.05),
      dibluTermo(6),
      plasaFatada(1.1),
      profilColtPlasa(0.3),
      amorsaDecorativa(0.25),
      tencuialaDecorativa(2.5),
      smallMaterials(2),
      izolator(1),
      necalificat(0.35),
    ],
  },
  {
    code: "DV-TRM-09",
    category,
    title:
      "Termoizolația soclului cu polistiren extrudat XPS de 10 cm și tencuială mozaicată",
    unit: "mp",
    includes:
      "Lipirea și diblarea plăcilor, armarea cu plasă în masa de șpaclu, profilele de colț, amorsa și tencuiala mozaicată.",
    excludes:
      "Profilul de soclu; hidroizolația soclului; săpătura de dezvelire sub cota terenului.",
    measurement: "Suprafața soclului termoizolat.",
    resources: [
      adezivPolistiren(10),
      xps10(1.05),
      dibluTermo(6),
      plasaFatada(1.1),
      profilColtPlasa(0.2),
      amorsaDecorativa(0.25),
      mozaicSoclu(5),
      smallMaterials(2),
      izolator(1),
      necalificat(0.35),
    ],
  },
  {
    code: "DV-TRM-10",
    category,
    title: "Profil de soclu din aluminiu cu picurător, pentru termosistem",
    unit: "m",
    includes:
      "Trasarea la nivel, fixarea profilului cu dibluri, cu distanțieri la denivelări, și îmbinarea elementelor.",
    measurement: "Lungimea profilului.",
    resources: [profilSoclu(1.05), dibluCui(3), izolator(0.15)],
  },
  {
    code: "DV-TRM-11",
    category,
    title:
      "Conturul golurilor de ferestre și uși în termosistem: spaleți și buiandrugi cu polistiren de 3 cm",
    unit: "m",
    includes:
      "Lipirea fâșiilor de polistiren pe spaleți, profilul de racord la tâmplărie, profilele de colț cu plasă, armarea, amorsa și tencuiala decorativă.",
    excludes: "Glaful de tablă de la partea de jos.",
    measurement:
      "Lungimea conturului golului, fără latura de jos, pe care stă glaful.",
    resources: [
      eps3(0.3),
      adezivPolistiren(3),
      plasaFatada(0.4),
      profilRacordTamplarie(1.05),
      profilColtPlasa(1.05),
      amorsaDecorativa(0.08),
      tencuialaDecorativa(0.7),
      izolator(0.6),
      necalificat(0.15),
    ],
  },
  {
    code: "DV-TRM-12",
    category,
    title:
      "Termoizolație de 10 cm din vată minerală de sticlă pe planșeul podului, cu barieră de vapori",
    unit: "mp",
    includes:
      "Așezarea barierei de vapori cu îmbinările lipite, apoi a vatei, cu rosturile strânse.",
    excludes: "Podinele de circulație.",
    measurement: "Suprafața izolată.",
    resources: [
      barieraVapori(1.1),
      bandaFolii(0.5),
      vataSticla10(1.05),
      izolator(0.18),
      necalificat(0.08),
    ],
  },
  {
    code: "DV-TRM-13",
    category,
    title:
      "Termoizolație de 25 cm din vată minerală granulată insuflată pe planșeul podului",
    unit: "mp",
    includes:
      "Așezarea barierei de vapori, delimitările la margini, insuflarea vatei la grosimea și densitatea cerute, nivelarea.",
    excludes: "Podinele de circulație.",
    measurement: "Suprafața izolată.",
    resources: [
      barieraVapori(1.1),
      bandaFolii(0.5),
      vataInsuflata(8.5),
      izolator(0.1),
      necalificat(0.08),
      masinaInsuflat(0.04),
    ],
  },
  {
    code: "DV-TRM-14",
    category,
    title:
      "Termoizolație de 20 cm din celuloză insuflată între căpriori sau în pereți cu structură",
    unit: "mp",
    includes:
      "Găurile de insuflare în placarea interioară, insuflarea celulozei la densitatea cerută și închiderea găurilor.",
    excludes: "Placarea interioară și bariera de vapori.",
    measurement: "Suprafața izolată.",
    resources: [
      celuloza(8),
      smallMaterials(2),
      izolator(0.1),
      necalificat(0.1),
      masinaInsuflat(0.05),
    ],
  },
  {
    code: "DV-TRM-15",
    category,
    title: "Strat suplimentar de 5 cm din vată minerală sub căpriori, pe șipci",
    unit: "mp",
    includes:
      "Baterea șipcilor transversal pe căpriori și așezarea vatei între ele.",
    excludes:
      "Vata dintre căpriori; bariera de vapori, luată o singură dată din DV-TRM-03 și montată sub acest strat; placarea la interior.",
    measurement: "Suprafața acoperișului izolat, măsurată pe pantă.",
    resources: [
      vataSticla5(1.05),
      cherestea(0.003),
      cuie(0.03),
      izolator(0.22),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-TRM-16",
    category,
    title:
      "Termoizolație de 10 cm din polistiren expandat EPS 100 sub șapă, pe planșee",
    unit: "mp",
    includes:
      "Așezarea plăcilor cu rosturi decalate și a foliei de separare de deasupra, cu petreceri de 10 cm.",
    excludes: "Hidroizolația plăcii; șapa.",
    measurement: "Suprafața izolată.",
    resources: [
      eps100(1.05),
      foliePolietilena(1.15),
      izolator(0.12),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-TRM-17",
    category,
    title:
      "Termoizolație de 10 cm din polistiren extrudat XPS pe terase, cu geotextil de separare",
    unit: "mp",
    includes:
      "Așezarea plăcilor cu rosturi decalate, cu falț, și a geotextilului de separare de deasupra, cu petreceri.",
    excludes: "Hidroizolația; stratul de protecție sau lestare.",
    measurement: "Suprafața izolată.",
    resources: [
      xps10(1.05),
      geotextil(1.15),
      izolator(0.12),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-TRM-18",
    category,
    title:
      "Termoizolație de 10 cm din panouri PIR pe terase, pe barieră de vapori bituminoasă",
    unit: "mp",
    includes:
      "Amorsarea suportului, bariera de vapori din membrană lipită cu flacără, așezarea panourilor cu rosturile decalate.",
    excludes: "Betonul de pantă; hidroizolația de deasupra.",
    measurement: "Suprafața izolată.",
    resources: [
      amorsaBituminoasa(0.3),
      membranaSbs3(1.15),
      gazPropan(0.1),
      pir(1.05),
      izolator(0.3),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-TRM-19",
    category,
    title:
      "Termoizolație de 5 cm din polistiren expandat pe tavanul subsolului sau al garajului, lipită și diblată",
    unit: "mp",
    includes:
      "Curățarea tavanului, lipirea plăcilor, diblarea și șlefuirea rosturilor.",
    excludes: "Armarea cu plasă și finisajul.",
    measurement: "Suprafața izolată, fără goluri.",
    resources: [
      eps5(1.05),
      adezivPolistiren(6),
      dibluTermo(5),
      izolator(0.35),
      necalificat(0.12),
    ],
  },
  {
    code: "DV-TRM-20",
    category,
    title:
      "Izolație fonică și termică de 3 cm din vată bazaltică de pardoseală, sub șapă flotantă",
    unit: "mp",
    includes:
      "Așezarea plăcilor cu rosturile strânse și a foliei de separare de deasupra, cu petreceri de 10 cm.",
    excludes: "Banda perimetrală și șapa.",
    measurement: "Suprafața izolată.",
    resources: [
      vataPardoseala(1.05),
      foliePolietilena(1.15),
      izolator(0.1),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-TRM-21",
    category,
    title:
      "Izolație de 5 cm din spumă poliuretanică pulverizată, pe acoperișuri și pereți",
    unit: "mp",
    includes:
      "Protejarea suprafețelor din jur, pulverizarea spumei în straturi până la grosimea cerută, cu utilajul și echipa de aplicare.",
    excludes: "Bariera de vapori; protecția spumei la lumină.",
    measurement: "Suprafața izolată.",
    resources: [spumaProiectata(1), izolator(0.05)],
  },
  {
    code: "DV-TRM-22",
    category,
    title:
      "Etanșarea rostului dintre tâmplărie și termosistem cu bandă precomprimată",
    unit: "m",
    includes: "Curățarea rostului și așezarea benzii precomprimate pe toc.",
    measurement: "Lungimea rosturilor etanșate.",
    resources: [bandaPrecomprimata(1.05), izolator(0.08)],
  },
  {
    code: "DV-TRM-23",
    category,
    title:
      "Rearmarea unui termosistem existent cu plasă nouă în masă de șpaclu, gata de finisaj",
    unit: "mp",
    includes:
      "Spălarea și repararea stratului vechi, înglobarea plasei noi în masa de șpaclu, șlefuirea și amorsa.",
    excludes: "Schela de fațadă; tencuiala decorativă.",
    measurement: "Suprafața rearmată, fără goluri.",
    resources: [
      adezivPolistiren(5),
      plasaFatada(1.1),
      amorsaDecorativa(0.25),
      izolator(0.5),
      necalificat(0.15),
    ],
  },
];
