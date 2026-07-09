/**
 * Security baseline smoke checks.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const checks = [
  {
    label: "secure cookie in production",
    file: "src/lib/auth.js",
    test: (c) => c.includes("process.env.NODE_ENV === \"production\"") && c.includes("secure"),
  },
  {
    label: "unified api guard exists",
    file: "src/lib/api-guard.js",
    test: (c) => c.includes("withApiGuard"),
  },
  {
    label: "dashboard uses api guard",
    file: "src/app/api/dashboard/route.js",
    test: (c) => c.includes("withApiGuard"),
  },
  {
    label: "mfa verify-login route exists",
    file: "src/app/api/auth/mfa/verify-login/route.js",
    test: (c) => c.includes("verifierMfaChallenge"),
  },
];

let failed = 0;
for (const check of checks) {
  const target = path.join(ROOT, check.file);
  if (!fs.existsSync(target)) {
    console.error(`Missing file for check: ${check.file}`);
    failed++;
    continue;
  }
  const content = read(check.file);
  if (!check.test(content)) {
    console.error(`Security check failed: ${check.label}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`Security smoke failed (${failed} issue(s)).`);
  process.exit(1);
}

console.log("Security smoke checks passed.");
