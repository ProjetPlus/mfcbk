import { BarChart3, FileDown, BookOpen, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembers, useDeaths, useAllContributions, useTreasury, useSettings } from "@/db/useDb";
import { exportMembersXLSX, exportContributionsXLSX } from "@/lib/exports";
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

  // ---------- Carnet de cotisations A5 (couverture verte + 1 page par membre) ----------
  const exportContributionBookletsPDF = () => {
    const assocName = (settings?.association_name || "Association des Chrétiens de Kouassikankro").toUpperCase();
    const assocShort = settings?.initials ? `AS.${settings.initials}.K` : "AS.CHRIS.K";
    const activeMembers = members.filter(m => m.status === "actif");
    if (activeMembers.length === 0) { toast.error("Aucun membre actif"); return; }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
    const W = 148, H = 210;
    const ROWS = 18;
    const margin = 8;

    // ==== Couverture verte ====
    const renderCover = (member: typeof activeMembers[0], num: number) => {
      doc.setFillColor(46, 125, 50); // vert profond
      doc.rect(0, 0, W, H, "F");
      doc.setFillColor(34, 95, 38);
      doc.rect(0, 0, W, 8, "F");
      doc.rect(0, H - 8, W, 8, "F");

      // Drapeau CI mini
      doc.setFillColor(255, 130, 0); doc.rect(W / 2 - 12, 18, 8, 5, "F");
      doc.setFillColor(255, 255, 255); doc.rect(W / 2 - 4, 18, 8, 5, "F");
      doc.setFillColor(0, 158, 96); doc.rect(W / 2 + 4, 18, 8, 5, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("RÉPUBLIQUE DE CÔTE D'IVOIRE", W / 2, 32, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Union — Discipline — Travail", W / 2, 37, { align: "center" });

      // Logo placeholder cercle
      doc.setFillColor(255, 255, 255);
      doc.circle(W / 2, 70, 22, "F");
      doc.setTextColor(46, 125, 50);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(assocShort, W / 2, 73, { align: "center" });
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("Mutuelle Funéraire", W / 2, 80, { align: "center" });

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(assocName, W - 30);
      doc.text(titleLines, W / 2, 110, { align: "center" });

      // Encart porteur
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 140, W - 30, 45, 3, 3, "F");
      doc.setTextColor(46, 125, 50);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CARNET DE COTISATIONS", W / 2, 148, { align: "center" });
      doc.setDrawColor(46, 125, 50);
      doc.line(30, 151, W - 30, 151);

      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("Délivré à :", 20, 158);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`${member.last_name} ${member.first_name}`.toUpperCase(), W / 2, 165, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(46, 125, 50);
      doc.text(`N° Carnet : ${member.member_id}`, W / 2, 172, { align: "center" });
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(7);
      doc.text(`Campement : ${member.campement || "—"}`, W / 2, 178, { align: "center" });
      doc.text(`Sous-préfecture : ${member.sous_prefecture || "—"}`, W / 2, 182, { align: "center" });

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.text(`Carnet ${num} / ${activeMembers.length}  —  Émis le ${new Date().toLocaleDateString("fr-FR")}`, W / 2, H - 4, { align: "center" });
    };

    activeMembers.forEach((m, idx) => {
      if (idx > 0) doc.addPage("a5", "portrait");
      renderCover(m, idx + 1);
      doc.addPage("a5", "portrait");

      // ==== Page intérieure : tableau cotisations ====
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
    { title: "Carnet de cotisations (A5, couverture verte + 1 page/membre)", desc: "Format papier officiel — Couverture République CI + DATE / DÉFUNT(E) / MONTANT / VISA", action: exportContributionBookletsPDF, icon: BookOpen, xlsx: null },
    { title: "Liste complète des membres", desc: "Tous les membres avec statuts", action: exportMembersPDF, icon: BarChart3, xlsx: async () => { try { await exportMembersXLSX(members); toast.success("Excel généré"); } catch { toast.error("Erreur Excel"); } } },
    { title: "Rapport de cotisations par décès", desc: "Détail par décès avec statuts de paiement", action: exportContributionsPDF, icon: BarChart3, xlsx: async () => { try { await exportContributionsXLSX(contributions, deaths); toast.success("Excel généré"); } catch { toast.error("Erreur Excel"); } } },
    { title: "Rapport financier — Caisse", desc: "Entrées, sorties et solde", action: exportFinancePDF, icon: BarChart3, xlsx: null },
    { title: "Membres en retard de cotisation", desc: "Liste des membres avec cotisations impayées", action: exportLatePDF, icon: BarChart3, xlsx: null },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Rapports & Exports</h1>
        <p className="text-sm text-muted-foreground mt-1">Génération de rapports PDF et Excel</p>
      </div>
      {reports.map((r, i) => {
        const Icon = r.icon;
        return (
          <Card key={i} className="border-border/50 shadow-elegant">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Icon className="h-4 w-4 text-accent" /> {r.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground flex-1 min-w-[200px]">{r.desc}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={r.action}>
                  <FileDown className="h-3 w-3 mr-1" /> PDF
                </Button>
                {r.xlsx && (
                  <Button size="sm" variant="outline" className="text-xs h-8 border-success/40 text-success hover:bg-success/10" onClick={r.xlsx}>
                    <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default Reports;
