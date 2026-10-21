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
import type * as accounts_cleanup from "../accounts/cleanup.js";
import type * as accounts_clients from "../accounts/clients.js";
import type * as accounts_files from "../accounts/files.js";
import type * as accounts_identifiers from "../accounts/identifiers.js";
import type * as accounts_organizations from "../accounts/organizations.js";
import type * as accounts_rates from "../accounts/rates.js";
import type * as accounts_tables from "../accounts/tables.js";
import type * as accounts_validators from "../accounts/validators.js";
import type * as admin from "../admin.js";
import type * as ai_jobs from "../ai/jobs.js";
import type * as ai_pricing from "../ai/pricing.js";
import type * as ai_tables from "../ai/tables.js";
import type * as ai_validators from "../ai/validators.js";
import type * as auth from "../auth.js";
import type * as catalog_access from "../catalog/access.js";
import type * as catalog_norms from "../catalog/norms.js";
import type * as catalog_products from "../catalog/products.js";
import type * as catalog_publishing from "../catalog/publishing.js";
import type * as catalog_resourceRows from "../catalog/resourceRows.js";
import type * as catalog_resources from "../catalog/resources.js";
import type * as catalog_tables from "../catalog/tables.js";
import type * as catalog_validators from "../catalog/validators.js";
import type * as estimates_estimates from "../estimates/estimates.js";
import type * as estimates_helpers from "../estimates/helpers.js";
import type * as estimates_lineItems from "../estimates/lineItems.js";
import type * as estimates_recap from "../estimates/recap.js";
import type * as estimates_sections from "../estimates/sections.js";
import type * as estimates_tables from "../estimates/tables.js";
import type * as estimates_validators from "../estimates/validators.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_roles from "../lib/roles.js";
import type * as lib_text from "../lib/text.js";
import type * as manufacturers_tables from "../manufacturers/tables.js";
import type * as manufacturers_validators from "../manufacturers/validators.js";
import type * as prices_listings from "../prices/listings.js";
import type * as prices_resolve from "../prices/resolve.js";
import type * as prices_tables from "../prices/tables.js";
import type * as prices_validators from "../prices/validators.js";
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
  "accounts/cleanup": typeof accounts_cleanup;
  "accounts/clients": typeof accounts_clients;
  "accounts/files": typeof accounts_files;
  "accounts/identifiers": typeof accounts_identifiers;
  "accounts/organizations": typeof accounts_organizations;
  "accounts/rates": typeof accounts_rates;
  "accounts/tables": typeof accounts_tables;
  "accounts/validators": typeof accounts_validators;
  admin: typeof admin;
  "ai/jobs": typeof ai_jobs;
  "ai/pricing": typeof ai_pricing;
  "ai/tables": typeof ai_tables;
  "ai/validators": typeof ai_validators;
  auth: typeof auth;
  "catalog/access": typeof catalog_access;
  "catalog/norms": typeof catalog_norms;
  "catalog/products": typeof catalog_products;
  "catalog/publishing": typeof catalog_publishing;
  "catalog/resourceRows": typeof catalog_resourceRows;
  "catalog/resources": typeof catalog_resources;
  "catalog/tables": typeof catalog_tables;
  "catalog/validators": typeof catalog_validators;
  "estimates/estimates": typeof estimates_estimates;
  "estimates/helpers": typeof estimates_helpers;
  "estimates/lineItems": typeof estimates_lineItems;
  "estimates/recap": typeof estimates_recap;
  "estimates/sections": typeof estimates_sections;
  "estimates/tables": typeof estimates_tables;
  "estimates/validators": typeof estimates_validators;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/dates": typeof lib_dates;
  "lib/errors": typeof lib_errors;
  "lib/roles": typeof lib_roles;
  "lib/text": typeof lib_text;
  "manufacturers/tables": typeof manufacturers_tables;
  "manufacturers/validators": typeof manufacturers_validators;
  "prices/listings": typeof prices_listings;
  "prices/resolve": typeof prices_resolve;
  "prices/tables": typeof prices_tables;
  "prices/validators": typeof prices_validators;
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
