// Prints a new key pair for Convex Auth's session tokens, as the
// JWT_PRIVATE_KEY and JWKS environment variables, for pasting into the Convex
// dashboard, such as the default variables of preview deployments.
// `bunx @convex-dev/auth` makes the same pair and sets it on a deployment you
// reach from the CLI.
import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const jwk = publicKey.export({ format: "jwk" });

// The key's line breaks become spaces, so it fits on one line, like the ones
// Convex Auth's CLI sets.
console.info(`JWT_PRIVATE_KEY=${pem.trimEnd().replace(/\n/g, " ")}`);
console.info(`JWKS=${JSON.stringify({ keys: [{ use: "sig", ...jwk }] })}`);
