"use client";

import {
  type SheetCategory,
  type Subchapter,
  subchapters,
} from "@devize/forms/sheet";
import { Button } from "@devize/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useScopedI18n } from "@/locales/client";

// Each subchapter's name in the locales.
const subchapterKeys = {
  "1.2": "site",
  "1.3": "environment",
  "1.4": "relocation",
  "2": "utilities",
  "4.1.1": "earthworks",
  "4.1.2": "structure",
  "4.1.3": "architecture",
  "4.1.4": "services",
  "4.2": "assembly",
  "4.3": "equipment",
  "4.4": "looseEquipment",
  "4.5": "furnishings",
  "4.6": "intangibles",
  "5.1.1": "siteSetup",
} as const satisfies Record<Subchapter, string>;

export type Placement = Readonly<Record<string, Subchapter>>;

export const placedIn = (placement: Placement, category: SheetCategory) =>
  placement[category.key] ?? category.guess;

/** The categories of works under their objects, in print order. */
export function byObject(categories: readonly SheetCategory[]) {
  const objects = new Map<
    string,
    { key: string; name: string; categories: SheetCategory[] }
  >();
  for (const category of categories) {
    const object = objects.get(category.object.key) ?? {
      key: category.object.key,
      name: category.object.name,
      categories: [],
    };
    object.categories.push(category);
    objects.set(object.key, object);
  }
  return [...objects.values()];
}

/** Where each category of works falls in the Deviz general, by object. */
export function PlacementFields({
  categories,
  placement,
  moved,
  onChange,
}: {
  categories: readonly SheetCategory[];
  placement: Placement;
  // Whether some works are placed other than by their names.
  moved: boolean;
  onChange: (placement: Placement) => void;
}) {
  const t = useScopedI18n("documents.forms");
  const objects = byObject(categories);
  return (
    <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
      <legend className="mb-1.5 p-0 text-body font-medium text-ink">
        {t("placement")}
      </legend>
      <p className="m-0 text-meta text-ink-3">{t("placementHint")}</p>
      {objects.map((object) => (
        <div key={object.key} className="grid gap-2">
          {objects.length > 1 && (
            <p className="m-0 text-meta font-medium text-ink-2">
              {object.name}
            </p>
          )}
          {object.categories.map((category) => {
            const id = `placement-${category.key}`;
            return (
              <div
                key={category.key}
                className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_17rem] sm:items-center sm:gap-3"
              >
                <label htmlFor={id} className="text-body text-ink">
                  {category.name}
                </label>
                <Select
                  value={placedIn(placement, category)}
                  onValueChange={(next) =>
                    onChange({
                      ...placement,
                      [category.key]: next as Subchapter,
                    })
                  }
                >
                  <SelectTrigger
                    id={id}
                    className="min-w-0 [&>span]:block [&>span]:truncate"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subchapters.map((code) => (
                      <SelectItem key={code} value={code}>
                        {`${code} ${t(`subchapters.${subchapterKeys[code]}`)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      ))}
      {moved && (
        <Button
          type="button"
          variant="link"
          className="justify-self-start"
          onClick={() => onChange({})}
        >
          {t("placementReset")}
        </Button>
      )}
    </fieldset>
  );
}
