import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";

const STORAGE_KEY = "senstock_banque_settings";

interface BanqueSettings {
  defaultCurrency: string;
  autoReconcile: string;
  transactionsPerPage: string;
}

function loadSettings(): BanqueSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    defaultCurrency: "FCFA",
    autoReconcile: "non",
    transactionsPerPage: "50",
  };
}

export default function BanqueParametresPage() {
  const [settings, setSettings] = useState<BanqueSettings>(loadSettings);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast.success("Paramètres enregistrés");
  };

  const update = (key: keyof BanqueSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres bancaires</h1>
        <p className="text-muted-foreground">
          Configurer les préférences du module banque
        </p>
      </div>

      <div className="max-w-lg space-y-6">
        {/* General settings */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Général</h3>
          </div>

          <div>
            <Label>Devise par défaut</Label>
            <Select value={settings.defaultCurrency} onValueChange={(v) => update("defaultCurrency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FCFA">Franc CFA (FCFA)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                <SelectItem value="USD">Dollar US (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Transactions par page</Label>
            <Select value={settings.transactionsPerPage} onValueChange={(v) => update("transactionsPerPage", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Rapprochement automatique</Label>
            <Select value={settings.autoReconcile} onValueChange={(v) => update("autoReconcile", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="non">Non</SelectItem>
                <SelectItem value="oui">Oui</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Si activé, les nouvelles transactions seront automatiquement marquées comme rapprochées
            </p>
          </div>
        </div>

        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
