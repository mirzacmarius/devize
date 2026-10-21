import { describe, expect, test } from "bun:test";
import { contextsIn, contextsOf, surfaceOf } from "./contexts";

describe("contextsIn", () => {
  test("reads where a work is done", () => {
    expect([...contextsIn("Gresie în baie")]).toEqual(["wet"]);
    expect([...contextsIn("Placaj pe balcon")]).toEqual(["outdoor"]);
    expect([...contextsIn("Termosistem pe fațada de nord")].sort()).toEqual([
      "facade",
      "outdoor",
    ]);
    expect([
      ...contextsIn("Montarea covorașului electric de încălzire"),
    ]).toEqual(["floor_heating"]);
    expect([...contextsIn("Pardoseală cu încălzire în pardoseală")]).toEqual([
      "floor_heating",
    ]);
    expect([...contextsIn("Zugrăveli în dormitor")]).toEqual([]);
  });

  test("hears a no", () => {
    expect([...contextsIn("Gresie fără încălzire în pardoseală")]).toEqual([]);
  });
});

test("surfaceOf tells floors from walls", () => {
  expect(surfaceOf({ title: "Pardoseală din gresie" })).toBe("floor");
  expect(surfaceOf({ title: "Gresie 60 × 60", category: "Pardoseli" })).toBe(
    "floor",
  );
  expect(surfaceOf({ title: "Plintă din gresie", category: "Pardoseli" })).toBe(
    "wall",
  );
  expect(surfaceOf({ title: "Placaj din faianță pe pereți" })).toBe("wall");
  expect(surfaceOf({ title: "Glafuri" })).toBeNull();
});

describe("contextsOf", () => {
  const sections = [
    { _id: "casa", name: "Casa Popescu" },
    { _id: "baie", name: "Baie etaj", parentId: "casa" },
    { _id: "terasa", name: "Terasă", parentId: "casa" },
    { _id: "interior", name: "Finisaje interioare" },
    { _id: "mixt", name: "Apartament: baie și living" },
  ];

  test("reads the Articol, then its Capitol and Obiect, then the Deviz", () => {
    const found = contextsOf({
      estimateTitle: "Renovare casă cu încălzire în pardoseală",
      sections,
      items: [
        { _id: "a", sectionId: "baie", title: "Pardoseală din gresie" },
        { _id: "b", sectionId: "terasa", title: "Placaj din gresie" },
        { _id: "c", title: "Zugrăveli pe tavane" },
      ],
    });
    expect(found.get("a")).toEqual({
      surface: "floor",
      contexts: {
        wet: { from: "section", name: "Baie etaj" },
        floor_heating: {
          from: "estimate",
          title: "Renovare casă cu încălzire în pardoseală",
        },
      },
    });
    expect(found.get("b")?.contexts.outdoor).toEqual({
      from: "section",
      name: "Terasă",
    });
    expect(Object.keys(found.get("c")?.contexts ?? {})).toEqual([
      "floor_heating",
    ]);
  });

  test("lets indoor words rule out an outdoor Deviz", () => {
    const found = contextsOf({
      estimateTitle: "Anvelopare bloc",
      sections,
      items: [
        { _id: "a", title: "Termoizolație pe pereți" },
        { _id: "b", sectionId: "interior", title: "Glet de ipsos" },
        { _id: "c", title: "Zugrăveli pe pereți interiori" },
      ],
    });
    expect(found.get("a")?.contexts.facade).toEqual({
      from: "estimate",
      title: "Anvelopare bloc",
    });
    expect(found.get("b")?.contexts).toEqual({});
    expect(found.get("c")?.contexts).toEqual({});
  });

  test("doesn't read a Capitol that names several places", () => {
    const found = contextsOf({
      estimateTitle: "Renovare baie",
      sections,
      items: [{ _id: "a", sectionId: "mixt", title: "Gresie" }],
    });
    // Nor the Deviz's title, further out.
    expect(found.get("a")?.contexts).toEqual({});
  });

  test("finds underfloor heating next to the floor it heats", () => {
    const found = contextsOf({
      estimateTitle: "Renovare",
      sections,
      items: [
        {
          _id: "heating",
          sectionId: "baie",
          title: "Încălzire electrică în pardoseală, cu covoraș",
        },
        { _id: "floor", sectionId: "baie", title: "Pardoseală din gresie" },
        { _id: "other", sectionId: "terasa", title: "Pardoseală din gresie" },
      ],
    });
    expect(found.get("floor")?.contexts.floor_heating).toEqual({
      from: "sibling",
      title: "Încălzire electrică în pardoseală, cu covoraș",
    });
    expect(found.get("other")?.contexts.floor_heating).toBeUndefined();
  });
});
