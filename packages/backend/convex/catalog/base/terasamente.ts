import type { BaseNorm } from "./norm";
import {
  autobasculanta,
  balast,
  betonC16,
  betonist,
  bordura,
  buldoexcavator,
  cherestea,
  cilindruCompactor,
  compresorPneumatic,
  cuie,
  dulgher,
  excavator,
  fierar,
  geotextil,
  gradinar,
  instalator,
  lacatus,
  maiCompactor,
  material,
  miniexcavator,
  mortarZidarie,
  necalificat,
  nisip,
  otelBeton,
  pavator,
  pavele,
  piatraSparta,
  pietris,
  placajFilmat,
  placaVibranta,
  pompaEpuisment,
  smallMaterials,
  topometrist,
  vibrator,
} from "./resources";

const category = "Terasamente și lucrări exterioare";

const pamantVegetal = material("Pământ vegetal", "mc", 60);
const semintaGazon = material("Semințe de gazon", "kg", 45);
const ingrasamant = material("Îngrășământ de pornire pentru gazon", "kg", 8);
const gazonRulou = material("Gazon rulou", "mp", 14);
const pavele8 = material("Pavele de beton, 8 cm", "mp", 52);
const dale = material("Dale de beton, 40 × 40 cm", "mp", 55);
const borduraMare = material(
  "Bordură de beton stradală, 20 × 25 cm",
  "buc",
  38,
);
const rigola = material(
  "Rigolă din beton polimer cu grătar din fontă",
  "m",
  180,
);
const tubDren = material("Tub de drenaj riflat Ø100", "m", 8);
const caminPluvial = material(
  "Cămin pluvial din PVC Ø315 cu capac",
  "buc",
  450,
);
const panouGard = material(
  "Panou de gard bordurat zincat, 2,5 × 1,7 m",
  "buc",
  185,
);
const stalpGard = material("Stâlp zincat pentru gard, 2,4 m", "buc", 55);
const clemeGard = material("Set de cleme pentru panou de gard", "set", 12);
const plasaImpletita = material("Plasă împletită zincată, 1,5 m", "m", 22);
const dusumeaLemn = material(
  "Dușumea de terasă din lemn tratat, 28 mm",
  "mp",
  120,
);
const grinziTerasa = material("Grinzi de lemn tratat pentru terase", "m", 14);
const surubInox = material("Șurub inox pentru terase", "buc", 0.5);
const plot = material("Plot reglabil pentru terase", "buc", 12);
const dusumeaWpc = material("Dușumea de terasă din WPC", "mp", 150);
const profilWpc = material(
  "Profil de susținere din aluminiu pentru terase",
  "m",
  20,
);
const clipsWpc = material("Clips pentru terase din WPC", "buc", 1);
const tevaPehd = material("Țeavă PEHD Ø25 PN6", "m", 3);
const aspersor = material("Aspersor escamotabil", "buc", 55);
const electrovana = material("Electrovană pentru irigații", "buc", 120);
const programator = material("Programator pentru irigații", "buc", 350);

export const terasamente: BaseNorm[] = [
  {
    code: "DV-TER-01",
    category,
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
    category,
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
    category,
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
    category,
    title: "Strat de balast compactat sub fundații, pardoseli sau alei",
    unit: "mc",
    includes:
      "Așezarea balastului în straturi, udarea și compactarea cu placa vibrantă.",
    measurement: "Volumul stratului compactat.",
    resources: [balast(1.25), necalificat(1.2), placaVibranta(0.3)],
  },
  {
    code: "DV-TER-05",
    category,
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
    category,
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
    category,
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
  {
    code: "DV-TER-08",
    category,
    title:
      "Decopertarea stratului vegetal de 20 cm, cu depozitarea pământului pe amplasament",
    unit: "mp",
    includes:
      "Îndepărtarea vegetației mărunte, decopertarea cu buldoexcavatorul și depozitarea pământului vegetal în grămezi, pentru refolosire.",
    excludes: "Tăierea arborilor și scoaterea rădăcinilor; transportul.",
    measurement: "Suprafața decopertată.",
    resources: [buldoexcavator(0.012), necalificat(0.03)],
  },
  {
    code: "DV-TER-09",
    category,
    title:
      "Săpătură mecanizată cu buldoexcavatorul, cu depozitarea pământului pe mal",
    unit: "mc",
    includes:
      "Săparea cu buldoexcavatorul, depozitarea pământului lângă săpătură pentru umpluturi și finisarea manuală a fundului.",
    excludes: "Sprijinirile; încărcarea și transportul pământului în plus.",
    measurement: "Volumul săpăturii, după dimensiunile din proiect.",
    resources: [buldoexcavator(0.03), necalificat(0.08)],
  },
  {
    code: "DV-TER-10",
    category,
    title: "Săpătură mecanizată cu miniexcavatorul, în curți și spații înguste",
    unit: "mc",
    includes:
      "Săparea cu miniexcavatorul, depozitarea pământului lângă săpătură și finisarea manuală a fundului.",
    excludes: "Sprijinirile; încărcarea și transportul pământului.",
    measurement: "Volumul săpăturii, după dimensiunile din proiect.",
    resources: [miniexcavator(0.08), necalificat(0.15)],
  },
  {
    code: "DV-TER-11",
    category,
    title:
      "Săpătură manuală în șanțuri pentru conducte și cabluri, până la 1 m adâncime",
    unit: "mc",
    includes:
      "Săparea șanțului cu pereții verticali, aruncarea pământului pe mal și nivelarea fundului la pantă.",
    excludes: "Sprijinirile; patul de nisip; umplutura.",
    measurement:
      "Volumul șanțului, cu lățimea de cel puțin 40 cm pentru o conductă.",
    resources: [necalificat(2.8)],
  },
  {
    code: "DV-TER-12",
    category,
    title:
      "Săpătură manuală în pământ tare sau cu bolovani, cu unelte pneumatice",
    unit: "mc",
    includes:
      "Desfacerea pământului cu ciocanul pneumatic și târnăcopul, aruncarea pe mal și nivelarea fundului.",
    excludes: "Sprijinirile; transportul pământului.",
    measurement: "Volumul săpăturii, după dimensiunile din proiect.",
    resources: [necalificat(4), compresorPneumatic(0.6)],
  },
  {
    code: "DV-TER-13",
    category,
    title: "Sprijinirea malurilor săpăturii cu dulapi și șpraițuri din lemn",
    unit: "mp",
    includes:
      "Montarea dulapilor pe măsura adâncirii săpăturii, a filatelor și a șpraițurilor, demontarea și recuperarea lemnului.",
    measurement: "Suprafața malului sprijinit.",
    resources: [cherestea(0.012), cuie(0.1), dulgher(0.5), necalificat(0.4)],
  },
  {
    code: "DV-TER-14",
    category,
    title: "Epuismente cu pompa, pentru apa din săpături",
    unit: "ora",
    includes:
      "Pompa cu furtunurile ei, supravegherea și mutarea ei pe măsura lucrului.",
    excludes: "Puțurile de colectare; evacuarea apei la distanță mare.",
    measurement: "Orele de funcționare a pompei.",
    resources: [pompaEpuisment(1), necalificat(0.2)],
  },
  {
    code: "DV-TER-15",
    category,
    title:
      "Umplutură din balast compactată cu cilindrul, pentru platforme și drumuri de incintă",
    unit: "mc",
    includes:
      "Împrăștierea balastului cu buldoexcavatorul în straturi de 20 cm, udarea și compactarea cu cilindrul.",
    measurement: "Volumul stratului compactat.",
    resources: [
      balast(1.25),
      necalificat(0.15),
      buldoexcavator(0.02),
      cilindruCompactor(0.03),
    ],
  },
  {
    code: "DV-TER-16",
    category,
    title:
      "Strat de piatră spartă compactată, pentru fundații de drumuri și platforme",
    unit: "mc",
    includes:
      "Împrăștierea pietrei sparte în straturi, împănarea, udarea și compactarea cu cilindrul.",
    measurement: "Volumul stratului compactat.",
    resources: [
      piatraSparta(1.3),
      necalificat(0.2),
      buldoexcavator(0.02),
      cilindruCompactor(0.04),
    ],
  },
  {
    code: "DV-TER-17",
    category,
    title: "Pat de nisip pentru conducte și cabluri, cu acoperirea lor",
    unit: "mc",
    includes:
      "Așezarea nisipului sub și peste conductă, în straturi compactate manual, cu banda de avertizare deasupra.",
    excludes: "Umplutura cu pământ de deasupra.",
    measurement: "Volumul nisipului pus în operă.",
    resources: [nisip(1.2), necalificat(1.2), placaVibranta(0.1)],
  },
  {
    code: "DV-TER-18",
    category,
    title: "Încărcarea mecanizată a pământului în autobasculantă",
    unit: "mc",
    includes:
      "Încărcarea pământului depozitat în grămezi, cu buldoexcavatorul.",
    excludes: "Transportul.",
    measurement: "Volumul pământului încărcat, măsurat în săpătură.",
    resources: [buldoexcavator(0.02)],
  },
  {
    code: "DV-TER-19",
    category,
    title: "Transportul pământului cu autobasculanta, la 10 km",
    unit: "mc",
    includes:
      "Transportul la depozitul autorizat sau la locul de refolosire, cu descărcarea.",
    excludes: "Încărcarea; taxa de depozitare.",
    measurement:
      "Volumul pământului măsurat în săpătură; un metru cub cântărește în jur de 1,8 t. Pentru altă distanță, transportul este masa înmulțită cu kilometrii.",
    resources: [autobasculanta(18)],
  },
  {
    code: "DV-TER-20",
    category,
    title: "Trasarea construcției pe teren, cu topometrist",
    unit: "buc",
    includes:
      "Materializarea axelor și a cotei de nivel cu țăruși și sârmă, pe împrejmuirea de trasare, și predarea lor constructorului, pentru o construcție cu amprenta de până la 300 mp.",
    measurement: "Numărul de trasări.",
    resources: [cherestea(0.02), cuie(0.5), topometrist(4), necalificat(4)],
  },
  {
    code: "DV-TER-21",
    category,
    title:
      "Împrăștierea pământului vegetal în strat de 10 cm, nivelat pentru gazon",
    unit: "mp",
    includes:
      "Aducerea pământului vegetal cu roaba, împrăștierea, mărunțirea și nivelarea lui cu grebla.",
    excludes: "Pământul adus din altă parte peste cel de pe amplasament.",
    measurement: "Suprafața amenajată.",
    resources: [pamantVegetal(0.11), necalificat(0.12)],
  },
  {
    code: "DV-TER-22",
    category,
    title: "Gazon prin semănare, cu îngrășământ de pornire",
    unit: "mp",
    includes:
      "Pregătirea și tăvălugirea patului, împrăștierea semințelor și a îngrășământului, greblarea ușoară și prima udare.",
    excludes: "Pământul vegetal; udările până la răsărire.",
    measurement: "Suprafața semănată.",
    resources: [
      semintaGazon(0.035),
      ingrasamant(0.03),
      gradinar(0.08),
      necalificat(0.05),
    ],
  },
  {
    code: "DV-TER-23",
    category,
    title: "Gazon din rulouri, pe pat pregătit",
    unit: "mp",
    includes:
      "Nivelarea și tăvălugirea patului, așezarea rulourilor cu rosturile țesute, tăieturile la margini și prima udare.",
    excludes: "Pământul vegetal; udările din primele săptămâni.",
    measurement: "Suprafața înierbată.",
    resources: [gazonRulou(1.05), gradinar(0.12), necalificat(0.08)],
  },
  {
    code: "DV-TER-24",
    category,
    title: "Pavaj din pavele de beton de 8 cm, pe strat de nisip, pentru auto",
    unit: "mp",
    includes:
      "Stratul de nisip nivelat, așezarea pavelelor, tăieturile, compactarea și umplerea rosturilor cu nisip.",
    excludes: "Fundația de balast sau piatră spartă; bordurile.",
    measurement: "Suprafața pavată.",
    resources: [
      nisip(0.055),
      pavele8(1.03),
      pavator(0.6),
      necalificat(0.4),
      placaVibranta(0.04),
    ],
  },
  {
    code: "DV-TER-25",
    category,
    title: "Dale de beton de 40 × 40 cm, pe strat de nisip",
    unit: "mp",
    includes:
      "Stratul de nisip nivelat, așezarea dalelor la nivel, tăieturile și umplerea rosturilor cu nisip.",
    excludes: "Fundația de balast; bordurile.",
    measurement: "Suprafața dalată.",
    resources: [nisip(0.05), dale(1.03), pavator(0.5), necalificat(0.3)],
  },
  {
    code: "DV-TER-26",
    category,
    title: "Bordură stradală din beton de 20 × 25 cm, pe fundație de beton",
    unit: "m",
    includes:
      "Săparea șanțului, fundația și contraforții din beton, așezarea bordurilor la aliniament și cotă, rostuirea lor.",
    measurement: "Lungimea bordurii.",
    resources: [
      borduraMare(2),
      betonC16(0.05),
      mortarZidarie(0.003),
      pavator(0.45),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-TER-27",
    category,
    title: "Rigolă din beton polimer cu grătar din fontă, pe pat de beton",
    unit: "m",
    includes:
      "Săpătura, patul și încastrarea de beton, așezarea rigolelor la pantă, îmbinările și racordul la canalizare, montarea grătarelor.",
    excludes: "Conducta de canalizare pluvială.",
    measurement: "Lungimea rigolei.",
    resources: [rigola(1), betonC16(0.06), pavator(0.5), necalificat(0.4)],
  },
  {
    code: "DV-TER-28",
    category,
    title: "Dren perimetral din tub riflat Ø100, în geotextil și pietriș",
    unit: "m",
    includes:
      "Așezarea geotextilului în șanț, stratul de pietriș, tubul de drenaj la pantă, acoperirea cu pietriș și închiderea geotextilului.",
    excludes: "Săpătura șanțului; căminele; umplutura de deasupra.",
    measurement: "Lungimea drenului.",
    resources: [tubDren(1.05), geotextil(1.8), pietris(0.25), necalificat(0.7)],
  },
  {
    code: "DV-TER-29",
    category,
    title: "Cămin pluvial sau de drenaj din PVC Ø315, cu capac",
    unit: "buc",
    includes:
      "Așezarea căminului pe pat de beton, racordarea tuburilor, montarea prelungitorului și a capacului la cotă.",
    excludes: "Săpătura; tuburile; umplutura.",
    measurement: "Numărul de cămine.",
    resources: [
      caminPluvial(1),
      betonC16(0.1),
      instalator(0.8),
      necalificat(1.5),
    ],
  },
  {
    code: "DV-TER-30",
    category,
    title: "Gard din panouri bordurate zincate de 1,7 m, pe stâlpi în beton",
    unit: "m",
    includes:
      "Gropile și betonarea stâlpilor, montarea panourilor cu clemele lor, alinierea și nivelarea.",
    excludes: "Fundația continuă și soclul; porțile.",
    measurement: "Lungimea gardului, fără porți.",
    resources: [
      panouGard(0.42),
      stalpGard(0.42),
      clemeGard(0.42),
      betonC16(0.03),
      lacatus(0.5),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-TER-31",
    category,
    title: "Gard din plasă împletită zincată de 1,5 m, pe stâlpi în beton",
    unit: "m",
    includes:
      "Gropile și betonarea stâlpilor, întinderea sârmelor de tensionare, montarea și întinderea plasei.",
    excludes: "Fundația continuă; porțile.",
    measurement: "Lungimea gardului, fără porți.",
    resources: [
      plasaImpletita(1.05),
      stalpGard(0.4),
      betonC16(0.03),
      smallMaterials(6),
      lacatus(0.35),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-TER-32",
    category,
    title:
      "Fundație și soclu din beton armat pentru gard, 30 cm lățime, 80 cm înălțime",
    unit: "m",
    includes:
      "Cofrajul soclului, armarea cu bare, turnarea și vibrarea betonului, decofrarea.",
    excludes: "Săpătura; stratul de balast; tencuirea sau placarea soclului.",
    measurement: "Lungimea fundației.",
    resources: [
      betonC16(0.24),
      otelBeton(6),
      placajFilmat(0.25),
      cherestea(0.006),
      cuie(0.1),
      betonist(1.2),
      dulgher(0.8),
      fierar(0.2),
      necalificat(1),
      vibrator(0.2),
    ],
  },
  {
    code: "DV-TER-33",
    category,
    title: "Terasă din dușumea de lemn tratat, pe grinzi și ploturi reglabile",
    unit: "mp",
    includes:
      "Așezarea ploturilor și a grinzilor la nivel, montarea scândurilor cu rost de 5 mm și șuruburi inox, tăieturile la margini.",
    excludes: "Placa sau pavajul de sub terasă; tratarea lemnului cu ulei.",
    measurement: "Suprafața terasei.",
    resources: [
      dusumeaLemn(1.08),
      grinziTerasa(3),
      surubInox(24),
      plot(3),
      dulgher(0.9),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-TER-34",
    category,
    title: "Terasă din dușumea de WPC, pe profile de aluminiu și ploturi",
    unit: "mp",
    includes:
      "Așezarea ploturilor și a profilelor la nivel, montarea lamelelor cu clipsuri, profilele de margine și tăieturile.",
    excludes: "Placa sau pavajul de sub terasă.",
    measurement: "Suprafața terasei.",
    resources: [
      dusumeaWpc(1.06),
      profilWpc(3),
      clipsWpc(20),
      plot(3),
      dulgher(0.8),
      necalificat(0.3),
    ],
  },
  {
    code: "DV-TER-35",
    category,
    title: "Sistem de irigații cu aspersoare escamotabile, pentru gazon",
    unit: "mp",
    includes:
      "Săparea șanțurilor, conductele din PEHD cu fitingurile lor, aspersoarele, electrovanele în cămin și programatorul, proba și reglarea.",
    excludes:
      "Branșamentul de apă și pompa; alimentarea electrică a programatorului.",
    measurement: "Suprafața gazonului irigat.",
    resources: [
      tevaPehd(0.5),
      aspersor(0.03),
      electrovana(0.005),
      programator(0.002),
      smallMaterials(8),
      instalator(0.06),
      necalificat(0.1),
    ],
  },
];
