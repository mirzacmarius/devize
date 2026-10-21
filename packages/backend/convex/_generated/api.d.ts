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
import type * as ai_claude from "../ai/claude.js";
import type * as ai_jobs from "../ai/jobs.js";
import type * as ai_messages from "../ai/messages.js";
import type * as ai_models from "../ai/models.js";
import type * as ai_pricing from "../ai/pricing.js";
import type * as ai_tables from "../ai/tables.js";
import type * as ai_validators from "../ai/validators.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_roles from "../lib/roles.js";
import type * as manufacturers_admin from "../manufacturers/admin.js";
import type * as manufacturers_ai from "../manufacturers/ai.js";
import type * as manufacturers_drafts from "../manufacturers/drafts.js";
import type * as manufacturers_lib_emailTemplate from "../manufacturers/lib/emailTemplate.js";
import type * as manufacturers_lib_findings from "../manufacturers/lib/findings.js";
import type * as manufacturers_lib_norms from "../manufacturers/lib/norms.js";
import type * as manufacturers_lib_prompts from "../manufacturers/lib/prompts.js";
import type * as manufacturers_lib_schemas from "../manufacturers/lib/schemas.js";
import type * as manufacturers_lib_text from "../manufacturers/lib/text.js";
import type * as manufacturers_normImports from "../manufacturers/normImports.js";
import type * as manufacturers_outreach from "../manufacturers/outreach.js";
import type * as manufacturers_research from "../manufacturers/research.js";
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
  "ai/claude": typeof ai_claude;
  "ai/jobs": typeof ai_jobs;
  "ai/messages": typeof ai_messages;
  "ai/models": typeof ai_models;
  "ai/pricing": typeof ai_pricing;
  "ai/tables": typeof ai_tables;
  "ai/validators": typeof ai_validators;
  auth: typeof auth;
  http: typeof http;
  "lib/roles": typeof lib_roles;
  "manufacturers/admin": typeof manufacturers_admin;
  "manufacturers/ai": typeof manufacturers_ai;
  "manufacturers/drafts": typeof manufacturers_drafts;
  "manufacturers/lib/emailTemplate": typeof manufacturers_lib_emailTemplate;
  "manufacturers/lib/findings": typeof manufacturers_lib_findings;
  "manufacturers/lib/norms": typeof manufacturers_lib_norms;
  "manufacturers/lib/prompts": typeof manufacturers_lib_prompts;
  "manufacturers/lib/schemas": typeof manufacturers_lib_schemas;
  "manufacturers/lib/text": typeof manufacturers_lib_text;
  "manufacturers/normImports": typeof manufacturers_normImports;
  "manufacturers/outreach": typeof manufacturers_outreach;
  "manufacturers/research": typeof manufacturers_research;
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
