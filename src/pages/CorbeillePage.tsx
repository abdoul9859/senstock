import { useState, useEffect, useCallback } from "react";
import {
  Trash2, RotateCcw, AlertTriangle, Package, FileText, FilePlus,
  FileCheck, Users, Truck as TruckIcon, FolderOpen, Loader2, UserCog,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const TOKEN_KEY = "mbayestock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function timeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "A l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hier";
  if (diffDays < 30) return `Il y a ${diffDays} jours`;
  const diffMonths = Math.floor(diffDays / 30);
  return `Il y a ${diffMonths} mois`;
}

interface TrashItem {
  _id: string;
  _type: string;
  deletedAt: string;
  // Product fields
  name?: string;
  brand?: string;
  model?: string;
  // Invoice/Quote/DeliveryNote/PurchaseOrder fields
  number?: string;
  type?: string;
  total?: number;
  status?: string;
  client?: { name: string };
  supplier?: { name: string };
  // Client/Supplier fields
  phone?: string;
  email?: string;
  // Employee fields
  firstName?: string;
  lastName?: string;
  position?: string;
  // Category fields
  description?: string;
}

const tabConfig = [
  { key: "product", label: "Produits", icon: Package },
  { key: "invoice", label: "Factures", icon: FileText },
  { key: "quote", label: "Devis", icon: FilePlus },
  { key: "deliveryNote", label: "Bons de livraison", icon: FileCheck },
  { key: "client", label: "Clients", icon: Users },
  { key: "supplier", label: "Fournisseurs", icon: TruckIcon },
  { key: "category", label: "Categories", icon: FolderOpen },
  { key: "employee", label: "Employes", icon: UserCog },
  { key: "purchaseOrder", label: "Commandes achat", icon: ShoppingCart },
];

function getItemLabel(item: TrashItem): string {
  if (item.name) return [item.name, item.brand, item.model].filter(Boolean).join(" ");
  if (item.number) return item.number;
  if (item.firstName) return `${item.firstName} ${item.lastName || ""}`;
  return "—";
}

function getItemDetail(item: TrashItem): string {
  if (item.client?.name) return item.client.name;
  if (item.supplier?.name) return item.supplier.name;
  if (item.phone) return item.phone;
  if (item.position) return item.position;
  if (item.description) return item.description;
  return "";
}

export default function CorbeillePage() {
  const [data, setData] = useState<Record<string, TrashItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("product");
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);
  const [emptying, setEmptying] = useState(false);
  const [deleteDialogItem, setDeleteDialogItem] = useState<TrashItem | null>(null);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trash", { headers: getHeaders() });
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  const totalItems = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);

  const handleRestore = async (item: TrashItem) => {
    setRestoring(item._id);
    try {
      const res = await fetch("/api/trash/restore", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ type: item._type, id: item._id }),
      });
      if (res.ok) {
        toast.success("Element restaure avec succes");
        fetchTrash();
      } else {
        toast.error("Erreur lors de la restauration");
      }
    } catch { toast.error("Erreur de connexion"); }
    setRestoring(null);
  };

  const handlePermanentDelete = async () => {
    if (!deleteDialogItem) return;
    setDeleting(deleteDialogItem._id);
    try {
      const res = await fetch(`/api/trash/${deleteDialogItem._type}/${deleteDialogItem._id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        toast.success("Element supprime definitivement");
        setDeleteDialogItem(null);
        fetchTrash();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch { toast.error("Erreur de connexion"); }
    setDeleting(null);
  };

  const handleEmptyTrash = async () => {
    setEmptying(true);
    try {
      const res = await fetch("/api/trash/empty", {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        toast.success("Corbeille videe");
        setEmptyDialogOpen(false);
        fetchTrash();
      } else {
        toast.error("Erreur lors du vidage");
      }
    } catch { toast.error("Erreur de connexion"); }
    setEmptying(false);
  };

  const currentItems = data[activeTab] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6" />
            Corbeille
          </h1>
          <p className="text-muted-foreground">
            {totalItems} element{totalItems !== 1 ? "s" : ""} dans la corbeille
          </p>
        </div>
        {totalItems > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setEmptyDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Vider la corbeille
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {tabConfig.map((tab) => {
          const count = (data[tab.key] || []).length;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4 justify-center">
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : currentItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Trash2 className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Aucun element dans cette categorie</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Element</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Supprime</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((item) => (
                <TableRow key={item._id} className="animate-row">
                  <TableCell className="font-medium text-sm">
                    {getItemLabel(item)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {getItemDetail(item)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.deletedAt ? timeAgo(item.deletedAt) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-500/10"
                        onClick={() => handleRestore(item)}
                        disabled={restoring === item._id}
                      >
                        {restoring === item._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        )}
                        Restaurer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteDialogItem(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty trash confirmation dialog */}
      <Dialog open={emptyDialogOpen} onOpenChange={setEmptyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Vider la corbeille
            </DialogTitle>
            <DialogDescription>
              Cette action supprimera definitivement {totalItems} element{totalItems !== 1 ? "s" : ""}.
              Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmptyDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleEmptyTrash} disabled={emptying}>
              {emptying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Supprimer definitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirmation dialog */}
      <Dialog open={!!deleteDialogItem} onOpenChange={() => setDeleteDialogItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Suppression definitive
            </DialogTitle>
            <DialogDescription>
              Voulez-vous supprimer definitivement "{deleteDialogItem ? getItemLabel(deleteDialogItem) : ""}" ?
              Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogItem(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handlePermanentDelete} disabled={!!deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Supprimer definitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
