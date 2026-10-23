export interface PlanFeature {
  text: string;
  /** Promised for the plan, not in the app yet. */
  soon?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  /** Lei per month for the whole firm; 0 is free. */
  price: number;
  tagline: string;
  features: PlanFeature[];
  cta: string;
  recommended?: boolean;
}

/**
 * The plans proposed for the launch. They are a proposal: the app has no
 * limits and no payments yet, and the page says so.
 */
export const plans: Plan[] = [
  {
    id: "gratuit",
    name: "Gratuit",
    price: 0,
    tagline: "Pentru meseriași și firme mici, cu câteva devize pe lună.",
    cta: "Începe gratuit",
    features: [
      { text: "3 devize pe lună" },
      { text: "Norme de bază și norme de producător" },
      { text: "Prețuri din magazine, citite la cerere" },
      { text: "Devize AI, cu o limită lunară" },
      { text: "Ofertă pe link, cu semnătura clientului" },
      { text: "Formularele oficiale F1–F6, DG, DO, C5–C9" },
      { text: "Utilizatori nelimitați" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 149,
    tagline: "Pentru firmele care fac devize în fiecare săptămână.",
    cta: "Începe cu Pro",
    recommended: true,
    features: [
      { text: "Devize nelimitate" },
      { text: "Devize AI fără contor, în limitele unei folosiri corecte" },
      { text: "Oferta și documentele cu sigla firmei" },
      { text: "Lista de cumpărături și coșul pe magazine" },
      { text: "Alerte de preț la devizele trimise" },
      { text: "Facturi din oferta acceptată", soon: true },
      { text: "Utilizatori nelimitați" },
    ],
  },
  {
    id: "echipa",
    name: "Echipă",
    price: 349,
    tagline: "Pentru firmele cu mai mulți devizieri și birou.",
    cta: "Începe cu Echipă",
    features: [
      { text: "Tot ce are Pro" },
      { text: "Roluri pentru membri: proprietar, admin, membru" },
      { text: "Export Excel al tuturor documentelor" },
      { text: "Jurnalul devizului: cine a schimbat ce", soon: true },
      { text: "API pentru integrări", soon: true },
      { text: "Utilizatori nelimitați" },
    ],
  },
];

/** What a Producător pays: nothing to publish, a plan for the statistics. */
export const producerPlan = {
  name: "Producători",
  free: [
    "Profilul de producător și publicarea normelor",
    "Normă din fișa tehnică, scrisă de Devize AI și verificată de noi",
    "Sisteme compatibile proprii, cu produsele tale",
  ],
  paid: [
    "Statisticile de utilizare lunare: norme adăugate în devize, devize trimise și acceptate cu produsele tale, cantități, valoarea acceptată și județele, fără firmele din spatele lor",
  ],
  note: "Publicarea rămâne gratuită. Prețul statisticilor îl stabilim cu primii producători.",
};

export const pricingFaq = [
  {
    question: "Se plătește ceva acum?",
    answer:
      "Nu. Devize e înainte de lansare și nu are nicio limită de plan în aplicație. Planurile de pe această pagină sunt propunerea noastră și pot fi ajustate înainte să pornească plățile.",
  },
  {
    question: "Prețul e pe firmă sau pe utilizator?",
    answer:
      "Pe firmă. Inviți câți colegi vrei, în orice plan, fără să plătești pentru fiecare.",
  },
  {
    question: "Există contract pe termen lung?",
    answer:
      "Nu. Planurile sunt lunare și le schimbi sau le oprești oricând, fără reînnoiri ascunse.",
  },
  {
    question: "Producătorii plătesc ca să publice norme?",
    answer:
      "Nu. Publicarea normelor și a profilului e gratuită și rămâne așa. Plătite sunt doar statisticile de utilizare, pentru producătorii care vor să știe cum ajung produsele lor în devize.",
  },
] as const;
