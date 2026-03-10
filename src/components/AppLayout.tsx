import { useState, useEffect, useMemo, useCallback } from "react";
import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { Sun, Moon, ChevronRight, Bell } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { ContactWidget } from "@/components/ContactWidget";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("senstock_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    localStorage.setItem("senstock_theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

export const AppLayout = () => {
  const { current } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const [notifCount, setNotifCount] = useState(0);

  const fetchNotifCount = useCallback(async () => {
    const token = localStorage.getItem("senstock_token");
    if (!token) return;
    try {
      const res = await fetch("/api/tasks/notification-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifCount(data.total || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifCount]);

  // Find current page — exact match first, then prefix match for sub-pages
  const { currentItem, parentItem } = useMemo(() => {
    const exact = current.items.find((i) => i.url === location.pathname);
    if (exact) return { currentItem: exact, parentItem: null };
    // Sub-page: e.g. /commerce/factures/nouvelle → parent is /commerce/factures
    const parent = current.items.find((i) => location.pathname.startsWith(i.url + "/"));
    return { currentItem: null, parentItem: parent };
  }, [current.items, location.pathname]);

  const workspaceHome = current.items[0]?.url || "/";

  // Sub-page title from URL last segment
  const subPageTitle = useMemo(() => {
    if (currentItem || !parentItem) return null;
    const rest = location.pathname.slice(parentItem.url.length + 1);
    const segment = rest.split("/")[0];
    const labels: Record<string, string> = {
      nouvelle: "Nouvelle facture",
      modifier: "Modifier",
    };
    return labels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  }, [currentItem, parentItem, location.pathname]);

  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-6 shrink-0">
          <nav className="flex items-center gap-1.5 text-sm shrink-0">
            <Link to={workspaceHome} className="text-muted-foreground hover:text-foreground transition-colors">
              {current.label}
            </Link>
            {currentItem && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="text-foreground font-medium">
                  {currentItem.title}
                </span>
              </>
            )}
            {parentItem && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <Link to={parentItem.url} className="text-muted-foreground hover:text-foreground transition-colors">
                  {parentItem.title}
                </Link>
                {subPageTitle && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-foreground font-medium">
                      {subPageTitle}
                    </span>
                  </>
                )}
              </>
            )}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-3">
            <GlobalSearch />
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate("/notifications")}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === "dark" ? "Theme clair" : "Theme sombre"}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <WorkspaceSwitcher />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>
      <ContactWidget />
    </div>
  );
};
