import type { NormResourceInput } from "../resourceRows";

// The Resurse the Norme de bază share: the trades, the machines, the
// transports and the materials more than one category consumes. A resource
// is defined once, so every norm gives it the same name, unit and reference
// price, and firms price it once for all of them (docs/adr/0012). Materials
// only one category uses sit at the top of that category's file.
//
// Reference prices are indicative Romanian prices for the edition, in lei
// without VAT, a fallback until a firm sets its own Tarife or a store price
// applies. Labour is per hour, without the CAM that the Deviz adds.

export type Consumption = (quantity: number) => NormResourceInput;

export function material(name: string, unit: string, price: number) {
  return (quantity: number): NormResourceInput => ({
    kind: "material",
    name,
    unit,
    quantity,
    referencePrice: price,
  });
}

export function labor(name: string, price: number) {
  return (quantity: number): NormResourceInput => ({
    kind: "labor",
    name,
    unit: "ora",
    quantity,
    referencePrice: price,
  });
}

export function equipment(name: string, unit: string, price: number) {
  return (quantity: number): NormResourceInput => ({
    kind: "equipment",
    name,
    unit,
    quantity,
    referencePrice: price,
  });
}

export function transport(name: string, unit: string, price: number) {
  return (quantity: number): NormResourceInput => ({
    kind: "transport",
    name,
    unit,
    quantity,
    referencePrice: price,
  });
}

/** Consumables too small to list, as a percentage of the norm's materials. */
export function smallMaterials(percent: number): NormResourceInput {
  return {
    kind: "material",
    name: "Material mărunt",
    unit: "%",
    quantity: percent,
  };
}

// Labour, lei per hour.
export const necalificat = labor("Muncitor necalificat", 28);
export const zidar = labor("Zidar", 35);
export const betonist = labor("Betonist", 34);
export const fierar = labor("Fierar betonist", 35);
export const dulgher = labor("Dulgher", 35);
export const tencuitor = labor("Tencuitor", 35);
export const zugrav = labor("Zugrav", 34);
export const vopsitor = labor("Vopsitor", 34);
export const faiantar = labor("Faianțar", 38);
export const parchetar = labor("Parchetar", 35);
export const montatorGips = labor("Montator gips-carton", 36);
export const izolator = labor("Izolator", 34);
export const instalator = labor("Instalator", 38);
export const electrician = labor("Electrician", 40);
export const tinichigiu = labor("Tinichigiu", 37);
export const invelitor = labor("Învelitor", 36);
export const montatorTamplarie = labor("Montator tâmplărie", 36);
export const pavator = labor("Pavator", 33);
export const schelar = labor("Schelar", 32);
export const lacatus = labor("Lăcătuș confecții metalice", 37);
export const sudor = labor("Sudor", 40);
export const mozaicar = labor("Mozaicar", 38);
export const pietrar = labor("Pietrar", 38);
export const frigotehnist = labor("Tehnician de climatizare", 42);
export const tehnicianCurentiSlabi = labor("Tehnician de curenți slabi", 40);
export const tapetar = labor("Tapetar", 36);
export const topometrist = labor("Topometrist", 55);
export const gradinar = labor("Grădinar", 30);

// Equipment, lei per hour with its operator, unless the unit says otherwise.
export const rotopercutor = equipment("Ciocan rotopercutor", "ora", 10);
export const ciocanDemolator = equipment("Ciocan demolator", "ora", 15);
export const betoniera = equipment("Betonieră 250 l", "ora", 12);
export const vibrator = equipment("Vibrator pentru beton", "ora", 12);
export const pompaBeton = equipment("Pompă de beton", "ora", 450);
export const masinaFasonat = equipment(
  "Mașină de tăiat și fasonat armături",
  "ora",
  20,
);
export const masinaTencuit = equipment("Mașină de tencuit", "ora", 40);
export const masinaTaiatPlaci = equipment(
  "Mașină de tăiat plăci ceramice",
  "ora",
  10,
);
export const masinaSlituit = equipment("Mașină de șlițuit", "ora", 15);
export const suduraPpr = equipment(
  "Aparat de sudură pentru țevi PPR",
  "ora",
  8,
);
export const excavator = equipment("Excavator pe șenile de 0,6 mc", "ora", 280);
export const maiCompactor = equipment("Mai compactor", "ora", 15);
export const placaVibranta = equipment("Placă vibrantă", "ora", 18);
export const popiCofraje = equipment(
  "Popi metalici și grinzi pentru cofraje, chirie",
  "mp",
  9,
);
export const chirieSchela = equipment(
  "Schelă metalică de fațadă, chirie pe o lună",
  "mp",
  6,
);
export const buldoexcavator = equipment("Buldoexcavator", "ora", 220);
export const miniexcavator = equipment("Miniexcavator de 1,5 t", "ora", 150);
export const cilindruCompactor = equipment(
  "Cilindru compactor vibrator",
  "ora",
  180,
);
export const automacara = equipment("Automacara de 25 t", "ora", 320);
export const platformaFoarfeca = equipment(
  "Platformă ridicătoare foarfecă, chirie pe zi",
  "zi",
  350,
);
export const liftMateriale = equipment(
  "Lift de materiale pentru fațadă, chirie pe zi",
  "zi",
  150,
);
export const polizor = equipment("Polizor unghiular cu disc", "ora", 5);
export const aparatSudura = equipment(
  "Aparat de sudură electric cu electrod",
  "ora",
  9,
);
export const carotiera = equipment("Carotieră cu carotă diamantată", "ora", 45);
export const masinaTaiatBeton = equipment(
  "Mașină de tăiat beton cu disc diamantat",
  "ora",
  40,
);
export const compresorPneumatic = equipment(
  "Compresor cu ciocan pneumatic",
  "ora",
  55,
);
export const elicopterBeton = equipment(
  "Elicopter pentru finisat beton",
  "ora",
  25,
);
export const masinaTaiatRosturi = equipment(
  "Mașină de tăiat rosturi în beton",
  "ora",
  35,
);
export const pompaSapa = equipment("Pompă de șapă cu malaxor", "ora", 60);
export const masinaSlefuitBeton = equipment(
  "Mașină de șlefuit beton cu aspirare",
  "ora",
  45,
);
export const masinaSlefuitParchet = equipment(
  "Mașină de șlefuit parchet",
  "ora",
  25,
);
export const pompaAirless = equipment("Pompă airless de vopsit", "ora", 20);
export const generator = equipment("Generator electric de 5 kVA", "ora", 20);
export const pompaEpuisment = equipment("Pompă de epuisment", "ora", 10);
export const aparatSpalat = equipment(
  "Aparat de spălat cu presiune",
  "ora",
  12,
);
export const suduraPe = equipment(
  "Aparat de sudură cap la cap pentru țevi PE",
  "ora",
  25,
);
export const presaFitinguri = equipment(
  "Presă pentru fitinguri de țevi",
  "ora",
  10,
);
export const masinaInsuflat = equipment(
  "Mașină de insuflat izolație",
  "ora",
  40,
);
export const pompaVid = equipment(
  "Pompă de vid cu set de manometre",
  "ora",
  10,
);
export const motocoasa = equipment("Motocoasă", "ora", 8);
export const motostivuitor = equipment("Motostivuitor", "ora", 90);
export const aerCald = equipment("Aparat de sudat cu aer cald", "ora", 12);

// Transport.
export const autobasculanta = transport(
  "Transport cu autobasculanta",
  "tkm",
  1.4,
);
export const containerMoloz = transport(
  "Container de 7 mc pentru moloz, cu transport și depozitare",
  "buc",
  520,
);
export const containerMic = transport(
  "Container de 4 mc pentru moloz, cu transport și depozitare",
  "buc",
  380,
);
export const sacMoloz = transport(
  "Sac de moloz de 1 mc, cu ridicare și depozitare",
  "buc",
  130,
);
export const autoutilitara = transport(
  "Transport cu autoutilitara de 3,5 t",
  "km",
  2.6,
);
export const transportAgabaritic = transport(
  "Transport cu camion cu macara",
  "ora",
  180,
);

// Masonry, concrete and formwork.
export const blocCeramic25 = material(
  "Bloc ceramic cu goluri verticale, 25 cm",
  "buc",
  7,
);
export const blocCeramic30 = material(
  "Bloc ceramic cu goluri verticale, 30 cm",
  "buc",
  8.2,
);
export const blocBca25 = material("Bloc de BCA, 25 cm", "buc", 10);
export const blocBca10 = material("Bloc de BCA, 10 cm", "buc", 4.3);
export const caramidaPlina = material("Cărămidă plină", "buc", 1.5);
export const mortarZidarie = material("Mortar de zidărie M10", "mc", 400);
export const mortarSapa = material(
  "Mortar de ciment M15 pentru șapă",
  "mc",
  440,
);
export const adezivBca = material("Adeziv pentru BCA", "kg", 1.3);
export const betonC8 = material("Beton C8/10", "mc", 360);
export const betonC16 = material("Beton C16/20", "mc", 430);
export const betonC20 = material("Beton C20/25", "mc", 465);
export const betonC25 = material("Beton C25/30", "mc", 495);
export const otelBeton = material("Oțel beton BST500S", "kg", 3.5);
export const plasaSudata = material("Plasă sudată", "kg", 4);
export const sarma = material("Sârmă neagră pentru legat armături", "kg", 9);
export const cherestea = material("Cherestea de rășinoase", "mc", 1300);
export const lemnEcarisat = material("Lemn ecarisat de rășinoase", "mc", 1600);
export const placajFilmat = material(
  "Placaj filmat pentru cofraje, 18 mm",
  "mp",
  80,
);
export const cuie = material("Cuie", "kg", 9);
export const uleiDecofrare = material("Ulei de decofrare", "l", 8);
export const elementeImbinare = material(
  "Elemente metalice de îmbinare pentru lemn",
  "kg",
  14,
);
export const balast = material("Balast", "mc", 85);
export const nisip = material("Nisip", "mc", 110);
export const pietris = material("Pietriș sort 16-31", "mc", 120);
export const piatraSparta = material("Piatră spartă sort 0-63", "mc", 115);
export const ciment = material("Ciment Portland 42,5 R", "kg", 0.75);
export const mortarReparatii = material(
  "Mortar de reparații pentru beton, clasa R3",
  "kg",
  4.2,
);
export const ancoraChimica = material(
  "Ancoră chimică, cartuș de 300 ml",
  "buc",
  45,
);
export const dibluMetalic = material(
  "Diblu metalic cu expandare, M10",
  "buc",
  2.2,
);
export const surubLemn = material("Holșurub pentru lemn", "buc", 0.15);
export const surubAutofiletant = material(
  "Șurub autoforant pentru metal",
  "buc",
  0.12,
);
export const geotextil = material("Geotextil de 200 g/mp", "mp", 3.2);
export const foliePolietilena = material("Folie de polietilenă", "mp", 0.8);
export const bandaAvertizare = material("Bandă de avertizare", "m", 0.3);
export const durificatorCuart = material(
  "Durificator de suprafață cu cuarț",
  "kg",
  2.2,
);
export const chitPoliuretanic = material(
  "Chit poliuretanic pentru rosturi, cartuș de 600 ml",
  "buc",
  35,
);
export const mortarRostuire = material(
  "Mortar de rostuire pentru zidărie aparentă",
  "kg",
  2,
);

// Plasters and drywall.
export const tencuialaIpsos = material(
  "Tencuială mecanizată pe bază de ipsos",
  "kg",
  0.95,
);
export const tencuialaCimentVar = material(
  "Tencuială mecanizată pe bază de ciment și var",
  "kg",
  0.52,
);
export const sprit = material(
  "Amorsă de aderență (șpriț) pentru tencuieli",
  "kg",
  0.6,
);
export const profileTencuiala = material(
  "Profile de ghidaj și colțare pentru tencuieli",
  "m",
  2.4,
);
export const gletIpsos = material("Glet de ipsos", "kg", 1.6);
export const ipsos = material("Ipsos de construcții", "kg", 1.2);
export const placaGips = material("Placă de gips-carton, 12,5 mm", "mp", 16.5);
export const placaGipsRezistentaUmezeala = material(
  "Placă de gips-carton rezistentă la umezeală, 12,5 mm",
  "mp",
  23,
);
export const profilCW75 = material("Profil CW 75", "m", 6);
export const profilUW75 = material("Profil UW 75", "m", 5);
export const profilCD60 = material("Profil CD 60", "m", 4.1);
export const profilUD30 = material("Profil UD 30", "m", 3.3);
export const brida = material("Bridă pentru profile CD", "buc", 0.7);
export const setSuspendare = material(
  "Set de suspendare pentru plafoane (tijă și piesă)",
  "set",
  3,
);
export const surubGips = material(
  "Șurub autoforant pentru gips-carton",
  "buc",
  0.04,
);
export const dibluCui = material("Diblu cu cui, 6 × 40 mm", "buc", 0.25);
export const ancoraTavan = material("Ancoră metalică pentru tavan", "buc", 0.9);
export const bandaProfile = material(
  "Bandă de etanșare pentru profile",
  "m",
  0.8,
);
export const bandaRosturi = material(
  "Bandă de hârtie pentru rosturi",
  "m",
  0.13,
);
export const masaSpaclu = material("Masă de șpaclu pentru rosturi", "kg", 3);
export const adezivGips = material(
  "Adeziv pentru plăci de gips-carton",
  "kg",
  1.3,
);

// Insulation and waterproofing.
export const vataSticla5 = material("Vată minerală de sticlă, 5 cm", "mp", 9);
export const vataSticla10 = material(
  "Vată minerală de sticlă, 10 cm",
  "mp",
  13,
);
export const vataSticla15 = material(
  "Vată minerală de sticlă, 15 cm",
  "mp",
  19,
);
export const vataBazaltica5 = material(
  "Vată minerală bazaltică, 5 cm",
  "mp",
  22,
);
export const vataBazaltica10 = material(
  "Vată minerală bazaltică de fațadă, 10 cm",
  "mp",
  48,
);
export const eps80 = material("Polistiren expandat EPS 80, 10 cm", "mp", 25);
export const xps5 = material("Polistiren extrudat XPS, 5 cm", "mp", 27);
export const adezivPolistiren = material(
  "Adeziv pentru polistiren, lipire și armare",
  "kg",
  1,
);
export const dibluTermo = material("Diblu pentru termoizolații", "buc", 0.6);
export const plasaFatada = material(
  "Plasă din fibră de sticlă pentru fațade, 160 g/mp",
  "mp",
  3.3,
);
export const profilColtPlasa = material("Profil de colț cu plasă", "m", 2.5);
export const amorsaDecorativa = material(
  "Amorsă pentru tencuieli decorative",
  "kg",
  7,
);
export const tencuialaDecorativa = material(
  "Tencuială decorativă acrilică, 1,5 mm",
  "kg",
  6,
);
export const barieraVapori = material("Folie barieră de vapori", "mp", 2);
export const bandaFolii = material("Bandă adezivă pentru folii", "m", 0.6);
export const amorsaBituminoasa = material("Amorsă bituminoasă", "kg", 9);
export const membranaSbs4 = material(
  "Membrană bituminoasă SBS, 4 mm",
  "mp",
  21,
);
export const membranaSbs3 = material(
  "Membrană bituminoasă SBS, 3 mm",
  "mp",
  17,
);
export const membranaArdezie = material(
  "Membrană bituminoasă cu ardezie, 4,5 mm",
  "mp",
  27,
);
export const gazPropan = material("Gaz propan", "kg", 9);
export const mortarHidroizolant = material(
  "Mortar hidroizolant elastic bicomponent",
  "kg",
  9.5,
);
export const bandaColturi = material(
  "Bandă de etanșare pentru colțuri și rosturi",
  "m",
  6,
);
export const emulsieBituminoasa = material("Emulsie bituminoasă", "kg", 6);
export const membranaCrampoane = material("Membrană cu crampoane", "mp", 6.5);
export const profilInchidere = material(
  "Profil de închidere pentru membrana cu crampoane",
  "m",
  6,
);
export const folieAnticondens = material(
  "Folie anticondens pentru acoperișuri",
  "mp",
  3.2,
);

// Floors, tiling and paint.
export const fibre = material("Fibre de polipropilenă pentru șapă", "kg", 30);
export const bandaPerimetrala = material("Bandă perimetrală din spumă", "m", 1);
export const sapaAutonivelanta = material("Șapă autonivelantă", "kg", 2);
export const amorsaSape = material("Amorsă pentru șape și adezivi", "kg", 9);
export const gresie = material("Gresie porțelanată", "mp", 55);
export const faianta = material("Faianță", "mp", 45);
export const adezivC2TE = material("Adeziv flexibil C2TE", "kg", 1.6);
export const adezivC2TES1 = material(
  "Adeziv flexibil deformabil C2TE S1",
  "kg",
  2.4,
);
export const chit = material("Chit de rosturi", "kg", 6);
export const chitEpoxidic = material("Chit de rosturi epoxidic", "kg", 45);
export const sistemNivelare = material(
  "Sistem de nivelare pentru plăci",
  "buc",
  0.2,
);
export const plintaGresie = material("Plintă din gresie", "m", 9);
export const profilFaianta = material("Profil de colț pentru faianță", "m", 4);
export const siliconSanitar = material("Silicon sanitar, cartuș", "buc", 20);
export const silicon = material("Silicon, cartuș", "buc", 18);
export const parchetLaminat = material("Parchet laminat, 8 mm", "mp", 45);
export const folieSpuma = material("Folie de spumă pentru parchet", "mp", 3.5);
export const placiSpc = material("Pardoseală vinilică SPC cu click", "mp", 65);
export const plintaParchet = material("Plintă din MDF sau PVC", "m", 12);
export const grundAcrilic = material("Grund acrilic", "l", 9);
export const vopseaLavabila = material("Vopsea lavabilă de interior", "l", 12);
export const grundFatada = material("Grund pentru fațade", "l", 11);
export const vopseaFatada = material("Vopsea lavabilă pentru fațade", "l", 18);
export const grundAnticoroziv = material("Grund anticoroziv", "kg", 22);
export const emailAlchidic = material("Email alchidic", "kg", 26);
export const diluant = material("Diluant", "l", 14);
export const lazura = material("Lazură pentru lemn", "l", 30);
export const solutieLemn = material(
  "Soluție ignifugă și insecto-fungicidă pentru lemn",
  "kg",
  9,
);
export const profilTrecere = material(
  "Profil de trecere din aluminiu",
  "m",
  25,
);
export const bandaHartie = material("Bandă adezivă de hârtie", "m", 0.35);
export const cartonProtectie = material(
  "Carton ondulat de protecție pentru pardoseli",
  "mp",
  2.2,
);
export const amorsaEpoxidica = material("Amorsă epoxidică", "kg", 42);
export const impregnantPiatra = material(
  "Impregnant pentru piatră naturală",
  "l",
  60,
);
export const plotTerasa = material("Plot reglabil pentru terase", "buc", 12);

// Joinery.
export const fereastraPvc = material(
  "Fereastră din PVC cu geam termoizolant",
  "mp",
  650,
);
export const spuma = material("Spumă poliuretanică, 750 ml", "buc", 28);
export const bandaTamplarie = material(
  "Bandă de etanșare pentru tâmplărie",
  "m",
  4,
);
export const dibluTamplarie = material("Diblu pentru tâmplărie", "buc", 1.2);
export const ancoraTamplarie = material(
  "Ancoră pentru tâmplărie metalică",
  "buc",
  1.5,
);
export const pervaz = material("Pervaz interior din PVC", "m", 45);
export const glaf = material("Glaf exterior din aluminiu", "m", 40);
export const usaInterioara = material(
  "Ușă interioară cu toc reglabil",
  "buc",
  750,
);
export const feronerie = material("Feronerie pentru ușă", "set", 80);
export const usaMetalica = material("Ușă metalică de exterior", "buc", 1800);

// Plumbing and heating.
export const tevaPpr20 = material("Țeavă PPR Ø20", "m", 3.3);
export const fitingPpr20 = material("Fiting PPR Ø20", "buc", 1.5);
export const tevaPpr25 = material("Țeavă PPR Ø25", "m", 5);
export const fitingPpr25 = material("Fiting PPR Ø25", "buc", 2.2);
export const clema = material("Clemă de fixare pentru țevi", "buc", 0.8);
export const tevaCanal50 = material("Țeavă de canalizare PP Ø50", "m", 6);
export const fitingCanal50 = material("Fiting de canalizare Ø50", "buc", 3.5);
export const tevaCanal110 = material("Țeavă de canalizare PP Ø110", "m", 14);
export const fitingCanal110 = material("Fiting de canalizare Ø110", "buc", 9);
export const bratara = material("Brățară pentru țevi de canalizare", "buc", 3);
export const vasWc = material("Vas WC cu rezervor", "set", 650);
export const racordFlexibil = material("Racord flexibil pentru apă", "buc", 15);
export const robinetColtar = material("Robinet colțar", "buc", 30);
export const racordWc = material("Racord de scurgere pentru WC", "buc", 20);
export const lavoar = material("Lavoar ceramic", "buc", 280);
export const baterieLavoar = material("Baterie pentru lavoar", "buc", 220);
export const sifonLavoar = material("Sifon pentru lavoar", "buc", 45);
export const setPrindere = material(
  "Set de prindere pentru obiecte sanitare",
  "set",
  15,
);
export const boiler = material("Boiler electric de 80 l", "buc", 750);
export const supapa = material("Supapă de siguranță pentru boiler", "buc", 25);
export const tevaPexAl16 = material(
  "Țeavă multistrat PEX-Al-PEX Ø16",
  "m",
  4.2,
);
export const tevaPexAl20 = material(
  "Țeavă multistrat PEX-Al-PEX Ø20",
  "m",
  6.5,
);
export const fitingPresare16 = material(
  "Fiting de presare pentru țeavă multistrat Ø16",
  "buc",
  9,
);
export const fitingPresare20 = material(
  "Fiting de presare pentru țeavă multistrat Ø20",
  "buc",
  12,
);
export const izolatieTeava = material(
  "Izolație din spumă de polietilenă pentru țevi, 9 mm",
  "m",
  2.5,
);
export const robinetSferic = material(
  'Robinet cu sferă de 1/2" sau 3/4"',
  "buc",
  22,
);
export const tevaOtelNegru = material(
  'Țeavă din oțel negru, 1/2" – 1"',
  "m",
  18,
);
export const fitingOtel = material("Fiting filetat din oțel", "buc", 9);
export const tevaPehd32 = material(
  "Țeavă PEHD Ø32 PN10 pentru branșament",
  "m",
  6,
);
export const fitingPehd32 = material(
  "Fiting de compresiune pentru PEHD Ø32",
  "buc",
  25,
);
export const apometru = material(
  'Apometru DN20 (3/4"), cu racorduri',
  "buc",
  180,
);
export const tevaCanal40 = material("Țeavă de canalizare PP Ø40", "m", 5);
export const fitingCanal40 = material("Fiting de canalizare Ø40", "buc", 3);
export const cutieDistribuitor = material(
  "Cutie de distribuitor îngropată",
  "buc",
  180,
);
export const izolatieTeava13 = material(
  "Izolație din spumă de polietilenă pentru țevi, 13 mm",
  "m",
  4,
);
export const brataraMetalica = material(
  "Brățară metalică cu diblu pentru țevi",
  "buc",
  4,
);
export const linieFrigorifica = material(
  'Linie frigorifică izolată din cupru, 3/8" – 5/8"',
  "m",
  95,
);
// Joints of insulation and ducts.
export const bandaAluminiu = material("Bandă adezivă din aluminiu", "m", 0.6);

// Electrical.
export const cablu25 = material("Cablu CYY-F 3 × 2,5 mm²", "m", 6.2);
export const cablu15 = material("Cablu CYY-F 3 × 1,5 mm²", "m", 4.2);
export const tubFlexibil = material("Tub flexibil de protecție Ø20", "m", 1.2);
export const dozaDerivatie = material("Doză de derivație", "buc", 2.5);
export const dozaAparat = material("Doză pentru aparataj", "buc", 1.5);
export const priza = material("Priză sau întrerupător", "buc", 18);
export const corpIluminat = material("Corp de iluminat LED", "buc", 120);
export const tablou = material("Tablou electric cu 12 module", "buc", 90);
export const sigurantaAutomata = material("Siguranță automată", "buc", 22);
export const diferential = material("Întrerupător diferențial", "buc", 150);
export const cabluUtp = material("Cablu UTP cat. 6", "m", 2.4);
export const canalCablu = material(
  "Canal de cablu din PVC, 40 × 25 mm",
  "m",
  7,
);

// Roofing.
export const tiglaMetalica = material("Țiglă metalică", "mp", 36);
export const tiglaCeramica = material("Țiglă ceramică", "buc", 5);
export const clemaTigla = material("Clemă pentru țiglă", "buc", 0.25);
export const surubTabla = material("Șurub autoforant pentru tablă", "buc", 0.3);
export const jgheab = material(
  "Jgheab semicircular din tablă vopsită",
  "m",
  28,
);
export const carligJgheab = material("Cârlig pentru jgheab", "buc", 7);
export const accesoriuJgheab = material("Accesoriu pentru jgheab", "buc", 15);
export const burlan = material("Burlan din tablă vopsită", "m", 26);
export const bratariBurlan = material("Brățară pentru burlan", "buc", 9);
export const cotBurlan = material("Cot pentru burlan", "buc", 22);
export const tablaZincata = material("Tablă zincată vopsită, 0,5 mm", "mp", 42);
export const placaOsb = material("Placă OSB 3, 18 mm", "mp", 38);

// Outdoor works.
export const pavele = material("Pavele de beton, 6 cm", "mp", 42);
export const bordura = material("Bordură de beton pentru alei", "buc", 16);

// Steel.
export const profilOtel = material(
  "Profile și table din oțel pentru confecții",
  "kg",
  6.5,
);
export const electrozi = material("Electrozi de sudură", "kg", 20);
export const discAbraziv = material(
  "Disc abraziv de tăiat sau șlefuit",
  "buc",
  7,
);
