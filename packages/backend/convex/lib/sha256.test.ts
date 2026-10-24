import { describe, expect, test } from "bun:test";
import { sha256Hex } from "./sha256";

describe("sha256Hex", () => {
  test("matches the published test vectors", async () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    // Two blocks, with the length straddling the padding.
    const long = "a".repeat(119);
    const expected = Buffer.from(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(long)),
    ).toString("hex");
    expect(sha256Hex(long)).toBe(expected);
    // Multi-byte characters hash as their UTF-8 bytes.
    expect(sha256Hex("Ofertă semnată")).toBe(
      Buffer.from(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode("Ofertă semnată"),
        ),
      ).toString("hex"),
    );
  });
});
