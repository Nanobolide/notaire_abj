/**
 * Réinitialise le mot de passe des comptes de démonstration à « ChangezMoi2026! ».
 * Utile en local si un ancien hash traîne (comptes *.notaire, superadmin, etc.).
 *   node scripts/reset-demo-passwords.js
 */
const path = require("path");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "notaria.db");
const MOT_DE_PASSE = "ChangezMoi2026!";

const db = new DatabaseSync(DB_PATH);
const hash = bcrypt.hashSync(MOT_DE_PASSE, 10);
const info = db.prepare(
  `UPDATE utilisateurs
     SET hash_mot_de_passe = ?, echecs_connexion = 0, verrouille_jusqua = NULL
   WHERE role = 'super_admin'
      OR identifiant IN ('notaire','secretariat','clerc1','accueil')
      OR identifiant LIKE '%.notaire'
      OR identifiant LIKE '%.secretariat'
      OR identifiant LIKE '%.clerc1'
      OR identifiant LIKE '%.comptable'`
).run(hash);
console.log(`✅ ${info.changes} compte(s) réinitialisé(s) au mot de passe « ${MOT_DE_PASSE} ».`);
