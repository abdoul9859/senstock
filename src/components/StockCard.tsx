import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "warning" | "inactive";
}

const statusStyles = {
  active: "bg-success",
  warning: "bg-warning",
  inactive: "bg-muted-foreground",
};

export const StatusDot = ({ status }: StatusBadgeProps) => (
  <span className={cn("inline-block h-2.5 w-2.5 rounded-full", statusStyles[status])} />
);

interface StockCardProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  status?: "active" | "warning" | "inactive";
  image?: string;
  onClick?: () => void;
}

export const StockCard = ({ title, subtitle, icon: Icon, status, image, onClick }: StockCardProps) => (
  <div
    onClick={onClick}
    className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-pointer animate-fade-in"
  >
    <div className="flex items-start gap-3">
      {image && (
        <img src={image} alt="" className="h-10 w-10 shrink-0 rounded-md border border-border object-cover" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold text-card-foreground truncate">{title}</h3>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {status && <StatusDot status={status} />}
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  </div>
);

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
}

export const StatCard = ({ label, value, icon: Icon, trend }: StatCardProps) => (
  <div className="rounded-lg border border-border bg-card p-5 animate-fade-in">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="mt-2 text-2xl font-bold text-card-foreground animate-count-up">{value}</p>
    {trend && <p className="mt-1 text-xs text-primary">{trend}</p>}
  </div>
);
