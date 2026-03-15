import { Monitor, Smartphone, Laptop, X } from "lucide-react";
import { useState } from "react";

interface DraftSession {
  id: string;
  device: string;
  deviceName: string;
  updatedAt: string;
}

interface DraftBannerProps {
  drafts: DraftSession[];
  onResume?: () => void;
  className?: string;
}

function getDeviceIcon(device: string) {
  if (device === "mobile") return Smartphone;
  return Monitor;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "a l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function DraftBanner({ drafts, onResume, className = "" }: DraftBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Only show drafts updated in the last 10 minutes
  const recentDrafts = drafts.filter((d) => {
    const diffMs = Date.now() - new Date(d.updatedAt).getTime();
    return diffMs < 10 * 60 * 1000;
  });

  if (recentDrafts.length === 0 || dismissed) return null;

  const draft = recentDrafts[0];
  const Icon = getDeviceIcon(draft.device);
  const deviceLabel = draft.device === "mobile" ? "mobile" : "ordinateur";

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm animate-in slide-in-from-top-2 ${className}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
        <Icon className="h-4 w-4 text-blue-500" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">
          Creation en cours sur {deviceLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          {draft.deviceName ? `${draft.deviceName} - ` : ""}
          {formatTime(draft.updatedAt)}
        </p>
      </div>
      {onResume && (
        <button
          onClick={onResume}
          className="shrink-0 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
        >
          Reprendre
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
