import { describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { setup, signIn } from "../test.helper";
import { insertManufacturer, insertNormImport } from "./test.helper";

describe("recordConsent", () => {
  test("records how the manufacturer agreed, for super admins only", async () => {
    const t = setup();
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const contractor = await signIn(t, { name: "Ana" });
    const manufacturerId = await insertManufacturer(t, admin.userId);
    const normImportId = await insertNormImport(
      t,
      admin.userId,
      manufacturerId,
    );
    const record = api.manufacturers.normImports.recordConsent;

    await expect(
      contractor.as.mutation(record, { normImportId, note: "Email" }),
    ).rejects.toThrow(/forbidden/);
    await expect(
      admin.as.mutation(record, { normImportId, note: "   " }),
    ).rejects.toThrow(/invalid/);
    await expect(
      admin.as.mutation(record, { normImportId, note: "x".repeat(501) }),
    ).rejects.toThrow(/invalid/);

    await admin.as.mutation(record, {
      normImportId,
      note: "  Emailul biroului tehnic din 21.10.2026 ",
    });
    const data = await admin.as.query(api.manufacturers.normImports.get, {
      normImportId,
    });
    expect(data?.normImport.consent).toMatchObject({
      note: "Emailul biroului tehnic din 21.10.2026",
      recordedBy: admin.userId,
    });
    expect(data?.consentBy).toBe("Admin");
  });
});
