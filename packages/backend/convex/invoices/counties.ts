import { normalizeText } from "../lib/text";

// Romania's counties as the e-Factura XML codes them (ISO 3166-2:RO), by the
// name people write in an address. București is RO-B, and its city is the
// sector: SECTOR1 to SECTOR6.

const countyCodes: Record<string, string> = {
  Alba: "RO-AB",
  Arad: "RO-AR",
  Argeș: "RO-AG",
  Bacău: "RO-BC",
  Bihor: "RO-BH",
  "Bistrița-Năsăud": "RO-BN",
  Botoșani: "RO-BT",
  Brașov: "RO-BV",
  Brăila: "RO-BR",
  București: "RO-B",
  Buzău: "RO-BZ",
  "Caraș-Severin": "RO-CS",
  Călărași: "RO-CL",
  Cluj: "RO-CJ",
  Constanța: "RO-CT",
  Covasna: "RO-CV",
  Dâmbovița: "RO-DB",
  Dolj: "RO-DJ",
  Galați: "RO-GL",
  Giurgiu: "RO-GR",
  Gorj: "RO-GJ",
  Harghita: "RO-HR",
  Hunedoara: "RO-HD",
  Ialomița: "RO-IL",
  Iași: "RO-IS",
  Ilfov: "RO-IF",
  Maramureș: "RO-MM",
  Mehedinți: "RO-MH",
  Mureș: "RO-MS",
  Neamț: "RO-NT",
  Olt: "RO-OT",
  Prahova: "RO-PH",
  "Satu Mare": "RO-SM",
  Sălaj: "RO-SJ",
  Sibiu: "RO-SB",
  Suceava: "RO-SV",
  Teleorman: "RO-TR",
  Timiș: "RO-TM",
  Tulcea: "RO-TL",
  Vaslui: "RO-VS",
  Vâlcea: "RO-VL",
  Vrancea: "RO-VN",
};

/** The counties, as addresses write them. */
export const countyNames = Object.keys(countyCodes);

const byKey = new Map<string, { name: string; code: string }>();
for (const [name, code] of Object.entries(countyCodes)) {
  const entry = { name, code };
  byKey.set(normalizeText(name), entry);
  byKey.set(normalizeText(code), entry);
  byKey.set(normalizeText(code.slice(3)), entry);
}
byKey.set("municipiul bucuresti", { name: "București", code: "RO-B" });
byKey.set("bucharest", { name: "București", code: "RO-B" });

/**
 * The county an address names, in its official spelling with its code, from
 * "cluj", "Jud. Cluj", "CJ" or "RO-CJ". Undefined for anything else.
 */
export function findCounty(
  value: string | undefined,
): { name: string; code: string } | undefined {
  if (!value) {
    return undefined;
  }
  const key = normalizeText(value)
    .replace(/^(jud|judetul|judet) /, "")
    .trim();
  return byKey.get(key);
}

/** The ISO 3166-2 code of a county, as the XML's CountrySubentity. */
export function countyCode(value: string | undefined): string | undefined {
  return findCounty(value)?.code;
}

/**
 * A city as the XML writes it: for București the sector, SECTOR3, from
 * "Sector 3", "sectorul 3" or "București, sector 3"; any other city as it is.
 */
export function xmlCityName(
  city: string | undefined,
  county: string | undefined,
): string | undefined {
  const trimmed = city?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (countyCode(county) !== "RO-B") {
    return trimmed;
  }
  const sector = /sector(?:ul)?\s*([1-6])\b/i.exec(trimmed);
  return sector ? `SECTOR${sector[1]}` : trimmed;
}

/** Whether a city stands as the XML wants it for București: a sector. */
export function isSectorName(value: string | undefined): boolean {
  return /^SECTOR[1-6]$/.test(value ?? "");
}
