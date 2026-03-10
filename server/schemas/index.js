const { z } = require("zod");

// ─── Auth ───
const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Nom requis").max(100),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe: 6 caracteres minimum"),
  businessName: z.string().optional(),
});

// ─── Products ───
const productSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  categoryId: z.string().uuid("Categorie invalide"),
  brand: z.string().max(100).optional().default(""),
  model: z.string().max(100).optional().default(""),
  purchasePrice: z.number().min(0).optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  sellingPrice: z.number().min(0).optional().nullable(),
  description: z.string().max(5000).optional().default(""),
  notes: z.string().max(5000).optional().default(""),
  supplierId: z.string().uuid().optional().nullable(),
  image: z.string().max(500).optional().default(""),
  quantity: z.number().int().min(0).optional().default(0),
  attributes: z.any().optional().default({}),
  archived: z.boolean().optional().default(false),
  published: z.boolean().optional().default(false),
}).passthrough(); // Allow extra fields like online* fields

// ─── Categories ───
const categorySchema = z.object({
  name: z.string().min(1, "Nom requis").max(100),
  description: z.string().max(500).optional().default(""),
  hasVariants: z.boolean().optional().default(false),
  attributes: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(["text", "number", "select"]).default("text"),
    options: z.array(z.string()).optional().default([]),
    required: z.boolean().optional().default(false),
  })).optional().default([]),
});

// ─── Clients ───
const clientSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  phone: z.string().max(50).optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional().default(""),
  notes: z.string().max(5000).optional().default(""),
});

// ─── Suppliers ───
const supplierSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  phone: z.string().max(50).optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional().default(""),
  notes: z.string().max(5000).optional().default(""),
});

// ─── Invoices ───
const invoiceSchema = z.object({
  type: z.enum(["facture", "proforma", "avoir", "echange", "vente_flash"]).optional().default("facture"),
  clientId: z.string().uuid().optional().nullable(),
  date: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  items: z.array(z.object({
    type: z.enum(["product", "service", "section"]).optional().default("product"),
    productId: z.string().uuid().optional().nullable(),
    variantId: z.string().optional().nullable(),
    description: z.string().max(500).optional().default(""),
    quantity: z.number().int().min(0).optional().default(1),
    unitPrice: z.number().min(0).optional().default(0),
    purchasePrice: z.number().min(0).optional().default(0),
  })).optional().default([]),
  notes: z.string().max(5000).optional().default(""),
  showTax: z.boolean().optional(),
  taxRate: z.number().min(0).max(100).optional(),
}).passthrough();

// ─── Employees ───
const employeeSchema = z.object({
  firstName: z.string().min(1, "Prenom requis").max(100),
  lastName: z.string().min(1, "Nom requis").max(100),
  phone: z.string().min(1, "Telephone requis").max(50),
  email: z.string().email().optional().or(z.literal("")),
  position: z.string().min(1, "Poste requis").max(100),
  department: z.string().max(100).optional().default(""),
  contractType: z.enum(["cdi", "cdd", "stage", "freelance"]).optional().default("cdi"),
  baseSalary: z.number().min(0).optional().default(0),
}).passthrough();

// ─── Bank Accounts ───
const bankAccountSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  bankName: z.string().max(200).optional().default(""),
  accountNumber: z.string().max(100).optional().default(""),
  type: z.enum(["courant", "epargne", "mobile_money"]).optional().default("courant"),
  currency: z.string().max(10).optional().default("FCFA"),
  balance: z.number().optional().default(0),
});

// ─── Bank Transactions ───
const bankTransactionSchema = z.object({
  type: z.enum(["entree", "sortie", "virement"]),
  category: z.string().max(100).optional().default("autre"),
  amount: z.number().positive("Montant doit etre positif"),
  description: z.string().max(500).optional().default(""),
  accountId: z.string().uuid("Compte invalide"),
  toAccountId: z.string().uuid().optional().nullable(),
  date: z.string().optional(),
  reference: z.string().max(200).optional().default(""),
}).passthrough();

module.exports = {
  loginSchema,
  registerSchema,
  productSchema,
  categorySchema,
  clientSchema,
  supplierSchema,
  invoiceSchema,
  employeeSchema,
  bankAccountSchema,
  bankTransactionSchema,
};
