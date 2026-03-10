import { useState } from "react";
import { Building, Mail, Phone, Globe, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CompanyData {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  ninea: string;
  rc: string;
  currency: string;
  country: string;
}

interface StepCompanyProps {
  data: CompanyData;
  onChange: (data: CompanyData) => void;
  onNext: () => void;
  onBack: () => void;
  loading?: boolean;
}

const currencies = [
  { value: "XOF", label: "FCFA (XOF)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "Dollar US (USD)" },
  { value: "GBP", label: "Livre Sterling (GBP)" },
];

const countries = [
  { value: "SN", label: "Sénégal" },
  { value: "CI", label: "Côte d'Ivoire" },
  { value: "ML", label: "Mali" },
  { value: "BF", label: "Burkina Faso" },
  { value: "GN", label: "Guinée" },
  { value: "TG", label: "Togo" },
  { value: "BJ", label: "Bénin" },
  { value: "NE", label: "Niger" },
  { value: "CM", label: "Cameroun" },
  { value: "GA", label: "Gabon" },
  { value: "FR", label: "France" },
];

export default function StepCompany({ data, onChange, onNext, onBack, loading }: StepCompanyProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(key: keyof CompanyData, value: string) {
    onChange({ ...data, [key]: value });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!data.companyName.trim()) newErrors.companyName = "Le nom de l'entreprise est requis";
    if (!data.country) newErrors.country = "Le pays est requis";
    if (!data.currency) newErrors.currency = "La devise est requise";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Informations de l'entreprise</h2>
        <p className="text-muted-foreground mt-2">
          Ces informations apparaîtront sur vos documents commerciaux
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Identité
          </CardTitle>
          <CardDescription>Informations principales de votre entreprise</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise *</Label>
              <Input
                id="companyName"
                value={data.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="Ma Société SARL"
              />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  value={data.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="contact@masociete.sn"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  className="pl-9"
                  value={data.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+221 77 000 00 00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Site web</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website"
                  className="pl-9"
                  value={data.website}
                  onChange={(e) => update("website", e.target.value)}
                  placeholder="https://masociete.sn"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="address"
                className="pl-9"
                value={data.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="123 Rue Example, Dakar"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Paramètres régionaux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Pays *</Label>
              <Select value={data.country} onValueChange={(v) => update("country", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un pays" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
            </div>
            <div className="space-y-2">
              <Label>Devise *</Label>
              <Select value={data.currency} onValueChange={(v) => update("currency", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une devise" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.currency && <p className="text-xs text-destructive">{errors.currency}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ninea">NINEA</Label>
              <Input
                id="ninea"
                value={data.ninea}
                onChange={(e) => update("ninea", e.target.value)}
                placeholder="Numéro d'identification"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc">Registre de Commerce</Label>
              <Input
                id="rc"
                value={data.rc}
                onChange={(e) => update("rc", e.target.value)}
                placeholder="RC-XXXXX"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Retour</Button>
        <Button onClick={handleNext} disabled={loading} size="lg">
          {loading ? "Enregistrement..." : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
