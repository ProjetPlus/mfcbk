import { BarChart3, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembers, useDeaths, useAllContributions, useTreasury } from "@/db/useDb";
import jsPDF from "jspdf";
import { toast } from "sonner";

const Reports = () => {
  const { members } = useMembers();
  const { deaths } = useDeaths();
  const contributions = useAllContributions();
  const treasury = useTreasury();

  const formatCFA = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  const exportMembersPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Liste complète des membres", 14, 20);
    doc.setFontSize(8);
    let y = 30;
    members.forEach((m, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}. ${m.member_id} — ${m.last_name} ${m.first_name} — ${m.status} — ${m.sous_prefecture}`, 14, y);
      y += 6;
    });
    doc.save("membres.pdf");
    toast.success("PDF généré");
  };

  const exportContributionsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Rapport de cotisations par décès", 14, 20);
    doc.setFontSize(8);
    let y = 30;
    deaths.forEach(d => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`${d.deceased_name} — ${new Date(d.date_of_death).toLocaleDateString("fr-FR")}`, 14, y);
      y += 6;
      doc.setFontSize(8);
      const deathContribs = contributions.filter(c => c.death_id === d.id);
      deathContribs.forEach(c => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`  ${c.member_name}: ${c.amount.toLocaleString("fr-FR")} / ${c.expected_amount.toLocaleString("fr-FR")} FCFA — ${c.status}`, 14, y);
        y += 5;
      });
      y += 4;
    });
    doc.save("cotisations.pdf");
    toast.success("PDF généré");
  };

  const exportFinancePDF = () => {
    if (!treasury) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Rapport financier — Caisse", 14, 20);
    doc.setFontSize(10);
    doc.text(`Solde total : ${formatCFA(treasury.total_balance)}`, 14, 35);
    doc.text(`Total collecté : ${formatCFA(treasury.total_contributions_collected)}`, 14, 45);
    doc.text(`Versements effectués : ${formatCFA(treasury.total_payouts)}`, 14, 55);
    doc.text(`Réserves retenues : ${formatCFA(treasury.retained_reserves)}`, 14, 65);
    doc.text(`Cotisations en attente : ${formatCFA(treasury.pending_contributions)}`, 14, 75);
    doc.save("rapport_financier.pdf");
    toast.success("PDF généré");
  };

  const exportLatePDF = () => {
    const late = contributions.filter(c => c.status === "non_payé" || c.status === "partiel");
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Membres en retard de cotisation", 14, 20);
    doc.setFontSize(8);
    let y = 30;
    late.forEach((c, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const rest = c.expected_amount - c.amount;
      doc.text(`${i + 1}. ${c.member_name} (${c.member_id}) — Reste : ${rest.toLocaleString("fr-FR")} FCFA`, 14, y);
      y += 6;
    });
    doc.save("retards_cotisation.pdf");
    toast.success("PDF généré");
  };

  const reports = [
    { title: "Liste complète des membres", desc: "Tous les membres avec statuts", action: exportMembersPDF },
    { title: "Rapport de cotisations par décès", desc: "Détail par décès avec statuts de paiement", action: exportContributionsPDF },
    { title: "Rapport financier — Caisse", desc: "Entrées, sorties et solde", action: exportFinancePDF },
    { title: "Membres en retard de cotisation", desc: "Liste des membres avec cotisations impayées", action: exportLatePDF },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Rapports & Exports</h1>
        <p className="text-sm text-muted-foreground mt-1">Génération de rapports PDF</p>
      </div>
      {reports.map((r, i) => (
        <Card key={i} className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" /> {r.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{r.desc}</p>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={r.action}>
              <FileDown className="h-3 w-3 mr-1" /> PDF
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Reports;
