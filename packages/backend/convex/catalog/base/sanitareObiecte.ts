import type { BaseNorm } from "./norm";
import {
  baterieLavoar,
  betonC16,
  dibluMetalic,
  fitingCanal40,
  instalator,
  material,
  necalificat,
  racordFlexibil,
  racordWc,
  robinetColtar,
  robinetSferic,
  setPrindere,
  sifonLavoar,
  siliconSanitar,
  smallMaterials,
  spuma,
  supapa,
  tevaCanal40,
} from "./resources";

const category = "Instalații sanitare";

// Obiectele sanitare: căzi, dușuri, WC-uri, bucătării, aparate de preparare
// și tratare a apei, accesorii și hidranți. Conductele sunt în
// sanitareConducte.ts.

const cadaAcril = material(
  "Cadă de baie din acril, 170×70 cm, cu picioare",
  "buc",
  1100,
);
const sifonCada = material("Sifon pentru cadă, cu preaplin", "buc", 80);
const baterieCada = material(
  "Baterie monocomandă pentru cadă, cu set de duș",
  "buc",
  320,
);
const cabinaDus = material(
  "Cabină de duș 90×90 cm cu cădiță din acril",
  "set",
  1600,
);
const sifonCadita = material("Sifon pentru cădiță de duș", "buc", 60);
const caditaCompozit = material(
  "Cădiță de duș din compozit, 90×90 cm",
  "buc",
  850,
);
const paravanDus = material(
  "Paravan de duș walk-in din sticlă securizată de 8 mm, 90 cm",
  "buc",
  1200,
);
const baterieDus = material(
  "Baterie monocomandă de duș, cu set de duș",
  "buc",
  280,
);
const coloanaDus = material(
  "Coloană de duș termostatată, cu pară de ploaie",
  "buc",
  850,
);
const baterieIngropata = material(
  "Baterie de duș îngropată, cu corp încastrat și set de duș",
  "set",
  900,
);
const bideu = material("Bideu ceramic", "buc", 350);
const baterieBideu = material("Baterie pentru bideu", "buc", 220);
const vasWcSuspendat = material("Vas WC suspendat cu capac", "buc", 750);
const rezervorIngropat = material(
  "Rezervor WC îngropat cu cadru de montaj",
  "set",
  950,
);
const clapeta = material("Clapetă de acționare pentru rezervor", "buc", 150);
const pisoar = material("Pisoar ceramic", "buc", 450);
const robinetPisoar = material("Robinet temporizat pentru pisoar", "buc", 250);
const sifonPisoar = material("Sifon pentru pisoar", "buc", 60);
const chiuvetaInox = material(
  "Chiuvetă de bucătărie din inox, cu o cuvă și picurător",
  "buc",
  450,
);
const baterieBucatarie = material(
  "Baterie pentru chiuvetă de bucătărie",
  "buc",
  280,
);
const sifonChiuveta = material(
  "Sifon pentru chiuvetă, cu racord pentru mașina de spălat",
  "buc",
  70,
);
const mobilierBaie = material(
  "Mobilier de baie suspendat cu lavoar încorporat, 80 cm",
  "set",
  1500,
);
const robinetMasina = material(
  'Robinet pentru mașina de spălat, cu racord de 3/4"',
  "buc",
  45,
);
const sifonMasina = material(
  "Sifon de perete pentru mașina de spălat",
  "buc",
  40,
);
const boiler120 = material("Boiler electric de 120 l", "buc", 950);
const instant = material("Încălzitor electric instant de 5,5 kW", "buc", 450);
const statieDedurizare = material(
  "Stație de dedurizare a apei cu rășină, 25 l",
  "buc",
  3800,
);
const filtruSedimente = material(
  'Filtru de sedimente cu cartuș lavabil, 1"',
  "buc",
  180,
);
const sareDedurizare = material(
  "Sare pentru dedurizare, sac de 25 kg",
  "sac",
  35,
);
const osmoza = material(
  "Sistem de filtrare cu osmoză inversă, cu rezervor și robinet",
  "set",
  1100,
);
const setAccesorii = material(
  "Set de accesorii de baie (suport de hârtie, cuier, suport de prosoape, oglindă)",
  "set",
  350,
);
const baraSprijin = material("Bară de sprijin din inox, 60 cm", "buc", 320);
const robinetGradina = material(
  "Robinet de grădină antiîngheț, cu evacuare și cheie",
  "buc",
  180,
);
const hidrantInterior = material(
  "Hidrant interior de incendiu cu furtun plat de 20 m, în cutie",
  "set",
  1800,
);
const hidrantExterior = material(
  "Hidrant exterior suprateran DN80",
  "buc",
  3500,
);
const vanaSectionare = material(
  "Vană de secționare cu sertar DN80",
  "buc",
  650,
);
const cotTalpa = material("Cot cu talpă DN80 pentru hidrant", "buc", 350);
const caminVana = material("Cămin de vane din PP cu capac", "buc", 900);

export const sanitareObiecte: BaseNorm[] = [
  {
    code: "DV-SAN-41",
    category,
    title: "Cadă de baie din acril cu picioare, cu montaj și racorduri",
    unit: "buc",
    includes:
      "Montarea picioarelor, poziționarea și calarea căzii, montarea sifonului cu preaplin, racordarea la canalizare, etanșarea rostului cu peretele și proba de etanșeitate.",
    excludes:
      "Bateria (DV-SAN-42), masca de cadă din gips-carton sau zidărie și placajele.",
    measurement: "Numărul de căzi montate.",
    resources: [
      cadaAcril(1),
      sifonCada(1),
      siliconSanitar(0.5),
      smallMaterials(2),
      instalator(3.5),
      necalificat(1),
    ],
  },
  {
    code: "DV-SAN-42",
    category,
    title: "Baterie pentru cadă, de perete, cu set de duș",
    unit: "buc",
    includes:
      "Montarea excentricelor pe racordurile din perete, fixarea bateriei, montarea furtunului și a parei de duș, reglarea și proba de funcționare.",
    measurement: "Numărul de baterii montate.",
    resources: [baterieCada(1), smallMaterials(2), instalator(1)],
  },
  {
    code: "DV-SAN-43",
    category,
    title: "Cabină de duș cu cădiță din acril, 90×90 cm, cu montaj",
    unit: "buc",
    includes:
      "Montarea cădiței cu sifon, asamblarea profilelor și a panourilor de sticlă, fixarea pe pereți, etanșarea cu silicon, racordarea la canalizare și proba de etanșeitate.",
    excludes: "Bateria de duș (DV-SAN-46) și legăturile de apă.",
    measurement: "Numărul de cabine montate.",
    resources: [
      cabinaDus(1),
      sifonCadita(1),
      siliconSanitar(1),
      smallMaterials(2),
      instalator(5),
      necalificat(1),
    ],
  },
  {
    code: "DV-SAN-44",
    category,
    title: "Cădiță de duș din compozit, 90×90 cm, cu montaj pe pardoseală",
    unit: "buc",
    includes:
      "Trasarea, montarea sifonului, pozarea cădiței pe spumă de montaj sau pe picioare, calarea la nivel, racordarea la canalizare, etanșarea perimetrală și proba de scurgere.",
    excludes: "Paravanul (DV-SAN-45), bateria și placajele.",
    measurement: "Numărul de cădițe montate.",
    resources: [
      caditaCompozit(1),
      sifonCadita(1),
      spuma(1),
      siliconSanitar(0.5),
      smallMaterials(2),
      instalator(3),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-45",
    category,
    title: "Paravan de duș walk-in din sticlă securizată de 8 mm, cu montaj",
    unit: "buc",
    includes:
      "Trasarea, fixarea profilului de perete și a barei de stabilizare, montarea panoului de sticlă, reglarea verticalității și etanșarea cu silicon.",
    measurement: "Numărul de paravane montate.",
    resources: [
      paravanDus(1),
      dibluMetalic(4),
      siliconSanitar(0.5),
      smallMaterials(2),
      instalator(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-46",
    category,
    title: "Baterie de duș de perete, cu set de duș",
    unit: "buc",
    includes:
      "Montarea excentricelor, fixarea bateriei, montarea barei și a parei de duș, reglarea și proba de funcționare.",
    measurement: "Numărul de baterii montate.",
    resources: [baterieDus(1), smallMaterials(2), instalator(1)],
  },
  {
    code: "DV-SAN-47",
    category,
    title: "Coloană de duș termostatată cu pară de ploaie, cu montaj",
    unit: "buc",
    includes:
      "Montarea excentricelor, fixarea bateriei termostatate și a coloanei, prinderea în perete, reglarea temperaturii și proba de funcționare.",
    measurement: "Numărul de coloane montate.",
    resources: [
      coloanaDus(1),
      dibluMetalic(2),
      smallMaterials(2),
      instalator(1.5),
    ],
  },
  {
    code: "DV-SAN-48",
    category,
    title: "Baterie de duș îngropată, cu corp încastrat și set de duș",
    unit: "buc",
    includes:
      "Montarea corpului încastrat în perete înaintea placajelor, racordarea la apă, proba de presiune, iar după placaje montarea părții aparente, a parei de ploaie și a dușului de mână.",
    excludes: "Șlițurile și refacerea peretelui.",
    measurement: "Numărul de baterii montate.",
    resources: [baterieIngropata(1), smallMaterials(3), instalator(3)],
  },
  {
    code: "DV-SAN-49",
    category,
    title: "Bideu cu baterie și sifon, cu montaj și racorduri",
    unit: "buc",
    includes:
      "Fixarea bideului, montarea bateriei și a sifonului, racordarea la apă caldă, rece și canalizare, etanșarea și proba de funcționare.",
    measurement: "Numărul de obiecte montate.",
    resources: [
      bideu(1),
      baterieBideu(1),
      sifonLavoar(1),
      racordFlexibil(2),
      robinetColtar(2),
      setPrindere(1),
      siliconSanitar(0.2),
      instalator(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-50",
    category,
    title: "Vas WC suspendat cu capac, pe cadru montat anterior",
    unit: "buc",
    includes:
      "Tăierea la lungime a racordurilor cadrului, fixarea vasului pe tijele cadrului, racordarea la scurgere și la alimentare, montarea capacului și proba de spălare.",
    excludes: "Cadrul cu rezervor îngropat (DV-SAN-51).",
    measurement: "Numărul de vase montate.",
    resources: [
      vasWcSuspendat(1),
      racordWc(1),
      siliconSanitar(0.2),
      smallMaterials(2),
      instalator(2),
    ],
  },
  {
    code: "DV-SAN-51",
    category,
    title:
      "Rezervor WC îngropat cu cadru de montaj și clapetă, montat în perete",
    unit: "buc",
    includes:
      "Trasarea, fixarea cadrului în pardoseală și în perete, reglarea înălțimii, racordarea la apă și la canalizare, proba de etanșeitate, iar după placaje montarea clapetei de acționare.",
    excludes:
      "Închiderea cadrului cu gips-carton sau zidărie, placajele și vasul WC (DV-SAN-50).",
    measurement: "Numărul de rezervoare montate.",
    resources: [
      rezervorIngropat(1),
      clapeta(1),
      dibluMetalic(4),
      racordFlexibil(1),
      robinetColtar(1),
      smallMaterials(2),
      instalator(3.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-52",
    category,
    title: "Pisoar cu robinet temporizat, cu montaj și racorduri",
    unit: "buc",
    includes:
      "Fixarea pisoarului pe perete, montarea robinetului temporizat și a sifonului, racordarea la apă și la canalizare, etanșarea și proba de funcționare.",
    measurement: "Numărul de obiecte montate.",
    resources: [
      pisoar(1),
      robinetPisoar(1),
      sifonPisoar(1),
      setPrindere(1),
      siliconSanitar(0.2),
      instalator(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-53",
    category,
    title: "Chiuvetă de bucătărie din inox cu baterie și sifon, cu montaj",
    unit: "buc",
    includes:
      "Montarea chiuvetei în decupajul blatului, cu garnitură și cleme, montarea bateriei și a sifonului, racordarea la apă și la canalizare și proba de funcționare.",
    excludes: "Decuparea blatului și mobilierul.",
    measurement: "Numărul de chiuvete montate.",
    resources: [
      chiuvetaInox(1),
      baterieBucatarie(1),
      sifonChiuveta(1),
      racordFlexibil(2),
      robinetColtar(2),
      siliconSanitar(0.3),
      instalator(2.5),
    ],
  },
  {
    code: "DV-SAN-54",
    category,
    title: "Mobilier de baie suspendat cu lavoar încorporat, baterie și sifon",
    unit: "set",
    includes:
      "Trasarea, fixarea corpului suspendat în perete, montarea lavoarului, a bateriei și a sifonului, racordarea la apă și la canalizare, reglarea ușilor și proba de funcționare.",
    measurement: "Numărul de seturi montate.",
    resources: [
      mobilierBaie(1),
      baterieLavoar(1),
      sifonLavoar(1),
      racordFlexibil(2),
      robinetColtar(2),
      dibluMetalic(4),
      siliconSanitar(0.3),
      instalator(3),
      necalificat(1),
    ],
  },
  {
    code: "DV-SAN-55",
    category,
    title: "Racord pentru mașina de spălat, cu robinet și sifon de perete",
    unit: "buc",
    includes:
      "Montarea robinetului de alimentare pe conducta de apă rece, a sifonului de perete și a legăturii la canalizare, proba de etanșeitate.",
    excludes: "Conductele de apă și de canalizare până la locul de racord.",
    measurement: "Numărul de racorduri realizate.",
    resources: [
      robinetMasina(1),
      sifonMasina(1),
      tevaCanal40(1),
      fitingCanal40(2),
      smallMaterials(2),
      instalator(1.5),
    ],
  },
  {
    code: "DV-SAN-56",
    category,
    title: "Boiler electric de 120 l, cu montaj și racorduri",
    unit: "buc",
    includes:
      "Fixarea boilerului pe perete cu ancore, racordarea la apă rece și caldă cu robineți de izolare, montarea supapei de siguranță și a evacuării, umplerea și proba de funcționare.",
    excludes: "Circuitul electric dedicat (categoria Instalații electrice).",
    measurement: "Numărul de boilere montate.",
    resources: [
      boiler120(1),
      supapa(1),
      robinetSferic(2),
      racordFlexibil(2),
      dibluMetalic(2),
      smallMaterials(2),
      instalator(3),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-57",
    category,
    title: "Încălzitor electric instant de 5,5 kW la punctul de consum",
    unit: "buc",
    includes:
      "Fixarea aparatului, racordarea la apă rece și la punctul de consum, proba de etanșeitate și de funcționare.",
    excludes: "Circuitul electric dedicat (categoria Instalații electrice).",
    measurement: "Numărul de aparate montate.",
    resources: [
      instant(1),
      racordFlexibil(2),
      robinetColtar(1),
      smallMaterials(2),
      instalator(1.5),
    ],
  },
  {
    code: "DV-SAN-58",
    category,
    title: "Stație de dedurizare a apei, cu filtru de sedimente și bypass",
    unit: "buc",
    includes:
      "Montarea filtrului de sedimente și a stației pe conducta de alimentare, realizarea bypass-ului cu trei robineți, racordarea evacuării la canalizare, încărcarea cu sare, punerea în funcțiune și reglarea durității.",
    excludes: "Priza electrică a stației.",
    measurement: "Numărul de stații montate.",
    resources: [
      statieDedurizare(1),
      filtruSedimente(1),
      robinetSferic(3),
      sareDedurizare(1),
      smallMaterials(3),
      instalator(5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-59",
    category,
    title: "Sistem de filtrare cu osmoză inversă sub chiuvetă, cu montaj",
    unit: "buc",
    includes:
      "Fixarea sistemului în corpul de mobilier, racordarea la apă rece, montarea robinetului pe blat sau chiuvetă, racordarea evacuării la sifon, spălarea membranei și proba de funcționare.",
    measurement: "Numărul de sisteme montate.",
    resources: [osmoza(1), smallMaterials(2), instalator(2)],
  },
  {
    code: "DV-SAN-60",
    category,
    title: "Set de accesorii de baie, cu montaj",
    unit: "set",
    includes:
      "Trasarea, găurirea placajelor cu burghiu pentru gresie, fixarea suportului de hârtie, a cuierului, a suportului de prosoape și a oglinzii.",
    measurement: "Numărul de seturi montate.",
    resources: [setAccesorii(1), smallMaterials(3), instalator(1.5)],
  },
  {
    code: "DV-SAN-61",
    category,
    title: "Bară de sprijin din inox pentru persoane cu mobilitate redusă",
    unit: "buc",
    includes:
      "Trasarea la înălțimea cerută, găurirea, fixarea barei cu ancore metalice în perete portant și proba de rezistență.",
    measurement: "Numărul de bare montate.",
    resources: [
      baraSprijin(1),
      dibluMetalic(4),
      smallMaterials(2),
      instalator(1),
    ],
  },
  {
    code: "DV-SAN-62",
    category,
    title: "Robinet de grădină antiîngheț montat prin perete exterior",
    unit: "buc",
    includes:
      "Carotarea peretelui, montarea robinetului cu țeava prin perete, racordarea la instalația interioară, etanșarea trecerii și proba de funcționare.",
    measurement: "Numărul de robineți montați.",
    resources: [
      robinetGradina(1),
      spuma(0.3),
      smallMaterials(3),
      instalator(2),
    ],
  },
  {
    code: "DV-SAN-63",
    category,
    title: "Hidrant interior de incendiu cu furtun plat, în cutie, cu montaj",
    unit: "buc",
    includes:
      "Fixarea cutiei în perete sau în nișă, montarea robinetului de hidrant, a tamburului cu furtun și a țevii de refulare, racordarea la coloana de incendiu și proba de presiune.",
    excludes: "Coloana de incendiu și semnalizarea.",
    measurement: "Numărul de hidranți montați.",
    resources: [
      hidrantInterior(1),
      dibluMetalic(4),
      smallMaterials(3),
      instalator(4),
      necalificat(1),
    ],
  },
  {
    code: "DV-SAN-64",
    category,
    title: "Hidrant exterior suprateran DN80, cu cot cu talpă, vană și cămin",
    unit: "buc",
    includes:
      "Montarea cotului cu talpă pe bloc de beton, a hidrantului și a vanei de secționare în cămin, racordarea la rețeaua de incendiu, proba de presiune și marcarea.",
    excludes:
      "Săpătura și umplutura (categoria Terasamente) și conducta de alimentare.",
    measurement: "Numărul de hidranți montați.",
    resources: [
      hidrantExterior(1),
      vanaSectionare(1),
      cotTalpa(1),
      caminVana(1),
      betonC16(0.3),
      smallMaterials(3),
      instalator(10),
      necalificat(8),
    ],
  },
  {
    code: "DV-SAN-65",
    category,
    title: "Montaj obiect sanitar furnizat de beneficiar (lavoar, WC, bideu)",
    unit: "buc",
    includes:
      "Fixarea obiectului, montarea bateriei și a sifonului livrate cu el, racordarea la apă și la canalizare și proba de funcționare; racordurile flexibile, robineții colțar și setul de prindere sunt incluse.",
    excludes: "Obiectul sanitar, bateria și sifonul, furnizate de beneficiar.",
    measurement: "Numărul de obiecte montate.",
    resources: [
      racordFlexibil(2),
      robinetColtar(2),
      setPrindere(1),
      siliconSanitar(0.2),
      instalator(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-66",
    category,
    title: "Montaj cadă sau cabină de duș furnizată de beneficiar",
    unit: "buc",
    includes:
      "Asamblarea, poziționarea și calarea, montarea sifonului livrat, racordarea la canalizare, etanșarea cu silicon și proba de etanșeitate.",
    excludes: "Cada sau cabina, sifonul și bateria, furnizate de beneficiar.",
    measurement: "Numărul de obiecte montate.",
    resources: [
      siliconSanitar(1),
      smallMaterials(2),
      instalator(4.5),
      necalificat(1),
    ],
  },
];
