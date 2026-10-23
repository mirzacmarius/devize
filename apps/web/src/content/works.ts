export interface WorkItem {
  name: string;
  unit: string;
}

export interface WorkChapter {
  name: string;
  items: WorkItem[];
}

export interface Work {
  /** The address under /lucrari. */
  slug: string;
  /** The page's title. */
  title: string;
  /** The short name, for cards and links. */
  short: string;
  /** The browser tab and search result title. */
  metaTitle: string;
  description: string;
  intro: string;
  /** The Capitole a Deviz for this work usually has, with typical Articole. */
  chapters: WorkChapter[];
  priceDrivers: string[];
  omissions: string[];
  /** Where producers' norms matter for this work. */
  producers: string;
  faq: { question: string; answer: string }[];
  related: string[];
}

export const works: Work[] = [
  {
    slug: "renovare-baie",
    title: "Deviz pentru renovarea băii",
    short: "Renovare baie",
    metaTitle: "Deviz renovare baie: ce cuprinde și ce se uită",
    description:
      "Ce cuprinde devizul unei băi renovate: demolări, instalații, hidroizolație, placaje și obiecte sanitare, cu unitățile de măsură și omisiunile frecvente.",
    intro:
      "O baie strânge în câțiva metri pătrați aproape toate meseriile: demolări, instalații sanitare și electrice, hidroizolație, placaje, obiecte sanitare. De aceea devizul de baie are cele mai multe omisiuni din practică, iar diferența dintre o ofertă bună și una păguboasă stă în rândurile mici.",
    chapters: [
      {
        name: "Demolări și pregătire",
        items: [
          { name: "Desfacere faianță și gresie, cu adeziv", unit: "mp" },
          { name: "Demontare obiecte sanitare", unit: "buc" },
          { name: "Desfacere șapă degradată", unit: "mp" },
          { name: "Evacuare moloz, cu coborâre și transport", unit: "mc" },
        ],
      },
      {
        name: "Instalații sanitare",
        items: [
          { name: "Traseu apă rece și caldă, PPR sau PEX", unit: "ml" },
          { name: "Traseu canalizare, PP sau PVC", unit: "ml" },
          { name: "Montaj obiecte sanitare și baterii", unit: "buc" },
          { name: "Probă de presiune", unit: "buc" },
        ],
      },
      {
        name: "Instalații electrice",
        items: [
          { name: "Circuit nou, cu cablu și tub", unit: "ml" },
          { name: "Doze, prize și întrerupătoare", unit: "buc" },
          { name: "Ventilator de baie, cu racord", unit: "buc" },
        ],
      },
      {
        name: "Suport și hidroizolație",
        items: [
          { name: "Șapă de pantă sau de egalizare", unit: "mp" },
          { name: "Amorsă pentru suport", unit: "mp" },
          { name: "Hidroizolație elastică, două straturi", unit: "mp" },
          { name: "Bandă de etanșare la colțuri și treceri", unit: "ml" },
        ],
      },
      {
        name: "Placaje",
        items: [
          { name: "Placare gresie, montaj drept sau în diagonală", unit: "mp" },
          { name: "Placare faianță", unit: "mp" },
          { name: "Chituire rosturi și silicon sanitar", unit: "mp" },
          { name: "Profile de colț și de trecere", unit: "ml" },
        ],
      },
      {
        name: "Finisaje",
        items: [
          {
            name: "Glet și lavabilă rezistentă la umezeală, tavan",
            unit: "mp",
          },
          { name: "Montaj ușă, cu toc și feronerie", unit: "buc" },
          { name: "Montaj accesorii: oglindă, suporturi", unit: "buc" },
        ],
      },
    ],
    priceDrivers: [
      "Formatul plăcilor și modul de montaj: în diagonală sau cu plăci mari, pierderile și manopera cresc față de montajul drept.",
      "Mutarea obiectelor sanitare: fiecare traseu nou de apă și canal adaugă metri liniari și spargeri.",
      "Starea instalațiilor existente: coloanele vechi se schimbă de obicei odată cu baia.",
      "Calitatea obiectelor sanitare și a bateriilor, de cele mai multe ori alese de client.",
      "Accesul: etajul fără lift schimbă costul evacuării molozului și al transportului materialelor.",
    ],
    omissions: [
      "Hidroizolația de sub placaj și pe pereții zonei de duș, până la înălțimea stropirii.",
      "Șapa de pantă spre sifonul de pardoseală la dușurile fără cădiță.",
      "Amorsa suportului înainte de șapă, hidroizolație și adeziv.",
      "Evacuarea molozului și protecția scării sau a liftului.",
      "Chituirea rosturilor și siliconul la colțuri, numărate separat de placare.",
      "Proba de presiune a instalației, înainte de a închide pereții.",
    ],
    producers:
      "Normele de producător contează cel mai mult la hidroizolație, adezivi și chituri: consumul pe metru pătrat vine din fișa tehnică a produsului ales, nu dintr-o medie veche.",
    faq: [
      {
        question: "Pe ce unitate se măsoară placajele?",
        answer:
          "Pe metru pătrat de suprafață placată, cu pierderile din tăieri incluse în consumul de plăci. Devize adaugă pierderile după modul de montaj: drept, decalat, în diagonală.",
      },
      {
        question: "Trebuie hidroizolație dacă baia nu e la parter?",
        answer:
          "Da. Hidroizolația protejează planșeul și vecinii de dedesubt, nu doar încăperea. Lipsa ei e cea mai scumpă omisiune a unei băi.",
      },
      {
        question: "Clientul vrea două variante de gresie. Fac două devize?",
        answer:
          "Nu. Faci un deviz și două variante ale ofertei, cu alte plăci în aceleași lucrări; clientul alege pe link și vede totalul fiecărei variante.",
      },
    ],
    related: ["renovare-bucatarie", "instalatii-sanitare", "pardoseli"],
  },
  {
    slug: "renovare-bucatarie",
    title: "Deviz pentru renovarea bucătăriei",
    short: "Renovare bucătărie",
    metaTitle: "Deviz renovare bucătărie: capitole, articole, omisiuni",
    description:
      "Capitolele devizului pentru o bucătărie renovată: instalații, pregătirea pereților, placaje, pardoseală și finisaje, cu ce se uită cel mai des.",
    intro:
      "Bucătăria combină instalații sanitare, electrice și de gaz cu finisaje care trebuie să țină la apă, grăsime și căldură. Devizul bun urmărește ordinea șantierului: instalațiile înainte de tencuială, placajele înainte de mobilier.",
    chapters: [
      {
        name: "Demolări",
        items: [
          { name: "Desfacere placaje și tencuieli degradate", unit: "mp" },
          { name: "Demontare mobilier și obiecte sanitare", unit: "buc" },
          { name: "Evacuare moloz", unit: "mc" },
        ],
      },
      {
        name: "Instalații",
        items: [
          {
            name: "Traseu apă și canalizare pentru chiuvetă și mașini",
            unit: "ml",
          },
          { name: "Circuite electrice pentru plită, cuptor, hotă", unit: "ml" },
          { name: "Prize și întrerupătoare", unit: "buc" },
          { name: "Racord gaz, de către instalator autorizat", unit: "buc" },
        ],
      },
      {
        name: "Pereți și tavan",
        items: [
          { name: "Reparații tencuială", unit: "mp" },
          { name: "Glet și lavabilă lavabilă, pereți și tavan", unit: "mp" },
          { name: "Placare faianță între blaturi și corpuri", unit: "mp" },
        ],
      },
      {
        name: "Pardoseală",
        items: [
          { name: "Șapă de egalizare sau autonivelantă", unit: "mp" },
          { name: "Placare gresie", unit: "mp" },
          { name: "Plinte", unit: "ml" },
        ],
      },
      {
        name: "Montaje finale",
        items: [
          { name: "Montaj chiuvetă și baterie", unit: "buc" },
          { name: "Montaj hotă, cu tubulatură", unit: "buc" },
          { name: "Montaj ușă și glafuri", unit: "buc" },
        ],
      },
    ],
    priceDrivers: [
      "Numărul de consumatori electrici: plita și cuptorul cer circuite dedicate.",
      "Mutarea chiuvetei sau a mașinii de spălat, cu trasee noi.",
      "Suprafața placată: numai între blat și corpurile suspendate sau tot peretele.",
      "Gazul: orice modificare a instalației se face numai de instalator autorizat, cu verificare.",
    ],
    omissions: [
      "Tubulatura hotei până la exterior sau la coloana de ventilație.",
      "Circuitele dedicate pentru plită și cuptor, cu siguranțe proprii.",
      "Siliconul la blat și la chiuvetă.",
      "Protecția mobilierului păstrat și a pardoselii din restul locuinței.",
      "Evacuarea molozului.",
    ],
    producers:
      "Adezivii, chiturile și vopselele lavabile pentru bucătărie au consumuri și condiții de aplicare în fișele tehnice; normele de producător le aduc în deviz întocmai.",
    faq: [
      {
        question: "Mobilierul intră în deviz?",
        answer:
          "De obicei nu: mobilierul e al clientului sau al tâmplarului. În deviz intră montajul chiuvetei, al hotei și al electrocasnicelor încorporabile, dacă le faci tu.",
      },
      {
        question: "Cum tratez lucrările la gaz?",
        answer:
          "Ca articol separat, cu furnizorul autorizat și verificarea lui. Devize îl poate ține ca articol propriu, cu prețul din oferta instalatorului.",
      },
    ],
    related: ["renovare-baie", "instalatii-electrice", "pardoseli"],
  },
  {
    slug: "zugraveli-apartament",
    title: "Deviz pentru zugrăveli de apartament",
    short: "Zugrăveli apartament",
    metaTitle: "Deviz zugrăveli apartament: glet, amorsă, lavabilă",
    description:
      "Cum se face devizul pentru zugrăvitul unui apartament: pregătirea suprafețelor, gletul, amorsa și vopseaua lavabilă, pe metru pătrat, cu omisiunile frecvente.",
    intro:
      "Zugrăveala e lucrarea cu cel mai mare volum și cea mai mică marjă de eroare: se măsoară pe metru pătrat de perete și tavan, iar prețul depinde de câte straturi primește suportul înainte de vopsea.",
    chapters: [
      {
        name: "Pregătire",
        items: [
          { name: "Protecție pardoseli, tâmplărie și mobilier", unit: "mp" },
          { name: "Îndepărtare tapet sau vopsea veche", unit: "mp" },
          { name: "Reparații crăpături, cu plasă", unit: "ml" },
        ],
      },
      {
        name: "Glet",
        items: [
          { name: "Amorsă pentru suport", unit: "mp" },
          { name: "Glet de ipsos sau de ciment, două straturi", unit: "mp" },
          { name: "Șlefuire și desprăfuire", unit: "mp" },
          { name: "Colțare din aluminiu", unit: "ml" },
        ],
      },
      {
        name: "Vopsitorie",
        items: [
          { name: "Amorsă pentru lavabilă", unit: "mp" },
          { name: "Vopsea lavabilă, două straturi, pereți", unit: "mp" },
          { name: "Vopsea lavabilă, două straturi, tavane", unit: "mp" },
          {
            name: "Vopsea rezistentă la umezeală, băi și bucătării",
            unit: "mp",
          },
        ],
      },
      {
        name: "Detalii",
        items: [
          { name: "Vopsire țevi și calorifere", unit: "buc" },
          { name: "Curățenie la final", unit: "mp" },
        ],
      },
    ],
    priceDrivers: [
      "Starea suportului: pereții noi cer glet complet, pereții vopsiți deja doar reparații și un strat.",
      "Culorile închise sau intense cer un strat în plus.",
      "Înălțimea tavanului și golurile: un apartament cu multe uși și ferestre are mai multe colțuri și margini.",
      "Mobilierul rămas în casă: protecția și mutarea lui intră în timp.",
    ],
    omissions: [
      "Amorsa înainte de glet și amorsa înainte de lavabilă, numărate separat.",
      "Șlefuirea și desprăfuirea între straturi.",
      "Protecția pardoselilor și a tâmplăriei.",
      "Tavanele, când clientul cere „pereții” și se așteaptă la tot.",
      "Vopseaua rezistentă la umezeală în băi și bucătării.",
    ],
    producers:
      "Consumul de glet și de vopsea pe metru pătrat vine din fișa tehnică a fiecărui produs; normele de producător îl folosesc întocmai, pe stratul și suportul potrivite.",
    faq: [
      {
        question: "Cum calculez suprafața de zugrăvit?",
        answer:
          "Perimetrul camerei înmulțit cu înălțimea, din care scazi golurile mai mari decât un prag stabilit, plus suprafața tavanului. Antemăsurătoarea pe camere, în lucru în Devize, face acest calcul din dimensiunile camerei.",
      },
      {
        question: "Un strat sau două?",
        answer:
          "Două straturi de lavabilă pe glet nou e standardul; pe o culoare intensă sau la trecerea de la o culoare închisă la una deschisă, al treilea strat se trece explicit în deviz.",
      },
    ],
    related: ["amenajare-apartament", "gips-carton", "renovare-baie"],
  },
  {
    slug: "termosistem-fatada",
    title: "Deviz pentru termosistem la fațadă",
    short: "Termosistem fațadă",
    metaTitle: "Deviz termosistem fațadă: polistiren sau vată, pe mp",
    description:
      "Devizul pentru izolarea termică a fațadei: schelă, pregătire, plăci de polistiren sau vată minerală, dibluri, plasă, masă de șpaclu și tencuială decorativă.",
    intro:
      "Termosistemul e lucrarea în care norma producătorului face diferența: fiecare sistem are adezivul, plasa, diblurile și tencuiala lui, cu consumuri exacte în fișa tehnică. Devizul se măsoară pe metru pătrat de fațadă, cu glafurile și soclul separat.",
    chapters: [
      {
        name: "Organizare și pregătire",
        items: [
          { name: "Montaj și demontaj schelă", unit: "mp" },
          { name: "Curățare și reparare suport", unit: "mp" },
          { name: "Amorsă pentru suport absorbant", unit: "mp" },
          { name: "Profil de soclu", unit: "ml" },
        ],
      },
      {
        name: "Izolație",
        items: [
          {
            name: "Lipire plăci polistiren expandat sau vată minerală",
            unit: "mp",
          },
          { name: "Dibluire mecanică", unit: "buc" },
          { name: "Izolație soclu cu polistiren extrudat", unit: "mp" },
          { name: "Izolație glafuri și intrados", unit: "ml" },
        ],
      },
      {
        name: "Armare",
        items: [
          { name: "Masă de șpaclu cu plasă din fibră de sticlă", unit: "mp" },
          { name: "Profile de colț cu plasă", unit: "ml" },
          { name: "Profile cu picurător la glafuri", unit: "ml" },
        ],
      },
      {
        name: "Finisaj",
        items: [
          { name: "Amorsă pentru tencuială decorativă", unit: "mp" },
          { name: "Tencuială decorativă siliconică sau acrilică", unit: "mp" },
          { name: "Tencuială mozaicată la soclu", unit: "mp" },
          { name: "Glafuri din tablă sau aluminiu", unit: "ml" },
        ],
      },
    ],
    priceDrivers: [
      "Materialul izolant și grosimea: vata minerală costă mai mult decât polistirenul și cere adeziv și dibluri potrivite.",
      "Schela: înălțimea clădirii și accesul în jurul ei.",
      "Golurile: ferestrele și ușile scad suprafața, dar adaugă metri liniari de glafuri, profile și intrados.",
      "Tencuiala decorativă: granulația și tipul liantului schimbă consumul și prețul pe metru pătrat.",
    ],
    omissions: [
      "Profilul de soclu și izolația soclului cu polistiren extrudat.",
      "Diblurile, numărate la bucată, mai multe la colțuri și la etajele superioare.",
      "Profilele de colț și cele cu picurător la glafuri.",
      "Amorsa dinaintea tencuielii decorative, cerută de producător pentru aderență și culoare uniformă.",
      "Glafurile exterioare, care se schimbă odată cu grosimea izolației.",
    ],
    producers:
      "Un termosistem este un sistem compatibil: adezivul, plăcile, plasa și tencuiala aceluiași producător. Devize îți propune restul sistemului când ai ales o parte din el și semnalează combinațiile greșite, cum e adezivul pentru polistiren pe vată.",
    faq: [
      {
        question: "Polistiren sau vată minerală?",
        answer:
          "Depinde de clădire, de cerințele la foc și de buget. Vata minerală e necombustibilă și permeabilă la vapori; polistirenul e mai ieftin și mai ușor. În Devize faci o variantă pentru fiecare și clientul alege pe link.",
      },
      {
        question: "Cum număr diblurile?",
        answer:
          "Din suprafață, cu densitatea cerută de producător și de înălțime: mai multe pe metru pătrat la colțurile clădirii și la ultimele etaje. Norma de producător a sistemului ales dă consumul exact.",
      },
    ],
    related: ["izolatie-mansarda", "acoperis", "casa-la-rosu"],
  },
  {
    slug: "acoperis",
    title: "Deviz pentru acoperiș",
    short: "Acoperiș",
    metaTitle: "Deviz acoperiș: șarpantă, învelitoare, jgheaburi",
    description:
      "Capitolele devizului pentru un acoperiș nou sau refăcut: desfacere, șarpantă, astereală, folie, învelitoare din țiglă sau tablă, coame, dolii, jgheaburi și burlane.",
    intro:
      "Acoperișul se măsoară pe metru pătrat de pantă, nu de planșeu, iar detaliile, coame, dolii, streașină, coșuri, aduc mai mulți metri liniari decât se vede de jos. Devizul bun le enumeră pe toate înainte de a urca pe schelă.",
    chapters: [
      {
        name: "Desfacere",
        items: [
          { name: "Desfacere învelitoare existentă", unit: "mp" },
          { name: "Desfacere astereală și șipci", unit: "mp" },
          { name: "Evacuare materiale, cu transport", unit: "mc" },
        ],
      },
      {
        name: "Șarpantă",
        items: [
          { name: "Șarpantă din lemn ecarisat, cu tratament", unit: "mc" },
          { name: "Înlocuire elemente degradate", unit: "ml" },
          { name: "Astereală sau șipci și contrașipci", unit: "mp" },
        ],
      },
      {
        name: "Învelitoare",
        items: [
          { name: "Folie anticondens, cu suprapuneri", unit: "mp" },
          {
            name: "Învelitoare din țiglă ceramică, beton sau tablă",
            unit: "mp",
          },
          { name: "Coame și muchii, cu bandă de aerisire", unit: "ml" },
          { name: "Dolii, cu tablă și etanșare", unit: "ml" },
        ],
      },
      {
        name: "Accesorii",
        items: [
          { name: "Jgheaburi, cu cârlige", unit: "ml" },
          { name: "Burlane, cu coturi și brățări", unit: "ml" },
          { name: "Opritori de zăpadă", unit: "buc" },
          { name: "Racorduri la coșuri și ferestre de mansardă", unit: "buc" },
          { name: "Streașină închisă cu lambriu sau tablă", unit: "mp" },
        ],
      },
    ],
    priceDrivers: [
      "Tipul învelitorii: țigla ceramică cere șarpantă mai puternică decât tabla și mai multă manoperă.",
      "Complexitatea: fiecare lucarnă, dolie și coș adaugă metri liniari de detalii scumpe.",
      "Panta și înălțimea: schela, siguranța și ritmul de lucru.",
      "Starea șarpantei: se vede abia după desfacerea învelitorii, de aceea devizul lasă un articol de înlocuire pe metru liniar.",
    ],
    omissions: [
      "Folia anticondens și contrașipcile, care fac ventilarea învelitorii.",
      "Coamele și doliile, cu accesoriile lor, numărate la metru liniar.",
      "Opritorii de zăpadă, obligatorii deasupra intrărilor și a trotuarelor.",
      "Racordurile la coșuri și la ferestrele de mansardă.",
      "Tratamentul lemnului împotriva ciupercilor și a focului.",
      "Schela sau sistemul de siguranță la lucrul la înălțime.",
    ],
    producers:
      "Producătorii de țiglă, tablă și folii publică consumul de țigle pe metru pătrat pentru fiecare model, suprapunerile și accesoriile cerute; normele lor aduc aceste cifre în deviz.",
    faq: [
      {
        question: "Cum calculez suprafața acoperișului?",
        answer:
          "Suprafața în plan a fiecărui versant împărțită la cosinusul pantei, sau lungimea pantei înmulțită cu lățimea, adunate pe toți versanții. Pierderile din tăieri la dolii și muchii se adaugă după modelul învelitorii.",
      },
      {
        question: "Repar sau refac șarpanta?",
        answer:
          "Se decide după desfacerea învelitorii. Devizul inițial ține un articol de înlocuire pe metru liniar, iar după constatare faci o revizie pe care clientul o acceptă pe link.",
      },
    ],
    related: ["izolatie-mansarda", "casa-la-rosu", "termosistem-fatada"],
  },
  {
    slug: "instalatii-electrice",
    title: "Deviz pentru instalații electrice",
    short: "Instalații electrice",
    metaTitle: "Deviz instalații electrice apartament sau casă",
    description:
      "Devizul pentru o instalație electrică nouă: tablou, circuite, doze, prize și întrerupătoare, corpuri de iluminat, împământare și verificări, cu unitățile de măsură.",
    intro:
      "Instalația electrică se devizează pe circuite și pe puncte: fiecare priză, întrerupător și corp de iluminat e un punct cu doza, cablul și tubul lui. Tabloul și împământarea sunt articole proprii, iar verificarea de la final nu lipsește dintr-o ofertă serioasă.",
    chapters: [
      {
        name: "Demontare și pregătire",
        items: [
          { name: "Demontare instalație veche", unit: "buc" },
          { name: "Șanțuri în zidărie sau beton, cu refacere", unit: "ml" },
        ],
      },
      {
        name: "Circuite",
        items: [
          { name: "Circuit iluminat, cablu în tub", unit: "ml" },
          { name: "Circuit prize, cablu în tub", unit: "ml" },
          { name: "Circuit dedicat pentru consumatori mari", unit: "ml" },
          { name: "Doze de derivație și de aparat", unit: "buc" },
        ],
      },
      {
        name: "Aparataj",
        items: [
          { name: "Prize simple și duble", unit: "buc" },
          { name: "Întrerupătoare și comutatoare", unit: "buc" },
          { name: "Corpuri de iluminat, montaj", unit: "buc" },
        ],
      },
      {
        name: "Tablou și protecții",
        items: [
          { name: "Tablou electric, cu siguranțe și diferențial", unit: "buc" },
          { name: "Priză de pământ și legături", unit: "buc" },
          { name: "Verificare și buletin PRAM", unit: "buc" },
        ],
      },
    ],
    priceDrivers: [
      "Numărul de puncte: fiecare priză sau întrerupător înseamnă doză, cablu, tub și manoperă.",
      "Traseele în beton față de zidărie sau gips-carton.",
      "Consumatorii mari: plită, cuptor, boiler, aer condiționat, cu circuite dedicate.",
      "Tabloul: numărul de circuite și protecțiile diferențiale cerute.",
    ],
    omissions: [
      "Refacerea șanțurilor și a tencuielii după montarea tuburilor.",
      "Dozele de derivație, pe lângă cele de aparat.",
      "Priza de pământ și verificarea ei.",
      "Buletinul PRAM și verificarea finală.",
      "Circuitul separat pentru aerul condiționat sau pentru boiler.",
    ],
    producers:
      "Producătorii de aparataj și de tuburi publică pe profilul lor ce accesorii cere montajul fiecărei game; normele lor evită listele cu piese lipsă la final.",
    faq: [
      {
        question: "Pe metru liniar sau pe punct?",
        answer:
          "Ambele apar într-un deviz bun: circuitele pe metru liniar de cablu și tub, aparatajul pe bucată. Devize ține fiecare articol cu unitatea lui și adună totul în recapitulație.",
      },
      {
        question: "E nevoie de un electrician autorizat?",
        answer:
          "Racordul la rețea și verificările se fac de personal autorizat. Trece-le ca articole separate, cu furnizorul lor, ca să nu lipsească din preț.",
      },
    ],
    related: [
      "instalatii-sanitare",
      "renovare-bucatarie",
      "amenajare-apartament",
    ],
  },
  {
    slug: "instalatii-sanitare",
    title: "Deviz pentru instalații sanitare",
    short: "Instalații sanitare",
    metaTitle: "Deviz instalații sanitare: apă, canalizare, obiecte",
    description:
      "Devizul pentru instalația sanitară a unei locuințe: trasee de apă rece și caldă, canalizare, boiler sau centrală, obiecte sanitare și probe de presiune.",
    intro:
      "Instalația sanitară se devizează pe metru liniar de traseu și pe bucată de obiect, iar fiecare obiect sanitar aduce cu el un racord de apă, unul de canal și un robinet de izolare. Proba de presiune e articolul care deosebește oferta serioasă de lista de piese.",
    chapters: [
      {
        name: "Demontare",
        items: [
          { name: "Demontare instalație și obiecte vechi", unit: "buc" },
          { name: "Spargeri și refaceri pentru trasee", unit: "ml" },
        ],
      },
      {
        name: "Alimentare cu apă",
        items: [
          { name: "Traseu apă rece și caldă, PPR sau PEX, izolat", unit: "ml" },
          { name: "Distribuitor cu robineți", unit: "buc" },
          { name: "Robineți de trecere și filtre", unit: "buc" },
          { name: "Probă de presiune", unit: "buc" },
        ],
      },
      {
        name: "Canalizare",
        items: [
          { name: "Traseu canalizare PP, cu pantă și piese", unit: "ml" },
          { name: "Sifon de pardoseală", unit: "buc" },
          { name: "Racord la coloana existentă", unit: "buc" },
        ],
      },
      {
        name: "Obiecte și aparate",
        items: [
          { name: "Montaj lavoar, WC, cadă sau cabină de duș", unit: "buc" },
          { name: "Montaj baterii", unit: "buc" },
          { name: "Montaj boiler sau racord la centrală", unit: "buc" },
        ],
      },
    ],
    priceDrivers: [
      "Lungimea traseelor și câte spargeri cer.",
      "Numărul de obiecte sanitare, fiecare cu racorduri și robineți proprii.",
      "Materialul conductelor și izolarea lor.",
      "Sursa de apă caldă: boiler electric, centrală sau instant.",
    ],
    omissions: [
      "Robineții de izolare la fiecare obiect și la intrare.",
      "Izolarea conductelor de apă caldă și a celor expuse la îngheț.",
      "Proba de presiune înainte de închiderea pereților.",
      "Refacerea tencuielii după spargeri.",
      "Sifonul de pardoseală și panta canalizării.",
    ],
    producers:
      "Producătorii de sisteme de țevi publică numărul de fitinguri pe metru și regulile de îmbinare; normele lor numără piesele care altfel se uită.",
    faq: [
      {
        question: "Cum număr fitingurile?",
        answer:
          "Din traseu: fiecare schimbare de direcție și fiecare ramificație e o piesă. Normele de producător dau un consum mediu de fitinguri pe metru liniar pentru fiecare sistem.",
      },
    ],
    related: ["renovare-baie", "instalatii-electrice", "renovare-bucatarie"],
  },
  {
    slug: "gips-carton",
    title: "Deviz pentru gips-carton",
    short: "Gips-carton",
    metaTitle: "Deviz gips-carton: tavane, pereți, placări",
    description:
      "Devizul pentru lucrări din gips-carton: tavane suspendate, pereți de compartimentare, placări, izolație cu vată, profile, șuruburi, bandă și glet de rosturi.",
    intro:
      "Gips-cartonul se măsoară pe metru pătrat de suprafață montată, dar prețul îl fac profilele, șuruburile, banda și gletul de rosturi, adică exact consumurile pe care producătorii sistemelor le publică pentru fiecare tip de perete și tavan.",
    chapters: [
      {
        name: "Tavane",
        items: [
          {
            name: "Tavan suspendat pe structură metalică, un strat",
            unit: "mp",
          },
          { name: "Scafe și coborâri pentru iluminat", unit: "ml" },
          { name: "Trape de vizitare", unit: "buc" },
        ],
      },
      {
        name: "Pereți",
        items: [
          { name: "Perete de compartimentare, dublu placat", unit: "mp" },
          {
            name: "Placare perete existent pe structură sau lipită",
            unit: "mp",
          },
          { name: "Izolație cu vată minerală în structură", unit: "mp" },
          { name: "Plăci rezistente la umezeală în băi", unit: "mp" },
        ],
      },
      {
        name: "Finisaj",
        items: [
          { name: "Bandă și glet de rosturi, cu șlefuire", unit: "mp" },
          { name: "Colțare metalice", unit: "ml" },
          { name: "Glet complet, pentru vopsea", unit: "mp" },
        ],
      },
    ],
    priceDrivers: [
      "Numărul de straturi de plăci și tipul lor: obișnuite, rezistente la umezeală sau la foc.",
      "Structura: pasul profilelor și înălțimea pereților.",
      "Izolația fonică sau termică dintre plăci.",
      "Decupajele pentru spoturi, prize și trape.",
    ],
    omissions: [
      "Banda de etanșare sub profilele de la perete și de la pardoseală.",
      "Șuruburile, numărate la metru pătrat din norma producătorului.",
      "Gletul de rosturi ca articol separat de gletul complet.",
      "Trapele de vizitare la instalații.",
      "Plăcile rezistente la umezeală în băi și bucătării.",
    ],
    producers:
      "Fiecare sistem de gips-carton are consumuri publicate de producător: plăci, profile, șuruburi, bandă, glet pe metru pătrat. Normele de producător le aduc în deviz întocmai, iar sistemele compatibile semnalează placa obișnuită pusă în baie.",
    faq: [
      {
        question: "Un strat sau două de plăci?",
        answer:
          "Pereții de compartimentare se fac de regulă cu două straturi pe fiecare față, pentru rezistență și fonică; tavanele cu unul. Norma sistemului ales spune consumul pentru fiecare.",
      },
    ],
    related: [
      "zugraveli-apartament",
      "izolatie-mansarda",
      "amenajare-apartament",
    ],
  },
  {
    slug: "pardoseli",
    title: "Deviz pentru pardoseli",
    short: "Pardoseli",
    metaTitle: "Deviz pardoseli: șapă, parchet, gresie, plinte",
    description:
      "Devizul pentru pardoseli noi: desfacere, șapă și autonivelantă, parchet sau gresie, plinte și praguri, cu pierderile din modul de montaj.",
    intro:
      "La pardoseli, suportul e jumătate din preț: șapa, autonivelanta și amorsa se măsoară pe metru pătrat ca și parchetul sau gresia de deasupra. Modul de montaj, drept, decalat, în diagonală sau în spic, schimbă pierderile și manopera.",
    chapters: [
      {
        name: "Desfacere și suport",
        items: [
          { name: "Desfacere pardoseală veche", unit: "mp" },
          { name: "Șapă de egalizare", unit: "mp" },
          { name: "Amorsă și șapă autonivelantă", unit: "mp" },
        ],
      },
      {
        name: "Parchet",
        items: [
          {
            name: "Folie și parchet laminat sau triplustratificat, flotant",
            unit: "mp",
          },
          { name: "Parchet masiv sau stratificat lipit", unit: "mp" },
          { name: "Plinte, cu colțare și capete", unit: "ml" },
        ],
      },
      {
        name: "Gresie",
        items: [
          { name: "Placare gresie, montaj drept sau în diagonală", unit: "mp" },
          { name: "Chituire rosturi", unit: "mp" },
          { name: "Plinte din gresie", unit: "ml" },
        ],
      },
      {
        name: "Detalii",
        items: [
          { name: "Praguri de trecere", unit: "buc" },
          { name: "Profile de dilatare", unit: "ml" },
        ],
      },
    ],
    priceDrivers: [
      "Starea suportului: o șapă veche și plană scutește autonivelanta.",
      "Modul de montaj: în diagonală sau în spic, pierderile cresc față de montajul drept.",
      "Formatul: plăcile mari și scândurile lungi cer suport perfect și adeziv potrivit.",
      "Încălzirea în pardoseală: adezivi și chituri deformabile, parchet potrivit.",
    ],
    omissions: [
      "Amorsa înainte de autonivelantă și de adeziv.",
      "Plintele și colțarele lor, numărate la metru liniar.",
      "Pragurile și profilele de dilatare între încăperi.",
      "Folia de sub parchetul flotant.",
      "Evacuarea pardoselii vechi.",
    ],
    producers:
      "Producătorii de adezivi și de șape publică consumul pe milimetru de grosime și pe metru pătrat; cu încălzire în pardoseală, sistemele compatibile din Devize semnalează adezivul rigid sau parchetul nepotrivit.",
    faq: [
      {
        question: "Cât adaug pentru pierderi?",
        answer:
          "Depinde de montaj: drept, puțin; decalat, mai mult; în diagonală sau în spic, cel mai mult. Devize calculează pierderile din modul de montaj ales și rotunjește la cutii întregi în lista de cumpărături.",
      },
    ],
    related: ["renovare-baie", "amenajare-apartament", "gips-carton"],
  },
  {
    slug: "amenajare-apartament",
    title: "Deviz pentru amenajarea unui apartament",
    short: "Amenajare apartament",
    metaTitle: "Deviz amenajare apartament complet, pe capitole",
    description:
      "Devizul complet al unui apartament: demolări, instalații, gips-carton, zugrăveli, pardoseli, băi, bucătărie și tâmplărie, organizat pe capitole și obiecte.",
    intro:
      "Amenajarea completă e devizul cel mai lung și cel mai ușor de pierdut din mână. Îl ții în frâu cu capitole pe meserii și cu obiecte pe încăperi, iar verificările și detectorul de omisiuni îl recitesc înainte de trimitere.",
    chapters: [
      {
        name: "Demolări",
        items: [
          { name: "Desfacere finisaje, placaje și pardoseli", unit: "mp" },
          { name: "Demolare pereți nestructurali", unit: "mp" },
          { name: "Evacuare moloz", unit: "mc" },
        ],
      },
      {
        name: "Instalații",
        items: [
          {
            name: "Instalație electrică nouă, pe puncte și circuite",
            unit: "buc",
          },
          { name: "Instalație sanitară, pe trasee și obiecte", unit: "ml" },
          {
            name: "Instalație termică: calorifere sau încălzire în pardoseală",
            unit: "buc",
          },
        ],
      },
      {
        name: "Compartimentări și finisaje",
        items: [
          { name: "Pereți și tavane din gips-carton", unit: "mp" },
          { name: "Glet și vopsea lavabilă", unit: "mp" },
          { name: "Pardoseli: șapă, parchet, gresie", unit: "mp" },
          { name: "Placaje în băi și bucătărie", unit: "mp" },
        ],
      },
      {
        name: "Tâmplărie și montaje",
        items: [
          { name: "Uși interioare, cu toc și feronerie", unit: "buc" },
          { name: "Glafuri interioare", unit: "ml" },
          { name: "Obiecte sanitare și baterii", unit: "buc" },
          { name: "Curățenie finală", unit: "mp" },
        ],
      },
    ],
    priceDrivers: [
      "Gradul de intervenție la instalații: înlocuire completă sau doar completări.",
      "Numărul de băi și starea lor.",
      "Nivelul finisajelor, ales de client prin variante.",
      "Durata: un apartament locuit în timpul lucrărilor se face în etape, cu protecții și mutări.",
    ],
    omissions: [
      "Protecția tâmplăriei și a lucrărilor terminate.",
      "Evacuarea molozului, pe toată durata, nu doar la demolări.",
      "Curățenia finală.",
      "Glafurile interioare și pragurile.",
      "Probele instalațiilor înainte de închiderea pereților.",
    ],
    producers:
      "Într-un apartament întreg intră zeci de produse; normele de producător și sistemele compatibile țin adezivii, gleturile, vopselele și plăcile potrivite între ele, încăpere cu încăpere.",
    faq: [
      {
        question: "Un deviz sau mai multe?",
        answer:
          "Un deviz cu obiecte pe încăperi și capitole pe meserii. Clientul vede totalul pe link, iar tu ții fiecare încăpere separat în recapitulație.",
      },
      {
        question: "Cum ofer trei niveluri de finisaje?",
        answer:
          "Cu variante ale ofertei: aceleași lucrări și cantități, alte materiale. Clientul alege varianta pe link și semnează.",
      },
    ],
    related: ["zugraveli-apartament", "renovare-baie", "pardoseli"],
  },
  {
    slug: "casa-la-rosu",
    title: "Deviz pentru casă la roșu",
    short: "Casă la roșu",
    metaTitle: "Deviz casă la roșu: fundații, zidărie, planșee, șarpantă",
    description:
      "Devizul structurii unei case: săpături, fundații, armături, zidărie, stâlpi și centuri, planșee, șarpantă și învelitoare, cu unitățile de măsură și omisiunile frecvente.",
    intro:
      "Casa la roșu se devizează din proiect: metri cubi de beton și săpătură, kilograme de armătură, metri pătrați de zidărie și cofraj. Antemăsurătoarea e aici obligatorie, iar devizul general din HG 907/2016 e cerut la autorizație.",
    chapters: [
      {
        name: "Terasamente",
        items: [
          { name: "Săpătură mecanică și manuală pentru fundații", unit: "mc" },
          { name: "Umplutură compactată și balast", unit: "mc" },
          { name: "Transport pământ", unit: "mc" },
        ],
      },
      {
        name: "Infrastructură",
        items: [
          { name: "Beton de egalizare", unit: "mc" },
          { name: "Fundații din beton armat, cu cofraj", unit: "mc" },
          { name: "Armături din oțel beton", unit: "kg" },
          { name: "Hidroizolație fundații și placă", unit: "mp" },
        ],
      },
      {
        name: "Suprastructură",
        items: [
          { name: "Zidărie din blocuri ceramice sau BCA", unit: "mp" },
          { name: "Stâlpi, grinzi și centuri din beton armat", unit: "mc" },
          { name: "Planșee din beton armat, cu cofraj", unit: "mp" },
          { name: "Buiandrugi", unit: "buc" },
        ],
      },
      {
        name: "Acoperiș",
        items: [
          { name: "Șarpantă din lemn", unit: "mc" },
          { name: "Astereală, folie și învelitoare", unit: "mp" },
          { name: "Jgheaburi și burlane", unit: "ml" },
        ],
      },
    ],
    priceDrivers: [
      "Terenul: adâncimea de fundare și apa freatică.",
      "Sistemul structural: zidărie portantă cu stâlpișori sau cadre din beton.",
      "Prețul betonului, al oțelului și al blocurilor, care se mișcă lunar.",
      "Utilajele: excavator, pompă de beton, macara, cu orele lor.",
    ],
    omissions: [
      "Betonul de egalizare sub fundații.",
      "Cofrajele, numărate pe metru pătrat de suprafață cofrată.",
      "Hidroizolația fundațiilor și a plăcii.",
      "Buiandrugii și centurile, pe lângă zidărie.",
      "Transportul pământului și al molozului.",
      "Organizarea de șantier: împrejmuire, utilități, pază.",
    ],
    producers:
      "Producătorii de blocuri ceramice și BCA publică consumul de blocuri și mortar pe metru pătrat pentru fiecare format; normele lor fac zidăria un articol exact.",
    faq: [
      {
        question: "Ce formulare cer la autorizație sau la bancă?",
        answer:
          "Devizul general pe capitolele HG 907/2016 și, la licitații publice, formularele F1–F6. Devize le completează din deviz, cu fiecare capitol încadrat în subcapitolul lui.",
      },
      {
        question: "Cum ajustez prețul când se scumpește betonul?",
        answer:
          "Devizele trimise sunt verificate zilnic cu prețurile zilei; când totalul s-ar mișca peste pragul tău, primești o alertă cu resursele vinovate și cu profitul rămas.",
      },
    ],
    related: ["acoperis", "termosistem-fatada", "instalatii-electrice"],
  },
  {
    slug: "izolatie-mansarda",
    title: "Deviz pentru izolarea mansardei",
    short: "Izolație mansardă",
    metaTitle: "Deviz izolație mansardă: vată, barieră de vapori, gips-carton",
    description:
      "Devizul pentru izolarea unei mansarde: vată minerală între și sub căpriori, folie anticondens, barieră de vapori, structură și placare cu gips-carton.",
    intro:
      "Izolația mansardei e un sistem de straturi în ordinea corectă: folia anticondens spre învelitoare, vata între și sub căpriori, bariera de vapori spre interior, apoi gips-cartonul. Devizul le numără pe fiecare pe metru pătrat de pantă și de perete.",
    chapters: [
      {
        name: "Pregătire",
        items: [
          { name: "Verificare și completare folie anticondens", unit: "mp" },
          { name: "Tratament lemn", unit: "mp" },
        ],
      },
      {
        name: "Izolație",
        items: [
          { name: "Vată minerală între căpriori", unit: "mp" },
          { name: "Al doilea strat de vată sub căpriori", unit: "mp" },
          { name: "Barieră de vapori, cu bandă la suprapuneri", unit: "mp" },
          { name: "Izolație pereți de fronton și pod", unit: "mp" },
        ],
      },
      {
        name: "Placare",
        items: [
          { name: "Structură metalică pentru plăci", unit: "mp" },
          { name: "Placare gips-carton, pante și pereți", unit: "mp" },
          { name: "Bandă și glet de rosturi", unit: "mp" },
          {
            name: "Ferestre de mansardă, montaj cu finisaj interior",
            unit: "buc",
          },
        ],
      },
    ],
    priceDrivers: [
      "Grosimea totală a vatei și dacă se pune în unul sau două straturi.",
      "Geometria: pante, lucarne și fronturi aduc tăieri și pierderi.",
      "Ferestrele de mansardă, cu finisajul lor interior.",
      "Dacă există folie anticondens sub învelitoare; altfel se intervine la acoperiș.",
    ],
    omissions: [
      "Bariera de vapori și banda de lipire la suprapuneri și la margini.",
      "Al doilea strat de vată, care acoperă punțile termice ale căpriorilor.",
      "Izolația pereților de fronton și a planșeului spre pod.",
      "Finisajul interior al ferestrelor de mansardă.",
      "Trapele de acces la pod și la instalații.",
    ],
    producers:
      "Producătorii de vată minerală publică grosimile, densitățile și consumul pentru fiecare produs, iar sistemele lor spun ce folie și ce bandă se potrivesc; normele de producător le aduc în deviz exact așa.",
    faq: [
      {
        question: "Vată de sticlă sau vată bazaltică?",
        answer:
          "Amândouă funcționează în mansardă; diferă greutatea, rezistența la foc și prețul. Faci o variantă pentru fiecare și clientul alege pe link, iar sistemele compatibile verifică folia și banda potrivite.",
      },
    ],
    related: ["acoperis", "gips-carton", "termosistem-fatada"],
  },
];

export const workBySlug = (slug: string) =>
  works.find((work) => work.slug === slug);
