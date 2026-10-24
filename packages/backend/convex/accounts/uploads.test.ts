import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import type { GenericValidator } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  insertManufacturer,
  insertNormImport,
} from "../manufacturers/test.helper";
import schema from "../schema";
import { firmOwner, setup, signIn, type TestConvex } from "../test.helper";
import { STORAGE_FIELDS } from "./uploads";

const MINUTE = 60 * 1000;
const START = new Date("2026-10-24T08:00:00Z").getTime();

afterEach(() => {
  setSystemTime();
});

function upload(t: TestConvex, type = "application/pdf") {
  return t.run(
    async (ctx): Promise<Id<"_storage">> =>
      await ctx.storage.store(new Blob(["x"], { type })),
  );
}

/** Which of `storageIds` are still stored. */
function stillStored(t: TestConvex, storageIds: Id<"_storage">[]) {
  return t.run(async (ctx) => {
    const left: Id<"_storage">[] = [];
    for (const storageId of storageIds) {
      if (await ctx.db.system.get("_storage", storageId)) {
        left.push(storageId);
      }
    }
    return left;
  });
}

async function sweep(t: TestConvex) {
  await t.mutation(internal.accounts.uploads.sweep, {});
  await t.finishAllScheduledFunctions(() => {});
}

/** The fields of the schema that keep a stored file, as table.field paths. */
function storageFields(validator: GenericValidator, path: string): string[] {
  switch (validator.kind) {
    case "id":
      return validator.tableName === "_storage" ? [path] : [];
    case "object":
      return Object.entries(validator.fields).flatMap(([name, field]) =>
        storageFields(field, `${path}.${name}`),
      );
    case "array":
      return storageFields(validator.element, path);
    case "record":
      return storageFields(validator.value, path);
    case "union":
      return validator.members.flatMap((member) => storageFields(member, path));
    default:
      return [];
  }
}

describe("uploads nobody claimed", () => {
  test("go an hour after their upload, while claimed ones stay", async () => {
    const t = setup();
    setSystemTime(START - 4 * 60 * MINUTE);
    // Uploaded before the cleanup looks, and never claimed.
    const forgotten = await upload(t);
    setSystemTime(START);
    const ana = await firmOwner(t, "Ana");
    const admin = await signIn(t, { name: "Admin", superadmin: true });
    const document = await upload(t);
    await ana.as.mutation(api.accounts.files.register, {
      organizationId: ana.organizationId,
      storageId: document,
      name: "caiet de sarcini.pdf",
      purpose: "tender",
    });
    const logo = await upload(t, "image/png");
    await ana.as.mutation(api.accounts.organizations.setLogo, {
      organizationId: ana.organizationId,
      storageId: logo,
    });
    const photo = await upload(t, "image/png");
    await ana.as.mutation(api.users.updateUserImage, { imageId: photo });
    const manufacturerId = await insertManufacturer(t, admin.userId);
    const normImportId = await insertNormImport(
      t,
      admin.userId,
      manufacturerId,
    );
    const norms = await t.run(async (ctx) => {
      const normImport = await ctx.db.get("normImports", normImportId);
      if (!normImport) {
        throw new Error("The norms import wasn't stored");
      }
      return normImport.fileId;
    });
    const abandoned = await upload(t);
    const all = [forgotten, document, logo, photo, norms, abandoned];

    // It could still be claimed for a few minutes; the cleanup waits an hour.
    setSystemTime(START + 30 * MINUTE);
    await sweep(t);
    expect(await stillStored(t, all)).toEqual(all);

    setSystemTime(START + 61 * MINUTE);
    await sweep(t);
    expect(await stillStored(t, all)).toEqual(
      all.filter((storageId) => storageId !== abandoned),
    );
  });

  test("are told from every field that keeps a stored file", () => {
    const fields = Object.entries(schema.tables).flatMap(
      ([table, definition]) => storageFields(definition.validator, table),
    );
    // A new field needs a check in accounts/uploads.ts, or its fresh files
    // are deleted within hours.
    expect(fields.sort()).toEqual(Object.keys(STORAGE_FIELDS).sort());
  });

  test("are told from every place that makes or claims a file", () => {
    const makers = [
      "storage.generateUploadUrl(",
      "storage.store(",
      "unclaimedUpload(",
    ];
    const found: Record<string, string[]> = {};
    const root = join(import.meta.dir, "..");
    for (const file of new Glob("**/*.ts").scanSync(root)) {
      const name = file.split("/").at(-1) ?? file;
      if (file.startsWith("_generated/") || name.split(".").length > 2) {
        continue;
      }
      const source = readFileSync(join(root, file), "utf8");
      const used = makers.filter((maker) => source.includes(maker));
      if (used.length > 0) {
        found[file] = used;
      }
    }
    // A new one makes files the cleanup in accounts/uploads.ts must keep:
    // give it a check there before adding it here.
    expect(found).toEqual({
      "accounts/files.ts": ["storage.generateUploadUrl(", "unclaimedUpload("],
      "accounts/organizations.ts": ["unclaimedUpload("],
      "manufacturers/normImports.ts": ["storage.generateUploadUrl("],
      "users.ts": ["storage.generateUploadUrl(", "unclaimedUpload("],
    });
  });
});
