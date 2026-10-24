import type { BaseNorm } from "./norm";
import {
  adezivBca,
  bandaPerimetrala,
  betonC16,
  betoniera,
  blocBca10,
  blocBca25,
  blocCeramic25,
  blocCeramic30,
  caramidaPlina,
  material,
  montatorGips,
  mortarZidarie,
  necalificat,
  otelBeton,
  smallMaterials,
  zidar,
} from "./resources";

const category = "Zidărie";

const blocCeramic38 = material(
  "Bloc ceramic cu goluri verticale, 38 cm",
  "buc",
  10.5,
);
const blocCeramic115 = material(
  "Bloc ceramic cu goluri verticale, 11,5 cm",
  "buc",
  4,
);
const blocCeramicSlefuit = material(
  "Bloc ceramic șlefuit cu goluri verticale, 25 cm",
  "buc",
  8,
);
const spumaAdeziva = material(
  "Spumă adezivă pentru blocuri ceramice șlefuite, 750 ml",
  "buc",
  45,
);
const blocBca30 = material("Bloc de BCA, 30 cm", "buc", 12);
const blocBca20 = material("Bloc de BCA, 20 cm", "buc", 8.2);
const blocBca15 = material("Bloc de BCA, 15 cm", "buc", 6.2);
const ancoraZidarie = material(
  "Ancoră de zidărie pentru legătura cu pereții",
  "buc",
  1.2,
);
const caramidaKlinker = material("Cărămidă aparentă klinker", "buc", 4.5);
const mortarAparent = material("Mortar pentru zidărie aparentă", "kg", 1.8);
const mortarRostuire = material(
  "Mortar de rostuire pentru zidărie aparentă",
  "kg",
  2,
);
const piatraZidarie = material(
  "Piatră naturală brută pentru zidărie",
  "mc",
  350,
);
const boltar = material("Boltar din beton, 40 × 20 × 20 cm", "buc", 7.5);
const caramidaSticla = material(
  "Cărămidă de sticlă, 19 × 19 × 8 cm",
  "buc",
  18,
);
const mortarSticla = material(
  "Mortar alb pentru cărămidă de sticlă",
  "kg",
  2.2,
);
const baraSticla = material("Bară de armare pentru cărămidă de sticlă", "m", 4);
const armaturaRost = material("Armătură de rost pentru zidărie", "m", 6);
const placaIpsos = material("Placă de ipsos cu nut și feder, 8 cm", "mp", 48);
const adezivIpsos = material("Adeziv pentru plăci de ipsos", "kg", 2);

export const zidarie: BaseNorm[] = [
  {
    code: "DV-ZID-01",
    category,
    title:
      "Zidărie din blocuri ceramice cu goluri verticale de 25 cm, cu mortar M10",
    unit: "mc",
    includes:
      "Prepararea mortarului, zidirea cu rosturi orizontale pline, tăierea blocurilor la colțuri și goluri, transportul materialelor la locul de muncă.",
    excludes:
      "Buiandrugii, stâlpișorii și centurile din beton armat; schela pentru înălțimi de peste 3 m.",
    measurement: "Volumul zidăriei, fără golurile de uși și ferestre.",
    resources: [
      blocCeramic25(46),
      mortarZidarie(0.09),
      smallMaterials(1),
      zidar(3.6),
      necalificat(1.8),
      betoniera(0.2),
    ],
  },
  {
    code: "DV-ZID-02",
    category,
    title:
      "Zidărie din blocuri ceramice cu goluri verticale de 30 cm, cu mortar M10",
    unit: "mc",
    includes:
      "Prepararea mortarului, zidirea cu rosturi orizontale pline, tăierea blocurilor la colțuri și goluri, transportul materialelor la locul de muncă.",
    excludes:
      "Buiandrugii, stâlpișorii și centurile din beton armat; schela pentru înălțimi de peste 3 m.",
    measurement: "Volumul zidăriei, fără golurile de uși și ferestre.",
    resources: [
      blocCeramic30(55),
      mortarZidarie(0.085),
      smallMaterials(1),
      zidar(3.3),
      necalificat(1.65),
      betoniera(0.2),
    ],
  },
  {
    code: "DV-ZID-03",
    category,
    title: "Zidărie din blocuri de BCA de 25 cm, cu adeziv în strat subțire",
    unit: "mc",
    includes:
      "Primul rând pe mortar, pentru nivelare, zidirea cu adeziv, tăierea și șlefuirea blocurilor, transportul materialelor la locul de muncă.",
    excludes:
      "Buiandrugii, stâlpișorii și centurile din beton armat; schela pentru înălțimi de peste 3 m.",
    measurement: "Volumul zidăriei, fără golurile de uși și ferestre.",
    resources: [
      blocBca25(34.3),
      adezivBca(22),
      mortarZidarie(0.01),
      zidar(2.6),
      necalificat(1.2),
    ],
  },
  {
    code: "DV-ZID-04",
    category,
    title: "Pereți despărțitori din blocuri de BCA de 10 cm, cu adeziv",
    unit: "mp",
    includes:
      "Zidirea cu adeziv, tăierea blocurilor, legarea de pereții existenți cu ancore, transportul materialelor la locul de muncă.",
    excludes: "Buiandrugii peste uși.",
    measurement: "Suprafața peretelui, fără golurile de uși.",
    resources: [
      blocBca10(8.6),
      adezivBca(2.4),
      smallMaterials(2),
      zidar(0.45),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-ZID-05",
    category,
    title: "Zidărie din cărămidă plină de 24 cm, cu mortar M10",
    unit: "mc",
    includes:
      "Prepararea mortarului, zidirea cu rosturi pline, țeserea la colțuri și intersecții, transportul materialelor la locul de muncă.",
    excludes: "Schela pentru înălțimi de peste 3 m.",
    measurement: "Volumul zidăriei, fără goluri.",
    resources: [
      caramidaPlina(410),
      mortarZidarie(0.26),
      zidar(6.5),
      necalificat(3.2),
      betoniera(0.5),
    ],
  },
  {
    code: "DV-ZID-06",
    category,
    title:
      "Zidărie din blocuri ceramice cu goluri verticale de 38 cm, cu mortar M10",
    unit: "mc",
    includes:
      "Prepararea mortarului, zidirea cu rosturi orizontale pline, tăierea blocurilor la colțuri și goluri, transportul materialelor la locul de muncă.",
    excludes:
      "Buiandrugii, stâlpișorii și centurile din beton armat; schela pentru înălțimi de peste 3 m.",
    measurement: "Volumul zidăriei, fără golurile de uși și ferestre.",
    resources: [
      blocCeramic38(46),
      mortarZidarie(0.08),
      smallMaterials(1),
      zidar(3.2),
      necalificat(1.6),
      betoniera(0.2),
    ],
  },
  {
    code: "DV-ZID-07",
    category,
    title: "Zidărie din blocuri ceramice șlefuite de 25 cm, cu spumă adezivă",
    unit: "mc",
    includes:
      "Primul rând pe mortar, la nivel, zidirea cu spumă adezivă în două cordoane, tăierea blocurilor, transportul materialelor la locul de muncă.",
    excludes:
      "Buiandrugii, stâlpișorii și centurile din beton armat; schela pentru înălțimi de peste 3 m.",
    measurement: "Volumul zidăriei, fără golurile de uși și ferestre.",
    resources: [
      blocCeramicSlefuit(46),
      spumaAdeziva(1.2),
      mortarZidarie(0.01),
      zidar(2.8),
      necalificat(1.2),
    ],
  },
  {
    code: "DV-ZID-08",
    category,
    title: "Pereți despărțitori din blocuri ceramice de 11,5 cm, cu mortar M10",
    unit: "mp",
    includes:
      "Zidirea cu mortar, tăierea blocurilor, legarea de pereții existenți cu ancore din două în două rânduri, transportul materialelor la locul de muncă.",
    excludes: "Buiandrugii peste uși.",
    measurement: "Suprafața peretelui, fără golurile de uși.",
    resources: [
      blocCeramic115(8.5),
      mortarZidarie(0.012),
      ancoraZidarie(1.5),
      zidar(0.55),
      necalificat(0.25),
    ],
  },
  {
    code: "DV-ZID-09",
    category,
    title: "Zidărie din blocuri de BCA de 30 cm, cu adeziv în strat subțire",
    unit: "mc",
    includes:
      "Primul rând pe mortar, pentru nivelare, zidirea cu adeziv, tăierea și șlefuirea blocurilor, transportul materialelor la locul de muncă.",
    excludes:
      "Buiandrugii, stâlpișorii și centurile din beton armat; schela pentru înălțimi de peste 3 m.",
    measurement: "Volumul zidăriei, fără golurile de uși și ferestre.",
    resources: [
      blocBca30(23),
      adezivBca(18),
      mortarZidarie(0.01),
      zidar(2.4),
      necalificat(1.1),
    ],
  },
  {
    code: "DV-ZID-10",
    category,
    title: "Pereți despărțitori din blocuri de BCA de 15 cm, cu adeziv",
    unit: "mp",
    includes:
      "Zidirea cu adeziv, tăierea blocurilor, legarea de pereții existenți cu ancore, transportul materialelor la locul de muncă.",
    excludes: "Buiandrugii peste uși.",
    measurement: "Suprafața peretelui, fără golurile de uși.",
    resources: [
      blocBca15(6.9),
      adezivBca(3),
      ancoraZidarie(1.5),
      smallMaterials(1),
      zidar(0.5),
      necalificat(0.22),
    ],
  },
  {
    code: "DV-ZID-11",
    category,
    title: "Pereți din blocuri de BCA de 20 cm, cu adeziv",
    unit: "mp",
    includes:
      "Zidirea cu adeziv, tăierea blocurilor, legarea de pereții existenți cu ancore, transportul materialelor la locul de muncă.",
    excludes: "Buiandrugii, stâlpișorii și centurile.",
    measurement: "Suprafața peretelui, fără goluri.",
    resources: [
      blocBca20(6.9),
      adezivBca(4),
      ancoraZidarie(1.5),
      smallMaterials(1),
      zidar(0.6),
      necalificat(0.28),
    ],
  },
  {
    code: "DV-ZID-12",
    category,
    title:
      "Zidărie aparentă din cărămidă klinker de 11,5 cm, cu rosturi profilate",
    unit: "mp",
    includes:
      "Zidirea cu mortar special, cu rosturile pline și profilate pe măsura lucrului, ancorele de legătură cu peretele din spate, protejarea zidăriei de ploaie.",
    excludes: "Peretele portant din spate; schela; curățarea finală cu acizi.",
    measurement: "Suprafața zidăriei aparente, fără goluri.",
    resources: [
      caramidaKlinker(52),
      mortarAparent(35),
      ancoraZidarie(4),
      zidar(2.2),
      necalificat(0.9),
    ],
  },
  {
    code: "DV-ZID-13",
    category,
    title:
      "Zidărie din piatră naturală brută cu mortar, pentru garduri și ziduri de sprijin",
    unit: "mc",
    includes:
      "Sortarea și spălarea pietrei, zidirea cu rosturi pline și fețele văzute alese, prepararea mortarului.",
    excludes: "Fundația; rostuirea decorativă; drenajul din spatele zidului.",
    measurement: "Volumul zidăriei.",
    resources: [
      piatraZidarie(1.15),
      mortarZidarie(0.35),
      zidar(7),
      necalificat(4),
      betoniera(0.6),
    ],
  },
  {
    code: "DV-ZID-14",
    category,
    title:
      "Zidărie din boltari de beton de 20 cm, cu golurile armate și umplute cu beton din două în două",
    unit: "mp",
    includes:
      "Zidirea boltarilor cu mortar, barele verticale în goluri, umplerea golurilor armate cu beton și îndesarea lui.",
    excludes: "Fundația și centura de la partea de sus.",
    measurement: "Suprafața peretelui, fără goluri.",
    resources: [
      boltar(13),
      mortarZidarie(0.015),
      betonC16(0.04),
      otelBeton(2),
      zidar(0.8),
      necalificat(0.4),
      betoniera(0.05),
    ],
  },
  {
    code: "DV-ZID-15",
    category,
    title: "Pereți din cărămidă de sticlă, cu mortar alb și armături",
    unit: "mp",
    includes:
      "Zidirea cu distanțieri și mortar alb, barele de armare în rosturi pe ambele direcții, rostuirea și curățarea sticlei, banda elastică pe contur.",
    excludes: "Rama sau golul pregătit în care se zidește.",
    measurement: "Suprafața peretelui.",
    resources: [
      caramidaSticla(25),
      mortarSticla(20),
      baraSticla(6),
      smallMaterials(5),
      zidar(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-ZID-16",
    category,
    title:
      "Închiderea golurilor de uși și ferestre cu zidărie de BCA de 25 cm, ancorată în zidăria existentă",
    unit: "mp",
    includes:
      "Curățarea marginilor golului, ancorele bătute în zidăria existentă, zidirea cu adeziv și împănarea ultimului rând cu mortar.",
    excludes: "Tencuiala de pe ambele fețe.",
    measurement: "Suprafața golului închis.",
    resources: [
      blocBca25(8.6),
      adezivBca(6),
      mortarZidarie(0.004),
      ancoraZidarie(4),
      zidar(1.1),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-ZID-17",
    category,
    title:
      "Armarea rosturilor de zidărie cu armătură prefabricată, din două în două rânduri",
    unit: "m",
    includes:
      "Așezarea armăturii în patul de mortar, cu suprapunerile și întoarcerile la colțuri.",
    measurement: "Lungimea armăturii montate.",
    resources: [armaturaRost(1.05), zidar(0.03)],
  },
  {
    code: "DV-ZID-18",
    category,
    title: "Rostuirea zidăriei aparente din cărămidă sau piatră",
    unit: "mp",
    includes:
      "Curățarea rosturilor pe 1,5 cm adâncime, umezirea, umplerea cu mortar de rostuire și profilarea rostului.",
    measurement: "Suprafața zidăriei rostuite, fără goluri.",
    resources: [mortarRostuire(5), zidar(0.4), necalificat(0.1)],
  },
  {
    code: "DV-ZID-19",
    category,
    title:
      "Pereți despărțitori din plăci de ipsos cu nut și feder de 8 cm, lipite",
    unit: "mp",
    includes:
      "Banda elastică pe contur, zidirea plăcilor cu adeziv de ipsos, tăieturile, șpăcluirea rosturilor, gata de glet.",
    excludes: "Gletul pe toată suprafața; buiandrugii peste uși.",
    measurement: "Suprafața peretelui, fără golurile de uși.",
    resources: [
      placaIpsos(1.05),
      adezivIpsos(2),
      bandaPerimetrala(0.6),
      montatorGips(0.6),
      necalificat(0.2),
    ],
  },
];
