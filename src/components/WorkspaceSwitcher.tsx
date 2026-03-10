import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, Check, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Map workspace id to the "voir" permission needed
const WORKSPACE_PERMISSIONS: Record<string, string> = {
  entrepot: "entrepot.voir",
  commerce: "commerce.voir",
  boutique: "boutique.voir",
  personnel: "personnel.voir",
  banque: "banque.voir",
  analytique: "analytique.voir",
  logistique: "logistique.voir",
  taches: "taches.voir",
};

export const WorkspaceSwitcher = () => {
  const { current, setCurrent, all } = useWorkspace();
  const { hasModule, hasPermission, isAdmin } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors outline-none">
        <current.icon className="h-4 w-4 text-primary" />
        <span>{current.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {all.map((ws) => {
          const locked = !hasModule(ws.id);
          // For gérant: hide workspaces they have no permission to view
          const perm = WORKSPACE_PERMISSIONS[ws.id];
          const noAccess = !isAdmin && perm && !hasPermission(perm);
          if (noAccess) return null;
          return (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => !locked && setCurrent(ws)}
              className={`flex items-center gap-3 ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              disabled={locked}
            >
              <ws.icon className={`h-4 w-4 ${locked ? "text-muted-foreground" : "text-primary"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{ws.label}</p>
                <p className="text-xs text-muted-foreground">{ws.description}</p>
              </div>
              {locked ? (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              ) : current.id === ws.id ? (
                <Check className="h-4 w-4 text-primary" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
