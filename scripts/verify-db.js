const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "notaria.db");
const ETUDE = "11111111-1111-1111-1111-111111111111";

const db = new DatabaseSync(DB_PATH);
const etude = db.prepare("SELECT nom FROM etudes WHERE id = ?").get(ETUDE);
const users = db.prepare(
  "SELECT identifiant, role FROM utilisateurs WHERE etude_id = ? ORDER BY identifiant"
).all(ETUDE);
const refs = db.prepare("SELECT count(*) AS n FROM referentiels WHERE etude_id = ?").get(ETUDE);
console.log({ etude, users, referentiels: refs.n });
