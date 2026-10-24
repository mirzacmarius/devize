import type { BaseNorm } from "./norm";
import {
  ancoraChimica,
  aparatSudura,
  automacara,
  betonC16,
  betonC20,
  dibluMetalic,
  discAbraziv,
  electrician,
  electrozi,
  emailAlchidic,
  grundAnticoroziv,
  lacatus,
  material,
  mortarZidarie,
  necalificat,
  otelBeton,
  polizor,
  profilOtel,
  rotopercutor,
  smallMaterials,
  sudor,
  surubTabla,
  vopsitor,
} from "./resources";

const category = "Confecții metalice";

const balustradaInox = material(
  "Balustradă din inox satinat, cu montanți și mână curentă",
  "m",
  650,
);
const manaCurenta = material(
  "Mână curentă din lemn de fag, cu suporturi",
  "m",
  95,
);
const poartaPietonala = material(
  "Poartă pietonală metalică de 1 × 2 m, cu toc și broască",
  "buc",
  1800,
);
const poartaBatanta = material(
  "Poartă auto batantă metalică de 4 × 2 m, cu stâlpi",
  "buc",
  5500,
);
const poartaCulisanta = material(
  "Poartă auto culisantă autoportantă de 4 m, cu șină și role",
  "buc",
  8500,
);
const automatizarePoarta = material(
  "Automatizare pentru poartă culisantă, cu telecomenzi",
  "set",
  2200,
);
const policarbonat = material("Policarbonat celular de 10 mm", "mp", 65);
const profilePolicarbonat = material(
  "Profile și accesorii pentru policarbonat",
  "m",
  12,
);
const profileZincate = material("Profile zincate formate la rece", "kg", 7.5);
const suruburiZincate = material(
  "Șuruburi, piulițe și șaibe zincate",
  "kg",
  18,
);
const tijaFiletata = material("Tijă filetată zincată M12", "buc", 6);
const zincare = material("Zincare termică a confecțiilor", "kg", 3.2);
const capacCamin = material(
  "Capac cu ramă din fontă pentru cămine, clasa B125",
  "buc",
  420,
);
const sticlaBalustrada = material(
  "Sticlă securizată laminată 8+8 mm pentru balustrade",
  "mp",
  480,
);
const profilSticla = material(
  "Profil de aluminiu pentru balustrade din sticlă",
  "m",
  350,
);
const manaCurentaInox = material(
  "Mână curentă din inox pentru balustrade din sticlă",
  "m",
  160,
);

export const metalice: BaseNorm[] = [
  {
    code: "DV-MET-01",
    category,
    title:
      "Confecții metalice din profile laminate, confecționate, grunduite și montate",
    unit: "kg",
    includes:
      "Debitarea, asamblarea prin sudură, curățarea cordoanelor, grundul anticoroziv, ridicarea și montarea cu prinderile din proiect.",
    excludes: "Vopseaua de finisaj; ancorele chimice în beton.",
    measurement: "Masa confecțiilor, după extrasul de materiale din proiect.",
    resources: [
      profilOtel(1.05),
      electrozi(0.02),
      discAbraziv(0.01),
      grundAnticoroziv(0.008),
      lacatus(0.12),
      sudor(0.06),
      necalificat(0.05),
      aparatSudura(0.05),
      polizor(0.02),
      automacara(0.002),
    ],
  },
  {
    code: "DV-MET-02",
    category,
    title:
      "Balustradă metalică din țeavă rectangulară, vopsită, pentru scări și balcoane",
    unit: "m",
    includes:
      "Confecționarea montanților, a mâinii curente și a umpluturii, montarea cu dibluri metalice, grundul și două straturi de email.",
    measurement: "Lungimea balustradei, măsurată pe mâna curentă.",
    resources: [
      profilOtel(12),
      electrozi(0.3),
      dibluMetalic(2),
      grundAnticoroziv(0.3),
      emailAlchidic(0.3),
      lacatus(1.5),
      sudor(0.6),
      vopsitor(0.4),
      aparatSudura(0.5),
      polizor(0.3),
      rotopercutor(0.2),
    ],
  },
  {
    code: "DV-MET-03",
    category,
    title: "Balustradă din inox satinat, cu montanți și mână curentă, montată",
    unit: "m",
    includes:
      "Măsurarea la fața locului, fixarea montanților cu dibluri metalice, montarea mâinii curente și a elementelor de umplutură, curățarea.",
    measurement: "Lungimea balustradei, măsurată pe mâna curentă.",
    resources: [
      balustradaInox(1),
      dibluMetalic(2),
      lacatus(1.2),
      necalificat(0.3),
      rotopercutor(0.2),
    ],
  },
  {
    code: "DV-MET-04",
    category,
    title: "Mână curentă din lemn pe suporturi metalice, fixată pe perete",
    unit: "m",
    includes:
      "Fixarea suporturilor cu dibluri, montarea și îmbinarea mâinii curente, capetele.",
    measurement: "Lungimea mâinii curente.",
    resources: [manaCurenta(1.05), dibluMetalic(1.2), lacatus(0.4)],
  },
  {
    code: "DV-MET-05",
    category,
    title: "Grilaje metalice de protecție la ferestre, vopsite, montate",
    unit: "mp",
    includes:
      "Confecționarea grilajului din profile, montarea cu dibluri metalice în zidărie sau beton, grundul și două straturi de email.",
    measurement: "Suprafața grilajului, măsurată pe contur.",
    resources: [
      profilOtel(25),
      electrozi(0.5),
      dibluMetalic(4),
      grundAnticoroziv(0.4),
      emailAlchidic(0.4),
      lacatus(2),
      sudor(0.8),
      vopsitor(0.6),
      aparatSudura(0.6),
      rotopercutor(0.3),
    ],
  },
  {
    code: "DV-MET-06",
    category,
    title: "Poartă pietonală metalică de 1 × 2 m, cu toc și broască, montată",
    unit: "buc",
    includes:
      "Gropile și betonarea stâlpilor tocului, montarea porții, reglarea balamalelor și a broaștei.",
    excludes: "Vopsirea; interfonul și yala electrică.",
    measurement: "Numărul de porți.",
    resources: [
      poartaPietonala(1),
      betonC16(0.15),
      lacatus(3),
      sudor(1),
      necalificat(2),
      aparatSudura(0.8),
    ],
  },
  {
    code: "DV-MET-07",
    category,
    title: "Poartă auto batantă metalică de 4 × 2 m, cu stâlpi, montată",
    unit: "buc",
    includes:
      "Gropile și betonarea stâlpilor, montarea canaturilor, reglarea balamalelor, opritorii și zăvorul.",
    excludes: "Vopsirea; automatizarea.",
    measurement: "Numărul de porți.",
    resources: [
      poartaBatanta(1),
      betonC16(0.4),
      lacatus(6),
      sudor(2),
      necalificat(3),
      aparatSudura(1.5),
    ],
  },
  {
    code: "DV-MET-08",
    category,
    title:
      "Poartă auto culisantă autoportantă de 4 m, cu automatizare, montată",
    unit: "buc",
    includes:
      "Fundația armată a șinei, montarea stâlpilor și a porții, reglarea rolelor, montarea motorului, a cremalierei, a fotocelulelor și a lămpii, programarea.",
    excludes: "Vopsirea; alimentarea electrică până la poartă.",
    measurement: "Numărul de porți.",
    resources: [
      poartaCulisanta(1),
      automatizarePoarta(1),
      betonC20(0.6),
      otelBeton(25),
      lacatus(10),
      sudor(2),
      electrician(3),
      necalificat(4),
      aparatSudura(1.5),
    ],
  },
  {
    code: "DV-MET-09",
    category,
    title:
      "Scară metalică de serviciu sau exterioară, confecționată, vopsită și montată",
    unit: "kg",
    includes:
      "Debitarea și asamblarea vangurilor, a treptelor și a podestelor, curățarea sudurilor, grundul și emailul, montarea cu prinderile din proiect.",
    excludes: "Balustrada.",
    measurement: "Masa scării, după extrasul de materiale din proiect.",
    resources: [
      profilOtel(1.05),
      electrozi(0.025),
      grundAnticoroziv(0.008),
      emailAlchidic(0.012),
      lacatus(0.2),
      sudor(0.1),
      vopsitor(0.03),
      aparatSudura(0.08),
      polizor(0.03),
    ],
  },
  {
    code: "DV-MET-10",
    category,
    title:
      "Copertină metalică cu învelitoare din policarbonat celular, confecționată și montată",
    unit: "mp",
    includes:
      "Structura din profile sudate și vopsite, fixarea ei cu dibluri metalice, montarea plăcilor de policarbonat cu profilele și șuruburile lor, etanșările.",
    measurement: "Suprafața copertinei, în proiecție orizontală.",
    resources: [
      profilOtel(18),
      policarbonat(1.1),
      profilePolicarbonat(2),
      surubTabla(10),
      electrozi(0.3),
      dibluMetalic(2),
      grundAnticoroziv(0.25),
      emailAlchidic(0.25),
      lacatus(2),
      sudor(0.8),
      vopsitor(0.4),
      necalificat(0.5),
      aparatSudura(0.6),
    ],
  },
  {
    code: "DV-MET-11",
    category,
    title:
      "Structură ușoară din profile zincate formate la rece, asamblată cu șuruburi",
    unit: "kg",
    includes:
      "Debitarea profilelor, asamblarea cu șuruburi zincate, ridicarea și montarea cu prinderile din proiect, pentru pergole, magazii și hale mici.",
    excludes: "Fundațiile și ancorele din beton; învelitoarea.",
    measurement: "Masa profilelor, după extrasul de materiale din proiect.",
    resources: [
      profileZincate(1.03),
      suruburiZincate(0.02),
      lacatus(0.08),
      necalificat(0.04),
      automacara(0.002),
    ],
  },
  {
    code: "DV-MET-12",
    category,
    title:
      "Ancorarea confecțiilor metalice în beton cu ancore chimice și tije filetate M12",
    unit: "buc",
    includes:
      "Găurirea și curățarea găurii, injectarea rășinii, tija filetată cu piulița și șaiba, strângerea după întărire.",
    measurement: "Numărul de ancore.",
    resources: [
      ancoraChimica(0.1),
      tijaFiletata(1),
      lacatus(0.25),
      rotopercutor(0.1),
    ],
  },
  {
    code: "DV-MET-13",
    category,
    title:
      "Zincarea termică a confecțiilor metalice, cu transportul la zincator",
    unit: "kg",
    includes:
      "Pregătirea pieselor cu găuri de scurgere, transportul la și de la zincator și zincarea prin imersie.",
    measurement: "Masa confecțiilor zincate.",
    resources: [zincare(1), lacatus(0.01)],
  },
  {
    code: "DV-MET-14",
    category,
    title: "Capac cu ramă din fontă pentru cămine, clasa B125, montat la cotă",
    unit: "buc",
    includes:
      "Așezarea ramei pe pat de mortar la cota pavajului, fixarea și montarea capacului.",
    measurement: "Numărul de capace.",
    resources: [
      capacCamin(1),
      mortarZidarie(0.01),
      lacatus(0.6),
      necalificat(0.5),
    ],
  },
  {
    code: "DV-MET-15",
    category,
    title:
      "Balustradă din sticlă securizată laminată, în profil de aluminiu, cu mână curentă din inox",
    unit: "m",
    includes:
      "Fixarea profilului de aluminiu cu dibluri metalice, așezarea și penarea sticlei, garniturile, mâna curentă din inox și capacele.",
    measurement: "Lungimea balustradei.",
    resources: [
      sticlaBalustrada(1.1),
      profilSticla(1),
      manaCurentaInox(1),
      dibluMetalic(3),
      smallMaterials(2),
      lacatus(2),
      necalificat(0.5),
    ],
  },
];
