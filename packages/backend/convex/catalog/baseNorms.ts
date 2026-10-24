import { acoperisuri } from "./base/acoperisuri";
import { betoane } from "./base/betoane";
import { curentiSlabi } from "./base/curentiSlabi";
import { demolari } from "./base/demolari";
import { electrice } from "./base/electrice";
import { gaze } from "./base/gaze";
import { gipscarton } from "./base/gipscarton";
import { hidroizolatii } from "./base/hidroizolatii";
import { metalice } from "./base/metalice";
import type { BaseNorm } from "./base/norm";
import { organizare } from "./base/organizare";
import { pardoseli } from "./base/pardoseli";
import { placaje } from "./base/placaje";
import { reparatii } from "./base/reparatii";
import { sanitareConducte } from "./base/sanitareConducte";
import { sanitareObiecte } from "./base/sanitareObiecte";
import { schele } from "./base/schele";
import { tamplarie } from "./base/tamplarie";
import { tencuieli } from "./base/tencuieli";
import { terasamente } from "./base/terasamente";
import { termice } from "./base/termice";
import { termoizolatii } from "./base/termoizolatii";
import { ventilatie } from "./base/ventilatie";
import { zidarie } from "./base/zidarie";
import { zugraveli } from "./base/zugraveli";

// Devize's own catalog of Norme de bază (docs/adr/0002 and 0012): generic
// norms with no brand, written by the Devize team from current practice. A
// super admin publishes this edition from the admin panel; a norm whose
// content changed becomes a new version of the one already published.
//
// Each category of baseCategories has its norms in one file under base/,
// in the order of its codes; this module puts the categories together in the
// order works follow on a site. The Resurse the categories share are in
// base/resources.ts, so one name means one unit and one reference price.
//
// Reference prices are lei without VAT, a fallback until a firm sets its own
// Tarife or a store price applies. Labour is per hour, without the CAM that
// the Deviz adds.

/** The edition of this catalog, shown on every norm it publishes. */
export const BASE_EDITION = "octombrie 2026 (a 2-a)";

export type { BaseNorm } from "./base/norm";
export { type BaseCategory, baseCategories } from "./baseCategories";

export const baseNorms: BaseNorm[] = [
  ...demolari,
  ...terasamente,
  ...betoane,
  ...zidarie,
  ...metalice,
  ...acoperisuri,
  ...termoizolatii,
  ...hidroizolatii,
  ...tencuieli,
  ...gipscarton,
  ...pardoseli,
  ...placaje,
  ...zugraveli,
  ...tamplarie,
  ...sanitareConducte,
  ...sanitareObiecte,
  ...termice,
  ...gaze,
  ...ventilatie,
  ...electrice,
  ...curentiSlabi,
  ...reparatii,
  ...schele,
  ...organizare,
];
