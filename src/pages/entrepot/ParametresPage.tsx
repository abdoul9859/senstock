import { Settings, RotateCcw, ClipboardList, ArrowDownUp, QrCode } from "lucide-react";
import { useEntrepotSettings, DEFAULT_SETTINGS } from "@/hooks/useEntrepotSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ParametresPage = () => {
  const { settings, updateSettings, resetSettings } = useEntrepotSettings();
  const { toast } = useToast();

  function handleReset() {
    resetSettings();
    toast({ title: "Parametres reinitialises", description: "Toutes les valeurs ont ete remises par defaut." });
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Parametres de l'entrepot
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configurez les valeurs par defaut pour l'inventaire, les mouvements et les codes-barres
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Inventaire ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Inventaire
            </CardTitle>
            <CardDescription>Seuils de stock, affichage et devise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Low stock thresholds */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="threshold-variants">Seuil stock faible (variantes)</Label>
                <Input
                  id="threshold-variants"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.lowStockThresholdVariants}
                  onChange={(e) => updateSettings({ lowStockThresholdVariants: Math.max(1, Number(e.target.value) || 1) })}
                />
                <p className="text-xs text-muted-foreground">
                  En dessous de ce nombre, le produit est signale en stock faible
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold-simple">Seuil stock faible (produits simples)</Label>
                <Input
                  id="threshold-simple"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.lowStockThresholdSimple}
                  onChange={(e) => updateSettings({ lowStockThresholdSimple: Math.max(1, Number(e.target.value) || 1) })}
                />
                <p className="text-xs text-muted-foreground">
                  Pour les produits sans variantes
                </p>
              </div>
            </div>

            {/* Default view */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vue par defaut</Label>
                <Select
                  value={settings.defaultView}
                  onValueChange={(v) => updateSettings({ defaultView: v as "grid" | "list" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grille</SelectItem>
                    <SelectItem value="list">Liste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Suffixe devise</Label>
                <Input
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => updateSettings({ currency: e.target.value })}
                  placeholder=" F"
                />
                <p className="text-xs text-muted-foreground">
                  Ex : " F" pour CFA, " €" pour euros
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Mouvements ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4 text-primary" />
              Mouvements
            </CardTitle>
            <CardDescription>Affichage de l'historique des mouvements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-xs">
              <Label>Elements par page</Label>
              <Select
                value={String(settings.movementsPageSize)}
                onValueChange={(v) => updateSettings({ movementsPageSize: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Codes-barres ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              Codes-barres
            </CardTitle>
            <CardDescription>Valeurs par defaut pour la generation et l'impression</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Format + Columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format par defaut</Label>
                <Select
                  value={settings.bcFormat}
                  onValueChange={(v) => updateSettings({ bcFormat: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CODE128">CODE128</SelectItem>
                    <SelectItem value="EAN13">EAN-13</SelectItem>
                    <SelectItem value="CODE39">CODE39</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Colonnes d'impression</Label>
                <Select
                  value={String(settings.bcPrintColumns)}
                  onValueChange={(v) => updateSettings({ bcPrintColumns: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 colonnes</SelectItem>
                    <SelectItem value="3">3 colonnes</SelectItem>
                    <SelectItem value="4">4 colonnes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Largeur des barres</Label>
                <span className="text-sm text-muted-foreground tabular-nums">{settings.bcWidth}</span>
              </div>
              <Slider
                min={1}
                max={3}
                step={0.5}
                value={[settings.bcWidth]}
                onValueChange={([v]) => updateSettings({ bcWidth: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hauteur (px)</Label>
                <span className="text-sm text-muted-foreground tabular-nums">{settings.bcHeight}px</span>
              </div>
              <Slider
                min={30}
                max={100}
                step={5}
                value={[settings.bcHeight]}
                onValueChange={([v]) => updateSettings({ bcHeight: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Taille du texte (px)</Label>
                <span className="text-sm text-muted-foreground tabular-nums">{settings.bcFontSize}px</span>
              </div>
              <Slider
                min={8}
                max={18}
                step={1}
                value={[settings.bcFontSize]}
                onValueChange={([v]) => updateSettings({ bcFontSize: v })}
              />
            </div>

            {/* Switches */}
            <div className="space-y-3 rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <Label>Afficher la valeur sous le code-barres</Label>
                <Switch
                  checked={settings.bcShowValue}
                  onCheckedChange={(v) => updateSettings({ bcShowValue: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Afficher le label (nom + N/S)</Label>
                <Switch
                  checked={settings.bcShowLabel}
                  onCheckedChange={(v) => updateSettings({ bcShowLabel: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Afficher le prix</Label>
                <Switch
                  checked={settings.bcShowPrice}
                  onCheckedChange={(v) => updateSettings({ bcShowPrice: v })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset */}
        <div className="flex justify-end pb-4">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            Reinitialiser les parametres
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ParametresPage;
