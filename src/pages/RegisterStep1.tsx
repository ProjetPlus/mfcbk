import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Upload, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sousPrefectures } from "@/data/mockData";

const idTypes = ["CNI", "Permis", "Passeport", "Carte du producteur", "Autre"];

const RegisterStep1 = () => {
  const navigate = useNavigate();
  const [department, setDepartment] = useState<string>("");
  const [photo, setPhoto] = useState<string>("");
  const [idPhoto, setIdPhoto] = useState<string>("");
  const [formData, setFormData] = useState({
    lastName: "", firstName: "", phone: "", phoneSecondary: "", whatsapp: "",
    campement: "", sousPrefecture: "", idType: "", idNumber: "",
  });

  const allSousPrefectures = department
    ? sousPrefectures[department as keyof typeof sousPrefectures] || []
    : [];

  const isValid = formData.lastName && formData.firstName && formData.phone && formData.sousPrefecture && formData.idType;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    // Store step1 data in sessionStorage for step2
    sessionStorage.setItem("register_step1", JSON.stringify({
      ...formData,
      photo,
      idPhoto,
    }));
    navigate("/register/step2");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-bordeaux-dark">Inscription — Étape 1</h1>
        <p className="text-sm text-muted-foreground mt-1">Informations personnelles du nouveau membre</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground text-sm font-bold">1</div>
        <div className="h-0.5 flex-1 bg-border" />
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-muted-foreground text-sm font-bold">2</div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nom *" value={formData.lastName} onChange={(v) => setFormData({ ...formData, lastName: v })} placeholder="Nom de famille" />
            <Field label="Prénom(s) *" value={formData.firstName} onChange={(v) => setFormData({ ...formData, firstName: v })} placeholder="Prénom(s)" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Contact principal *" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} placeholder="+225 XX XX XX XX XX" />
            <Field label="Contact secondaire" value={formData.phoneSecondary} onChange={(v) => setFormData({ ...formData, phoneSecondary: v })} placeholder="Optionnel" />
            <Field label="WhatsApp" value={formData.whatsapp} onChange={(v) => setFormData({ ...formData, whatsapp: v })} placeholder="Optionnel" />
          </div>
          <Field label="Campement *" value={formData.campement} onChange={(v) => setFormData({ ...formData, campement: v })} placeholder="Lieu de résidence" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Département</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(sousPrefectures).map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Sous-préfecture *</Label>
              <Select value={formData.sousPrefecture} onValueChange={(v) => setFormData({ ...formData, sousPrefecture: v })} disabled={!department}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {allSousPrefectures.map((sp) => (
                    <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Pièce d'identité & Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Type de pièce *</Label>
            <Select value={formData.idType} onValueChange={(v) => setFormData({ ...formData, idType: v })}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {idTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <label className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent/50 transition-colors block">
            {idPhoto ? (
              <div className="flex flex-col items-center gap-2">
                <img src={idPhoto} alt="Pièce d'identité" className="max-h-32 rounded" />
                <p className="text-xs text-success font-medium">✓ Photo de pièce d'identité chargée</p>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Photo de la pièce d'identité</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG — max 5 Mo</p>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, setIdPhoto)} />
          </label>

          <Field label="Numéro de pièce" value={formData.idNumber} onChange={(v) => setFormData({ ...formData, idNumber: v })} placeholder="Saisie manuelle du numéro" />

          <label className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent/50 transition-colors block">
            {photo ? (
              <div className="flex flex-col items-center gap-2">
                <img src={photo} alt="Photo membre" className="w-24 h-24 rounded-full object-cover" />
                <p className="text-xs text-success font-medium">✓ Photo du membre chargée</p>
              </div>
            ) : (
              <>
                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Photo du membre</p>
                <p className="text-xs text-muted-foreground mt-1">Optionnel — utilisée pour la carte de membre</p>
              </>
            )}
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handlePhotoUpload(e, setPhoto)} />
          </label>
        </CardContent>
      </Card>

      <div className="p-3 bg-info-bg rounded-lg border border-accent/20">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Important :</strong> Les données seront sauvegardées après le paiement du droit d'adhésion à l'étape 2.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!isValid}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={handleNext}
        >
          Suivant <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10" />
    </div>
  );
}

export default RegisterStep1;
