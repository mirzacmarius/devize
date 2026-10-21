import { describe, expect, test } from "bun:test";
import { contextsOf } from "./contexts";
import { type CheckItem, ruleFindings, tileSide } from "./rules";

// Made-up Articole, with the materials of the Norme de bază or of no one.
function item(
  _id: string,
  title: string,
  materials: [name: string, unit: string][],
  sectionId?: string,
): CheckItem & { category?: string } {
  return {
    _id,
    sectionId,
    title,
    resources: [
      ...materials.map(([name, unit], index) => ({
        key: `${_id}:${index}`,
        kind: "material",
        name,
        unit,
      })),
      { key: `${_id}:labor`, kind: "labor", name: "Faianțar", unit: "ora" },
    ],
  };
}

const tiledFloor = (id: string, sectionId?: string) =>
  item(
    id,
    "Pardoseală din gresie porțelanată de 60 × 60 cm, lipită cu adeziv flexibil",
    [
      ["Gresie porțelanată", "mp"],
      ["Adeziv flexibil C2TE", "kg"],
      ["Chit de rosturi", "kg"],
      ["Sistem de nivelare pentru plăci", "buc"],
    ],
    sectionId,
  );

function check(
  items: (CheckItem & { category?: string })[],
  estimateTitle = "Renovare",
  sections: { _id: string; name: string; parentId?: string }[] = [],
) {
  return ruleFindings(
    items,
    contextsOf({ estimateTitle, sections, items }),
  ).map((finding) => ({
    ruleId: finding.ruleId,
    severity: finding.severity,
    material: finding.material,
    fix:
      finding.fix?.kind === "material"
        ? finding.fix.material.name
        : finding.fix?.code,
  }));
}

describe("ruleFindings", () => {
  test("finds nothing wrong in a plain tiled floor", () => {
    expect(check([tiledFloor("a")])).toEqual([]);
  });

  test("wants a deformable adhesive and a flexible grout on a heated floor", () => {
    const sections = [{ _id: "baie", name: "Baie" }];
    expect(
      check(
        [
          item(
            "heating",
            "Încălzire electrică în pardoseală",
            [["Covoraș electric de încălzire", "mp"]],
            "baie",
          ),
          tiledFloor("floor", "baie"),
        ],
        "Renovare",
        sections,
      ),
    ).toEqual([
      {
        // Read from the heating's own Articol: only worth checking.
        ruleId: "heated_floor_adhesive",
        severity: "warning",
        material: "Adeziv flexibil C2TE",
        fix: "Adeziv deformabil C2TE S1",
      },
      {
        ruleId: "heated_floor_grout",
        severity: "warning",
        material: "Chit de rosturi",
        fix: "Chit de rosturi flexibil CG2WA",
      },
    ]);
    // Said on the Articol itself, the adhesive is an error.
    const heated = tiledFloor("floor");
    heated.title = "Gresie pe încălzire în pardoseală";
    expect(check([heated])[0]).toEqual({
      ruleId: "heated_floor_adhesive",
      severity: "error",
      material: "Adeziv flexibil C2TE",
      fix: "Adeziv deformabil C2TE S1",
    });
  });

  test("accepts a deformable adhesive however it is written", () => {
    for (const name of ["Adeziv C2TE S1", "Adeziv C2TES1", "Adeziv C2 S2"]) {
      const floor = item("a", "Gresie pe încălzire în pardoseală", [
        ["Gresie porțelanată", "mp"],
        [name, "kg"],
      ]);
      expect(check([floor])).toEqual([]);
    }
  });

  test("keeps wall tiles off floors and out of the frost", () => {
    const floor = item("a", "Pardoseală din faianță", [
      ["Faianță", "mp"],
      ["Adeziv flexibil C2TE", "kg"],
    ]);
    expect(check([floor]).map((f) => f.ruleId)).toEqual(["floor_wall_tiles"]);
    const terrace = item("b", "Placaj pe terasă", [
      ["Faianță 20 × 20", "mp"],
      ["Adeziv C1T", "kg"],
    ]);
    expect(check([terrace])).toEqual([
      {
        ruleId: "outdoor_wall_tiles",
        severity: "error",
        material: "Faianță 20 × 20",
        fix: "Gresie porțelanată rezistentă la îngheț",
      },
      {
        ruleId: "outdoor_adhesive_c1",
        severity: "error",
        material: "Adeziv C1T",
        fix: "Adeziv deformabil C2TE S1",
      },
    ]);
    // The profile for the tiles' edges is no tile.
    const wall = item("c", "Placaj din faianță pe pereți, în baie", [
      ["Faianță", "mp"],
      ["Profil de colț pentru faianță", "m"],
    ]);
    expect(check([wall])).toEqual([]);
  });

  test("wants big tiles laid with a C2 adhesive", () => {
    const floor = item("a", "Gresie 120 × 60", [
      ["Gresie porțelanată", "mp"],
      ["Adeziv C1", "kg"],
    ]);
    expect(check([floor]).map((f) => f.ruleId)).toEqual(["large_tiles_c1"]);
    expect(tileSide(["Gresie 600x600 mm"])).toBe(60);
    expect(tileSide(["Gresie 30 × 30"])).toBe(30);
    expect(tileSide(["Gresie"])).toBeNull();
  });

  test("keeps interior paint and gypsum indoors", () => {
    const facade = item("a", "Vopsitorie pe fațadă", [
      ["Grund acrilic", "l"],
      ["Vopsea lavabilă de interior", "l"],
    ]);
    expect(check([facade])).toEqual([
      {
        ruleId: "outdoor_interior_paint",
        severity: "error",
        material: "Vopsea lavabilă de interior",
        fix: "Vopsea lavabilă pentru fațade",
      },
    ]);
    const plaster = item("b", "Tencuială pe soclu", [
      ["Tencuială mecanizată pe bază de ipsos", "kg"],
      ["Profile de ghidaj și colțare pentru tencuieli", "m"],
    ]);
    expect(check([plaster])).toEqual([
      {
        ruleId: "outdoor_gypsum_plaster",
        severity: "error",
        material: "Tencuială mecanizată pe bază de ipsos",
        fix: "DV-TEN-03",
      },
    ]);
  });

  test("wants moisture-proof boards, floors and sealant in a bathroom", () => {
    const sections = [{ _id: "baie", name: "Baie" }];
    const findings = check(
      [
        item(
          "a",
          "Placarea pereților cu gips-carton",
          [
            ["Placă de gips-carton, 12,5 mm", "mp"],
            ["Șurub autoforant pentru gips-carton", "buc"],
          ],
          "baie",
        ),
        item(
          "b",
          "Pardoseală din parchet laminat",
          [
            ["Folie de polietilenă", "mp"],
            ["Parchet laminat, 8 mm", "mp"],
          ],
          "baie",
        ),
        item("c", "Etanșări", [["Silicon, cartuș", "buc"]], "baie"),
      ],
      "Renovare apartament",
      sections,
    );
    expect(findings).toEqual([
      {
        ruleId: "wet_gypsum_board",
        severity: "error",
        material: "Placă de gips-carton, 12,5 mm",
        fix: "Placă de gips-carton rezistentă la umiditate (H2), 12,5 mm",
      },
      {
        ruleId: "wet_laminate",
        severity: "error",
        material: "Parchet laminat, 8 mm",
        fix: "DV-PRD-06",
      },
      {
        ruleId: "wet_silicone",
        severity: "warning",
        material: "Silicon, cartuș",
        fix: "Silicon sanitar, cartuș",
      },
    ]);
  });

  test("checks a mineral wool facade's adhesive, render and wool", () => {
    const facade = item("a", "Termosistem cu vată", [
      ["Adeziv pentru polistiren, lipire și armare", "kg"],
      ["Vată minerală de sticlă, 10 cm", "mp"],
      ["Tencuială decorativă acrilică, 1,5 mm", "kg"],
    ]);
    expect(check([facade])).toEqual([
      {
        ruleId: "mineral_wool_eps_adhesive",
        severity: "warning",
        material: "Adeziv pentru polistiren, lipire și armare",
        fix: "Adeziv pentru vată minerală, lipire și armare",
      },
      {
        ruleId: "facade_glass_wool",
        severity: "error",
        material: "Vată minerală de sticlă, 10 cm",
        fix: "Vată minerală bazaltică pentru termosisteme, 10 cm",
      },
      {
        ruleId: "mineral_wool_acrylic",
        severity: "warning",
        material: "Tencuială decorativă acrilică, 1,5 mm",
        fix: "Tencuială decorativă siliconică, 1,5 mm",
      },
    ]);
    // Polystyrene takes an acrylic render, even next to an attic's wool.
    const eps = item("b", "Termosistem cu polistiren", [
      ["Polistiren expandat EPS 80, 10 cm", "mp"],
      ["Tencuială decorativă acrilică, 1,5 mm", "kg"],
    ]);
    const attic = item("c", "Termoizolație pe planșeul podului", [
      ["Vată minerală de sticlă, 10 cm", "mp"],
    ]);
    expect(check([eps, attic], "Anvelopare bloc")).toEqual([]);
  });

  test("keeps bitumen from under the tiles of a bathroom", () => {
    const sections = [{ _id: "baie", name: "Baie" }];
    const findings = check(
      [
        item(
          "a",
          "Hidroizolație cu membrană bituminoasă",
          [
            ["Amorsă bituminoasă", "kg"],
            ["Membrană bituminoasă SBS, 4 mm", "mp"],
          ],
          "baie",
        ),
        tiledFloor("b", "baie"),
      ],
      "Renovare",
      sections,
    );
    expect(findings).toEqual([
      {
        ruleId: "bitumen_under_tiles",
        severity: "warning",
        material: "Amorsă bituminoasă",
        fix: "DV-HDR-03",
      },
    ]);
  });

  test("offers no swap in another unit", () => {
    const facade = item("a", "Vopsitorie pe fațadă", [
      ["Vopsea lavabilă de interior", "kg"],
    ]);
    expect(check([facade])[0]?.fix).toBeUndefined();
  });

  test("never flags what its own swaps put in", () => {
    const sections = [{ _id: "terasa", name: "Terasă" }];
    const fixed = item(
      "a",
      "Placaj pe terasă cu încălzire în pardoseală",
      [
        ["Gresie porțelanată rezistentă la îngheț", "mp"],
        ["Adeziv deformabil C2TE S1", "kg"],
        ["Chit de rosturi flexibil CG2WA", "kg"],
      ],
      "terasa",
    );
    expect(check([fixed], "Renovare", sections)).toEqual([]);
  });
});
