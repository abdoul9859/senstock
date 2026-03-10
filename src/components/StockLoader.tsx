import { Boxes } from "lucide-react";

export const StockLoader = () => (
  <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
    <div className="relative mb-4">
      {/* Icon container */}
      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
        <Boxes className="h-5 w-5 text-primary animate-pulse" style={{ animationDuration: "0.8s" }} />
      </div>
    </div>
    {/* Loading bars */}
    <div className="flex items-end gap-0.5 mb-3 h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-0.5 rounded-full bg-primary/50"
          style={{
            animation: "stock-bar 0.6s ease-in-out infinite",
            animationDelay: `${i * 0.08}s`,
            height: "6px",
          }}
        />
      ))}
    </div>
    <p className="text-xs text-muted-foreground">Chargement...</p>
    <style>{`
      @keyframes stock-bar {
        0%, 100% { height: 6px; opacity: 0.3; }
        50% { height: 16px; opacity: 1; }
      }
    `}</style>
  </div>
);
