export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

export const faqGroups: FaqGroup[] = [
  {
    title: "Despre Devize",
    items: [
      {
        question: "Ce este Devize?",
        answer:
          "O aplicație web în care constructorii fac devize de construcții din norme publicate de producători și dintr-un catalog propriu, cu prețuri citite din magazine, și trimit clientului o ofertă pe link sau depun formularele oficiale la licitații. Devize AI propune articolele, omisiunile și răspunsurile pentru client; omul confirmă.",
      },
      {
        question: "Pentru cine este?",
        answer:
          "Pentru constructori, de la meseriașul care face trei devize pe lună până la firma cu birou de ofertare, și pentru producătorii de materiale, care își publică normele de deviz pentru produsele lor.",
      },
      {
        question: "Merge pe telefon?",
        answer:
          "Da. Devize e o aplicație web pe care o instalezi pe telefon ca pe orice aplicație, fără magazin de aplicații. Pozele și dictarea de pe șantier intră direct în deviz.",
      },
      {
        question: "Este Devize gratuit?",
        answer:
          "Acum da: aplicația e înainte de lansare și nu are limite de plan. Planurile propuse pentru lansare, Gratuit, Pro și Echipă, sunt pe pagina de prețuri.",
      },
    ],
  },
  {
    title: "Norme și prețuri",
    items: [
      {
        question: "De unde vin normele?",
        answer:
          "Din două locuri. Producătorii publică norme pentru produsele lor, cu consumurile din fișele tehnice, pe care echipa Devize le verifică înainte de publicare. Pentru restul lucrărilor, Devize are un catalog propriu de norme de bază, scris acum, cu materialele și termenii de azi. Devize nu folosește indicatoarele de norme din 1981.",
      },
      {
        question: "Pot folosi propriile mele norme?",
        answer:
          "Da. Copiezi orice normă din catalog în normele firmei și o adaptezi, sau scrii una de la zero. Articolul propriu rămâne pentru lucrările fără normă.",
      },
      {
        question: "De unde vin prețurile materialelor?",
        answer:
          "Prețul unui material urmează o ordine: prețul tău, dacă l-ai scris; produsul ales dintr-un magazin, citit de pe pagina lui publică, cu data citirii, și verificat zilnic cât timp îl folosești; și, la urmă, prețul de referință al normei. Magazinele de azi sunt Dedeman, Leroy Merlin, Hornbach și BRICO.",
      },
      {
        question: "Ce sunt alertele de preț?",
        answer:
          "Devizele trimise sau acceptate sunt verificate în fiecare dimineață cu prețurile zilei. Când totalul unuia s-ar schimba cu mai mult decât pragul tău, 5% dacă nu alegi altul, primești o alertă cu resursele care au mișcat cel mai mult și cu profitul rămas dacă clientul plătește prețul trimis. Devizul în sine nu se schimbă.",
      },
      {
        question: "Cum se calculează manopera și cotele?",
        answer:
          "Din tarifele firmei tale pe oră sau pe unitate, pentru fiecare meserie, utilaj și transport, și din cotele devizului: CAM pe manoperă, cheltuieli indirecte, profit și TVA. Fiecare deviz pornește de la cotele implicite ale firmei și le poate schimba.",
      },
    ],
  },
  {
    title: "Licitații publice",
    items: [
      {
        question: "Pot face oferta pentru o licitație din SEAP?",
        answer:
          "Da. Importi listele de cantități ale autorității din Excel, PDF sau poze, cu cantitățile și unitățile ei păstrate întocmai, iar Devize AI potrivește fiecare poziție pe o normă. La final descarci formularele F1–F6, DG, DO, C5–C9 și formularul de ofertă, sau completezi prețurile direct în fișierul Excel al autorității.",
      },
      {
        question: "Ce verifică Devize înainte de descărcare?",
        answer:
          "Că fiecare poziție apare o singură dată și are valoare, că niciuna nu e sărită, că sunt doar pozițiile și cantitățile autorității, încadrarea în devizul general, utilajele din F4, durata de execuție, valabilitatea ofertei și cine o semnează.",
      },
      {
        question: "Lucrările care lipsesc din listele autorității?",
        answer:
          "Listele unei licitații nu pot primi poziții noi, așa că detectorul de omisiuni le transformă în clarificări de cerut autorității contractante, cu motivul și cantitatea estimată.",
      },
    ],
  },
  {
    title: "Clienți și oferte",
    items: [
      {
        question: "Cum vede clientul devizul?",
        answer:
          "Primește un link secret, fără cont. Alege între variante, economic, standard, premium, bifează lucrările opționale și vede totalul recalculat pentru ce a ales. Poate pune întrebări, la care răspunde asistentul ofertei doar din ce scrie în ofertă, iar ce nu știe ajunge la tine.",
      },
      {
        question: "Cum semnează clientul?",
        answer:
          "Desenează semnătura pe link și acceptă oferta, cu numele și ora păstrate; e o semnătură electronică simplă, potrivită pentru lucrări private. Pentru licitații, documentele se semnează în continuare cu semnătura calificată a firmei.",
      },
      {
        question: "Clientul poate schimba devizul după ce l-am trimis?",
        answer:
          "Nu. Trimiterea blochează devizul. Clientul alege doar între variantele și opționalele pe care le-ai pregătit, iar orice schimbare devine o revizie nouă, făcută de tine.",
      },
    ],
  },
  {
    title: "Inteligența artificială",
    items: [
      {
        question: "Ce face Devize AI și ce nu face?",
        answer:
          "Propune: articole din descriere, poze sau liste de cantități, omisiunile unui deviz, ciorne de norme din fișe tehnice, răspunsuri pentru client din oferta lui. Nu aplică nimic singur: fiecare propunere poartă semnul AI, spune de unde are datele și intră în deviz doar la confirmarea ta.",
      },
      {
        question: "Ce model folosește?",
        answer:
          "Modelele Claude ale companiei Anthropic, prin API. Trimitem doar ce e nevoie pentru cererea respectivă: descrierea, pozele, lista sau devizul în lucru. Detaliile sunt în politica de confidențialitate.",
      },
    ],
  },
  {
    title: "Producători",
    items: [
      {
        question: "Cum ajung normele mele în Devize?",
        answer:
          "Îți revendici profilul de producător, cu linkul primit pe e-mail, cu o adresă de pe domeniul firmei sau cu o cerere pe care o verificăm după CUI la ANAF. Apoi încarci fișa tehnică a unui produs, Devize AI scrie ciorna normei cu pagina fiecărei cifre, tu o corectezi, iar echipa Devize o verifică și o publică.",
      },
      {
        question: "Costă ceva?",
        answer:
          "Nu. Publicarea normelor și profilul sunt gratuite. Statisticile de utilizare lunare sunt singurul serviciu plătit pentru producători.",
      },
      {
        question: "Ce văd din felul în care sunt folosite normele?",
        answer:
          "Cât de des firmele adaugă normele tale în devize, câte devize cu normele sau produsele tale sunt trimise și acceptate, ce cantități conțin și cât valorează partea acceptată, cât de des un client a ales alt producător și în ce județe. Niciodată care firmă: un județ apare doar de la trei firme în sus.",
      },
    ],
  },
  {
    title: "Cont și date",
    items: [
      {
        question: "Cum intru în cont?",
        answer:
          "Cu un cod primit pe e-mail sau cu contul Google. Nu există parolă de ținut minte.",
      },
      {
        question: "Pot lucra cu colegii pe același deviz?",
        answer:
          "Da. Inviți colegi pe e-mail în firma ta, ca membri sau administratori, iar devizele, clienții, tarifele și prețurile sunt ale firmei, nu ale unei persoane.",
      },
      {
        question: "Cine îmi vede datele?",
        answer:
          "Doar membrii firmei tale. Fiecare înregistrare aparține unei firme, iar un link de ofertă arată clientului numai oferta lui. Ce păstrăm, de ce și cât timp scrie în politica de confidențialitate.",
      },
      {
        question: "Pot aduce devizele din alt program?",
        answer:
          "Listele de cantități din Excel se importă deja. La importul din WinDoc, Doclib și eDevize lucrăm; dacă ai fișiere exportate din ele, ne ajută să le primim.",
      },
    ],
  },
];
