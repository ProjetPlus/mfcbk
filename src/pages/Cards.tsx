import { useState } from "react";
import { CreditCard, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMembers, useSettings } from "@/db/useDb";
import { toast } from "sonner";
import type { DbMember, DbSettings } from "@/db/database";
import QRCode from "qrcode";
import jsPDF from "jspdf";

const CARD_W = 85.6;
const CARD_H = 54;

async function generateCardPDF(member: DbMember, settings?: DbSettings) {
  const assocName = (settings?.association_name || "Association des Chrétiens de Kouassikankro").toUpperCase();
  const assocShort = settings?.initials ? `AS.${settings.initials}.K` : "AS.CHRIS.K";
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [CARD_W, CARD_H] });

  doc.setFillColor(107, 26, 46);
  doc.rect(0, 0, CARD_W, CARD_H, "F");

  doc.setFillColor(201, 168, 76);
  doc.rect(0, 0, CARD_W, 14, "F");

  doc.setTextColor(107, 26, 46);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("MUTUELLE FUNÉRAIRE", CARD_W / 2, 5, { align: "center" });
  doc.setFontSize(5);
  doc.text(assocName.length > 50 ? assocName.slice(0, 50) : assocName, CARD_W / 2, 9, { align: "center" });
  doc.setFontSize(3.5);
  doc.setFont("helvetica", "normal");
  doc.text("République de Côte d'Ivoire — Union, Discipline, Travail", CARD_W / 2, 12.5, { align: "center" });

  doc.setFillColor(250, 247, 244);
  doc.roundedRect(5, 18, 18, 22, 2, 2, "F");
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(5);
  doc.text("PHOTO", 14, 30, { align: "center" });

  doc.setTextColor(250, 247, 244);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${member.last_name} ${member.first_name}`, 28, 24);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(201, 168, 76);
  doc.text(member.member_id, 28, 29);

  doc.setTextColor(220, 220, 220);
  doc.setFontSize(5);
  doc.text(`Campement : ${member.campement}`, 28, 34);
  doc.text(`S/P : ${member.sous_prefecture}`, 28, 38);
  doc.text(`Tél : ${member.phone}`, 28, 42);
  doc.text(`Inscrit le : ${new Date(member.registration_date).toLocaleDateString("fr-FR")}`, 28, 46);

  doc.setFillColor(201, 168, 76);
  doc.roundedRect(60, 42, 22, 8, 1, 1, "F");
  doc.setTextColor(107, 26, 46);
  doc.setFontSize(4.5);
  doc.setFont("helvetica", "bold");
  doc.text(`${member.total_covered_persons} couvert(s)`, 71, 47, { align: "center" });

  doc.addPage([CARD_W, CARD_H], "landscape");

  doc.setFillColor(250, 247, 244);
  doc.rect(0, 0, CARD_W, CARD_H, "F");

  const qrDataUrl = await QRCode.toDataURL(member.member_id, { width: 200, margin: 1, color: { dark: "#6B1A2E", light: "#FAF7F4" } });
  doc.addImage(qrDataUrl, "PNG", (CARD_W - 24) / 2, 4, 24, 24);

  doc.setTextColor(107, 26, 46);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(member.member_id, CARD_W / 2, 33, { align: "center" });

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(4);
  doc.setFont("helvetica", "normal");
  doc.text(`Cette carte est la propriété de ${assocShort}.`, CARD_W / 2, 38, { align: "center" });
  doc.text("Association des Chrétiens de Kouassikankro.", CARD_W / 2, 41, { align: "center" });
  doc.text("En cas de perte, veuillez la retourner à l'association.", CARD_W / 2, 44, { align: "center" });

  doc.setFillColor(201, 168, 76);
  doc.rect(0, CARD_H - 4, CARD_W, 4, "F");
  doc.setTextColor(107, 26, 46);
  doc.setFontSize(3.5);
  doc.setFont("helvetica", "bold");
  doc.text(assocShort, CARD_W / 2, CARD_H - 1.5, { align: "center" });

  return doc;
}

const Cards = () => {
  const { members } = useMembers();
  const { settings } = useSettings();
  const [previewMember, setPreviewMember] = useState<DbMember | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [generating, setGenerating] = useState<string | null>(null);

  const activeMembers = members.filter(m => m.status === "actif" && m.adhesion_paid);

  const handlePreview = async (member: DbMember) => {
    setPreviewMember(member);
    const doc = await generateCardPDF(member, settings);
    const blob = doc.output("blob");
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const handleDownload = async (member: DbMember) => {
    setGenerating(member.id);
    try {
      const doc = await generateCardPDF(member, settings);
      doc.save(`Carte_${member.member_id}.pdf`);
      toast.success("Carte générée", { description: `${member.last_name} ${member.first_name}` });
    } catch {
      toast.error("Erreur lors de la génération");
    }
    setGenerating(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Cartes de membre</h1>
        <p className="text-sm text-muted-foreground mt-1">Génération de cartes CR80 recto/verso avec QR code</p>
      </div>

      <div className="space-y-2">
        {activeMembers.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {m.first_name[0]}{m.last_name[0]}
              </div>
              <div>
                <p className="font-semibold text-sm">{m.last_name} {m.first_name}</p>
                <p className="text-xs text-accent">{m.member_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] bg-or-light text-accent border-accent/20">
                {m.total_covered_persons} couvert(s)
              </Badge>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handlePreview(m)}>
                <Eye className="h-3 w-3 mr-1" /> Aperçu
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleDownload(m)} disabled={generating === m.id}>
                <Download className="h-3 w-3 mr-1" /> {generating === m.id ? "..." : "PDF"}
              </Button>
            </div>
          </div>
        ))}
        {activeMembers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun membre actif éligible</p>
          </div>
        )}
      </div>

      <Dialog open={!!previewMember} onOpenChange={() => { setPreviewMember(null); setPreviewUrl(""); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-display text-bordeaux-dark">
              Carte de {previewMember?.last_name} {previewMember?.first_name}
            </DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe src={previewUrl} className="w-full h-[400px] rounded border border-border" title="Aperçu carte" />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setPreviewMember(null); setPreviewUrl(""); }}>Fermer</Button>
            {previewMember && (
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleDownload(previewMember)}>
                <Download className="h-4 w-4 mr-1" /> Télécharger PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cards;
