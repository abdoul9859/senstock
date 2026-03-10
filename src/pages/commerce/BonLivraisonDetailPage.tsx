import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Printer, Trash2, FileText, Users, Package,
  StickyNote, Truck, CheckCircle, XCircle, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SendWhatsAppButton } from "@/components/SendWhatsAppButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { StockLoader } from "@/components/StockLoader";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";
import { getCommerceSettings } from "@/hooks/useCommerceSettings";
import { getTemplateById } from "@/components/invoice-templates";
import { toast } from "sonner";
import { usePrintFooterPush } from "@/hooks/usePrintFooterPush";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const statusConfig: Record<string, { label: string; color: string }> = {
  en_preparation: { label: "En preparation", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  expedie: { label: "Expedie", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  livre: { label: "Livre", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  annule: { label: "Annule", color: "bg-muted text-muted-foreground line-through" },
};

interface DeliveryItem {
  _id: string;
  type: string;
  productId?: { _id: string; name: string; brand: string; model: string; image: string };
  description: string;
  quantity: number;
  delivered: number;
}

interface DeliveryNoteDetail {
  _id: string;
  number: string;
  status: string;
  invoiceId: string;
  invoiceNumber: string;
  client?: { _id: string; name: string; phone: string; email: string; address: string };
  date: string;
  deliveryDate?: string;
  deliveryAddress: string;
  items: DeliveryItem[];
  notes: string;
  createdAt: string;
}

const BonLivraisonDetailPage = () => {
  usePrintFooterPush();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("print") === "true";

  const [note, setNote] = useState<DeliveryNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/delivery-notes/${id}`, { headers: getHeaders() });
      if (res.ok) {
        setNote(await res.json());
      } else {
        toast.error("Bon de livraison introuvable");
        navigate("/commerce/bons-livraison");
      }
    } catch { toast.error("Erreur de connexion"); }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchNote(); }, [fetchNote]);

  useEffect(() => {
    if (autoPrint && note && !loading) {
      setTimeout(() => window.print(), 500);
    }
  }, [autoPrint, note, loading]);

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/commerce/bons-livraison")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground">Chargement...</h2>
        </div>
        <StockLoader />
      </div>
    );
  }

  if (!note) return null;

  const sc = statusConfig[note.status] || statusConfig.en_preparation;

  // Template rendering for print — reuse invoice templates
  const commerceSettings = getCommerceSettings();
  const currency = getEntrepotSettings().currency;
  const templateInfo = getTemplateById(commerceSettings.invoiceTemplate);
  const TemplateComponent = templateInfo.component;

  const printData = {
    _id: note._id,
    number: note.number,
    type: "bon_livraison",
    status: note.status,
    client: note.client,
    date: note.date,
    invoiceNumber: note.invoiceNumber,
    deliveryAddress: note.deliveryAddress,
    items: note.items.map((item) => ({
      ...item,
      unitPrice: 0,
      purchasePrice: 0,
      total: 0,
    })),
    subtotal: 0,
    showTax: false,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
    notes: note.notes,
    signature: "",
    createdAt: note.createdAt,
  };

  async function handleUpdateStatus(status: string) {
    try {
      const res = await fetch(`/api/delivery-notes/${id}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Statut mis a jour`);
        fetchNote();
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le bon ${note!.number} ?`)) return;
    try {
      const res = await fetch(`/api/delivery-notes/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) { toast.success("Bon supprime"); navigate("/commerce/bons-livraison"); }
      else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  return (
    <>
      {/* Print view — portaled to <body> so it's outside #root which is hidden on print */}
      {createPortal(
        <div className="hidden print:block" id="invoice-print-area">
          <TemplateComponent invoice={printData as any} settings={commerceSettings} currency={currency} />
        </div>,
        document.body
      )}

      {/* Screen view */}
      <div className="print:hidden animate-fade-in">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/commerce/bons-livraison")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground font-mono">{note.number}</h2>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-primary/10 text-primary">
                  Bon de livraison
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sc.color}`}>
                  {sc.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Cree le {formatDate(note.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {note.status === "en_preparation" && (
              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus("expedie")}>
                <Truck className="h-3.5 w-3.5 mr-1" /> Expedier
              </Button>
            )}
            {note.status === "expedie" && (
              <Button variant="outline" size="sm" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleUpdateStatus("livre")}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Marquer livre
              </Button>
            )}
            {note.status !== "annule" && note.status !== "livre" && (
              <Button variant="outline" size="sm" className="text-amber-500 hover:text-amber-600" onClick={() => handleUpdateStatus("annule")}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Annuler
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Imprimer
            </Button>
            <SendWhatsAppButton
              type="delivery-note"
              id={note._id || note.id}
              clientPhone={note.client?.phone}
              size="sm"
            />
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Numero</span>
                  <span className="font-mono font-medium">{note.number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Facture</span>
                  <button onClick={() => navigate(`/commerce/factures/${note.invoiceId}`)}
                    className="font-mono text-primary hover:underline flex items-center gap-1">
                    {note.invoiceNumber} <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Statut</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span>{formatDate(note.date)}</span>
                </div>
                {note.deliveryDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date livraison</span>
                    <span>{formatDate(note.deliveryDate)}</span>
                  </div>
                )}
                {note.deliveryAddress && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Adresse livraison</span>
                    <span className="text-right max-w-[200px]">{note.deliveryAddress}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                {note.client ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{note.client.name}</p>
                    {note.client.phone && <p className="text-sm text-muted-foreground">{note.client.phone}</p>}
                    {note.client.email && <p className="text-sm text-muted-foreground">{note.client.email}</p>}
                    {note.client.address && <p className="text-sm text-muted-foreground">{note.client.address}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Aucun client</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Articles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Article</TableHead>
                      <TableHead className="text-center w-24">Quantite</TableHead>
                      <TableHead className="text-center w-24">Livre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {note.items.map((item) => (
                      <TableRow key={item._id} className="animate-list-item">
                        <TableCell className="text-sm font-medium">
                          {item.productId
                            ? [item.productId.name, item.productId.brand, item.productId.model].filter(Boolean).join(" ")
                            : item.description || "Service"}
                        </TableCell>
                        <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          <span className={item.delivered >= item.quantity ? "text-emerald-500" : "text-amber-500"}>
                            {item.delivered}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {note.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default BonLivraisonDetailPage;
