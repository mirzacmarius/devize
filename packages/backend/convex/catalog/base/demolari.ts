import type { BaseNorm } from "./norm";
import {
  autobasculanta,
  carotiera,
  ciocanDemolator,
  compresorPneumatic,
  containerMic,
  containerMoloz,
  discAbraziv,
  dulgher,
  electrician,
  instalator,
  invelitor,
  masinaTaiatBeton,
  montatorTamplarie,
  necalificat,
  polizor,
  rotopercutor,
  sacMoloz,
  tinichigiu,
} from "./resources";

const category = "Demolări și desfaceri";

export const demolari: BaseNorm[] = [
  {
    code: "DV-DEM-01",
    category,
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
    category,
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
    category,
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
    category,
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
    category,
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
    category,
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
    category,
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
    category,
    title:
      "Evacuarea molozului cu container de 7 mc, cu transport și depozitare",
    unit: "buc",
    includes:
      "Aducerea containerului, ridicarea lui plin, transportul și taxa de depozitare a deșeurilor din construcții.",
    excludes: "Încărcarea molozului în container.",
    measurement: "Numărul de containere.",
    resources: [containerMoloz(1)],
  },
  {
    code: "DV-DEM-09",
    category,
    title: "Desfacerea șapelor din mortar de ciment, până la 6 cm grosime",
    unit: "mp",
    includes:
      "Spargerea șapei cu ciocanul demolator, desprinderea de pe suport, cu folia sau izolația de sub ea, și strângerea molozului în grămezi.",
    excludes:
      "Desfacerea plăcii de beton de sub șapă; încărcarea și transportul molozului.",
    measurement: "Suprafața șapei desfăcute.",
    resources: [necalificat(0.5), ciocanDemolator(0.3)],
  },
  {
    code: "DV-DEM-10",
    category,
    title:
      "Demolarea betonului simplu sau slab armat din fundații, plăci și trepte",
    unit: "mc",
    includes:
      "Spargerea betonului cu ciocanul demolator și cel pneumatic, tăierea armăturilor întâlnite și strângerea molozului în grămezi.",
    excludes:
      "Sprijinirile; săpătura de dezvelire; încărcarea și transportul molozului.",
    measurement: "Volumul betonului demolat, după dimensiunile măsurate.",
    resources: [
      discAbraziv(0.5),
      necalificat(6),
      ciocanDemolator(2.5),
      compresorPneumatic(0.8),
      polizor(0.3),
    ],
  },
  {
    code: "DV-DEM-11",
    category,
    title: "Demolarea betonului armat din stâlpi, grinzi și plăci",
    unit: "mc",
    includes:
      "Spargerea betonului cu ciocanul pneumatic, tăierea armăturilor cu discul, sortarea fierului și strângerea molozului în grămezi.",
    excludes:
      "Sprijinirea elementelor rămase, stabilită de proiectant; încărcarea și transportul molozului.",
    measurement: "Volumul betonului demolat, după dimensiunile măsurate.",
    resources: [
      discAbraziv(2),
      necalificat(8),
      compresorPneumatic(2.2),
      polizor(0.8),
    ],
  },
  {
    code: "DV-DEM-12",
    category,
    title: "Desfacerea pereților din gips-carton, cu structura și vata lor",
    unit: "mp",
    includes:
      "Desprinderea plăcilor, scoaterea vatei, demontarea profilelor și sortarea materialelor pe categorii de deșeuri.",
    excludes: "Încărcarea și transportul materialelor rezultate.",
    measurement: "Suprafața peretelui desfăcut, fără goluri.",
    resources: [necalificat(0.3)],
  },
  {
    code: "DV-DEM-13",
    category,
    title: "Desfacerea plafoanelor suspendate din gips-carton sau casete",
    unit: "mp",
    includes:
      "Desprinderea plăcilor sau a casetelor, demontarea profilelor și a suspendărilor, scoaterea izolației și sortarea materialelor.",
    excludes:
      "Demontarea corpurilor de iluminat și a instalațiilor din plafon; încărcarea și transportul materialelor.",
    measurement: "Suprafața plafonului desfăcut, în proiecție orizontală.",
    resources: [necalificat(0.35)],
  },
  {
    code: "DV-DEM-14",
    category,
    title:
      "Îndepărtarea zugrăvelilor și a tapetului vechi de pe pereți și tavane",
    unit: "mp",
    includes:
      "Umezirea și răzuirea straturilor de zugrăveală sau desprinderea tapetului cu adezivul lui, până la glet sau tencuială, și strângerea resturilor.",
    excludes: "Reparațiile gletului; gletul nou.",
    measurement: "Suprafața curățată, fără goluri.",
    resources: [necalificat(0.18)],
  },
  {
    code: "DV-DEM-15",
    category,
    title: "Desfacerea învelitorii din țiglă, cu șipcile și folia",
    unit: "mp",
    includes:
      "Scoaterea țiglelor, a coamelor și a accesoriilor, desfacerea șipcilor, a contrașipcilor și a foliei, coborârea materialelor și stivuirea lor.",
    excludes:
      "Desfacerea șarpantei; demontarea jgheaburilor și a burlanelor; transportul materialelor.",
    measurement: "Suprafața învelitorii desfăcute, măsurată pe pantă.",
    resources: [necalificat(0.35), invelitor(0.1)],
  },
  {
    code: "DV-DEM-16",
    category,
    title: "Desfacerea învelitorii din tablă, cu șipcile și folia",
    unit: "mp",
    includes:
      "Desfacerea șuruburilor sau a falțurilor, coborârea foilor de tablă, desfacerea șipcilor și a foliei, stivuirea materialelor.",
    excludes:
      "Desfacerea șarpantei; demontarea jgheaburilor și a burlanelor; transportul materialelor.",
    measurement: "Suprafața învelitorii desfăcute, măsurată pe pantă.",
    resources: [necalificat(0.25), tinichigiu(0.08)],
  },
  {
    code: "DV-DEM-17",
    category,
    title: "Demontarea jgheaburilor și a burlanelor",
    unit: "m",
    includes:
      "Desprinderea jgheaburilor sau a burlanelor de pe cârlige și brățări, demontarea prinderilor și coborârea elementelor.",
    excludes: "Transportul materialelor; schela.",
    measurement: "Lungimea jgheaburilor și a burlanelor demontate.",
    resources: [necalificat(0.12), tinichigiu(0.06)],
  },
  {
    code: "DV-DEM-18",
    category,
    title: "Desfacerea șarpantei din lemn",
    unit: "mc",
    includes:
      "Desfacerea elementelor în ordinea inversă montării, scoaterea cuielor și a pieselor metalice, coborârea și stivuirea lemnului.",
    excludes:
      "Desfacerea învelitorii; transportul materialelor; schela sau platforma de lucru.",
    measurement: "Volumul lemnului desfăcut, după dimensiunile elementelor.",
    resources: [dulgher(4), necalificat(6)],
  },
  {
    code: "DV-DEM-19",
    category,
    title: "Demontarea obiectelor sanitare, cu bateriile și racordurile lor",
    unit: "buc",
    includes:
      "Închiderea apei, desfacerea racordurilor, demontarea obiectului cu bateria și sifonul, dopurile provizorii la conducte.",
    excludes: "Desfacerea conductelor din perete; transportul.",
    measurement:
      "Numărul de obiecte sanitare demontate: lavoar, WC, cadă, cabină, bideu, chiuvetă.",
    resources: [instalator(0.6), necalificat(0.2)],
  },
  {
    code: "DV-DEM-20",
    category,
    title:
      "Demontarea aparatajului electric și a corpurilor de iluminat, cu scoaterea de sub tensiune",
    unit: "buc",
    includes:
      "Scoaterea de sub tensiune a circuitului, demontarea prizei, a întrerupătorului sau a corpului de iluminat și izolarea capetelor de cablu.",
    excludes: "Scoaterea cablurilor din perete; tabloul electric.",
    measurement: "Numărul de aparate și corpuri de iluminat demontate.",
    resources: [electrician(0.2)],
  },
  {
    code: "DV-DEM-21",
    category,
    title:
      "Tăierea betonului armat cu disc diamantat, pentru goluri, până la 15 cm adâncime",
    unit: "m",
    includes:
      "Trasarea, tăierea cu apă pe ambele fețe unde se poate, desprinderea bucăților tăiate și strângerea lor.",
    excludes:
      "Sprijinirile și buiandrugii noi; coborârea bucăților grele cu macaraua; încărcarea și transportul molozului.",
    measurement:
      "Lungimea tăieturii. Un gol de ușă de 0,9 × 2,1 m într-un perete are 5,1 m de tăietură.",
    resources: [necalificat(0.6), masinaTaiatBeton(0.5)],
  },
  {
    code: "DV-DEM-22",
    category,
    title:
      "Carotare în beton sau zidărie pentru treceri de conducte, Ø100–160 mm, până la 30 cm adâncime",
    unit: "buc",
    includes:
      "Trasarea, fixarea carotierei, găurirea cu apă, scoaterea carotei și curățarea locului.",
    excludes: "Etanșarea trecerii după montarea conductei.",
    measurement:
      "Numărul de carote. O trecere printr-un perete mai gros de 30 cm se numără pentru fiecare 30 cm începuți.",
    resources: [necalificat(0.6), carotiera(0.5)],
  },
  {
    code: "DV-DEM-23",
    category,
    title: "Desfacerea pavajelor din pavele sau dale, cu stratul de nisip",
    unit: "mp",
    includes:
      "Scoaterea pavelelor sau a dalelor, curățarea și stivuirea celor bune pentru refolosire, strângerea nisipului și a resturilor.",
    excludes: "Desfacerea bordurilor și a fundației; transportul.",
    measurement: "Suprafața pavajului desfăcut.",
    resources: [necalificat(0.4), rotopercutor(0.05)],
  },
  {
    code: "DV-DEM-24",
    category,
    title: "Desfacerea trotuarelor și a platformelor din beton, până la 12 cm",
    unit: "mp",
    includes:
      "Spargerea betonului cu ciocanul demolator, scoaterea bucăților și strângerea molozului în grămezi.",
    excludes:
      "Desfacerea stratului de balast; încărcarea și transportul molozului.",
    measurement: "Suprafața desfăcută.",
    resources: [necalificat(0.8), ciocanDemolator(0.4)],
  },
  {
    code: "DV-DEM-25",
    category,
    title:
      "Evacuarea molozului cu container de 4 mc, cu transport și depozitare",
    unit: "buc",
    includes:
      "Aducerea containerului, ridicarea lui plin, transportul și taxa de depozitare a deșeurilor din construcții.",
    excludes: "Încărcarea molozului în container.",
    measurement: "Numărul de containere.",
    resources: [containerMic(1)],
  },
  {
    code: "DV-DEM-26",
    category,
    title:
      "Evacuarea molozului în saci de 1 mc, cu ridicare, transport și depozitare",
    unit: "buc",
    includes:
      "Sacul, ridicarea lui plin de la marginea drumului, transportul și taxa de depozitare.",
    excludes: "Încărcarea molozului în sac și aducerea lui la drum.",
    measurement: "Numărul de saci ridicați.",
    resources: [sacMoloz(1)],
  },
];
