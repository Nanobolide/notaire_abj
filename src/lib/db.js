import { Pool } from "pg";
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const isPg = !!process.env.DATABASE_URL;
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "notaria.db");

let pgPool;
const tenantPools = new Map();
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
  if (!pgPool) pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: pgSsl() });
  return pgPool.query(sql, params);
}

function tenantDatabaseMap() {
  const raw = process.env.TENANT_DATABASE_URLS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function resolveTenantConnectionString(etudeId) {
  const map = tenantDatabaseMap();
  return map[etudeId] || process.env.DATABASE_URL;
}

function poolForTenant(etudeId) {
  const connectionString = resolveTenantConnectionString(etudeId);
  if (!connectionString) throw new Error("DATABASE_URL manquant.");
  if (connectionString === process.env.DATABASE_URL) {
    if (!pgPool) pgPool = new Pool({ connectionString, ssl: pgSsl() });
    return pgPool;
  }
  if (!tenantPools.has(connectionString)) {
    tenantPools.set(connectionString, new Pool({ connectionString, ssl: pgSsl() }));
  }
  return tenantPools.get(connectionString);
}

export function newId() {
  return randomUUID();
}

export async function query(sql, params = []) {
  return isPg ? pgQuery(sql, params) : sqliteQuery(sql, params);
}

/** Exécute `fn(client)` dans une transaction (RLS armée sur PostgreSQL). */
export async function withTenant(etudeId, fn) {
  const client = { etudeId, query };
  if (isPg) {
    const tenantPool = poolForTenant(etudeId);
    const c = await tenantPool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.current_etude_id', $1, true)", [etudeId]);
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

export async function securityEvent(clientOrDb, {
  etudeId = null, utilisateur = null, typeEvenement, severite = "info", details = null,
}) {
  const runner = clientOrDb?.query ? clientOrDb : { query };
  const payload = details ? JSON.stringify(details) : null;
  if (isPg) {
    await runner.query(
      `INSERT INTO security_events (etude_id, utilisateur, type_evenement, severite, details)
       VALUES ($1,$2,$3,$4,$5)`,
      [etudeId, utilisateur, typeEvenement, severite, payload ? JSON.parse(payload) : null]
    );
    return;
  }
  await runner.query(
    `INSERT INTO security_events (id, etude_id, utilisateur, type_evenement, severite, details)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [newId(), etudeId, utilisateur, typeEvenement, severite, payload]
  );
}

/** C7 — compte actif et non verrouillé (révocation immédiate). */
export async function verifierCompteActif(uid) {
  if (isPg) {
    try {
      const { rows } = await query(`SELECT compte_est_actif($1) AS ok`, [uid]);
      const ok = rows[0]?.ok === true;
      if (ok) { try { await query(`SELECT marquer_activite($1)`, [uid]); } catch {} }
      return ok;
    } catch {
      // Schéma sans fonctions RLS : repli requête directe
    }
  }
  const nowSql = isPg ? "now()" : "datetime('now')";
  const actifSql = isPg ? "u.actif = true" : "u.actif = 1";
  const { rows } = await query(
    `SELECT 1 FROM utilisateurs u JOIN etudes e ON e.id = u.etude_id
     WHERE u.id = $1 AND ${actifSql} AND (u.role = 'super_admin' OR e.statut = 'active')
       AND (u.verrouille_jusqua IS NULL OR u.verrouille_jusqua <= ${nowSql})`,
    [uid]
  );
  const ok = rows.length > 0;
  if (ok) {
    const maj = isPg ? "now()" : "datetime('now')";
    try { await query(`UPDATE utilisateurs SET derniere_activite = ${maj} WHERE id = $1`, [uid]); } catch {}
  }
  return ok;
}

export async function deconnecterPresence(uid) {
  if (isPg) {
    try { await query(`SELECT deconnecter_presence($1)`, [uid]); return; } catch {}
  }
  await query(`UPDATE utilisateurs SET derniere_activite = NULL WHERE id = $1`, [uid]);
}

export async function purgerCorbeilleExpiree(etudeId) {
  if (isPg) {
    try { await query(`SELECT purger_corbeille_expiree($1)`, [etudeId]); return; } catch {}
    await query(
      `DELETE FROM actes WHERE etude_id = $1 AND supprime_le < now() - interval '30 days'`, [etudeId]);
    await query(
      `DELETE FROM appels_courriers WHERE etude_id = $1 AND supprime_le < now() - interval '30 days'`, [etudeId]);
    return;
  }
  await query(
    `DELETE FROM actes WHERE etude_id = $1 AND supprime_le < datetime('now', '-30 days')`, [etudeId]);
  await query(
    `DELETE FROM appels_courriers WHERE etude_id = $1 AND supprime_le < datetime('now', '-30 days')`, [etudeId]);
}

const db = { query, withTenant, newId, audit, securityEvent, verifierCompteActif, deconnecterPresence, purgerCorbeilleExpiree };
export const TenantResolver = { resolveTenantConnectionString };
export const ConnectionManager = { poolForTenant };
export const pool = db;
export default db;
