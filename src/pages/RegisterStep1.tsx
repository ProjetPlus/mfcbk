import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Upload, Camera, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sousPrefectures } from "@/data/mockData";
import { loadDraft, saveDraft, clearDraft } from "@/lib/draftStore";
import { fileToDataURL, processPortrait, compressImage } from "@/lib/imageProcess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const idTypes = ["CNI", "Permis", "Passeport", "Carte du producteur", "Autre"];
const DEFAULT_DIAL = "+225 ";
const DRAFT_KEY = "register_step1";

type DraftShape = {
  department: string;
  photo: string;
  idPhoto: string;
  formData: {
    lastName: string; firstName: string;
    phone: string; phoneSecondary: string; whatsapp: string;
    campement: string; sousPrefecture: string; idType: string; idNumber: string;
  };
};

const initial: DraftShape = {
  department: "",
  photo: "",
  idPhoto: "",
  formData: {
    lastName: "", firstName: "",
    phone: DEFAULT_DIAL, phoneSecondary: DEFAULT_DIAL, whatsapp: DEFAULT_DIAL,
    campement: "", sousPrefecture: "", idType: "", idNumber: "",
  },
};

const RegisterStep1 = () => {
  const navigate = useNavigate();

  // Hydrate from sessionStorage so a camera-induced reload preserves state.
  const [draft, setDraft] = useState<DraftShape>(() => loadDraft<DraftShape>(DRAFT_KEY, initial));
  const { department, photo, idPhoto, formData } = draft;

  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [processingId, setProcessingId] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const photoUploadRef = useRef<HTMLInputElement>(null);
  const photoCameraRef = useRef<HTMLInputElement>(null);
  const idUploadRef = useRef<HTMLInputElement>(null);
  const idCameraRef = useRef<HTMLInputElement>(null);

  // Persist on every change.
  useEffect(() => { saveDraft(DRAFT_KEY, draft); }, [draft]);

  const setForm = (patch: Partial<DraftShape["formData"]>) =>
    setDraft((d) => ({ ...d, formData: { ...d.formData, ...patch } }));

  const setPhoto = (v: string) => setDraft((d) => ({ ...d, photo: v }));
  const setIdPhoto = (v: string) => setDraft((d) => ({ ...d, idPhoto: v }));
  const setDepartment = (v: string) =>
    setDraft((d) => ({ ...d, department: v, formData: { ...d.formData, sousPrefecture: "" } }));

  const allSousPrefectures = department
    ? sousPrefectures[department as keyof typeof sousPrefectures] || []
    : [];

  const isValid =
    formData.lastName && formData.firstName && formData.phone.replace(/\D/g, "").length >= 8 &&
    formData.sousPrefecture && formData.idType;

  /** Ensure a phone field always starts with the dial prefix. */
  const handlePhone = (key: "phone" | "phoneSecondary" | "whatsapp", v: string) => {
    let next = v;
    if (!next.startsWith(DEFAULT_DIAL.trim())) next = DEFAULT_DIAL + next.replace(/^\+?\s*\d*\s*/, "");
    setForm({ [key]: next } as any);
  };

  /** Prevent the user from backspacing into the dial prefix. */
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, value: string) => {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const prefixLen = DEFAULT_DIAL.length;
    if ((e.key === "Backspace" && start <= prefixLen && end <= prefixLen) ||
        (e.key === "Delete" && start < prefixLen)) {
      e.preventDefault();
    }
  };

  /** Process & store member portrait (auto-enhance + face-centered square crop). */
  const handleMemberPhoto = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Photo trop lourde (max 8 Mo)"); return; }
    setProcessingPhoto(true);
    try {
      const raw = await fileToDataURL(file);
      const enhanced = await processPortrait(raw, { size: 512 });
      setPhoto(enhanced);
      toast.success("Photo traitée (auto-éclairage + cadrage portrait)");
    } catch (e: any) {
      toast.error("Échec du traitement photo", { description: e.message });
    } finally {
      setProcessingPhoto(false);
    }
  };

  /** Compress ID card image, then call OCR edge function to auto-fill the number. */
  const handleIdPhoto = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image trop lourde (max 10 Mo)"); return; }
    setProcessingId(true);
    try {
      const raw = await fileToDataURL(file);
      const compressed = await compressImage(raw, 1280, 0.85);
      setIdPhoto(compressed);
      // Auto-OCR
      runOcr(compressed);
    } catch (e: any) {
      toast.error("Échec du traitement", { description: e.message });
    } finally {
      setProcessingId(false);
    }
  };

  const runOcr = async (image?: string) => {
    const src = image || idPhoto;
    if (!src) { toast.error("Aucune image de pièce d'identité"); return; }
    setOcrLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("id-ocr", {
        body: { image: src, idType: formData.idType || undefined },
      });
      if (error) throw error;
      const num = (data as any)?.number;
      if (num) {
        setForm({ idNumber: num });
        toast.success("Numéro détecté automatiquement", { description: num });
      } else {
        toast.info("Numéro non détecté — veuillez le saisir manuellement");
      }
    } catch (e: any) {
      toast.error("OCR indisponible", { description: e.message || "Saisissez le numéro manuellement" });
    } finally {
      setOcrLoading(false);
    }
  };

  const handleNext = () => {
    sessionStorage.setItem("register_step1", JSON.stringify({ ...formData, photo, idPhoto }));
    navigate("/register/step2");
  };

  const handleResetDraft = () => {
    clearDraft(DRAFT_KEY);
    setDraft(initial);
    toast.success("Brouillon effacé");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-bordeaux-dark">Inscription — Étape 1</h1>
          <p className="text-sm text-muted-foreground mt-1">Informations personnelles du nouveau membre</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleResetDraft} className="text-xs">
          Vider le brouillon
        </Button>
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
            <Field label="Nom *" value={formData.lastName} onChange={(v) => setForm({ lastName: v })} placeholder="Nom de famille" />
            <Field label="Prénom(s) *" value={formData.firstName} onChange={(v) => setForm({ firstName: v })} placeholder="Prénom(s)" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PhoneField label="Contact principal *" value={formData.phone} onChange={(v) => handlePhone("phone", v)} onKeyDown={(e) => handlePhoneKeyDown(e, formData.phone)} />
            <PhoneField label="Contact secondaire" value={formData.phoneSecondary} onChange={(v) => handlePhone("phoneSecondary", v)} onKeyDown={(e) => handlePhoneKeyDown(e, formData.phoneSecondary)} />
            <PhoneField label="WhatsApp" value={formData.whatsapp} onChange={(v) => handlePhone("whatsapp", v)} onKeyDown={(e) => handlePhoneKeyDown(e, formData.whatsapp)} />
          </div>
          <Field label="Campement *" value={formData.campement} onChange={(v) => setForm({ campement: v })} placeholder="Lieu de résidence" />

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
              <Select value={formData.sousPrefecture} onValueChange={(v) => setForm({ sousPrefecture: v })} disabled={!department}>
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
            <Select value={formData.idType} onValueChange={(v) => setForm({ idType: v })}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {idTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ID card photo + OCR */}
          <div className="border-2 border-dashed border-border rounded-lg p-4 space-y-3">
            {idPhoto ? (
              <div className="flex flex-col items-center gap-2">
                <img src={idPhoto} alt="Pièce d'identité" className="max-h-40 rounded" />
                <p className="text-xs text-success font-medium">✓ Pièce d'identité chargée</p>
              </div>
            ) : (
              <div className="text-center py-2">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Photo de la pièce d'identité</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG — analyse automatique du numéro</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" disabled={processingId}
                onClick={() => idUploadRef.current?.click()}>
                {processingId ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ImageIcon className="h-4 w-4 mr-1" />}
                Choisir un fichier
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={processingId}
                onClick={() => idCameraRef.current?.click()}>
                <Camera className="h-4 w-4 mr-1" /> Prendre une photo
              </Button>
            </div>
            <input ref={idUploadRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleIdPhoto(e.target.files?.[0])} />
            <input ref={idCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => handleIdPhoto(e.target.files?.[0])} />
            {idPhoto && (
              <Button type="button" variant="secondary" size="sm" className="w-full" disabled={ocrLoading}
                onClick={() => runOcr()}>
                {ocrLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Réanalyser le numéro automatiquement
              </Button>
            )}
          </div>

          <Field
            label="Numéro de pièce (auto ou manuel)"
            value={formData.idNumber}
            onChange={(v) => setForm({ idNumber: v })}
            placeholder="Détecté automatiquement — modifiable"
          />

          {/* Member portrait — upload OR camera, auto-enhance */}
          <div className="border-2 border-dashed border-border rounded-lg p-4 space-y-3">
            {photo ? (
              <div className="flex flex-col items-center gap-2">
                <img src={photo} alt="Photo membre" className="w-28 h-28 rounded-full object-cover ring-4 ring-accent/30" />
                <p className="text-xs text-success font-medium">✓ Photo portrait professionnelle prête</p>
              </div>
            ) : (
              <div className="text-center py-2">
                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Photo du membre</p>
                <p className="text-xs text-muted-foreground mt-1">Upload ou photo — auto-éclairage & recadrage portrait</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" disabled={processingPhoto}
                onClick={() => photoUploadRef.current?.click()}>
                {processingPhoto ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ImageIcon className="h-4 w-4 mr-1" />}
                Uploader
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={processingPhoto}
                onClick={() => photoCameraRef.current?.click()}>
                <Camera className="h-4 w-4 mr-1" /> Prendre photo
              </Button>
            </div>
            <input ref={photoUploadRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleMemberPhoto(e.target.files?.[0])} />
            <input ref={photoCameraRef} type="file" accept="image/*" capture="user" className="hidden"
              onChange={(e) => handleMemberPhoto(e.target.files?.[0])} />
          </div>
        </CardContent>
      </Card>

      <div className="p-3 bg-info-bg rounded-lg border border-accent/20">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Brouillon automatique :</strong> tout ce que vous saisissez est sauvegardé localement. Si la page se recharge (ex. ouverture de la caméra), vos données sont restaurées.
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

function PhoneField({ label, value, onChange, onKeyDown }: { label: string; value: string; onChange: (v: string) => void; onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="+225 XX XX XX XX XX"
        inputMode="tel"
        className="h-10"
      />
    </div>
  );
}

export default RegisterStep1;
