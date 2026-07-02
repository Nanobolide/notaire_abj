import { Pool } from "pg";
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const isPg = !!process.env.DATABASE_URL;
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "notaria.db");

let pool;
let sqlite;

function pgSsl() {
  const url = process.env.DATABASE_URL || "";
  return url.includes("render.com") ? { rejectUnauthorized: false } : undefined;
}

function getSqlite() {
  if (!sqlite) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    sqlite = new DatabaseSync(DB_PATH);
    sqlite.exec("PRAGMA journal_mode = WAL");
    sqlite.exec("PRAGMA foreign_keys = ON");
  }
  return sqlite;
}

function sqliteQuery(sql, params = []) {
  const s = sql.replace(/\$(\d+)/g, "?");
  const head = sql.trim().split(/\s+/)[0].toUpperCase();
  if (head === "SELECT" || head === "WITH" || /RETURNING/i.test(sql)) {
    const rows = getSqlite().prepare(s).all(...params);
    return { rows, rowCount: rows.length };
  }
  const info = getSqlite().prepare(s).run(...params);
  return { rows: [], rowCount: info.changes };
}

async function pgQuery(sql, params = []) {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: pgSsl() });
  }
  return pool.query(sql, params);
}

export function newId() {
  return randomUUID();
}

export async function query(sql, params = []) {
  return isPg ? pgQuery(sql, params) : sqliteQuery(sql, params);
}

export async function withTenant(etudeId, fn) {
  const client = { etudeId, query };
  if (isPg) {
    if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: pgSsl() });
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const wrapped = { etudeId, query: (sql, params) => c.query(sql, params) };
      const result = await fn(wrapped);
      await c.query("COMMIT");
      return result;
    } catch (err) {
      await c.query("ROLLBACK");
      throw err;
    } finally {
      c.release();
    }
  }
  getSqlite().exec("BEGIN");
  try {
    const result = await fn(client);
    getSqlite().exec("COMMIT");
    return result;
  } catch (err) {
    getSqlite().exec("ROLLBACK");
    throw err;
  }
}

export async function audit(client, { etudeId, table, ligneId, action, avant, apres, utilisateur }) {
  await client.query(
    `INSERT INTO audit_log (etude_id, table_cible, ligne_id, action, ancienne_valeur, nouvelle_valeur, utilisateur)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [etudeId, table, ligneId || null, action, avant ? JSON.stringify(avant) : null,
      apres ? JSON.stringify(apres) : null, utilisateur || null]
  );
}

export default { query, withTenant, newId, audit };
