export interface Point {
  title: string;
  description: string;
}

export interface WorkflowSection {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  points: Point[];
}

/** The Constructor's page, in the order a Deviz is made and sent. */
export const workflow: WorkflowSection[] = [
  {
    id: "pornire",
    eyebrow: "Pornire",
    title: "Începi din ce ai la îndemână",
    lead: "Un deviz nou nu pornește de la o listă goală. Devize AI citește ce ai și propune articolele, cu normele și cantitățile lor; tu confirmi rând cu rând ce intră în deviz.",
    points: [
      {
        title: "Descrierea lucrării",
        description:
          "Scrii în cuvintele tale: „baie de 6 mp, gresie și faianță, schimbăm instalația”. Primești articolele, cu norme din catalog și cantități de verificat.",
      },
      {
        title: "Poze de pe șantier",
        description:
          "Câteva poze ale încăperii sau ale fațadei spun ce e de făcut și cât. Devize AI le citește împreună cu descrierea.",
      },
      {
        title: "Dictare",
        description:
          "Vorbești de pe șantier, de pe telefon, și articolele apar în deviz la fel ca din descriere.",
      },
      {
        title: "Lista de cantități a licitației",
        description:
          "Importi formularul F3 al autorității din Excel, PDF sau poze. Fiecare poziție își păstrează numărul, unitatea și cantitatea autorității și primește o normă potrivită.",
      },
      {
        title: "Articolul propriu",
        description:
          "Pentru lucrarea fără normă scrii un articol cu resursele lui. Rămâne al firmei și îl refolosești.",
      },
    ],
  },
  {
    id: "norme",
    eyebrow: "Norme",
    title: "Norme care spun ce consumă lucrarea de fapt",
    lead: "O normă e rețeta unei unități de lucrare: materialele, orele de manoperă, utilajele și transportul pe care le consumă un metru pătrat sau o bucată. Devize are norme scrise acum, nu indicatoarele din 1981.",
    points: [
      {
        title: "Norme de bază, scrise în 2026",
        description:
          "Catalogul propriu al Devize, cu termenii și materialele de azi. Fiecare normă spune ce cuprinde, ce nu cuprinde și cum se măsoară, și dă un preț de referință fiecărei resurse.",
      },
      {
        title: "Norme de producător",
        description:
          "Scrise de producători din fișele tehnice ale produselor lor, verificate de echipa Devize, cu versiuni. Norma confirmată de producător apare prima când cauți.",
      },
      {
        title: "Normele firmei tale",
        description:
          "Copiezi orice normă și o adaptezi la cum lucrezi tu, sau o scrii de la zero. Ce schimbi rămâne în normele tale, nu în catalog.",
      },
      {
        title: "Fiecare resursă, o singură dată",
        description:
          "Adezivul, gletul sau ora de faianțar apar o singură dată în catalog. Îi dai prețul o dată și toate normele care îl folosesc îl iau.",
      },
    ],
  },
  {
    id: "preturi",
    eyebrow: "Prețuri",
    title: "Prețul de azi, din magazinul tău",
    lead: "Prețurile materialelor nu stau într-o listă actualizată la șase luni. Se citesc din magazin când ai nevoie de ele și poartă data citirii.",
    points: [
      {
        title: "Citire la cerere",
        description:
          "Pui linkul produsului din Dedeman, Leroy Merlin, Hornbach sau BRICO. Devize citește prețul de pe pagina lui publică și îl ține cu data.",
      },
      {
        title: "Produse alese",
        description:
          "Pentru fiecare material alegi produsul pe care îl cumperi, cel mult unul pe magazin, cu câte unități are un ambalaj. Prețul lui se verifică în fiecare zi cât timp îl folosești.",
      },
      {
        title: "Ordinea prețului",
        description:
          "Prețul tău, dacă l-ai scris; apoi produsul ales din magazin; la urmă prețul de referință al normei. Fiecare articol spune de unde are prețul.",
      },
      {
        title: "Tarife și cote",
        description:
          "Tarifele firmei pe oră sau pe unitate pentru fiecare meserie, utilaj și transport. Cotele devizului, CAM, indirecte, profit și TVA, pornesc de la cele implicite ale firmei.",
      },
      {
        title: "Alerte de preț",
        description:
          "Devizele trimise sunt verificate în fiecare dimineață. Când totalul unuia s-ar mișca peste pragul tău, afli ce resurse au mișcat și cât profit rămâne la prețul trimis.",
      },
    ],
  },
  {
    id: "verificari",
    eyebrow: "Verificări",
    title: "Verificat înainte să plece",
    lead: "Un deviz pleacă spre client sau spre autoritate doar după ce trece verificările, iar ce lipsește se vede ca listă de rezolvat, nu ca surpriză pe șantier.",
    points: [
      {
        title: "Opt verificări înainte de trimitere",
        description:
          "Are articole, nicio lucrare uitată, toate resursele au preț, prețurile și normele sunt la zi, articolele AI sunt confirmate, clientul e ales, TVA-ul e corect.",
      },
      {
        title: "Detectorul de omisiuni",
        description:
          "Devize AI citește devizul ca un inginer de șantier și propune lucrările pe care articolele le cer, dar nu le are: hidroizolația de sub gresie, evacuarea molozului, amorsa. Cu motivul și cantitatea, de confirmat.",
      },
      {
        title: "Sisteme compatibile și combinații greșite",
        description:
          "Adezivul rigid pe încălzirea în pardoseală sau faianța la exterior sunt semnalate, cu schimbul care le repară. Când devizul are o parte dintr-un sistem, primești restul lui, cu cantitățile calculate.",
      },
      {
        title: "Revizii și blocare la trimitere",
        description:
          "Trimiterea blochează devizul. Orice schimbare de după e o revizie nouă, iar fiecare articol își păstrează norma și prețurile din ziua lui.",
      },
    ],
  },
  {
    id: "oferta",
    eyebrow: "Ofertă",
    title: "Oferta pe care clientul o înțelege",
    lead: "Clientul nu primește un PDF de douăzeci de pagini, ci un link pe care alege, întreabă și semnează. Tu vezi ce a ales și când a deschis-o.",
    points: [
      {
        title: "Link secret, fără cont",
        description:
          "Clientul deschide oferta pe telefon sau pe laptop, fără să-și facă un cont. Linkul arată doar oferta lui.",
      },
      {
        title: "Variante și lucrări opționale",
        description:
          "Economic, standard, premium: aceleași lucrări, alte materiale. Lucrările opționale se bifează, iar totalul se recalculează pentru ce a ales.",
      },
      {
        title: "Asistentul ofertei",
        description:
          "Clientul întreabă, iar asistentul răspunde numai din ce scrie în ofertă. Ce nu știe ajunge la tine, cu notificare, și răspunzi din pagina devizului.",
      },
      {
        title: "Semnătură și urmărire",
        description:
          "Clientul acceptă cu semnătura desenată, cu numele și ora păstrate. Vezi de câte ori a deschis linkul și când, și primești e-mail la decizie.",
      },
      {
        title: "Devizul pentru client, în PDF",
        description:
          "Cu sigla și datele firmei, capitolele, articolele și recapitulația, în formatul în care clienții sunt obișnuiți să le citească.",
      },
    ],
  },
  {
    id: "cumparaturi",
    eyebrow: "Cumpărături",
    title: "Lista de cumpărături și coșul",
    lead: "După acceptare, devizul se transformă în ce cumperi și de unde: ambalaje întregi, cu pierderile din modul de montaj, împărțite pe magazine la cel mai mic total.",
    points: [
      {
        title: "Ambalaje întregi",
        description:
          "Materialele tuturor articolelor, adunate și rotunjite la saci, găleți și cutii, în cea mai ieftină combinație de mărimi, cu ce rămâne după lucrare.",
      },
      {
        title: "Modul de montaj",
        description:
          "Drept, decalat, în diagonală sau în spic: pierderile și manopera cresc după cum se montează, iar devizul le urmează. Poți corecta ambele cifre înainte să le aplici.",
      },
      {
        title: "Coșul pe magazine",
        description:
          "Fiecare material se cumpără dintr-un singur magazin, iar fiecare magazin folosit adaugă livrarea sau drumul, mai puțin când comanda ajunge la pragul de livrare gratuită.",
      },
    ],
  },
  {
    id: "licitatii",
    eyebrow: "Licitații",
    title: "Licitații publice fără copy-paste",
    lead: "Listele autorității intră în deviz așa cum sunt, prețurile ies în formularele oficiale sau chiar în fișierul Excel al autorității, iar verificarea de dinaintea descărcării prinde greșelile care descalifică.",
    points: [
      {
        title: "Import cu potrivire pe norme",
        description:
          "Formularul F3 din Excel, PDF sau poze. Fiecare poziție primește o normă propusă de Devize AI, pe care o confirmi, și păstrează unitatea și cantitatea autorității.",
      },
      {
        title: "Formularele oficiale",
        description:
          "F1–F6, DG, DO, C5–C9 și formularul de ofertă, în PDF și într-un singur Excel cu o foaie pe formular. Numerotarea se adaptează la ce cere autoritatea.",
      },
      {
        title: "Verificarea formularelor",
        description:
          "Fiecare poziție o singură dată și cu valoare, nicio poziție sărită, doar pozițiile și cantitățile autorității, încadrarea în devizul general, utilajele din F4, durata, valabilitatea și semnatarul ofertei.",
      },
      {
        title: "Fișierul autorității, completat",
        description:
          "Prețurile se scriu în fișierul Excel al autorității, în așezarea ei, fără să-i schimbi nicio celulă de text.",
      },
      {
        title: "Formularul de ofertă, în litere",
        description:
          "Valoarea fără TVA și TVA-ul, în cifre și în litere, durata lucrărilor și valabilitatea ofertei, completate din F1 și F6.",
      },
      {
        title: "Clarificări din omisiuni",
        description:
          "Listele unei licitații nu pot primi poziții noi, așa că lucrările lipsă devin clarificări de cerut autorității, cu motivul și cantitatea estimată.",
      },
    ],
  },
  {
    id: "echipa",
    eyebrow: "Firmă și șantier",
    title: "Firma, echipa și telefonul",
    lead: "Devizele, clienții, tarifele și prețurile sunt ale firmei, nu ale unei persoane. Colegii intră cu o invitație pe e-mail, iar telefonul merge pe șantier.",
    points: [
      {
        title: "Membri și invitații",
        description:
          "Inviți colegi pe e-mail, ca membri sau administratori. Fiecare vede devizele firmei și lucrează în ele.",
      },
      {
        title: "Clienți, tarife și cote",
        description:
          "Clienții firmei, tarifele pe meserii și cotele implicite stau într-un singur loc și intră în fiecare deviz nou.",
      },
      {
        title: "Pe telefon, ca o aplicație",
        description:
          "Instalezi Devize pe telefon din browser, fără magazin de aplicații. Pozele și dictarea de pe șantier intră direct în deviz.",
      },
    ],
  },
];
