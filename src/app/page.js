import { redirect } from "next/navigation";
import { session } from "@/lib/auth";

export default function Accueil() {
  const s = session();
  if (!s) redirect("/connexion");
  redirect(s.role === "super_admin" ? "/admin" : "/tableau-de-bord");
}
