import type { BaseCategory } from "../baseCategories";
import type { NormResourceInput } from "../resourceRows";

/** One Normă de bază as the code writes it, before it is published. */
export type BaseNorm = {
  code: string;
  category: BaseCategory;
  title: string;
  unit: string;
  includes: string;
  excludes?: string;
  measurement: string;
  resources: NormResourceInput[];
};
