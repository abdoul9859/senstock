import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  RefreshCw,
  Trash2,
  Users,
  Loader2,
  SlidersHorizontal,
  Copy,
  Merge,
  Phone,
  Mail,
  MapPin,
  FileText,
  FilePlus,
  FileCheck,
  MessageSquare,
  Landmark,
  ArrowRight,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface Client {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
}

interface DuplicateGroup {
  key: string;
  clients: Client[];
  similarity: number;
  matchReason: string;
}

// Dice coefficient on bigrams
function bigrams(str: string): Set<string> {
  const s = str.toLowerCase().trim();
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.substring(i, i + 2));
  }
  return set;
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a.toLowerCase().trim() === b.toLowerCase().trim()) return 1;
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;
  let intersection = 0;
  bigramsA.forEach((bg) => {
    if (bigramsB.has(bg)) intersection++;
  });
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

function normalizePhone(phone: string): string {
  return (phone || "").replace(/[\s\-\.\(\)]/g, "");
}

function computeSimilarity(a: Client, b: Client): { score: number; reason: string } {
  const nameSim = diceCoefficient(a.name, b.name);
  const reasons: string[] = [];

  let score = nameSim * 0.5;
  if (nameSim > 0.6) reasons.push(`nom ${Math.round(nameSim * 100)}%`);

  const phoneA = normalizePhone(a.phone);
  const phoneB = normalizePhone(b.phone);
  if (phoneA && phoneB && phoneA === phoneB) {
    score += 0.3;
    reasons.push("même téléphone");
  } else if (phoneA && phoneB) {
    const phoneSim = diceCoefficient(phoneA, phoneB);
    score += phoneSim * 0.15;
    if (phoneSim > 0.7) reasons.push(`tél. ${Math.round(phoneSim * 100)}%`);
  } else {
    score += nameSim * 0.15;
  }

  const emailA = (a.email || "").toLowerCase().trim();
  const emailB = (b.email || "").toLowerCase().trim();
  if (emailA && emailB && emailA === emailB) {
    score += 0.2;
    reasons.push("même email");
  } else if (emailA && emailB) {
    const emailSim = diceCoefficient(emailA, emailB);
    score += emailSim * 0.1;
    if (emailSim > 0.7) reasons.push(`email ${Math.round(emailSim * 100)}%`);
  } else {
    score += nameSim * 0.1;
  }

  if (a.name.toLowerCase().trim() === b.name.toLowerCase().trim()) {
    score = Math.max(score, 0.9);
    if (!reasons.includes("nom 100%")) {
      reasons.unshift("nom identique");
    }
  }

  return {
    score: Math.min(1, score),
    reason: reasons.join(", ") || `ressemblance ${Math.round(score * 100)}%`,
  };
}

function findDuplicates(clients: Client[], threshold: number): DuplicateGroup[] {
  const groups: Map<string, DuplicateGroup> = new Map();
  const assigned = new Set<string>();

  for (let i = 0; i < clients.length; i++) {
    if (assigned.has(clients[i]._id)) continue;

    const group: Client[] = [clients[i]];
    let bestSim = 0;
    let bestReason = "";

    for (let j = i + 1; j < clients.length; j++) {
      if (assigned.has(clients[j]._id)) continue;
      const { score, reason } = computeSimilarity(clients[i], clients[j]);
      if (score >= threshold) {
        group.push(clients[j]);
        if (score > bestSim) {
          bestSim = score;
          bestReason = reason;
        }
      }
    }

    if (group.length > 1) {
      const key = group.map((c) => c._id).sort().join("-");
      group.forEach((c) => assigned.add(c._id));
      groups.set(key, { key, clients: group, similarity: bestSim, matchReason: bestReason });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.similarity - a.similarity);
}

export default function DoublonsClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(60);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [mergeGroup, setMergeGroup] = useState<DuplicateGroup | null>(null);
  const [mergeKeep, setMergeKeep] = useState<string>("");
  const [merging, setMerging] = useState(false);

  // Transfer options
  const [optInvoices, setOptInvoices] = useState(true);
  const [optQuotes, setOptQuotes] = useState(true);
  const [optDeliveryNotes, setOptDeliveryNotes] = useState(true);
  const [optRequests, setOptRequests] = useState(true);
  const [optCreances, setOptCreances] = useState(true);

  const token = localStorage.getItem("mbayestock_token");

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur");
      setClients(await res.json());
    } catch {
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const duplicates = useMemo(
    () => findDuplicates(clients, threshold / 100),
    [clients, threshold]
  );

  const totalDuplicates = duplicates.reduce((s, g) => s + g.clients.length, 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/clients/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Client supprimé");
      setDeleteTarget(null);
      fetchClients();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const openMerge = (group: DuplicateGroup) => {
    setMergeGroup(group);
    setOptInvoices(true);
    setOptQuotes(true);
    setOptDeliveryNotes(true);
    setOptRequests(true);
    setOptCreances(true);
    // Default: keep the oldest client
    const sorted = [...group.clients].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    setMergeKeep(sorted[0]._id);
  };

  const handleMerge = async () => {
    if (!mergeGroup || !mergeKeep) return;
    const mergeIds = mergeGroup.clients
      .filter((c) => c._id !== mergeKeep)
      .map((c) => c._id);

    setMerging(true);
    try {
      const res = await fetch(`/api/clients/merge`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keepId: mergeKeep,
          mergeIds,
          options: {
            transferInvoices: optInvoices,
            transferQuotes: optQuotes,
            transferDeliveryNotes: optDeliveryNotes,
            transferRequests: optRequests,
            transferCreances: optCreances,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      const data = await res.json();
      const { stats } = data;
      const parts: string[] = [`${data.merged} client(s) fusionné(s)`];
      const transfers: string[] = [];
      if (stats.invoices > 0) transfers.push(`${stats.invoices} facture(s)`);
      if (stats.quotes > 0) transfers.push(`${stats.quotes} devis`);
      if (stats.deliveryNotes > 0) transfers.push(`${stats.deliveryNotes} BL`);
      if (stats.requests > 0) transfers.push(`${stats.requests} demande(s)`);
      if (stats.creances > 0) transfers.push(`${stats.creances} créance(s)`);
      if (transfers.length > 0) parts.push(`${transfers.join(", ")} transféré(s)`);
      toast.success(parts.join(" — "));
      setMergeGroup(null);
      fetchClients();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la fusion");
    } finally {
      setMerging(false);
    }
  };

  const transferOptions = [
    {
      key: "invoices" as const,
      label: "Factures",
      desc: "Transférer les factures vers le client conservé",
      icon: FileText,
      checked: optInvoices,
      onChange: setOptInvoices,
    },
    {
      key: "quotes" as const,
      label: "Devis",
      desc: "Transférer les devis vers le client conservé",
      icon: FilePlus,
      checked: optQuotes,
      onChange: setOptQuotes,
    },
    {
      key: "deliveryNotes" as const,
      label: "Bons de livraison",
      desc: "Transférer les BL vers le client conservé",
      icon: FileCheck,
      checked: optDeliveryNotes,
      onChange: setOptDeliveryNotes,
    },
    {
      key: "requests" as const,
      label: "Demandes",
      desc: "Transférer les demandes clients vers le client conservé",
      icon: MessageSquare,
      checked: optRequests,
      onChange: setOptRequests,
    },
    {
      key: "creances" as const,
      label: "Créances",
      desc: "Transférer les créances vers le client conservé",
      icon: Landmark,
      checked: optCreances,
      onChange: setOptCreances,
    },
  ];

  const activeTransfers = transferOptions.filter((o) => o.checked).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Copy className="h-6 w-6 text-blue-500" />
            Doublons clients
          </h1>
          <p className="text-muted-foreground mt-1">
            Détectez et fusionnez les fiches clients en doublon
          </p>
        </div>
        <Button variant="outline" onClick={fetchClients} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Similarity slider */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <SlidersHorizontal className="h-5 w-5 text-blue-500" />
          <h2 className="font-semibold">Seuil de ressemblance</h2>
          <Badge variant="secondary" className="ml-auto text-base px-3">
            {threshold}%
          </Badge>
        </div>
        <Slider
          value={[threshold]}
          onValueChange={(v) => setThreshold(v[0])}
          min={30}
          max={100}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>30% — Plus de résultats</span>
          <span>100% — Correspondance exacte</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold">{clients.length}</div>
          <div className="text-sm text-muted-foreground">Clients analysés</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{duplicates.length}</div>
          <div className="text-sm text-muted-foreground">Groupes de doublons</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{totalDuplicates}</div>
          <div className="text-sm text-muted-foreground">Clients concernés</div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : duplicates.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-lg">Aucun doublon détecté</h3>
          <p className="text-muted-foreground mt-1">
            Essayez de réduire le seuil de ressemblance pour élargir la recherche
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.map((group) => (
            <div key={group.key} className="rounded-lg border bg-card overflow-hidden">
              <div className="bg-blue-500/10 border-b px-4 py-2.5 flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="border-blue-500/50 text-blue-600 bg-blue-500/10"
                >
                  {Math.round(group.similarity * 100)}% similaire
                </Badge>
                <span className="text-sm text-muted-foreground">{group.matchReason}</span>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => openMerge(group)}
                  >
                    <Merge className="h-3 w-3 mr-1" />
                    Fusionner
                  </Button>
                </div>
              </div>
              <div className="divide-y">
                {group.clients.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        {c.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </span>
                        )}
                        {c.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {c.email}
                          </span>
                        )}
                        {c.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {c.address}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                      title="Supprimer ce client"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le client <strong>{deleteTarget?.name}</strong> sera supprimé définitivement.
              Les factures et créances associées ne seront pas supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge dialog */}
      <Dialog open={!!mergeGroup} onOpenChange={(o) => !o && setMergeGroup(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-blue-500" />
              Fusionner les clients
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Sélectionnez le client à conserver. Les documents des autres clients seront
            transférés selon les options choisies, puis les doublons seront supprimés.
          </p>

          {/* Client selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase text-muted-foreground">
              Client à conserver
            </Label>
            {mergeGroup?.clients.map((c) => (
              <div
                key={c._id}
                onClick={() => setMergeKeep(c._id)}
                className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                  mergeKeep === c._id
                    ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500"
                    : "hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.name}</span>
                  {mergeKeep === c._id && (
                    <Badge className="bg-blue-500 text-white">Conserver</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                  {c.phone && <div>Tél : {c.phone}</div>}
                  {c.email && <div>Email : {c.email}</div>}
                  {c.address && <div>Adresse : {c.address}</div>}
                  <div className="text-xs">
                    Créé le {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transfer options */}
          <div className="space-y-3 mt-2">
            <Label className="text-xs font-medium uppercase text-muted-foreground">
              Transfert de documents
            </Label>
            <div className="rounded-lg border p-3 space-y-3">
              {transferOptions.map((opt, i) => (
                <div key={opt.key}>
                  {i > 0 && <div className="border-t mb-3" />}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </div>
                    </div>
                    <Switch checked={opt.checked} onCheckedChange={opt.onChange} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted/50 border p-3 text-sm space-y-1">
            <div className="font-medium flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              Résultat de la fusion
            </div>
            <div className="text-muted-foreground pl-5 space-y-0.5">
              <div>
                {(mergeGroup?.clients.length || 0) - 1} client(s) sera/seront supprimé(s)
              </div>
              <div>
                Les informations manquantes seront complétées depuis les doublons
              </div>
              {activeTransfers > 0 ? (
                <div className="text-blue-600">
                  {activeTransfers} type(s) de documents seront transférés
                </div>
              ) : (
                <div className="text-amber-600">
                  Aucun document ne sera transféré — les documents des doublons resteront
                  orphelins
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeGroup(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleMerge}
              disabled={merging}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {merging ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Merge className="h-4 w-4 mr-2" />
              )}
              Fusionner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
