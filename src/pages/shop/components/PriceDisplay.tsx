import { useShopSettings } from "@/contexts/ShopSettingsContext";

interface PriceDisplayProps {
  amount: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function PriceDisplay({ amount, className = "", size = "md" }: PriceDisplayProps) {
  const { settings } = useShopSettings();
  const formatted = amount.toLocaleString("fr-FR") + settings.commerce.currency;

  const sizeClass = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-semibold",
    xl: "text-2xl font-bold",
  }[size];

  return <span className={`${sizeClass} ${className}`}>{formatted}</span>;
}
