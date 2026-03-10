import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Printer, Pencil, Copy, Send, Trash2,
  FileText, Users, Package, StickyNote, CheckCircle, XCircle, ArrowRightCircle,
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
  envoyee: { label: "Envoye", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  accepte: { label: "Accepte", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  refuse: { label: "Refuse", color: "bg-red-500/15 text-red-600 dark:text-red-400" },
  expire: { label: "Expire", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  converti: { label: "Converti", color: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
};

interface QuoteItem {
  _id: string;
  type: "product" | "service" | "section";
  productId?: { _id: string; name: string; brand: string; model: string; image: string };
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteDetail {
  _id: string;
  number: string;
  status: string;
  client?: { _id: string; name: string; phone: string; email: string; address: string };
  date: string;
  validUntil?: string;
  items: QuoteItem[];
  subtotal: number;
  showTax: boolean;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  signature: string;
  convertedToInvoice?: string;
  createdAt: string;
}

const DevisDetailPage = () => {
  usePrintFooterPush();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("print") === "true";

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${id}`, { headers: getHeaders() });
      if (res.ok) {
        setQuote(await res.json());
      } else {
        toast.error("Devis introuvable");
        navigate("/commerce/devis");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  useEffect(() => {
    if (autoPrint && quote && !loading) {
      setTimeout(() => window.print(), 500);
    }
  }, [autoPrint, quote, loading]);

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/commerce/devis")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground">Chargement...</h2>
        </div>
        <StockLoader />
      </div>
    );
  }

  if (!quote) return null;

  const sc = statusConfig[quote.status] || statusConfig.brouillon;
  const isBrouillon = quote.status === "brouillon";
  const isConverted = quote.status === "converti";

  // Template rendering for print — reuse invoice templates by shaping the data
  const commerceSettings = getCommerceSettings();
  const currency = getEntrepotSettings().currency;
  const templateInfo = getTemplateById(commerceSettings.invoiceTemplate);
  const TemplateComponent = templateInfo.component;

  const printData = {
    ...quote,
    type: "devis",
    payment: undefined,
    warranty: undefined,
    exchangeItems: undefined,
  };

  async function handleValidate() {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify({ status: "envoyee" }),
      });
      if (res.ok) { toast.success("Devis envoye"); fetchQuote(); }
      else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleAccept() {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify({ status: "accepte" }),
      });
      if (res.ok) { toast.success("Devis accepte"); fetchQuote(); }
      else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleRefuse() {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify({ status: "refuse" }),
      });
      if (res.ok) { toast.success("Devis refuse"); fetchQuote(); }
      else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleConvert() {
    if (!confirm(`Convertir le devis ${quote!.number} en facture ?`)) return;
    try {
      const res = await fetch(`/api/quotes/${id}/convert`, {
        method: "POST", headers: getHeaders(), body: JSON.stringify({ invoiceType: "facture" }),
      });
      if (res.ok) {
        const invoice = await res.json();
        toast.success(`Facture ${invoice.number} creee`);
        navigate(`/commerce/factures/${invoice._id}`);
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le devis ${quote!.number} ?`)) return;
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) { toast.success("Devis supprime"); navigate("/commerce/devis"); }
      else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleDuplicate() {
    try {
      const body = {
        client: quote!.client?._id,
        items: (quote!.items || []).map((it) => ({
          type: it.type, productId: it.productId?._id || undefined,
          description: it.description, quantity: it.quantity,
          unitPrice: it.unitPrice, total: it.total,
        })),
        subtotal: quote!.subtotal, showTax: quote!.showTax, taxRate: quote!.taxRate,
        taxAmount: quote!.taxAmount, total: quote!.total,
        notes: quote!.notes || "",
      };
      const res = await fetch("/api/quotes", {
        method: "POST", headers: getHeaders(), body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        toast.success(`Devis duplique : ${created.number}`);
        navigate(`/commerce/devis/${created._id}`);
      } else { toast.error((await res.json()).error || "Erreur"); }
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
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/commerce/devis")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground font-mono">{quote.number}</h2>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-primary/10 text-primary">
                  Devis
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sc.color}`}>
                  {sc.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Cree le {formatDate(quote.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isConverted && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/commerce/devis/modifier/${id}`)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
              </Button>
            )}
            {isBrouillon && (
              <Button variant="outline" size="sm" onClick={handleValidate}>
                <Send className="h-3.5 w-3.5 mr-1" /> Envoyer
              </Button>
            )}
            {quote.status === "envoyee" && (
              <>
                <Button variant="outline" size="sm" className="text-emerald-500 hover:text-emerald-600" onClick={handleAccept}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accepter
                </Button>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={handleRefuse}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Refuser
                </Button>
              </>
            )}
            {(quote.status === "accepte" || quote.status === "envoyee") && !isConverted && (
              <Button variant="outline" size="sm" className="text-violet-500 hover:text-violet-600" onClick={handleConvert}>
                <ArrowRightCircle className="h-3.5 w-3.5 mr-1" /> Convertir en facture
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Imprimer
            </Button>
            <SendWhatsAppButton
              type="quote"
              id={quote._id || quote.id}
              clientPhone={quote.client?.phone}
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
                  <span className="font-mono font-medium">{quote.number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Statut</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span>{formatDate(quote.date)}</span>
                </div>
                {quote.validUntil && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valide jusqu'au</span>
                    <span>{formatDate(quote.validUntil)}</span>
                  </div>
                )}
                {isConverted && quote.convertedToInvoice && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Converti en</span>
                    <button
                      className="text-primary hover:underline text-sm"
                      onClick={() => navigate(`/commerce/factures/${quote.convertedToInvoice}`)}
                    >
                      Voir la facture
                    </button>
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
                {quote.client ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{quote.client.name}</p>
                    {quote.client.phone && <p className="text-sm text-muted-foreground">{quote.client.phone}</p>}
                    {quote.client.email && <p className="text-sm text-muted-foreground">{quote.client.email}</p>}
                    {quote.client.address && <p className="text-sm text-muted-foreground">{quote.client.address}</p>}
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
              {quote.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun article</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Produit / Description</TableHead>
                        <TableHead className="text-center">Qte</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quote.items.map((item) =>
                        item.type === "section" ? (
                          <TableRow key={item._id} className="bg-muted/20 animate-list-item">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                              {item.description || "Section"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={item._id} className="animate-list-item">
                            <TableCell className="text-sm font-medium">
                              {item.productId
                                ? [item.productId.name, item.productId.brand, item.productId.model].filter(Boolean).join(" ")
                                : item.description || "Service"}
                            </TableCell>
                            <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">{formatFCFA(item.unitPrice)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatFCFA(item.total)}</TableCell>
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
                    <span className="font-medium">{formatFCFA(quote.subtotal)}</span>
                  </div>
                  {quote.showTax && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">TVA ({quote.taxRate}%)</span>
                      <span className="font-medium">{formatFCFA(quote.taxAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatFCFA(quote.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {quote.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Signature */}
          {quote.signature && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Signature</CardTitle>
              </CardHeader>
              <CardContent>
                <img src={quote.signature} alt="Signature" className="h-24 border border-border rounded-md p-2 bg-white" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default DevisDetailPage;
