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
  if (/render\.com|sslmode=require|ssl=true/i.test(url)) {
    return { rejectUnauthorized: false };
  }
  return undefined;
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

function bindParams(params) {
  return params.map((p) => (p === undefined ? null : p));
}

function sqliteQuery(sql, params = []) {
  const bound = bindParams(params);
  const expanded = [];
  const s = sql.replace(/\$(\d+)/g, (_, n) => {
    expanded.push(bound[parseInt(n, 10) - 1]);
    return "?";
  });
  const head = sql.trim().split(/\s+/)[0].toUpperCase();
  if (head === "SELECT" || head === "WITH" || /RETURNING/i.test(sql)) {
    const rows = getSqlite().prepare(s).all(...expanded);
    return { rows, rowCount: rows.length };
  }
  const info = getSqlite().prepare(s).run(...expanded);
  return { rows: [], rowCount: info.changes };
}

async function pgQuery(sql, params = []) {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: pgSsl() });
  return pool.query(sql, params);
}

export function newId() {
  return randomUUID();
}

export async function query(sql, params = []) {
  return isPg ? pgQuery(sql, params) : sqliteQuery(sql, params);
}

/** Exécute `fn(client)` dans une transaction (isolation par etude_id dans les requêtes). */
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
