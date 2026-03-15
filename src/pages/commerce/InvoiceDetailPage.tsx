import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Printer, Pencil, Copy, Send, Trash2, XCircle, Undo2,
  FileText, Users, Package, CreditCard, ShieldCheck, StickyNote,
  RefreshCw, Zap, ArrowLeftRight, ExternalLink, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SendWhatsAppButton } from "@/components/SendWhatsAppButton";
import { Separator } from "@/components/ui/separator";
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

function formatFCFA(n?: number): string {
  if (n == null) return "0 F";
  return n.toLocaleString("fr-FR") + getEntrepotSettings().currency;
}

function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const statusConfig: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  envoyee: { label: "Envoyee", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  payee: { label: "Payee", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  partielle: { label: "Partielle", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  en_retard: { label: "En retard", color: "bg-red-500/15 text-red-600 dark:text-red-400" },
  annulee: { label: "Annulee", color: "bg-muted text-muted-foreground line-through" },
};

const typeConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  facture: { label: "Facture", color: "bg-primary/10 text-primary", icon: FileText },
  proforma: { label: "Proforma", color: "bg-violet-500/15 text-violet-600", icon: FileText },
  avoir: { label: "Avoir", color: "bg-orange-500/15 text-orange-600", icon: FileText },
  echange: { label: "Echange", color: "bg-cyan-500/15 text-cyan-600", icon: ArrowLeftRight },
  vente_flash: { label: "Vente flash", color: "bg-amber-500/15 text-amber-600", icon: Zap },
};

const paymentMethodLabels: Record<string, string> = {
  especes: "Especes",
  mobile_money: "Mobile Money",
  virement: "Virement bancaire",
  cheque: "Cheque",
  carte: "Carte bancaire",
  autre: "Autre",
};

interface InvoiceItem {
  _id: string;
  type: "product" | "service" | "section";
  productId?: { _id: string; name: string; brand: string; model: string; image: string; supplier?: { _id: string; name: string; phone: string }; variants?: { _id: string; serialNumber: string; barcode: string; supplier?: { _id: string; name: string; phone: string } }[] };
  variantId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  discountAmount?: number;
  discountReason?: string;
  total: number;
}

interface ExchangeItem {
  _id: string;
  description: string;
  variantLabel: string;
  price: number;
  quantity: number;
  notes: string;
  addToStock: boolean;
  label?: { id: string; name: string; color: string } | null;
}

interface InvoiceDetail {
  _id: string;
  number: string;
  type: string;
  status: string;
  client?: { _id: string; name: string; phone: string; email: string; address: string };
  date: string;
  dueDate?: string;
  items: InvoiceItem[];
  exchangeItems?: ExchangeItem[];
  subtotal: number;
  discountAmount?: number;
  discountReason?: string;
  showTax: boolean;
  taxRate: number;
  taxAmount: number;
  total: number;
  payment?: { enabled: boolean; amount: number; method: string; date: string };
  paymentHistory?: { _id: string; amount: number; method: string; date: string; note: string }[];
  warranty?: { enabled: boolean; duration: string; description: string };
  notes: string;
  signature: string;
  createdAt: string;
}

const InvoiceDetailPage = () => {
  usePrintFooterPush();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoPrint = searchParams.get("print") === "true";
  const highlightVariant = searchParams.get("highlight");

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { headers: getHeaders() });
      if (res.ok) {
        setInvoice(await res.json());
      } else {
        toast.error("Facture introuvable");
        navigate("/commerce/factures");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  useEffect(() => {
    if (autoPrint && invoice && !loading) {
      // Redirect to server-rendered print template
      const token = localStorage.getItem("senstock_token");
      window.location.href = `/api/print/invoice/${invoice._id || invoice.id}?token=${token}`;
    }
  }, [autoPrint, invoice, loading]);

  // Highlight the matching item row when coming from inventory
  useEffect(() => {
    if (highlightVariant && invoice && !loading) {
      const match = invoice.items.find((i) => i.variantId === highlightVariant);
      if (match) {
        setHighlightedItem(match._id);
        // Scroll to the articles section
        setTimeout(() => {
          document.getElementById(`item-${match._id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
        // Clear highlight after 3 seconds
        setTimeout(() => setHighlightedItem(null), 3500);
      }
      // Clean up the URL param
      setSearchParams({}, { replace: true });
    }
  }, [highlightVariant, invoice, loading, setSearchParams]);

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/commerce/factures")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground">Chargement...</h2>
        </div>
        <StockLoader />
      </div>
    );
  }

  if (!invoice) return null;

  const sc = statusConfig[invoice.status] || statusConfig.brouillon;
  const tc = typeConfig[invoice.type] || typeConfig.facture;
  const isBrouillon = invoice.status === "brouillon";
  const isPaidOrPartial = invoice.status === "payee" || invoice.status === "partielle";

  // Template rendering
  const commerceSettings = getCommerceSettings();
  const currency = getEntrepotSettings().currency;
  const templateInfo = getTemplateById(commerceSettings.invoiceTemplate);
  const TemplateComponent = templateInfo.component;

  async function handleRevertBrouillon() {
    if (!confirm(`Remettre la facture ${invoice!.number} en brouillon ?`)) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status: "brouillon", payment: { enabled: false, amount: 0, method: "especes" } }),
      });
      if (res.ok) {
        toast.success("Facture remise en brouillon");
        fetchInvoice();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  async function handleCancelPayment() {
    if (!confirm(`Annuler le paiement de la facture ${invoice!.number} ?`)) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ payment: { enabled: false, amount: 0, method: "especes" } }),
      });
      if (res.ok) {
        toast.success("Paiement annule");
        fetchInvoice();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  async function handleValidate() {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status: "envoyee" }),
      });
      if (res.ok) {
        toast.success("Facture validee");
        fetchInvoice();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer la facture ${invoice!.number} ?`)) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) {
        toast.success("Facture supprimee");
        navigate("/commerce/factures");
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  async function handleGenerateBL() {
    try {
      const res = await fetch(`/api/delivery-notes/from-invoice/${id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const bl = await res.json();
        toast.success(`Bon de livraison ${bl.number} cree`);
        navigate(`/commerce/bons-livraison/${bl._id}`);
      } else {
        const data = await res.json();
        if (data.existingId) {
          toast.error("Un BL existe deja pour cette facture");
          navigate(`/commerce/bons-livraison/${data.existingId}`);
        } else {
          toast.error(data.error || "Erreur");
        }
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  async function handleDuplicate() {
    try {
      const body = {
        type: invoice!.type,
        client: invoice!.client?._id,
        items: (invoice!.items || []).map((it) => ({
          type: it.type,
          productId: it.productId?._id || undefined,
          variantId: it.variantId,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          purchasePrice: it.purchasePrice,
          total: it.total,
        })),
        subtotal: invoice!.subtotal,
        showTax: invoice!.showTax,
        taxRate: invoice!.taxRate,
        taxAmount: invoice!.taxAmount,
        total: invoice!.total,
        notes: invoice!.notes || "",
      };
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        toast.success(`Facture dupliquee : ${created.number}`);
        navigate(`/commerce/factures/${created._id}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  return (
    <>
      {/* ═══ PRINT VIEW — portaled to <body> so it sits outside #root ═══ */}
      {createPortal(
        <div className="hidden print:block" id="invoice-print-area">
          <TemplateComponent invoice={invoice} settings={commerceSettings} currency={currency} />
        </div>,
        document.body
      )}

      {/* ═══ SCREEN VIEW — hidden during print ═══ */}
      <div className="print:hidden animate-fade-in">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/commerce/factures")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground font-mono">{invoice.number}</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tc.color}`}>
                  {tc.label}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sc.color}`}>
                  {sc.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Creee le {formatDate(invoice.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/commerce/factures/modifier/${id}`)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
            </Button>
            {isBrouillon && (
              <Button variant="outline" size="sm" onClick={handleValidate}>
                <Send className="h-3.5 w-3.5 mr-1" /> Valider
              </Button>
            )}
            {isPaidOrPartial && (
              <Button variant="outline" size="sm" className="text-orange-500 hover:text-orange-600" onClick={handleCancelPayment}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Annuler paiement
              </Button>
            )}
            {!isBrouillon && (
              <Button variant="outline" size="sm" className="text-amber-500 hover:text-amber-600" onClick={handleRevertBrouillon}>
                <Undo2 className="h-3.5 w-3.5 mr-1" /> Brouillon
              </Button>
            )}
            {!isBrouillon && (
              <Button variant="outline" size="sm" className="text-cyan-500 hover:text-cyan-600" onClick={handleGenerateBL}>
                <Truck className="h-3.5 w-3.5 mr-1" /> Generer BL
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => {
              const token = localStorage.getItem("senstock_token");
              window.open(`/api/print/invoice/${invoice._id || invoice.id}?token=${token}`, "_blank");
            }}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Imprimer
            </Button>
            <SendWhatsAppButton
              type="invoice"
              id={invoice._id || invoice.id}
              clientPhone={invoice.client?.phone}
              size="sm"
            />
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Dupliquer
            </Button>
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-4">
          {/* Info row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invoice info */}
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
                  <span className="font-mono font-medium">{invoice.number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tc.color}`}>
                    {invoice.type === "echange" && <RefreshCw className="h-3 w-3" />}
                    {invoice.type === "vente_flash" && <Zap className="h-3 w-3" />}
                    {tc.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Statut</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span>{formatDate(invoice.date)}</span>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Echeance</span>
                    <span>{formatDate(invoice.dueDate)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoice.client ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{invoice.client.name}</p>
                    {invoice.client.phone && (
                      <p className="text-sm text-muted-foreground">{invoice.client.phone}</p>
                    )}
                    {invoice.client.email && (
                      <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
                    )}
                    {invoice.client.address && (
                      <p className="text-sm text-muted-foreground">{invoice.client.address}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {invoice.type === "vente_flash" ? "Vente flash — pas de client" : "Aucun client"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Exchange items (if echange type) */}
          {invoice.type === "echange" && invoice.exchangeItems && invoice.exchangeItems.length > 0 && (
            <Card className="border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                  Produits echanges (recus du client)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Produit</TableHead>
                        <TableHead>Variante</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                        <TableHead className="text-center">Qte</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Étiquette</TableHead>
                        <TableHead className="text-center">Remis en stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.exchangeItems.map((ei) => (
                        <TableRow key={ei._id}>
                          <TableCell className="text-sm font-medium">{ei.description}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{ei.variantLabel || "—"}</TableCell>
                          <TableCell className="text-right text-sm">{formatFCFA(ei.price)}</TableCell>
                          <TableCell className="text-center text-sm">{ei.quantity}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{ei.notes || "—"}</TableCell>
                          <TableCell>
                            {ei.label ? (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                style={{ backgroundColor: ei.label.color }}
                              >
                                {ei.label.name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={ei.addToStock ? "default" : "secondary"} className="text-[10px]">
                              {ei.addToStock ? "Oui" : "Non"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Articles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun article</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Produit</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead className="text-center">Qte</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.map((item) =>
                        item.type === "section" ? (
                          <TableRow key={item._id} className="bg-muted/20 animate-list-item">
                            <TableCell colSpan={6} className="font-semibold text-sm">
                              {item.description || "Section"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow
                            key={item._id}
                            id={`item-${item._id}`}
                            className={`animate-list-item ${highlightedItem === item._id ? "animate-highlight" : ""}`}
                          >
                            <TableCell className="text-sm font-medium">
                              {item.productId ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 hover:text-primary hover:underline transition-colors text-left"
                                  onClick={() => navigate(`/entrepot/inventaire?product=${item.productId!._id}`)}
                                >
                                  {[item.productId.name, item.productId.brand, item.productId.model].filter(Boolean).join(" ")}
                                  <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                                </button>
                              ) : (
                                item.description || "Service"
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.variantId && item.productId?.variants
                                ? <span className="font-mono">{item.productId.variants.find((v) => v._id === item.variantId)?.serialNumber || ""}</span>
                                : item.description || ""}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {(() => {
                                if (!item.productId) return "—";
                                const variant = item.variantId && item.productId.variants
                                  ? item.productId.variants.find((v) => v._id === item.variantId)
                                  : null;
                                const supplier = variant?.supplier || item.productId.supplier;
                                return supplier ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Truck className="h-3 w-3 shrink-0" />
                                    {supplier.name}
                                  </span>
                                ) : "—";
                              })()}
                            </TableCell>
                            <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">{formatFCFA(item.unitPrice)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatFCFA(item.total)}
                              {(item.discountAmount || 0) > 0 && (
                                <span className="block text-[10px] text-destructive" title={item.discountReason || "Reduction"}>
                                  -{formatFCFA(item.discountAmount)} {item.discountReason ? `(${item.discountReason})` : ""}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-72 space-y-2 animate-scale-in">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-medium">{formatFCFA(invoice.subtotal)}</span>
                  </div>
                  {(invoice.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-destructive">
                        Reduction
                        {invoice.discountReason && <span className="text-[10px] text-muted-foreground ml-1">({invoice.discountReason})</span>}
                      </span>
                      <span className="font-medium text-destructive">-{formatFCFA(invoice.discountAmount)}</span>
                    </div>
                  )}
                  {invoice.showTax && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">TVA ({invoice.taxRate}%)</span>
                      <span className="font-medium">{formatFCFA(invoice.taxAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatFCFA(invoice.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          {(invoice.payment?.enabled || (invoice.paymentHistory && invoice.paymentHistory.length > 0)) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                {invoice.payment?.enabled && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total paye</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatFCFA(invoice.payment.amount)}</p>
                    </div>
                    {invoice.status === "partielle" && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-500">Reste a payer</p>
                        <p className="text-lg font-bold text-red-500">{formatFCFA(invoice.total - invoice.payment.amount)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* History */}
                {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Historique des paiements</p>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Methode</TableHead>
                            <TableHead className="text-xs text-right">Montant</TableHead>
                            <TableHead className="text-xs">Note</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.paymentHistory.map((ph) => (
                            <TableRow key={ph._id}>
                              <TableCell className="text-sm">{formatDate(ph.date)}</TableCell>
                              <TableCell className="text-sm">{paymentMethodLabels[ph.method] || ph.method}</TableCell>
                              <TableCell className={`text-sm text-right font-mono font-medium ${ph.amount < 0 ? "text-red-500" : "text-emerald-500"}`}>
                                {ph.amount > 0 ? "+" : ""}{formatFCFA(ph.amount)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{ph.note || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Warranty */}
          {invoice.warranty?.enabled && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Garantie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invoice.warranty.duration && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duree</span>
                    <span className="font-medium">{invoice.warranty.duration}</span>
                  </div>
                )}
                {invoice.warranty.description && (
                  <p className="text-sm text-muted-foreground">{invoice.warranty.description}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Signature */}
          {invoice.signature && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Signature</CardTitle>
              </CardHeader>
              <CardContent>
                <img src={invoice.signature} alt="Signature" className="h-24 border border-border rounded-md p-2 bg-white" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default InvoiceDetailPage;
