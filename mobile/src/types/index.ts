import type { PlanType } from "../config/planPermissions";

// ── Auth ──

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TenantInfo {
  plan: PlanType;
  subscriptionStatus: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
  trialEndsAt: string | null;
}

// ── Products ──

export interface ProductVariant {
  _id: string;
  name: string;
  serialNumber?: string;
  barcode?: string;
  condition?: string;
  purchasePrice: number;
  sellingPrice: number;
  price?: number | null;
  sold: boolean;
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  category?: Category;
  brand?: string;
  model?: string;
  purchasePrice: number;
  costPrice?: number;
  sellingPrice: number;
  supplier?: Supplier;
  notes?: string;
  image?: string;
  quantity: number;
  attributes?: Record<string, string>;
  variants: ProductVariant[];
  archived?: boolean;
  deleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ── Categories ──

export interface Category {
  _id: string;
  name: string;
  description?: string;
  parent?: string;
}

// ── Clients ──

export interface Client {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

// ── Suppliers ──

export interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
  rating?: number;
  ratingCount?: number;
}

// ── Invoices ──

export type InvoiceType = "facture" | "proforma" | "avoir" | "echange" | "vente_flash";
export type InvoiceStatus = "impayee" | "partielle" | "payee" | "annulee";

export interface InvoiceItem {
  _id: string;
  type: "product" | "service";
  productId?: {
    _id: string;
    name: string;
    brand?: string;
    model?: string;
    image?: string;
  };
  description: string;
  quantity: number;
  unitPrice: number;
  purchasePrice?: number;
  total: number;
}

export interface Invoice {
  _id: string;
  number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  client: Client;
  date: string;
  dueDate?: string;
  items: InvoiceItem[];
  exchangeItems?: InvoiceItem[];
  subtotal: number;
  showTax?: boolean;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  payment?: {
    enabled: boolean;
    amount: number;
    method?: string;
    date?: string;
  };
  warranty?: {
    enabled: boolean;
    duration?: string;
    description?: string;
  };
  notes?: string;
  signature?: string;
  createdAt: string;
}

// ── Employees ──

export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  role?: string;
  salary?: number;
  startDate?: string;
}

// ── Bank ──

export interface BankAccount {
  _id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export interface BankTransaction {
  _id: string;
  accountId: string | { _id: string; name: string };
  type: "credit" | "debit" | "virement";
  amount: number;
  description: string;
  category?: string;
  date: string;
  fromAccount?: string | { _id: string; name: string };
  toAccount?: string | { _id: string; name: string };
  createdAt: string;
}

// ── Orders (Boutique) ──

export interface Order {
  _id: string;
  number: string;
  source: "manuel" | "boutique";
  customer: { name: string; phone?: string; email?: string };
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

// ── Purchase Orders (Logistique) ──

export interface PurchaseOrder {
  _id: string;
  number: string;
  supplier: Supplier;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  total: number;
  status: string;
  createdAt: string;
}

// ── Quotes ──

export type QuoteStatus = "en_attente" | "accepte" | "refuse" | "expire";

export interface Quote {
  _id: string;
  number: string;
  status: QuoteStatus;
  client: Client;
  date: string;
  validUntil?: string;
  items: InvoiceItem[];
  subtotal: number;
  showTax?: boolean;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  notes?: string;
  createdAt: string;
}

// ── Delivery Notes ──

export interface DeliveryNote {
  _id: string;
  number: string;
  invoice?: { _id: string; number: string };
  client: Client;
  status: "en_cours" | "livre";
  items: { description: string; quantity: number }[];
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
}

// ── Receivables ──

export interface Creance {
  _id: string;
  client: Client;
  invoice?: { _id: string; number: string };
  amount: number;
  amountPaid: number;
  remaining: number;
  dueDate: string;
  status: "en_cours" | "en_retard" | "payee";
  createdAt: string;
}

// ── Daily Purchases ──

export interface DailyPurchase {
  _id: string;
  description: string;
  amount: number;
  category?: string;
  date: string;
  createdAt: string;
}

// ── Salaries ──

export interface Salary {
  _id: string;
  employee: Employee;
  amount: number;
  month: number;
  year: number;
  status: "en_attente" | "paye";
  paidAt?: string;
  createdAt: string;
}

// ── Leaves ──

export type LeaveType = "conge_paye" | "maladie" | "sans_solde" | "maternite" | "autre";
export type LeaveStatus = "en_attente" | "approuve" | "refuse";

export interface Leave {
  _id: string;
  employee: Employee;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: LeaveStatus;
  createdAt: string;
}

// ── Attendance ──

export interface Attendance {
  _id: string;
  employee: Employee;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "present" | "absent" | "retard" | "conge";
  notes?: string;
}

// ── Supplier Ratings ──

export interface SupplierRating {
  _id: string;
  supplier: Supplier;
  qualityScore: number;
  deliveryScore: number;
  priceScore: number;
  serviceScore: number;
  comment?: string;
  ratedBy?: string;
  createdAt: string;
}

// ── Promotions ──

export interface Promotion {
  _id: string;
  name: string;
  type: "pourcentage" | "fixe";
  value: number;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

// ── Tasks ──

export interface TaskBoard {
  _id: string;
  name: string;
  description?: string;
  columns: TaskColumn[];
  createdAt: string;
}

export interface TaskColumn {
  _id: string;
  name: string;
  cards: TaskCard[];
}

export interface TaskCard {
  _id: string;
  title: string;
  description?: string;
  priority?: "haute" | "moyenne" | "basse";
  assignee?: string;
  dueDate?: string;
  columnId?: string;
  createdAt: string;
}

// ── Recurring Invoices ──

export interface RecurringInvoice {
  _id: string;
  client: Client;
  frequency: "hebdomadaire" | "mensuel" | "trimestriel" | "annuel";
  nextDate: string;
  lastGeneratedAt?: string;
  active: boolean;
  templateItems: { description: string; quantity: number; unitPrice: number }[];
  showTax?: boolean;
  taxRate?: number;
  notes?: string;
  totalGenerated: number;
  createdAt: string;
}

// ── Arrivages ──

export interface ArrivageItem {
  _id: string;
  productId?: string;
  product?: { _id: string; name: string; brand?: string; model?: string; image?: string; sellingPrice?: number; purchasePrice?: number };
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  variantIds?: string[];
}

export interface Arrivage {
  _id: string;
  reference: string;
  supplier?: Supplier;
  date: string;
  status: "en_cours" | "recu" | "annule";
  totalItems: number;
  totalCost: number;
  notes?: string;
  items: ArrivageItem[];
  createdAt: string;
}

// ── Stock Movements ──

export interface StockMovement {
  _id: string;
  product: { _id: string; name: string };
  type: string;
  quantity: number;
  note?: string;
  createdAt: string;
}
