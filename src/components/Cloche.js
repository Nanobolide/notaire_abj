"use client";
import { useEffect, useState, useRef } from "react";

/** P10 — Cloche d'annonces côté étude : montre les annonces non lues, permet de les marquer lues. */
export default function Cloche({ actif }) {
  const [annonces, setAnnonces] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  const charger = () => fetch("/api/annonces").then((r) => r.json())
    .then((d) => Array.isArray(d) && setAnnonces(d)).catch(() => {});
  useEffect(() => { if (actif) charger(); }, [actif]);
  useEffect(() => {
    const clic = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false); };
    document.addEventListener("mousedown", clic);
    return () => document.removeEventListener("mousedown", clic);
  }, []);

  if (!actif) return null;
  const nonLues = annonces.filter((a) => !a.lu).length;

  const marquerLu = async (id) => {
    await fetch("/api/annonces", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annonceId: id }) });
    charger();
  };
  const typeLibelle = { information: "Information", mise_a_jour: "Mise à jour", maintenance: "Maintenance" };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOuvert(!ouvert)} title="Annonces"
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, position: "relative", padding: "4px 6px" }}>
        🔔
        {nonLues > 0 && (
          <span style={{ position: "absolute", top: 0, right: 0, background: "#B03030", color: "#fff",
            fontSize: 10, fontWeight: 700, borderRadius: 9, minWidth: 16, height: 16, lineHeight: "16px",
            textAlign: "center", padding: "0 3px" }}>{nonLues}</span>
        )}
      </button>
      {ouvert && (
        <div style={{ position: "absolute", right: 0, top: "115%", width: 320, maxHeight: 400, overflowY: "auto",
          background: "#fff", border: "1px solid #D9DEE8", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          zIndex: 50, padding: 8 }}>
          {annonces.length === 0 && <p style={{ fontSize: 12.5, color: "#7A8396", padding: 10, margin: 0 }}>Aucune annonce.</p>}
          {annonces.map((a) => (
            <div key={a.id} style={{ padding: "9px 10px", borderRadius: 7, marginBottom: 4,
              background: a.lu ? "transparent" : "#F5F8FC", borderLeft: a.lu ? "none" : "3px solid #1F3864" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <strong style={{ fontSize: 13, color: "#1F3864" }}>{a.titre}</strong>
                <span style={{ fontSize: 10, color: "#8A94A8", whiteSpace: "nowrap" }}>{typeLibelle[a.type]}</span>
              </div>
              <p style={{ fontSize: 12, color: "#3A4255", margin: "4px 0 6px", lineHeight: 1.4 }}>{a.message}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10.5, color: "#8A94A8" }}>{new Date(a.cree_le).toLocaleDateString("fr-FR")}</span>
                {!a.lu && <button onClick={() => marquerLu(a.id)} style={{ fontSize: 11, background: "none",
                  border: "none", color: "#1F3864", cursor: "pointer", textDecoration: "underline" }}>Marquer comme lu</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
