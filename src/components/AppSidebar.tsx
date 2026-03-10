import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Boxes, Settings, Bell, ChevronsLeft, ChevronsRight, LogOut, User, ChevronUp, MessageCircle, Trash2, Globe } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { isNewFeature, isUpcomingFeature } from "@/config/featureFlags";

// Map sidebar URLs to required permissions (gérant only — admin bypasses)
const URL_PERMISSIONS: Record<string, string> = {
  // Entrepot
  "/entrepot/dashboard": "entrepot.voir",
  "/entrepot/inventaire": "entrepot.voir",
  "/entrepot/mouvements": "entrepot.mouvements",
  "/entrepot/codes-barres": "entrepot.voir",
  "/entrepot/categories": "entrepot.categories",
  "/entrepot/doublons": "entrepot.voir",
  "/entrepot/maintenance": "entrepot.voir",
  "/entrepot/parametres": "entrepot.parametres",
  // Commerce
  "/commerce/dashboard": "commerce.voir",
  "/commerce/factures": "commerce.voir",
  "/commerce/devis": "commerce.devis",
  "/commerce/bons-livraison": "commerce.voir",
  "/commerce/clients": "commerce.clients",
  "/commerce/demandes": "commerce.clients",
  "/commerce/creances": "commerce.creances",
  "/commerce/achats": "commerce.achats",
  "/commerce/caisse": "commerce.voir",
  "/commerce/doublons-clients": "commerce.clients",
  "/commerce/parametres": "commerce.parametres",
  // Boutique
  "/boutique/dashboard": "boutique.voir",
  "/boutique/catalogue": "boutique.catalogue",
  "/boutique/commandes": "boutique.commandes",
  "/boutique/promotions": "boutique.promotions",
  "/boutique/site-web": "boutique.voir",
  "/boutique/parametres": "boutique.parametres",
  // Personnel
  "/personnel/dashboard": "personnel.voir",
  "/personnel/employes": "personnel.employes",
  "/personnel/salaires": "personnel.salaires",
  "/personnel/conges": "personnel.employes",
  "/personnel/presences": "personnel.employes",
  // Banque
  "/banque/dashboard": "banque.voir",
  "/banque/comptes": "banque.comptes",
  "/banque/transactions": "banque.transactions",
  "/banque/virements": "banque.virements",
  "/banque/conversion": "banque.transactions",
  "/banque/rapprochement": "banque.transactions",
  "/banque/import": "banque.transactions",
  "/banque/parametres": "banque.parametres",
  // Analytique
  "/analytique/dashboard": "analytique.voir",
  "/analytique/tendances": "analytique.voir",
  "/analytique/repartition": "analytique.voir",
  "/analytique/rentabilite": "analytique.voir",
  "/analytique/objectifs": "analytique.voir",
  // Pilotage
  "/taches/dashboard": "taches.voir",
  "/taches/tableaux": "taches.tableaux",
  "/taches/liste": "taches.voir",
  "/taches/agenda": "taches.agenda",
  // Logistique
  "/logistique/dashboard": "logistique.voir",
  "/logistique/fournisseurs": "logistique.fournisseurs",
  "/logistique/notations": "logistique.fournisseurs",
  "/logistique/commandes": "logistique.commandes",
  "/logistique/livraisons": "logistique.livraisons",
  "/logistique/planification": "logistique.commandes",
};
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const AppSidebar = () => {
  const { current } = useWorkspace();
  const { user, logout, updateProfile, hasPermission, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Profile form state
  const [profileName, setProfileName] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  // Filter sidebar items based on gérant permissions (admin sees all)
  const filteredItems = useMemo(() => {
    if (isAdmin) return current.items;
    return current.items.filter((item) => {
      const perm = URL_PERMISSIONS[item.url];
      if (!perm) return true; // no permission mapping = always visible
      return hasPermission(perm);
    });
  }, [current.items, isAdmin, hasPermission]);

  const fetchTrashCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("mbayestock_token");
      if (!token) return;
      const res = await fetch("/api/trash/count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTrashCount(data.total || 0);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTrashCount();
    const interval = setInterval(fetchTrashCount, 30000);
    return () => clearInterval(interval);
  }, [fetchTrashCount]);

  function handleLogout() {
    setPopoverOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  function openProfileDialog() {
    setPopoverOpen(false);
    setProfileName(user?.name || "");
    setProfilePassword("");
    setProfileError("");
    setProfileSuccess("");
    setProfileOpen(true);
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    const data: { name?: string; password?: string } = {};
    if (profileName.trim() && profileName.trim() !== user?.name) {
      data.name = profileName.trim();
    }
    if (profilePassword) {
      if (profilePassword.length < 4) {
        setProfileError("Le mot de passe doit contenir au moins 4 caractères");
        return;
      }
      data.password = profilePassword;
    }

    if (!data.name && !data.password) {
      setProfileError("Aucune modification détectée");
      return;
    }

    setProfileSaving(true);
    const result = await updateProfile(data);
    setProfileSaving(false);

    if (result.success) {
      setProfileSuccess("Profil mis à jour");
      setProfilePassword("");
      setTimeout(() => setProfileOpen(false), 800);
    } else {
      setProfileError(result.error || "Erreur de mise à jour");
    }
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-sidebar shrink-0 transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex border-b border-border",
        collapsed ? "flex-col items-center gap-2 px-2 py-4" : "items-center justify-between px-3 py-5"
      )}>
        <div className={cn("flex items-center overflow-hidden", collapsed ? "justify-center" : "gap-2.5")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Boxes className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground">StockFlow</h1>
              <p className="text-[10px] text-muted-foreground">v1.0.0</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          title={collapsed ? "Étendre" : "Réduire"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {!collapsed && (
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {current.label}
          </p>
        )}
        <ul className="space-y-0.5">
          {filteredItems.map((item) => {
            const upcoming = isUpcomingFeature(item.url);
            const isNew = isNewFeature(item.url);
            return (
              <li key={item.url}>
                {upcoming ? (
                  <div
                    className={cn(
                      "flex items-center rounded-md px-2.5 py-2 text-[13px] font-medium text-muted-foreground/50 cursor-not-allowed",
                      collapsed ? "justify-center py-2.5" : "gap-2.5"
                    )}
                    title={collapsed ? `${item.title} (Prochainement)` : undefined}
                  >
                    <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.title}</span>
                        <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] font-medium leading-none text-muted-foreground">
                          Bientôt
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.url}
                    className={cn(
                      "nav-item-animated relative flex items-center rounded-md px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed ? "justify-center py-2.5" : "gap-2.5"
                    )}
                    activeClassName="bg-sidebar-accent text-foreground nav-active-dot"
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.title}</span>
                        {isNew && (
                          <span className="rounded-full bg-green-500 px-1.5 py-0.5 text-[9px] font-medium leading-none text-white">
                            Nouveau
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>

      </nav>

      {/* Trash link */}
      <div className="px-2 pb-1">
        <NavLink
          to="/corbeille"
          className={cn(
            "flex items-center rounded-md px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "justify-center py-2.5" : "gap-2.5"
          )}
          activeClassName="bg-sidebar-accent text-foreground"
          title={collapsed ? `Corbeille (${trashCount})` : undefined}
        >
          <Trash2 className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
          {!collapsed && (
            <>
              <span className="flex-1">Corbeille</span>
              {trashCount > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                  {trashCount}
                </span>
              )}
            </>
          )}
        </NavLink>
      </div>

      {/* User profile */}
      {user && (
        <div className="border-t border-border px-2 py-3">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent cursor-pointer",
                  collapsed ? "justify-center" : "gap-2.5"
                )}
                title={collapsed ? user.name : undefined}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="truncate text-[13px] font-medium text-foreground">{user.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 p-1.5">
              <div className="px-2 py-2 border-b border-border mb-1">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                {user.role && (
                  <span className="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary capitalize">
                    {user.role}
                  </span>
                )}
              </div>
              <button
                onClick={openProfileDialog}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <User className="h-4 w-4" />
                Mon profil
              </button>
              <button
                onClick={() => { setPopoverOpen(false); navigate("/parametres"); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Settings className="h-4 w-4" />
                Paramètres
              </button>
              <button
                onClick={() => { setPopoverOpen(false); navigate("/notifications"); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Bell className="h-4 w-4" />
                Notifications
              </button>
              <button
                onClick={() => {
                  setPopoverOpen(false);
                  // Scroll to bottom to reveal floating contact widget, or open it programmatically
                  const widget = document.querySelector("[title='Contactez-nous']") as HTMLButtonElement;
                  if (widget) widget.click();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-green-600 dark:text-green-400 transition-colors hover:bg-green-500/10"
              >
                <MessageCircle className="h-4 w-4" />
                Contactez-nous
              </button>
              <button
                onClick={() => { setPopoverOpen(false); navigate("/"); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Globe className="h-4 w-4" />
                Page d'accueil
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Profile edit dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mon profil</DialogTitle>
            <DialogDescription>Modifiez vos informations personnelles</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {profileError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                {profileSuccess}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="profile-email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={user?.email || ""}
                className="flex h-9 w-full rounded-md border border-border bg-muted px-3 py-1 text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="text-sm font-medium text-foreground">
                Nom
              </label>
              <input
                id="profile-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-password" className="text-sm font-medium text-foreground">
                Nouveau mot de passe
              </label>
              <input
                id="profile-password"
                type="password"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                placeholder="Laisser vide pour ne pas changer"
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {profileSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
};
