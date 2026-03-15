export { TemplateLBP } from "./TemplateLBP";
export { TemplateTECHZONE } from "./TemplateTECHZONE";
export { TemplateMinimal } from "./TemplateMinimal";
export { TemplateClassique } from "./TemplateClassique";
export type { InvoiceTemplateProps, PrintInvoice } from "./types";
export { formatCurrency, formatDateFR, formatDateShort, typeLabels, paymentMethodLabels } from "./types";

import type { InvoiceTemplateProps } from "./types";
import { TemplateLBP } from "./TemplateLBP";
import { TemplateTECHZONE } from "./TemplateTECHZONE";
import { TemplateMinimal } from "./TemplateMinimal";
import { TemplateClassique } from "./TemplateClassique";

export type TemplateId = "lbp" | "techzone" | "minimal" | "classique";

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  component: React.ComponentType<InvoiceTemplateProps>;
}

export const templates: TemplateInfo[] = [
  {
    id: "classique",
    name: "Classique",
    description: "Design gold professionnel avec en-tête, sections et garantie intégrée",
    component: TemplateClassique,
  },
  {
    id: "lbp",
    name: "Modèle 1",
    description: "Design professionnel avec en-tête, tableau et footer détaillé",
    component: TemplateLBP,
  },
  {
    id: "techzone",
    name: "Modèle 2",
    description: "Design moderne et épuré avec total en avant et barre d'accent",
    component: TemplateTECHZONE,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Design épuré et aéré avec fond chaleureux et mise en page claire",
    component: TemplateMinimal,
  },
];

export function getTemplateById(id: string): TemplateInfo {
  return templates.find((t) => t.id === id) || templates[0];
}
