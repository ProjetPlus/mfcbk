import { BarChart3, FileDown, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembers, useDeaths, useAllContributions, useTreasury, useSettings } from "@/db/useDb";
import jsPDF from "jspdf";
import { toast } from "sonner";

const Reports = () => {
  const { members } = useMembers();
  const { deaths } = useDeaths();
  const contributions = useAllContributions();
  const treasury = useTreasury();
  const { settings } = useSettings();

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

  // ---------- Carnet de cotisations A5 (1 page par membre) ----------
  const exportContributionBookletsPDF = () => {
    const assocName = (settings?.association_name || "Association des Chrétiens de Kouassikankro").toUpperCase();
    const assocShort = settings?.initials ? `AS.${settings.initials}.K` : "AS.CHRIS.K";
    const activeMembers = members.filter(m => m.status === "actif");
    if (activeMembers.length === 0) { toast.error("Aucun membre actif"); return; }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
    const W = 148, H = 210;
    const ROWS = 18;
    const margin = 8;

    activeMembers.forEach((m, idx) => {
      if (idx > 0) doc.addPage("a5", "portrait");

      doc.setDrawColor(46, 125, 50);
      doc.setLineWidth(0.6);
      doc.roundedRect(margin / 2 + 2, margin / 2 + 2, W - margin - 4, H - margin - 4, 4, 4);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin / 2 + 3, margin / 2 + 3, W - margin - 6, H - margin - 6, 3.5, 3.5);

      doc.setTextColor(46, 125, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(assocShort, W / 2, 16, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(assocName.slice(0, 70), W / 2, 21, { align: "center" });
      doc.text("République de Côte d'Ivoire — Union, Discipline, Travail", W / 2, 25, { align: "center" });

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, 29, W - margin, 29);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`${m.last_name} ${m.first_name}`, margin, 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(46, 125, 50);
      doc.text(`N° ${m.member_id}`, W - margin, 34, { align: "right" });
      doc.setTextColor(80, 80, 80);
      doc.text(`Campement : ${m.campement || "—"}   |   S/P : ${m.sous_prefecture || "—"}`, margin, 39);
      doc.text(`Tél : ${m.phone}   |   Couvert(s) : ${m.total_covered_persons}`, margin, 43);

      const tableTop = 48;
      const tableLeft = margin;
      const tableRight = W - margin;
      const tableWidth = tableRight - tableLeft;
      const colDate = 22;
      const colMontant = 26;
      const colVisa = 24;
      const colDefunt = tableWidth - colDate - colMontant - colVisa;
      const rowH = (H - tableTop - margin - 8) / (ROWS + 1);

      doc.setFillColor(232, 245, 233);
      doc.rect(tableLeft, tableTop, tableWidth, rowH, "F");
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.25);
      doc.rect(tableLeft, tableTop, tableWidth, rowH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(46, 125, 50);
      const headerY = tableTop + rowH / 2 + 1.2;
      doc.text("DATE", tableLeft + colDate / 2, headerY, { align: "center" });
      doc.text("DÉFUNT(E)", tableLeft + colDate + colDefunt / 2, headerY, { align: "center" });
      doc.text("MONTANT", tableLeft + colDate + colDefunt + colMontant / 2, headerY, { align: "center" });
      doc.text("VISA", tableLeft + colDate + colDefunt + colMontant + colVisa / 2, headerY, { align: "center" });

      const memberContribs = contributions
        .filter(c => c.member_id === m.member_id && (c.status === "payé" || c.status === "partiel") && c.amount > 0)
        .map(c => {
          const death = deaths.find(d => d.id === c.death_id);
          return {
            date: c.date ? new Date(c.date).toLocaleDateString("fr-FR") : "",
            defunt: death?.deceased_name || "",
            montant: c.amount.toLocaleString("fr-FR"),
          };
        });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      for (let i = 0; i < ROWS; i++) {
        const y = tableTop + rowH * (i + 1);
        doc.rect(tableLeft, y, tableWidth, rowH);
        doc.line(tableLeft + colDate, y, tableLeft + colDate, y + rowH);
        doc.line(tableLeft + colDate + colDefunt, y, tableLeft + colDate + colDefunt, y + rowH);
        doc.line(tableLeft + colDate + colDefunt + colMontant, y, tableLeft + colDate + colDefunt + colMontant, y + rowH);

        const entry = memberContribs[i];
        if (entry) {
          const ty = y + rowH / 2 + 1.2;
          doc.text(entry.date, tableLeft + 1.5, ty);
          doc.text(entry.defunt.slice(0, 28), tableLeft + colDate + 1.5, ty);
          doc.text(entry.montant + " F", tableLeft + colDate + colDefunt + colMontant - 1.5, ty, { align: "right" });
        }
      }

      doc.setFontSize(6);
      doc.setTextColor(120, 120, 120);
      doc.text(`Carnet n° ${m.member_id}`, margin, H - 6);
      doc.text(`Page ${idx + 1} / ${activeMembers.length}`, W - margin, H - 6, { align: "right" });
    });

    doc.save(`Carnets_Cotisations_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`Carnets générés`, { description: `${activeMembers.length} membre(s)` });
  };

  const reports = [
    { title: "Carnet de cotisations (A5, 1 page/membre)", desc: "Format papier officiel — DATE / DÉFUNT(E) / MONTANT / VISA", action: exportContributionBookletsPDF, icon: BookOpen },
    { title: "Liste complète des membres", desc: "Tous les membres avec statuts", action: exportMembersPDF, icon: BarChart3 },
    { title: "Rapport de cotisations par décès", desc: "Détail par décès avec statuts de paiement", action: exportContributionsPDF, icon: BarChart3 },
    { title: "Rapport financier — Caisse", desc: "Entrées, sorties et solde", action: exportFinancePDF, icon: BarChart3 },
    { title: "Membres en retard de cotisation", desc: "Liste des membres avec cotisations impayées", action: exportLatePDF, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Rapports & Exports</h1>
        <p className="text-sm text-muted-foreground mt-1">Génération de rapports PDF</p>
      </div>
      {reports.map((r, i) => {
        const Icon = r.icon;
        return (
          <Card key={i} className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Icon className="h-4 w-4 text-accent" /> {r.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{r.desc}</p>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={r.action}>
                <FileDown className="h-3 w-3 mr-1" /> PDF
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default Reports;
