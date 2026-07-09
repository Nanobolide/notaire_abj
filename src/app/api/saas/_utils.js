import { isPg } from "@/lib/dialect";

export function asJson(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export function nowSql() {
  return isPg() ? "now()" : "datetime('now')";
}
