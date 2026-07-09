/**
 * Basic authorization matrix smoke for local API routes.
 * This test is lightweight and validates that policy helpers exist.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const accesPath = path.join(ROOT, "src", "lib", "acces.js");

if (!fs.existsSync(accesPath)) {
  console.error("Missing access matrix module: src/lib/acces.js");
  process.exit(1);
}

const routeChecks = [
  "src/app/api/actes/route.js",
  "src/app/api/appels/route.js",
  "src/app/api/dashboard/route.js",
  "src/app/api/comptes/route.js",
  "src/app/api/exports/[registre]/route.js",
];

let failures = 0;
for (const rel of routeChecks) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.error(`Missing route file: ${rel}`);
    failures++;
    continue;
  }
  const content = fs.readFileSync(full, "utf8");
  if (!content.includes("@/lib/acces")) {
    console.error(`No access-matrix import in ${rel}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`Authorization matrix check failed (${failures} issue(s)).`);
  process.exit(1);
}

console.log("Authorization matrix smoke check passed.");
