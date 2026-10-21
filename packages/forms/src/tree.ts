import {
  computeRecap,
  type Recap,
} from "@devize/backend/convex/estimates/recap";
import type { ExportData, LineItemInput, SectionInput } from "./input";
import { listedLine } from "./listed";

// A Deviz the way the forms see it: an objective (the Deviz) made of objects,
// each made of categories of works (the Capitole), each with its own list of
// quantities and its own closing: CAM, indirect costs and profit.

export type Category = {
  key: string;
  name: string;
  code?: string;
  items: LineItemInput[];
  // The category's own Recapitulație, from its line items as its list of
  // quantities prints them.
  recap: Recap;
};

export type WorkObject = {
  key: string;
  name: string;
  code?: string;
  // Stands for the works outside any of the Deviz's objects.
  implicit: boolean;
  categories: Category[];
};

const byPosition = <T extends { position: number }>(a: T, b: T) =>
  a.position - b.position;

/**
 * Groups a Deviz's line items into objects and categories, in print order:
 * the works outside any object first, then each object with the items placed
 * directly in it, then its chapters. Empty categories and objects are left out.
 */
export function buildTree(data: ExportData): WorkObject[] {
  const sections = [...data.sections].sort(byPosition);
  const known = new Map(sections.map((section) => [section._id, section]));
  const objects = sections.filter((section) => section.kind === "object");
  const objectIds = new Set(objects.map((object) => object._id));
  const bySection = new Map<string, LineItemInput[]>();
  const loose: LineItemInput[] = [];
  for (const item of [...data.lineItems].sort(byPosition)) {
    if (item.sectionId && known.has(item.sectionId)) {
      const list = bySection.get(item.sectionId) ?? [];
      list.push(item);
      bySection.set(item.sectionId, list);
    } else {
      loose.push(item);
    }
  }

  const markups = data.estimate.markups;
  const category = (
    key: string,
    name: string,
    code: string | undefined,
    items: LineItemInput[],
  ): Category => ({
    key,
    name,
    code,
    items,
    recap: computeRecap(
      items.map((item, index) => listedLine(item, index + 1)),
      markups,
    ),
  });
  const chapters = (inObject: (chapter: SectionInput) => boolean) =>
    sections
      .filter((section) => section.kind === "chapter" && inObject(section))
      .flatMap((chapter) => {
        const items = bySection.get(chapter._id) ?? [];
        return items.length > 0
          ? [category(chapter._id, chapter.name, chapter.code, items)]
          : [];
      });

  const outside = chapters(
    (chapter) => !chapter.parentId || !objectIds.has(chapter.parentId),
  );
  const result: WorkObject[] = [];
  if (loose.length > 0 || outside.length > 0) {
    const general = [
      ...(loose.length > 0
        ? [
            category(
              "loose",
              objects.length > 0 || outside.length > 0
                ? "Lucrări diverse"
                : data.estimate.title,
              undefined,
              loose,
            ),
          ]
        : []),
      ...outside,
    ];
    result.push({
      key: "general",
      name: objects.length > 0 ? "Lucrări generale" : data.estimate.title,
      implicit: true,
      categories: general,
    });
  }
  for (const object of objects) {
    const own = bySection.get(object._id) ?? [];
    const categories = [
      ...(own.length > 0
        ? [category(object._id, object.name, object.code, own)]
        : []),
      ...chapters((chapter) => chapter.parentId === object._id),
    ];
    if (categories.length > 0) {
      result.push({
        key: object._id,
        name: object.name,
        code: object.code,
        implicit: false,
        categories,
      });
    }
  }
  return result;
}
