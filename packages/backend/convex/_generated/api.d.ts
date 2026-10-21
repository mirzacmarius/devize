/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as ai_jobs from "../ai/jobs.js";
import type * as ai_pricing from "../ai/pricing.js";
import type * as ai_tables from "../ai/tables.js";
import type * as ai_validators from "../ai/validators.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_roles from "../lib/roles.js";
import type * as manufacturers_tables from "../manufacturers/tables.js";
import type * as manufacturers_validators from "../manufacturers/validators.js";
import type * as users from "../users.js";
import type * as utils_validators from "../utils/validators.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "ai/jobs": typeof ai_jobs;
  "ai/pricing": typeof ai_pricing;
  "ai/tables": typeof ai_tables;
  "ai/validators": typeof ai_validators;
  auth: typeof auth;
  http: typeof http;
  "lib/roles": typeof lib_roles;
  "manufacturers/tables": typeof manufacturers_tables;
  "manufacturers/validators": typeof manufacturers_validators;
  users: typeof users;
  "utils/validators": typeof utils_validators;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
