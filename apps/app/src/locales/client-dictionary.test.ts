import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { clientDictionary, serverOnlyScopes } from "./client-dictionary";
import ro from "./ro";

describe("the dictionary client components read", () => {
  test("leaves out the legal documents and keeps the rest", () => {
    const dictionary = clientDictionary(ro);
    for (const scope of serverOnlyScopes) {
      expect(dictionary).not.toHaveProperty(scope);
    }
    expect(Object.keys(dictionary)).toHaveLength(
      Object.keys(ro).length - serverOnlyScopes.length,
    );
    // The links to the documents and the notice to accept them stay.
    expect(dictionary.legal).toEqual(ro.legal);
    expect(dictionary.termsNotice).toEqual(ro.termsNotice);
  });

  test("no client component reads a scope it doesn't get", () => {
    // useScopedI18n is the client's; server components call getScopedI18n.
    const reads = new RegExp(
      `useScopedI18n\\(\\s*"(${serverOnlyScopes.join("|")})[".]`,
    );
    const src = join(import.meta.dir, "..");
    const readers = readdirSync(src, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) => reads.test(readFileSync(join(src, file), "utf8")));
    expect(readers).toEqual([]);
  });
});
