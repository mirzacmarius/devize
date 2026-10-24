import type { BaseNorm } from "./norm";
import {
  cherestea,
  chirieSchela,
  cuie,
  dulgher,
  equipment,
  liftMateriale,
  material,
  mortarReparatii,
  necalificat,
  placaOsb,
  platformaFoarfeca,
  schelar,
  transportAgabaritic,
} from "./resources";

const category = "Schele";

const plasaProtectie = material("Plasă de protecție pentru schelă", "mp", 2.5);
const schelaMobila = equipment(
  "Schelă mobilă din aluminiu de 8 m, chirie pe zi",
  "zi",
  120,
);
const platformaCapre = equipment(
  "Platformă de lucru pe capre cu podină, chirie pe o lună",
  "mp",
  3,
);
const ancoraSchela = material("Ancoră cu ochi pentru schelă", "buc", 3.5);

export const schele: BaseNorm[] = [
  {
    code: "DV-SCH-01",
    category,
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
    category,
    title: "Chiria schelei metalice de fațadă, pe o lună",
    unit: "mp",
    includes: "Chiria elementelor de schelă pentru o lună.",
    measurement:
      "Suprafața fațadei acoperite de schelă, pentru fiecare lună de folosire.",
    resources: [chirieSchela(1)],
  },
  {
    code: "DV-SCH-03",
    category,
    title:
      "Montarea și demontarea schelei metalice de fațadă, între 10 și 20 m înălțime",
    unit: "mp",
    includes:
      "Aducerea elementelor, montarea cu podine, balustrade și scări de acces, prinderea schelei de ancoraje, demontarea și stivuirea.",
    excludes:
      "Chiria schelei (DV-SCH-02); plasa de protecție (DV-SCH-04); ancorajele în fațadă (DV-SCH-06).",
    measurement: "Suprafața fațadei acoperite de schelă.",
    resources: [schelar(0.3), necalificat(0.16)],
  },
  {
    code: "DV-SCH-04",
    category,
    title: "Plasă de protecție pe schelă, cu montare și demontare",
    unit: "mp",
    includes: "Întinderea și legarea plasei pe schelă, demontarea la final.",
    measurement: "Suprafața de schelă acoperită cu plasă.",
    resources: [plasaProtectie(1.05), schelar(0.03), necalificat(0.03)],
  },
  {
    code: "DV-SCH-05",
    category,
    title:
      "Copertină de protecție pentru pietoni la baza schelei, din OSB pe dulapi",
    unit: "mp",
    includes:
      "Montarea consolelor și a dulapilor pe schelă, a plăcilor OSB cu pantă, demontarea la final.",
    measurement: "Suprafața copertinei.",
    resources: [
      placaOsb(1.05),
      cherestea(0.03),
      cuie(0.2),
      dulgher(0.6),
      necalificat(0.4),
    ],
  },
  {
    code: "DV-SCH-06",
    category,
    title: "Ancorarea schelei în fațadă, cu astuparea găurilor la demontare",
    unit: "buc",
    includes:
      "Forarea, montarea ancorei cu ochi, scoaterea ei la demontare și astuparea găurii cu mortar; prinderea schelei de ancoră este cuprinsă în DV-SCH-01 și DV-SCH-03.",
    measurement: "Numărul de ancoraje.",
    resources: [ancoraSchela(1), mortarReparatii(0.2), schelar(0.15)],
  },
  {
    code: "DV-SCH-07",
    category,
    title:
      "Schelă mobilă din aluminiu de 8 m, chirie pe zi, cu montaj și mutări",
    unit: "zi",
    includes:
      "Chiria pe zi, montarea la începutul lucrării, mutările pe parcurs și demontarea la final, cuprinse proporțional.",
    measurement: "Numărul de zile de folosire.",
    resources: [schelaMobila(1), schelar(0.5)],
  },
  {
    code: "DV-SCH-08",
    category,
    title:
      "Platformă de lucru interioară pe capre cu podină, cu montare, chirie o lună și demontare",
    unit: "mp",
    includes:
      "Montarea caprelor și a podinei, chiria pe o lună, mutările și demontarea.",
    measurement: "Suprafața platformei.",
    resources: [platformaCapre(1), schelar(0.08), necalificat(0.06)],
  },
  {
    code: "DV-SCH-09",
    category,
    title:
      "Platformă ridicătoare foarfecă, chirie pe zi, cu transportul cuprins proporțional",
    unit: "zi",
    includes: "Chiria pe zi cu aducerea și ridicarea de pe șantier.",
    measurement: "Numărul de zile de folosire.",
    resources: [platformaFoarfeca(1), transportAgabaritic(0.2)],
  },
  {
    code: "DV-SCH-10",
    category,
    title: "Lift de materiale pentru fațadă, chirie pe zi, cu montaj",
    unit: "zi",
    includes: "Chiria pe zi, montarea și demontarea cuprinse proporțional.",
    measurement: "Numărul de zile de folosire.",
    resources: [liftMateriale(1), schelar(0.3)],
  },
];
