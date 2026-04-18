// Lightweight XLSX export utilities (loaded on demand to keep bundle small).
import type { DbMember, DbContribution, DbDeath } from "@/db/database";

async function getXLSX() {
  const mod = await import("xlsx");
  return (mod as any).default || mod;
}

export async function exportMembersXLSX(members: DbMember[]) {
  const XLSX = await getXLSX();
  const rows = members.map((m) => ({
    "ID Membre": m.member_id,
    "Nom": m.last_name,
    "Prénom(s)": m.first_name,
    "Téléphone": m.phone,
    "WhatsApp": m.whatsapp || "",
    "Campement": m.campement,
    "Sous-préfecture": m.sous_prefecture,
    "Type pièce": m.id_type,
    "N° pièce": m.id_number || "",
    "Statut": m.status,
    "Adhésion payée": m.adhesion_paid ? "Oui" : "Non",
    "Personnes couvertes": m.total_covered_persons,
    "Cotisations": m.contribution_status,
    "Inscrit le": m.registration_date,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Membres");
  XLSX.writeFile(wb, `Membres_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportContributionsXLSX(
  contributions: DbContribution[],
  deaths: DbDeath[]
) {
  const XLSX = await getXLSX();
  const rows = contributions.map((c) => {
    const d = deaths.find((x) => x.id === c.death_id);
    return {
      "Décès": d?.deceased_name || "",
      "Date décès": d?.date_of_death || "",
      "ID Membre": c.member_id,
      "Membre": c.member_name,
      "Attendu (FCFA)": c.expected_amount,
      "Payé (FCFA)": c.amount,
      "Restant (FCFA)": Math.max(0, c.expected_amount - c.amount),
      "Méthode": c.payment_method,
      "Statut": c.status,
      "Date paiement": c.date || "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cotisations");
  XLSX.writeFile(wb, `Cotisations_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
