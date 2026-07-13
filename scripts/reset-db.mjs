import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "data", "pglite");
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("✅ Base PGlite supprimée :", dir);
  console.log("   Relancez npm run dev — schéma, comptes et démo seront recréés.");
} else {
  console.log("Aucune base PGlite à supprimer.");
}
