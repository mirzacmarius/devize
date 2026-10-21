// How a Deviz's line items sit in its Obiecte and Capitole, numbered in the
// order they print, with each section's subtotal.

type SectionLike = {
  _id: string;
  kind: "object" | "chapter";
  parentId?: string;
};

type ItemLike = {
  _id: string;
  sectionId?: string;
  totals: { total: number };
};

export type NumberedItem<Item> = { item: Item; index: number };

export type SectionGroup<Section, Item> = {
  section: Section;
  items: NumberedItem<Item>[];
  // The chapters inside an object; always empty for a chapter.
  chapters: SectionGroup<Section, Item>[];
  // Lei without markups, its chapters included.
  total: number;
};

export type LineGroups<Section, Item> = {
  // Items in no section, which print first.
  loose: NumberedItem<Item>[];
  sections: SectionGroup<Section, Item>[];
};

/**
 * Groups a Deviz's items by section. Both lists come in position order; an
 * item whose section is gone counts as loose, and a chapter whose object is
 * gone as a top-level section.
 */
export function groupLines<Section extends SectionLike, Item extends ItemLike>(
  sections: readonly Section[],
  items: readonly Item[],
): LineGroups<Section, Item> {
  const known = new Set(sections.map((section) => section._id));
  const bySection = new Map<string, Item[]>();
  const loose: Item[] = [];
  for (const item of items) {
    if (item.sectionId && known.has(item.sectionId)) {
      const list = bySection.get(item.sectionId) ?? [];
      list.push(item);
      bySection.set(item.sectionId, list);
    } else {
      loose.push(item);
    }
  }

  let index = 0;
  const number = (list: readonly Item[]) =>
    list.map((item) => ({ item, index: ++index }));
  const bani = (list: readonly NumberedItem<Item>[]) =>
    list.reduce(
      (sum, { item }) => sum + Math.round(item.totals.total * 100),
      0,
    );

  const isTop = (section: Section) =>
    section.kind === "object" ||
    !section.parentId ||
    !sections.some(
      (other) => other._id === section.parentId && other.kind === "object",
    );

  const result: LineGroups<Section, Item> = {
    loose: number(loose),
    sections: [],
  };
  for (const section of sections) {
    if (!isTop(section)) {
      continue;
    }
    const own = number(bySection.get(section._id) ?? []);
    const chapters =
      section.kind === "object"
        ? sections
            .filter(
              (child) =>
                child.kind === "chapter" && child.parentId === section._id,
            )
            .map((chapter) => {
              const chapterItems = number(bySection.get(chapter._id) ?? []);
              return {
                section: chapter,
                items: chapterItems,
                chapters: [],
                total: bani(chapterItems) / 100,
              };
            })
        : [];
    const chapterBani = chapters.reduce(
      (sum, chapter) => sum + Math.round(chapter.total * 100),
      0,
    );
    result.sections.push({
      section,
      items: own,
      chapters,
      total: (bani(own) + chapterBani) / 100,
    });
  }
  return result;
}
