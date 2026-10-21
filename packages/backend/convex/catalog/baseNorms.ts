import type { NormResourceInput } from "./resourceRows";

// Devize's own catalog of Norme de bază (docs/adr/0002 and 0010): generic
// norms with no brand, written by the Devize team from current practice. A
// super admin publishes this edition from the admin panel; a norm whose
// content changed becomes a new version of the one already published.
//
// Reference prices are lei without VAT, a fallback until a firm sets its own
// Tarife or a store price applies. Labour is per hour, without the CAM that
// the Deviz adds.

/** The edition of this catalog, shown on every norm it publishes. */
export const BASE_EDITION = "octombrie 2026";

export const baseCategories = [
  "Demolări și desfaceri",
  "Terasamente și lucrări exterioare",
  "Betoane și armături",
  "Zidărie",
  "Acoperișuri",
  "Termoizolații",
  "Hidroizolații",
  "Tencuieli și gleturi",
  "Gips-carton",
  "Pardoseli",
  "Placaje",
  "Zugrăveli și vopsitorii",
  "Tâmplărie",
  "Instalații sanitare",
  "Instalații electrice",
  "Schele",
] as const;

export type BaseCategory = (typeof baseCategories)[number];

export type BaseNorm = {
  code: string;
  category: BaseCategory;
  title: string;
  unit: string;
  includes: string;
  excludes?: string;
  measurement: string;
  resources: NormResourceInput[];
};

type Consumption = (quantity: number) => NormResourceInput;

function material(name: string, unit: string, price: number): Consumption {
  return (quantity) => ({
    kind: "material",
    name,
    unit,
    quantity,
    referencePrice: price,
  });
}

function labor(name: string, price: number): Consumption {
  return (quantity) => ({
    kind: "labor",
    name,
    unit: "ora",
    quantity,
    referencePrice: price,
  });
}

function equipment(name: string, unit: string, price: number): Consumption {
  return (quantity) => ({
    kind: "equipment",
    name,
    unit,
    quantity,
    referencePrice: price,
  });
}

function transport(name: string, unit: string, price: number): Consumption {
  return (quantity) => ({
    kind: "transport",
    name,
    unit,
    quantity,
    referencePrice: price,
  });
}

/** Consumables too small to list, as a percentage of the norm's materials. */
function smallMaterials(percent: number): NormResourceInput {
  return {
    kind: "material",
    name: "Material mărunt",
    unit: "%",
    quantity: percent,
  };
}

// Labour, lei per hour.
const necalificat = labor("Muncitor necalificat", 28);
const zidar = labor("Zidar", 35);
const betonist = labor("Betonist", 34);
const fierar = labor("Fierar betonist", 35);
const dulgher = labor("Dulgher", 35);
const tencuitor = labor("Tencuitor", 35);
const zugrav = labor("Zugrav", 34);
const vopsitor = labor("Vopsitor", 34);
const faiantar = labor("Faianțar", 38);
const parchetar = labor("Parchetar", 35);
const montatorGips = labor("Montator gips-carton", 36);
const izolator = labor("Izolator", 34);
const instalator = labor("Instalator", 38);
const electrician = labor("Electrician", 40);
const tinichigiu = labor("Tinichigiu", 37);
const invelitor = labor("Învelitor", 36);
const montatorTamplarie = labor("Montator tâmplărie", 36);
const pavator = labor("Pavator", 33);
const schelar = labor("Schelar", 32);

// Equipment, lei per hour with its operator, unless the unit says otherwise.
const rotopercutor = equipment("Ciocan rotopercutor", "ora", 10);
const ciocanDemolator = equipment("Ciocan demolator", "ora", 15);
const betoniera = equipment("Betonieră 250 l", "ora", 12);
const vibrator = equipment("Vibrator pentru beton", "ora", 12);
const pompaBeton = equipment("Pompă de beton", "ora", 450);
const masinaFasonat = equipment(
  "Mașină de tăiat și fasonat armături",
  "ora",
  20,
);
const masinaTencuit = equipment("Mașină de tencuit", "ora", 40);
const masinaTaiatPlaci = equipment("Mașină de tăiat plăci ceramice", "ora", 10);
const masinaSlituit = equipment("Mașină de șlițuit", "ora", 15);
const suduraPpr = equipment("Aparat de sudură pentru țevi PPR", "ora", 8);
const excavator = equipment("Excavator pe șenile de 0,6 mc", "ora", 280);
const maiCompactor = equipment("Mai compactor", "ora", 15);
const placaVibranta = equipment("Placă vibrantă", "ora", 18);
const popiCofraje = equipment(
  "Popi metalici și grinzi pentru cofraje, chirie",
  "mp",
  9,
);
const chirieSchela = equipment(
  "Schelă metalică de fațadă, chirie pe o lună",
  "mp",
  6,
);

// Transport.
const autobasculanta = transport("Transport cu autobasculanta", "tkm", 1.4);
const containerMoloz = transport(
  "Container de 7 mc pentru moloz, cu transport și depozitare",
  "buc",
  520,
);

// Masonry, concrete and formwork.
const blocCeramic25 = material(
  "Bloc ceramic cu goluri verticale, 25 cm",
  "buc",
  7,
);
const blocCeramic30 = material(
  "Bloc ceramic cu goluri verticale, 30 cm",
  "buc",
  8.2,
);
const blocBca25 = material("Bloc de BCA, 25 cm", "buc", 10);
const blocBca10 = material("Bloc de BCA, 10 cm", "buc", 4.3);
const caramidaPlina = material("Cărămidă plină", "buc", 1.5);
const mortarZidarie = material("Mortar de zidărie M10", "mc", 400);
const mortarSapa = material("Mortar de ciment M15 pentru șapă", "mc", 440);
const adezivBca = material("Adeziv pentru BCA", "kg", 1.3);
const betonC8 = material("Beton C8/10", "mc", 360);
const betonC16 = material("Beton C16/20", "mc", 430);
const betonC20 = material("Beton C20/25", "mc", 465);
const otelBeton = material("Oțel beton BST500S", "kg", 3.5);
const plasaSudata = material("Plasă sudată", "kg", 4);
const sarma = material("Sârmă neagră pentru legat armături", "kg", 9);
const cherestea = material("Cherestea de rășinoase", "mc", 1300);
const lemnEcarisat = material("Lemn ecarisat de rășinoase", "mc", 1600);
const placajFilmat = material("Placaj filmat pentru cofraje, 18 mm", "mp", 80);
const cuie = material("Cuie", "kg", 9);
const uleiDecofrare = material("Ulei de decofrare", "l", 8);
const elementeImbinare = material(
  "Elemente metalice de îmbinare pentru lemn",
  "kg",
  14,
);
const balast = material("Balast", "mc", 85);
const nisip = material("Nisip", "mc", 110);

// Plasters and drywall.
const tencuialaIpsos = material(
  "Tencuială mecanizată pe bază de ipsos",
  "kg",
  0.95,
);
const tencuialaCimentVar = material(
  "Tencuială mecanizată pe bază de ciment și var",
  "kg",
  0.52,
);
const sprit = material(
  "Amorsă de aderență (șpriț) pentru tencuieli",
  "kg",
  0.6,
);
const profileTencuiala = material(
  "Profile de ghidaj și colțare pentru tencuieli",
  "m",
  2.4,
);
const gletIpsos = material("Glet de ipsos", "kg", 1.6);
const ipsos = material("Ipsos de construcții", "kg", 1.2);
const placaGips = material("Placă de gips-carton, 12,5 mm", "mp", 16.5);
const profilCW75 = material("Profil CW 75", "m", 6);
const profilUW75 = material("Profil UW 75", "m", 5);
const profilCD60 = material("Profil CD 60", "m", 4.1);
const profilUD30 = material("Profil UD 30", "m", 3.3);
const brida = material("Bridă pentru profile CD", "buc", 0.7);
const setSuspendare = material(
  "Set de suspendare pentru plafoane (tijă și piesă)",
  "set",
  3,
);
const surubGips = material("Șurub autoforant pentru gips-carton", "buc", 0.04);
const dibluCui = material("Diblu cu cui, 6 × 40 mm", "buc", 0.25);
const ancoraTavan = material("Ancoră metalică pentru tavan", "buc", 0.9);
const bandaProfile = material("Bandă de etanșare pentru profile", "m", 0.8);
const bandaRosturi = material("Bandă de hârtie pentru rosturi", "m", 0.13);
const masaSpaclu = material("Masă de șpaclu pentru rosturi", "kg", 3);
const adezivGips = material("Adeziv pentru plăci de gips-carton", "kg", 1.3);

// Insulation and waterproofing.
const vataSticla5 = material("Vată minerală de sticlă, 5 cm", "mp", 9);
const vataSticla10 = material("Vată minerală de sticlă, 10 cm", "mp", 13);
const vataSticla15 = material("Vată minerală de sticlă, 15 cm", "mp", 19);
const eps80 = material("Polistiren expandat EPS 80, 10 cm", "mp", 25);
const xps5 = material("Polistiren extrudat XPS, 5 cm", "mp", 27);
const adezivPolistiren = material(
  "Adeziv pentru polistiren, lipire și armare",
  "kg",
  1,
);
const dibluTermo = material("Diblu pentru termoizolații", "buc", 0.6);
const plasaFatada = material(
  "Plasă din fibră de sticlă pentru fațade, 160 g/mp",
  "mp",
  3.3,
);
const profilColtPlasa = material("Profil de colț cu plasă", "m", 2.5);
const amorsaDecorativa = material(
  "Amorsă pentru tencuieli decorative",
  "kg",
  7,
);
const tencuialaDecorativa = material(
  "Tencuială decorativă acrilică, 1,5 mm",
  "kg",
  6,
);
const barieraVapori = material("Folie barieră de vapori", "mp", 2);
const bandaFolii = material("Bandă adezivă pentru folii", "m", 0.6);
const foliePolietilena = material("Folie de polietilenă", "mp", 0.8);
const amorsaBituminoasa = material("Amorsă bituminoasă", "kg", 9);
const membranaSbs4 = material("Membrană bituminoasă SBS, 4 mm", "mp", 21);
const membranaSbs3 = material("Membrană bituminoasă SBS, 3 mm", "mp", 17);
const membranaArdezie = material(
  "Membrană bituminoasă cu ardezie, 4,5 mm",
  "mp",
  27,
);
const gazPropan = material("Gaz propan", "kg", 9);
const mortarHidroizolant = material(
  "Mortar hidroizolant elastic bicomponent",
  "kg",
  9.5,
);
const bandaColturi = material(
  "Bandă de etanșare pentru colțuri și rosturi",
  "m",
  6,
);
const emulsieBituminoasa = material("Emulsie bituminoasă", "kg", 6);
const membranaCrampoane = material("Membrană cu crampoane", "mp", 6.5);
const profilInchidere = material(
  "Profil de închidere pentru membrana cu crampoane",
  "m",
  6,
);

// Floors, tiling and paint.
const fibre = material("Fibre de polipropilenă pentru șapă", "kg", 30);
const bandaPerimetrala = material("Bandă perimetrală din spumă", "m", 1);
const sapaAutonivelanta = material("Șapă autonivelantă", "kg", 2);
const amorsaSape = material("Amorsă pentru șape și adezivi", "kg", 9);
const gresie = material("Gresie porțelanată", "mp", 55);
const faianta = material("Faianță", "mp", 45);
const adezivC2TE = material("Adeziv flexibil C2TE", "kg", 1.6);
const chit = material("Chit de rosturi", "kg", 6);
const sistemNivelare = material("Sistem de nivelare pentru plăci", "buc", 0.2);
const plintaGresie = material("Plintă din gresie", "m", 9);
const profilFaianta = material("Profil de colț pentru faianță", "m", 4);
const siliconSanitar = material("Silicon sanitar, cartuș", "buc", 20);
const silicon = material("Silicon, cartuș", "buc", 18);
const parchetLaminat = material("Parchet laminat, 8 mm", "mp", 45);
const folieSpuma = material("Folie de spumă pentru parchet", "mp", 3.5);
const placiSpc = material("Pardoseală vinilică SPC cu click", "mp", 65);
const plintaParchet = material("Plintă din MDF sau PVC", "m", 12);
const grundAcrilic = material("Grund acrilic", "l", 9);
const vopseaLavabila = material("Vopsea lavabilă de interior", "l", 12);
const grundFatada = material("Grund pentru fațade", "l", 11);
const vopseaFatada = material("Vopsea lavabilă pentru fațade", "l", 18);
const grundAnticoroziv = material("Grund anticoroziv", "kg", 22);
const emailAlchidic = material("Email alchidic", "kg", 26);
const diluant = material("Diluant", "l", 14);
const lazura = material("Lazură pentru lemn", "l", 30);
const solutieLemn = material(
  "Soluție ignifugă și insecto-fungicidă pentru lemn",
  "kg",
  9,
);

// Joinery.
const fereastraPvc = material(
  "Fereastră din PVC cu geam termoizolant",
  "mp",
  650,
);
const spuma = material("Spumă poliuretanică, 750 ml", "buc", 28);
const bandaTamplarie = material("Bandă de etanșare pentru tâmplărie", "m", 4);
const dibluTamplarie = material("Diblu pentru tâmplărie", "buc", 1.2);
const ancoraTamplarie = material(
  "Ancoră pentru tâmplărie metalică",
  "buc",
  1.5,
);
const pervaz = material("Pervaz interior din PVC", "m", 45);
const glaf = material("Glaf exterior din aluminiu", "m", 40);
const usaInterioara = material("Ușă interioară cu toc reglabil", "buc", 750);
const feronerie = material("Feronerie pentru ușă", "set", 80);
const usaMetalica = material("Ușă metalică de exterior", "buc", 1800);

// Plumbing.
const tevaPpr20 = material("Țeavă PPR Ø20", "m", 3.3);
const fitingPpr20 = material("Fiting PPR Ø20", "buc", 1.5);
const tevaPpr25 = material("Țeavă PPR Ø25", "m", 5);
const fitingPpr25 = material("Fiting PPR Ø25", "buc", 2.2);
const clema = material("Clemă de fixare pentru țevi", "buc", 0.8);
const tevaCanal50 = material("Țeavă de canalizare PP Ø50", "m", 6);
const fitingCanal50 = material("Fiting de canalizare Ø50", "buc", 3.5);
const tevaCanal110 = material("Țeavă de canalizare PP Ø110", "m", 14);
const fitingCanal110 = material("Fiting de canalizare Ø110", "buc", 9);
const bratara = material("Brățară pentru țevi de canalizare", "buc", 3);
const vasWc = material("Vas WC cu rezervor", "set", 650);
const racordFlexibil = material("Racord flexibil pentru apă", "buc", 15);
const robinetColtar = material("Robinet colțar", "buc", 30);
const racordWc = material("Racord de scurgere pentru WC", "buc", 20);
const lavoar = material("Lavoar ceramic", "buc", 280);
const baterieLavoar = material("Baterie pentru lavoar", "buc", 220);
const sifonLavoar = material("Sifon pentru lavoar", "buc", 45);
const setPrindere = material(
  "Set de prindere pentru obiecte sanitare",
  "set",
  15,
);
const boiler = material("Boiler electric de 80 l", "buc", 750);
const supapa = material("Supapă de siguranță pentru boiler", "buc", 25);

// Electrical.
const cablu25 = material("Cablu CYY-F 3 × 2,5 mm²", "m", 6.2);
const cablu15 = material("Cablu CYY-F 3 × 1,5 mm²", "m", 4.2);
const tubFlexibil = material("Tub flexibil de protecție Ø20", "m", 1.2);
const dozaDerivatie = material("Doză de derivație", "buc", 2.5);
const dozaAparat = material("Doză pentru aparataj", "buc", 1.5);
const priza = material("Priză sau întrerupător", "buc", 18);
const corpIluminat = material("Corp de iluminat LED", "buc", 120);
const tablou = material("Tablou electric cu 12 module", "buc", 90);
const sigurantaAutomata = material("Siguranță automată", "buc", 22);
const diferential = material("Întrerupător diferențial", "buc", 150);

// Roofing.
const tiglaMetalica = material("Țiglă metalică", "mp", 36);
const tiglaCeramica = material("Țiglă ceramică", "buc", 5);
const clemaTigla = material("Clemă pentru țiglă", "buc", 0.25);
const folieAnticondens = material(
  "Folie anticondens pentru acoperișuri",
  "mp",
  3.2,
);
const surubTabla = material("Șurub autoforant pentru tablă", "buc", 0.3);
const jgheab = material("Jgheab semicircular din tablă vopsită", "m", 28);
const carligJgheab = material("Cârlig pentru jgheab", "buc", 7);
const accesoriuJgheab = material("Accesoriu pentru jgheab", "buc", 15);
const burlan = material("Burlan din tablă vopsită", "m", 26);
const bratariBurlan = material("Brățară pentru burlan", "buc", 9);
const cotBurlan = material("Cot pentru burlan", "buc", 22);

// Outdoor works.
const pavele = material("Pavele de beton, 6 cm", "mp", 42);
const bordura = material("Bordură de beton pentru alei", "buc", 16);

const demolition: BaseNorm[] = [
  {
    code: "DV-DEM-01",
    category: "Demolări și desfaceri",
    title: "Desfacerea tencuielilor interioare de pe pereți și tavane",
    unit: "mp",
    includes:
      "Desprinderea tencuielii până la zidărie sau beton, curățarea suprafeței și strângerea molozului în grămezi la locul de muncă.",
    excludes:
      "Încărcarea și transportul molozului; schela pentru înălțimi de peste 3 m.",
    measurement: "Suprafața de pe care s-a desfăcut tencuiala, fără goluri.",
    resources: [necalificat(0.45), rotopercutor(0.2)],
  },
  {
    code: "DV-DEM-02",
    category: "Demolări și desfaceri",
    title: "Desfacerea placajelor din faianță sau gresie, cu adezivul lor",
    unit: "mp",
    includes:
      "Spargerea și desprinderea plăcilor împreună cu adezivul sau mortarul de poză și strângerea molozului în grămezi.",
    excludes: "Refacerea suportului; încărcarea și transportul molozului.",
    measurement: "Suprafața placajului desfăcut.",
    resources: [necalificat(0.6), rotopercutor(0.3)],
  },
  {
    code: "DV-DEM-03",
    category: "Demolări și desfaceri",
    title:
      "Desfacerea pardoselilor din parchet sau parchet laminat, cu plintele",
    unit: "mp",
    includes:
      "Demontarea plintelor și a pardoselii, scoaterea foliilor de sub ea și stivuirea materialelor la locul de muncă.",
    excludes:
      "Desfacerea șapei; încărcarea și transportul materialelor rezultate.",
    measurement: "Suprafața pardoselii desfăcute.",
    resources: [necalificat(0.25)],
  },
  {
    code: "DV-DEM-04",
    category: "Demolări și desfaceri",
    title: "Demolarea zidăriei din cărămidă sau blocuri ceramice",
    unit: "mc",
    includes:
      "Demolarea zidăriei cu mortarul și tencuiala ei, sortarea și strângerea molozului în grămezi la locul de muncă.",
    excludes:
      "Sprijinirea elementelor de deasupra; încărcarea și transportul molozului.",
    measurement: "Volumul zidăriei demolate, cu tencuiala, fără goluri.",
    resources: [necalificat(4.5), ciocanDemolator(1.2)],
  },
  {
    code: "DV-DEM-05",
    category: "Demolări și desfaceri",
    title: "Demontarea tâmplăriei din lemn, PVC sau metal, cu tocul",
    unit: "mp",
    includes:
      "Demontarea cercevelelor sau a foilor de ușă și a tocului, desprinderea prinderilor și stivuirea la locul de muncă.",
    excludes: "Refacerea glafurilor și a tencuielii din jurul golului.",
    measurement: "Suprafața golului, măsurată la exteriorul tocului.",
    resources: [necalificat(0.6), montatorTamplarie(0.25)],
  },
  {
    code: "DV-DEM-06",
    category: "Demolări și desfaceri",
    title: "Încărcarea manuală a molozului în autobasculantă sau container",
    unit: "t",
    includes:
      "Încărcarea molozului strâns în grămezi, cu transport cu roaba pe cel mult 30 m.",
    excludes: "Transportul și taxa de depozitare.",
    measurement:
      "Masa molozului încărcat; un metru cub de moloz afânat are în jur de 1,4 t.",
    resources: [necalificat(1.1)],
  },
  {
    code: "DV-DEM-07",
    category: "Demolări și desfaceri",
    title: "Transportul molozului cu autobasculanta, la 20 km",
    unit: "t",
    includes:
      "Transportul la groapa de deșeuri sau la stația de reciclare, cu descărcarea.",
    excludes: "Încărcarea; taxa de depozitare.",
    measurement:
      "Masa molozului transportat. Pentru altă distanță, transportul este masa înmulțită cu distanța în kilometri.",
    resources: [autobasculanta(20)],
  },
  {
    code: "DV-DEM-08",
    category: "Demolări și desfaceri",
    title:
      "Evacuarea molozului cu container de 7 mc, cu transport și depozitare",
    unit: "buc",
    includes:
      "Aducerea containerului, ridicarea lui plin, transportul și taxa de depozitare a deșeurilor din construcții.",
    excludes: "Încărcarea molozului în container.",
    measurement: "Numărul de containere.",
    resources: [containerMoloz(1)],
  },
];

const earthworks: BaseNorm[] = [
  {
    code: "DV-TER-01",
    category: "Terasamente și lucrări exterioare",
    title: "Săpătură manuală în pământ pentru fundații, până la 1,5 m adâncime",
    unit: "mc",
    includes:
      "Săparea cu aruncarea pământului pe mal, nivelarea fundului și taluzarea pereților săpăturii.",
    excludes: "Sprijinirile; evacuarea apei; transportul pământului.",
    measurement: "Volumul săpăturii, după dimensiunile din proiect.",
    resources: [necalificat(3)],
  },
  {
    code: "DV-TER-02",
    category: "Terasamente și lucrări exterioare",
    title: "Săpătură mecanizată cu excavatorul, cu încărcare în autobasculantă",
    unit: "mc",
    includes:
      "Săparea cu excavatorul, încărcarea în mijlocul de transport și finisarea manuală a fundului săpăturii.",
    excludes: "Transportul pământului.",
    measurement: "Volumul săpăturii, după dimensiunile din proiect.",
    resources: [excavator(0.035), necalificat(0.1)],
  },
  {
    code: "DV-TER-03",
    category: "Terasamente și lucrări exterioare",
    title: "Umplutură din pământ compactat în straturi, cu maiul compactor",
    unit: "mc",
    includes:
      "Împrăștierea pământului în straturi de cel mult 20 cm, udarea și compactarea fiecărui strat.",
    excludes: "Aducerea pământului de la distanță.",
    measurement: "Volumul umpluturii compactate.",
    resources: [necalificat(1.4), maiCompactor(0.35)],
  },
  {
    code: "DV-TER-04",
    category: "Terasamente și lucrări exterioare",
    title: "Strat de balast compactat sub fundații, pardoseli sau alei",
    unit: "mc",
    includes:
      "Așezarea balastului în straturi, udarea și compactarea cu placa vibrantă.",
    measurement: "Volumul stratului compactat.",
    resources: [balast(1.25), necalificat(1.2), placaVibranta(0.3)],
  },
  {
    code: "DV-TER-05",
    category: "Terasamente și lucrări exterioare",
    title: "Trotuar din beton C16/20 de 10 cm, pe strat de balast de 10 cm",
    unit: "mp",
    includes:
      "Stratul de balast compactat, cofrajul marginilor, turnarea și finisarea betonului, rosturile de dilatare.",
    excludes: "Armarea cu plasă sudată.",
    measurement: "Suprafața trotuarului.",
    resources: [
      balast(0.125),
      betonC16(0.103),
      cherestea(0.002),
      betonist(0.4),
      necalificat(0.5),
      vibrator(0.05),
      placaVibranta(0.03),
    ],
  },
  {
    code: "DV-TER-06",
    category: "Terasamente și lucrări exterioare",
    title: "Pavaj din pavele de beton de 6 cm, pe strat de nisip",
    unit: "mp",
    includes:
      "Stratul de nisip nivelat, așezarea pavelelor, tăieturile, compactarea și umplerea rosturilor cu nisip.",
    excludes: "Fundația de balast; bordurile.",
    measurement: "Suprafața pavată.",
    resources: [
      nisip(0.055),
      pavele(1.03),
      pavator(0.55),
      necalificat(0.4),
      placaVibranta(0.04),
    ],
  },
  {
    code: "DV-TER-07",
    category: "Terasamente și lucrări exterioare",
    title: "Bordură prefabricată din beton pentru alei, pe fundație de beton",
    unit: "m",
    includes:
      "Săparea șanțului, fundația de beton, așezarea bordurilor și rostuirea lor.",
    measurement: "Lungimea bordurii.",
    resources: [
      bordura(1),
      betonC16(0.03),
      mortarZidarie(0.002),
      pavator(0.35),
      necalificat(0.3),
    ],
  },
];

const concrete: BaseNorm[] = [
  {
    code: "DV-BET-01",
    category: "Betoane și armături",
    title: "Beton simplu C8/10 în egalizări și umpluturi, turnat fără pompă",
    unit: "mc",
    includes:
      "Primirea betonului din autobetonieră, turnarea direct din jgheab sau cu roaba, nivelarea și protejarea suprafeței.",
    excludes: "Cofrajele.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [betonC8(1.03), betonist(1.2), necalificat(0.8)],
  },
  {
    code: "DV-BET-02",
    category: "Betoane și armături",
    title: "Beton C16/20 în fundații, turnat cu pompa",
    unit: "mc",
    includes:
      "Pomparea și turnarea betonului, compactarea prin vibrare, nivelarea fețelor și protejarea betonului proaspăt.",
    excludes: "Cofrajele și armăturile.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [
      betonC16(1.02),
      betonist(1),
      necalificat(0.6),
      pompaBeton(0.08),
      vibrator(0.25),
    ],
  },
  {
    code: "DV-BET-03",
    category: "Betoane și armături",
    title: "Beton C20/25 în stâlpi, grinzi și centuri, turnat cu pompa",
    unit: "mc",
    includes:
      "Pomparea și turnarea betonului în straturi, compactarea prin vibrare și protejarea betonului proaspăt.",
    excludes: "Cofrajele și armăturile.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [
      betonC20(1.02),
      betonist(2.2),
      necalificat(1),
      pompaBeton(0.1),
      vibrator(0.5),
    ],
  },
  {
    code: "DV-BET-04",
    category: "Betoane și armături",
    title: "Beton C20/25 în plăci, turnat cu pompa",
    unit: "mc",
    includes:
      "Pomparea și turnarea betonului, compactarea prin vibrare, finisarea suprafeței cu dreptarul, protejarea și udarea betonului.",
    excludes: "Cofrajele și armăturile.",
    measurement:
      "Volumul betonului pus în operă, după dimensiunile din proiect.",
    resources: [
      betonC20(1.02),
      betonist(1.6),
      necalificat(0.8),
      pompaBeton(0.08),
      vibrator(0.4),
    ],
  },
  {
    code: "DV-BET-05",
    category: "Betoane și armături",
    title: "Cofraje din placaj și cherestea pentru fundații și pereți",
    unit: "mp",
    includes:
      "Confecționarea și montarea cofrajului cu sprijinirile lui, ungerea cu ulei de decofrare, decofrarea și curățarea materialelor pentru refolosire.",
    excludes: "Schela de lucru.",
    measurement: "Suprafața cofrajului în contact cu betonul.",
    resources: [
      placajFilmat(0.3),
      cherestea(0.012),
      cuie(0.15),
      uleiDecofrare(0.1),
      dulgher(1),
      necalificat(0.45),
    ],
  },
  {
    code: "DV-BET-06",
    category: "Betoane și armături",
    title: "Cofraje din placaj și cherestea pentru stâlpi, grinzi și centuri",
    unit: "mp",
    includes:
      "Confecționarea și montarea cofrajului cu sprijinirile lui, ungerea cu ulei de decofrare, decofrarea și curățarea materialelor pentru refolosire.",
    excludes: "Schela de lucru.",
    measurement: "Suprafața cofrajului în contact cu betonul.",
    resources: [
      placajFilmat(0.35),
      cherestea(0.018),
      cuie(0.2),
      uleiDecofrare(0.1),
      dulgher(1.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-BET-07",
    category: "Betoane și armături",
    title: "Cofraje din placaj pentru plăci, pe popi metalici",
    unit: "mp",
    includes:
      "Montarea popilor și a grinzilor, așezarea placajului, ungerea cu ulei de decofrare, decofrarea și curățarea materialelor.",
    excludes: "Cofrajul marginilor plăcii.",
    measurement: "Suprafața plăcii cofrate, măsurată pe fața de jos.",
    resources: [
      placajFilmat(0.3),
      cherestea(0.008),
      cuie(0.08),
      uleiDecofrare(0.1),
      popiCofraje(1),
      dulgher(0.9),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-BET-08",
    category: "Betoane și armături",
    title: "Armături din oțel beton BST500S, fasonate și montate",
    unit: "kg",
    includes:
      "Tăierea și fasonarea barelor, montarea și legarea lor cu sârmă, distanțierii pentru stratul de acoperire.",
    excludes: "Plasele sudate.",
    measurement: "Masa armăturilor după extrasul de armare din proiect.",
    resources: [
      otelBeton(1.03),
      sarma(0.01),
      smallMaterials(1),
      fierar(0.032),
      necalificat(0.012),
      masinaFasonat(0.002),
    ],
  },
  {
    code: "DV-BET-09",
    category: "Betoane și armături",
    title: "Armături din plase sudate, montate",
    unit: "kg",
    includes:
      "Tăierea plaselor, montarea lor cu suprapuneri, legarea cu sârmă și distanțierii.",
    measurement: "Masa plaselor după proiect, fără suprapuneri.",
    resources: [
      plasaSudata(1.05),
      sarma(0.005),
      smallMaterials(1),
      fierar(0.015),
      necalificat(0.006),
    ],
  },
];

const masonry: BaseNorm[] = [
  {
    code: "DV-ZID-01",
    category: "Zidărie",
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
    category: "Zidărie",
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
    category: "Zidărie",
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
    category: "Zidărie",
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
    category: "Zidărie",
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
];

const roofing: BaseNorm[] = [
  {
    code: "DV-ACO-01",
    category: "Acoperișuri",
    title: "Șarpantă din lemn ecarisat de rășinoase, confecționată și montată",
    unit: "mc",
    includes:
      "Trasarea, tăierea și îmbinarea elementelor, ridicarea lor și montarea cu cuie și elemente metalice de îmbinare.",
    excludes: "Tratarea lemnului; ancorarea în centuri.",
    measurement: "Volumul lemnului din șarpantă, după proiect.",
    resources: [
      lemnEcarisat(1.08),
      cuie(4),
      elementeImbinare(6),
      dulgher(18),
      necalificat(6),
    ],
  },
  {
    code: "DV-ACO-02",
    category: "Acoperișuri",
    title: "Tratarea lemnului cu soluție ignifugă și insecto-fungicidă",
    unit: "mp",
    includes:
      "Aplicarea soluției cu pensula, în două straturi, pe toate fețele.",
    measurement: "Suprafața desfășurată a lemnului tratat.",
    resources: [solutieLemn(0.35), vopsitor(0.08), necalificat(0.02)],
  },
  {
    code: "DV-ACO-03",
    category: "Acoperișuri",
    title:
      "Învelitoare din țiglă metalică, cu folie anticondens, șipci și contrașipci",
    unit: "mp",
    includes:
      "Montarea foliei, a contrașipcilor și a șipcilor, montarea foilor de țiglă și fixarea lor cu șuruburi.",
    excludes: "Coamele, doliile, bordurile, șorțurile și sistemul pluvial.",
    measurement: "Suprafața învelitorii, măsurată pe pantă.",
    resources: [
      folieAnticondens(1.15),
      cherestea(0.007),
      cuie(0.05),
      tiglaMetalica(1.12),
      surubTabla(8),
      smallMaterials(2),
      invelitor(0.45),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-ACO-04",
    category: "Acoperișuri",
    title:
      "Învelitoare din țiglă ceramică, cu folie anticondens, șipci și contrașipci",
    unit: "mp",
    includes:
      "Montarea foliei, a contrașipcilor și a șipcilor, așezarea țiglelor și prinderea lor cu cleme.",
    excludes:
      "Coamele, doliile, accesoriile de ventilație și sistemul pluvial.",
    measurement: "Suprafața învelitorii, măsurată pe pantă.",
    resources: [
      folieAnticondens(1.15),
      cherestea(0.007),
      cuie(0.05),
      tiglaCeramica(11.5),
      clemaTigla(4),
      smallMaterials(2),
      invelitor(0.75),
      necalificat(0.35),
    ],
  },
  {
    code: "DV-ACO-05",
    category: "Acoperișuri",
    title: "Jgheab semicircular din tablă vopsită, cu cârlige și accesorii",
    unit: "m",
    includes:
      "Fixarea cârligelor cu pantă spre burlane, montarea jgheabului, a îmbinărilor, a capacelor și a racordurilor.",
    measurement: "Lungimea jgheabului.",
    resources: [
      jgheab(1.05),
      carligJgheab(1.5),
      accesoriuJgheab(0.3),
      tinichigiu(0.45),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-ACO-06",
    category: "Acoperișuri",
    title: "Burlan din tablă vopsită, cu brățări și coturi",
    unit: "m",
    includes: "Fixarea brățărilor, montarea burlanului și a coturilor.",
    measurement: "Lungimea burlanului.",
    resources: [
      burlan(1.05),
      bratariBurlan(0.7),
      cotBurlan(0.2),
      tinichigiu(0.35),
      necalificat(0.1),
    ],
  },
];

const insulation: BaseNorm[] = [
  {
    code: "DV-TRM-01",
    category: "Termoizolații",
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
    category: "Termoizolații",
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
    category: "Termoizolații",
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
    category: "Termoizolații",
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
];

const waterproofing: BaseNorm[] = [
  {
    code: "DV-HDR-01",
    category: "Hidroizolații",
    title:
      "Hidroizolație cu membrană bituminoasă SBS de 4 mm, într-un strat, lipită cu flacără",
    unit: "mp",
    includes:
      "Curățarea suportului, amorsarea, lipirea membranei cu flacără, cu petreceri de 10 cm, și întoarcerile la racorduri.",
    excludes: "Șapa de pantă; protecția hidroizolației.",
    measurement: "Suprafața hidroizolată, cu întoarcerile.",
    resources: [
      amorsaBituminoasa(0.3),
      membranaSbs4(1.15),
      gazPropan(0.12),
      izolator(0.25),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-HDR-02",
    category: "Hidroizolații",
    title:
      "Hidroizolație de terasă din două straturi de membrană bituminoasă, cu ardezie la suprafață",
    unit: "mp",
    includes:
      "Amorsarea, lipirea cu flacără a primului strat și a stratului cu ardezie, cu rosturile decalate, și racordurile la atice și la guri de scurgere.",
    excludes: "Termoizolația și șapa de pantă; gurile de scurgere.",
    measurement: "Suprafața hidroizolată, cu întoarcerile.",
    resources: [
      amorsaBituminoasa(0.3),
      membranaSbs3(1.15),
      membranaArdezie(1.15),
      gazPropan(0.22),
      izolator(0.45),
      necalificat(0.18),
    ],
  },
  {
    code: "DV-HDR-03",
    category: "Hidroizolații",
    title:
      "Hidroizolație cu mortar elastic bicomponent sub placaje, în băi și pe balcoane",
    unit: "mp",
    includes:
      "Montarea benzii de etanșare la colțuri și străpungeri, aplicarea mortarului în două straturi.",
    excludes: "Placajul.",
    measurement: "Suprafața hidroizolată, cu racordurile pe pereți.",
    resources: [
      mortarHidroizolant(3),
      bandaColturi(0.6),
      izolator(0.3),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-HDR-04",
    category: "Hidroizolații",
    title: "Hidroizolație de fundații cu emulsie bituminoasă, în două straturi",
    unit: "mp",
    includes:
      "Curățarea suprafeței și aplicarea emulsiei în două straturi încrucișate.",
    excludes: "Protecția hidroizolației.",
    measurement: "Suprafața hidroizolată.",
    resources: [emulsieBituminoasa(1.2), izolator(0.15), necalificat(0.05)],
  },
  {
    code: "DV-HDR-05",
    category: "Hidroizolații",
    title: "Protecția hidroizolației fundațiilor cu membrană cu crampoane",
    unit: "mp",
    includes:
      "Fixarea membranei cu crampoanele spre perete, petrecerile și profilul de închidere la partea de sus.",
    measurement: "Suprafața protejată.",
    resources: [
      membranaCrampoane(1.15),
      profilInchidere(0.2),
      dibluCui(2),
      izolator(0.1),
      necalificat(0.05),
    ],
  },
];

const plastering: BaseNorm[] = [
  {
    code: "DV-TEN-01",
    category: "Tencuieli și gleturi",
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
    category: "Tencuieli și gleturi",
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
    category: "Tencuieli și gleturi",
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
    category: "Tencuieli și gleturi",
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
];

const drywall: BaseNorm[] = [
  {
    code: "DV-GIP-01",
    category: "Gips-carton",
    title:
      "Perete despărțitor din gips-carton pe profile CW/UW 75, placat simplu pe ambele fețe, cu vată minerală de 5 cm",
    unit: "mp",
    includes:
      "Trasarea, montarea profilelor cu bandă de etanșare, așezarea vatei, înșurubarea plăcilor și tratarea rosturilor cu bandă și masă de șpaclu.",
    excludes: "Gletul pe toată suprafața; ramele pentru uși; vopsirea.",
    measurement: "Suprafața peretelui, fără goluri.",
    resources: [
      placaGips(2.1),
      profilCW75(2),
      profilUW75(0.7),
      vataSticla5(1.05),
      surubGips(30),
      dibluCui(1.6),
      bandaProfile(1.2),
      bandaRosturi(1.6),
      masaSpaclu(0.7),
      smallMaterials(2),
      montatorGips(0.9),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-GIP-02",
    category: "Gips-carton",
    title: "Placarea pereților cu gips-carton pe profile CD/UD, un strat",
    unit: "mp",
    includes:
      "Trasarea, prinderea bridelor și a profilelor, înșurubarea plăcilor și tratarea rosturilor cu bandă și masă de șpaclu.",
    excludes: "Termoizolația din spatele plăcilor; gletul pe toată suprafața.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      placaGips(1.05),
      profilCD60(2.2),
      profilUD30(0.8),
      brida(1.5),
      surubGips(15),
      dibluCui(2.5),
      bandaRosturi(0.8),
      masaSpaclu(0.35),
      montatorGips(0.55),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-GIP-03",
    category: "Gips-carton",
    title: "Plafon suspendat din gips-carton pe profile CD/UD, cu tije",
    unit: "mp",
    includes:
      "Trasarea, prinderea tijelor de planșeu, montarea profilelor, înșurubarea plăcilor și tratarea rosturilor.",
    excludes:
      "Termoizolația de deasupra; decupajele pentru corpuri de iluminat; gletul pe toată suprafața.",
    measurement: "Suprafața plafonului, în proiecție orizontală.",
    resources: [
      placaGips(1.05),
      profilCD60(3.2),
      profilUD30(0.4),
      setSuspendare(1.2),
      ancoraTavan(1.2),
      surubGips(17),
      dibluCui(0.8),
      bandaRosturi(1.2),
      masaSpaclu(0.45),
      smallMaterials(2),
      montatorGips(0.85),
      necalificat(0.2),
    ],
  },
  {
    code: "DV-GIP-04",
    category: "Gips-carton",
    title: "Placarea pereților cu gips-carton lipit cu adeziv",
    unit: "mp",
    includes:
      "Aplicarea adezivului în puncte, lipirea și alinierea plăcilor, tratarea rosturilor cu bandă și masă de șpaclu.",
    excludes: "Pregătirea pereților denivelați cu mai mult de 2 cm.",
    measurement: "Suprafața placată, fără goluri.",
    resources: [
      placaGips(1.05),
      adezivGips(4),
      bandaRosturi(0.8),
      masaSpaclu(0.35),
      montatorGips(0.45),
      necalificat(0.1),
    ],
  },
];

const flooring: BaseNorm[] = [
  {
    code: "DV-PRD-01",
    category: "Pardoseli",
    title: "Șapă din mortar de ciment de 5 cm, armată cu fibre, driscuită",
    unit: "mp",
    includes:
      "Folia de separare, banda perimetrală, prepararea și turnarea mortarului, nivelarea pe repere și driscuirea.",
    excludes: "Termoizolația; tăierea rosturilor de contracție.",
    measurement: "Suprafața șapei, între pereți.",
    resources: [
      foliePolietilena(1.1),
      bandaPerimetrala(0.6),
      mortarSapa(0.053),
      fibre(0.03),
      betonist(0.35),
      necalificat(0.25),
      betoniera(0.05),
    ],
  },
  {
    code: "DV-PRD-02",
    category: "Pardoseli",
    title: "Strat de egalizare din șapă autonivelantă de 5 mm",
    unit: "mp",
    includes:
      "Amorsarea suportului, prepararea și turnarea șapei, egalizarea cu rola cu țepi.",
    excludes: "Reparațiile suportului.",
    measurement: "Suprafața egalizată.",
    resources: [
      amorsaSape(0.15),
      sapaAutonivelanta(8),
      betonist(0.12),
      necalificat(0.08),
    ],
  },
  {
    code: "DV-PRD-03",
    category: "Pardoseli",
    title:
      "Pardoseală din gresie porțelanată de 60 × 60 cm, lipită cu adeziv flexibil",
    unit: "mp",
    includes:
      "Trasarea, prepararea adezivului, lipirea plăcilor cu sistem de nivelare, tăieturile, rostuirea și curățarea.",
    excludes: "Șapa; plintele.",
    measurement: "Suprafața pardoselii placate.",
    resources: [
      gresie(1.06),
      adezivC2TE(5.5),
      chit(0.35),
      sistemNivelare(6),
      smallMaterials(2),
      faiantar(0.85),
      necalificat(0.25),
      masinaTaiatPlaci(0.06),
    ],
  },
  {
    code: "DV-PRD-04",
    category: "Pardoseli",
    title: "Plintă din gresie, lipită cu adeziv flexibil",
    unit: "m",
    includes: "Tăierea, lipirea și rostuirea plintei.",
    measurement: "Lungimea plintei.",
    resources: [plintaGresie(1.05), adezivC2TE(0.4), chit(0.05), faiantar(0.2)],
  },
  {
    code: "DV-PRD-05",
    category: "Pardoseli",
    title: "Pardoseală din parchet laminat de 8 mm, montată flotant",
    unit: "mp",
    includes:
      "Folia de protecție la umiditate, folia de spumă, montarea parchetului cu îmbinare click și tăieturile.",
    excludes: "Plintele și profilele de trecere.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      foliePolietilena(1.1),
      folieSpuma(1.05),
      parchetLaminat(1.05),
      parchetar(0.3),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-PRD-06",
    category: "Pardoseli",
    title: "Pardoseală vinilică SPC cu îmbinare click, montată flotant",
    unit: "mp",
    includes:
      "Folia de protecție la umiditate, montarea plăcilor cu îmbinare click și tăieturile.",
    excludes: "Plintele și profilele de trecere.",
    measurement: "Suprafața pardoselii, între pereți.",
    resources: [
      foliePolietilena(1.1),
      placiSpc(1.05),
      parchetar(0.28),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-PRD-07",
    category: "Pardoseli",
    title: "Plintă din MDF sau PVC pentru parchet, cu accesorii",
    unit: "m",
    includes:
      "Tăierea și montarea plintei cu clipsuri sau adeziv, cu colțurile și capetele ei.",
    measurement: "Lungimea plintei.",
    resources: [plintaParchet(1.05), smallMaterials(5), parchetar(0.12)],
  },
];

const tiling: BaseNorm[] = [
  {
    code: "DV-PLC-01",
    category: "Placaje",
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
    category: "Placaje",
    title:
      "Etanșarea cu silicon sanitar a colțurilor și a racordurilor la obiectele sanitare",
    unit: "m",
    includes: "Curățarea rostului, aplicarea și netezirea siliconului.",
    measurement: "Lungimea rosturilor etanșate.",
    resources: [siliconSanitar(0.12), faiantar(0.06)],
  },
];

const painting: BaseNorm[] = [
  {
    code: "DV-ZUG-01",
    category: "Zugrăveli și vopsitorii",
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
    category: "Zugrăveli și vopsitorii",
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
    category: "Zugrăveli și vopsitorii",
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
    category: "Zugrăveli și vopsitorii",
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
    category: "Zugrăveli și vopsitorii",
    title: "Lazurarea lemnului în două straturi",
    unit: "mp",
    includes:
      "Șlefuirea ușoară, desprăfuirea și aplicarea lazurii în două straturi.",
    measurement: "Suprafața lazurată, desfășurată.",
    resources: [lazura(0.2), smallMaterials(3), vopsitor(0.3)],
  },
];

const joinery: BaseNorm[] = [
  {
    code: "DV-TAM-01",
    category: "Tâmplărie",
    title:
      "Fereastră din PVC cu geam termoizolant, cu montaj, spumă și benzi de etanșare",
    unit: "mp",
    includes:
      "Fixarea tocului cu dibluri, reglarea, spumarea rostului, benzile de etanșare și montarea cercevelelor.",
    excludes: "Pervazul și glaful; finisarea golului.",
    measurement: "Suprafața ferestrei, măsurată la exteriorul tocului.",
    resources: [
      fereastraPvc(1),
      spuma(0.35),
      bandaTamplarie(3.3),
      dibluTamplarie(4),
      montatorTamplarie(1.2),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-TAM-02",
    category: "Tâmplărie",
    title: "Pervaz interior din PVC, montat",
    unit: "m",
    includes: "Tăierea, fixarea cu spumă și etanșarea pervazului cu silicon.",
    measurement: "Lungimea pervazului.",
    resources: [
      pervaz(1.05),
      spuma(0.05),
      silicon(0.05),
      montatorTamplarie(0.35),
    ],
  },
  {
    code: "DV-TAM-03",
    category: "Tâmplărie",
    title: "Glaf exterior din aluminiu, montat",
    unit: "m",
    includes:
      "Tăierea, fixarea cu spumă, capacele laterale și etanșarea glafului cu silicon.",
    measurement: "Lungimea glafului.",
    resources: [glaf(1.05), spuma(0.05), silicon(0.05), montatorTamplarie(0.3)],
  },
  {
    code: "DV-TAM-04",
    category: "Tâmplărie",
    title: "Ușă interioară cu toc reglabil și feronerie, cu montaj",
    unit: "buc",
    includes:
      "Asamblarea și fixarea tocului cu spumă, montarea foii de ușă, a pervazurilor de toc și a feroneriei, reglarea.",
    measurement: "Numărul de uși.",
    resources: [
      usaInterioara(1),
      feronerie(1),
      spuma(0.5),
      montatorTamplarie(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-TAM-05",
    category: "Tâmplărie",
    title: "Ușă metalică de exterior, cu montaj",
    unit: "buc",
    includes:
      "Fixarea tocului cu ancore, reglarea, spumarea și etanșarea rostului, reglarea feroneriei.",
    excludes: "Finisarea golului.",
    measurement: "Numărul de uși.",
    resources: [
      usaMetalica(1),
      ancoraTamplarie(8),
      spuma(0.7),
      silicon(0.2),
      montatorTamplarie(3.5),
      necalificat(1),
    ],
  },
];

const plumbing: BaseNorm[] = [
  {
    code: "DV-SAN-01",
    category: "Instalații sanitare",
    title:
      "Conductă din polipropilenă PPR Ø20 pentru apă rece și caldă, cu fitinguri",
    unit: "m",
    includes:
      "Tăierea țevii, sudarea fitingurilor, fixarea cu cleme și proba de presiune.",
    excludes: "Șlițurile și astuparea lor; izolația conductei.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaPpr20(1.02),
      fitingPpr20(0.6),
      clema(1),
      instalator(0.35),
      necalificat(0.1),
      suduraPpr(0.05),
    ],
  },
  {
    code: "DV-SAN-02",
    category: "Instalații sanitare",
    title:
      "Conductă din polipropilenă PPR Ø25 pentru apă rece și caldă, cu fitinguri",
    unit: "m",
    includes:
      "Tăierea țevii, sudarea fitingurilor, fixarea cu cleme și proba de presiune.",
    excludes: "Șlițurile și astuparea lor; izolația conductei.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaPpr25(1.02),
      fitingPpr25(0.5),
      clema(1),
      instalator(0.4),
      necalificat(0.1),
      suduraPpr(0.05),
    ],
  },
  {
    code: "DV-SAN-03",
    category: "Instalații sanitare",
    title: "Conductă de canalizare din PP Ø50, în interior",
    unit: "m",
    includes:
      "Montarea țevilor și a fitingurilor cu mufe și garnituri, fixarea cu brățări și verificarea etanșeității.",
    excludes: "Șlițurile și astuparea lor.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaCanal50(1.02),
      fitingCanal50(0.6),
      bratara(0.8),
      instalator(0.3),
      necalificat(0.1),
    ],
  },
  {
    code: "DV-SAN-04",
    category: "Instalații sanitare",
    title: "Conductă de canalizare din PP Ø110, în interior",
    unit: "m",
    includes:
      "Montarea țevilor și a fitingurilor cu mufe și garnituri, fixarea cu brățări și verificarea etanșeității.",
    excludes: "Șlițurile și astuparea lor.",
    measurement: "Lungimea conductei, în axul ei, cu fitingurile.",
    resources: [
      tevaCanal110(1.02),
      fitingCanal110(0.4),
      bratara(0.8),
      instalator(0.35),
      necalificat(0.15),
    ],
  },
  {
    code: "DV-SAN-05",
    category: "Instalații sanitare",
    title: "Vas WC cu rezervor, cu montaj și racorduri",
    unit: "buc",
    includes:
      "Fixarea vasului de pardoseală, racordarea la canalizare și la apă, etanșarea cu silicon și proba de funcționare.",
    measurement: "Numărul de obiecte montate.",
    resources: [
      vasWc(1),
      racordFlexibil(1),
      robinetColtar(1),
      racordWc(1),
      setPrindere(1),
      siliconSanitar(0.2),
      instalator(2.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-SAN-06",
    category: "Instalații sanitare",
    title: "Lavoar cu baterie și sifon, cu montaj",
    unit: "buc",
    includes:
      "Fixarea lavoarului, montarea bateriei și a sifonului, racordarea la apă și la canalizare, proba de funcționare.",
    measurement: "Numărul de obiecte montate.",
    resources: [
      lavoar(1),
      baterieLavoar(1),
      sifonLavoar(1),
      racordFlexibil(2),
      robinetColtar(2),
      setPrindere(1),
      siliconSanitar(0.2),
      instalator(2.2),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-SAN-07",
    category: "Instalații sanitare",
    title: "Boiler electric de 80 l, cu montaj",
    unit: "buc",
    includes:
      "Fixarea boilerului pe perete, racordarea la apă rece și caldă cu supapa de siguranță, umplerea și proba de funcționare.",
    excludes: "Circuitul electric de alimentare.",
    measurement: "Numărul de boilere montate.",
    resources: [
      boiler(1),
      supapa(1),
      racordFlexibil(2),
      setPrindere(1),
      instalator(2),
      necalificat(0.5),
    ],
  },
];

const electrical: BaseNorm[] = [
  {
    code: "DV-ELE-01",
    category: "Instalații electrice",
    title:
      "Circuit electric de prize cu cablu CYY-F 3 × 2,5 mm² în tub flexibil, îngropat",
    unit: "m",
    includes:
      "Pozarea tubului în șliț, tragerea cablului, legăturile în doze și verificarea circuitului.",
    excludes: "Șlițurile și astuparea lor; prizele.",
    measurement: "Lungimea circuitului, de la tablou până la ultima priză.",
    resources: [
      tubFlexibil(1.05),
      cablu25(1.05),
      dozaDerivatie(0.1),
      electrician(0.15),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-ELE-02",
    category: "Instalații electrice",
    title:
      "Circuit electric de iluminat cu cablu CYY-F 3 × 1,5 mm² în tub flexibil, îngropat",
    unit: "m",
    includes:
      "Pozarea tubului în șliț, tragerea cablului, legăturile în doze și verificarea circuitului.",
    excludes:
      "Șlițurile și astuparea lor; întrerupătoarele și corpurile de iluminat.",
    measurement:
      "Lungimea circuitului, de la tablou până la ultimul punct de lumină.",
    resources: [
      tubFlexibil(1.05),
      cablu15(1.05),
      dozaDerivatie(0.1),
      electrician(0.13),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-ELE-03",
    category: "Instalații electrice",
    title: "Șlițuri în zidărie pentru tuburi și conducte, cu astuparea lor",
    unit: "m",
    includes:
      "Trasarea, tăierea și scobirea șliței de cel mult 3 × 3 cm, astuparea cu ipsos după montaj și strângerea resturilor.",
    measurement: "Lungimea șlițurilor.",
    resources: [ipsos(1), necalificat(0.25), masinaSlituit(0.08)],
  },
  {
    code: "DV-ELE-04",
    category: "Instalații electrice",
    title: "Priză sau întrerupător îngropat, cu doză de aparat",
    unit: "buc",
    includes: "Fixarea dozei, conectarea și montarea aparatului cu rama lui.",
    measurement: "Numărul de aparate.",
    resources: [dozaAparat(1), priza(1), electrician(0.35)],
  },
  {
    code: "DV-ELE-05",
    category: "Instalații electrice",
    title: "Corp de iluminat LED aplicat, cu montaj",
    unit: "buc",
    includes:
      "Fixarea corpului de iluminat, conectarea lui și proba de funcționare.",
    measurement: "Numărul de corpuri de iluminat.",
    resources: [corpIluminat(1), dibluCui(2), electrician(0.6)],
  },
  {
    code: "DV-ELE-06",
    category: "Instalații electrice",
    title: "Tablou electric de apartament cu 12 module, echipat și montat",
    unit: "buc",
    includes:
      "Fixarea tabloului, montarea aparatelor pe șină, conectarea și etichetarea circuitelor, verificarea funcționării.",
    excludes:
      "Branșamentul și coloana de alimentare; măsurătorile prizei de pământ.",
    measurement: "Numărul de tablouri.",
    resources: [
      tablou(1),
      sigurantaAutomata(8),
      diferential(1),
      smallMaterials(5),
      electrician(4),
    ],
  },
];

const scaffolding: BaseNorm[] = [
  {
    code: "DV-SCH-01",
    category: "Schele",
    title:
      "Montarea și demontarea schelei metalice de fațadă, până la 10 m înălțime",
    unit: "mp",
    includes:
      "Aducerea elementelor la fațadă, montarea cu ancoraje, podine și balustrade, demontarea și stivuirea lor.",
    excludes: "Chiria schelei; plasa de protecție.",
    measurement: "Suprafața fațadei acoperite de schelă.",
    resources: [schelar(0.22), necalificat(0.12)],
  },
  {
    code: "DV-SCH-02",
    category: "Schele",
    title: "Chiria schelei metalice de fațadă, pe o lună",
    unit: "mp",
    includes: "Chiria elementelor de schelă pentru o lună.",
    measurement:
      "Suprafața fațadei acoperite de schelă, pentru fiecare lună de folosire.",
    resources: [chirieSchela(1)],
  },
];

/** The base catalog's norms, by category, in the order they are published. */
export const baseNorms: readonly BaseNorm[] = [
  ...demolition,
  ...earthworks,
  ...concrete,
  ...masonry,
  ...roofing,
  ...insulation,
  ...waterproofing,
  ...plastering,
  ...drywall,
  ...flooring,
  ...tiling,
  ...painting,
  ...joinery,
  ...plumbing,
  ...electrical,
  ...scaffolding,
];
