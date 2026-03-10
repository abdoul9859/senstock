import type { CommerceSettings } from "@/hooks/useCommerceSettings";

export interface PrintInvoiceItem {
  _id: string;
  type: "product" | "service" | "section";
  productId?: { _id: string; name: string; brand: string; model: string; image: string };
  variantId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  discountAmount?: number;
  discountReason?: string;
  total: number;
  delivered?: number;
}

export interface PrintExchangeItem {
  _id: string;
  description: string;
  variantLabel: string;
  price: number;
  quantity: number;
  notes: string;
  addToStock: boolean;
}

export interface PrintInvoice {
  _id: string;
  number: string;
  type: string;
  status: string;
  client?: { _id: string; name: string; phone: string; email: string; address: string };
  date: string;
  dueDate?: string;
  items: PrintInvoiceItem[];
  exchangeItems?: PrintExchangeItem[];
  subtotal: number;
  discountAmount?: number;
  discountReason?: string;
  showTax: boolean;
  taxRate: number;
  taxAmount: number;
  total: number;
  payment?: { enabled: boolean; amount: number; method: string; date: string };
  warranty?: { enabled: boolean; duration: string; description: string };
  notes: string;
  signature: string;
  createdAt: string;
  deliveryAddress?: string;
  invoiceNumber?: string;
}

export interface InvoiceTemplateProps {
  invoice: PrintInvoice;
  settings: CommerceSettings;
  currency: string;
}

export function formatCurrency(n: number | undefined, currency: string): string {
  if (n == null) return `0${currency}`;
  return n.toLocaleString("fr-FR") + currency;
}

export function formatDateFR(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatDateShort(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const typeLabels: Record<string, string> = {
  facture: "FACTURE",
  proforma: "FACTURE PROFORMA",
  avoir: "AVOIR",
  echange: "FACTURE D'ECHANGE",
  vente_flash: "VENTE FLASH",
  devis: "DEVIS",
  bon_livraison: "BON DE LIVRAISON",
};

export const paymentMethodLabels: Record<string, string> = {
  especes: "Especes",
  mobile_money: "Mobile Money",
  virement: "Virement bancaire",
  cheque: "Cheque",
  carte: "Carte bancaire",
  autre: "Autre",
};
