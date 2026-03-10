import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  KanbanSquare,
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  CalendarDays,
} from "lucide-react";

interface Stats {
  totalBoards: number;
  totalCards: number;
  completedCards: number;
  urgentCards: number;
  overdueCards: number;
}

interface Board {
  _id: string;
  id: string;
  name: string;
  description: string;
  color: string;
  columns: { id: string; name: string; _count: { cards: number } }[];
  _count: { columns: number };
}

function getToken() {
  return localStorage.getItem("mbayestock_token") || "";
}

export default function TaskDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchData = async () => {
    try {
      const [sRes, bRes] = await Promise.all([
        fetch("/api/tasks/stats", { headers }),
        fetch("/api/tasks/boards", { headers }),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (bRes.ok) setBoards(await bRes.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createBoard = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/tasks/boards", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Nouveau tableau" }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {}
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completionRate = stats && stats.totalCards > 0
    ? Math.round((stats.completedCards / stats.totalCards) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pilotage</h1>
          <p className="text-muted-foreground">
            Gérez vos projets et tâches comme un pro
          </p>
        </div>
        <Button onClick={createBoard} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau tableau
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border p-4 bg-blue-500/10 animate-card">
          <KanbanSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats?.totalBoards || 0}
          </div>
          <div className="text-sm text-muted-foreground">Tableaux</div>
        </div>
        <div className="rounded-lg border p-4 bg-purple-500/10 animate-card">
          <ListChecks className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1" />
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats?.totalCards || 0}
          </div>
          <div className="text-sm text-muted-foreground">Tâches totales</div>
        </div>
        <div className="rounded-lg border p-4 bg-green-500/10 animate-card">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mb-1" />
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completionRate}%
          </div>
          <div className="text-sm text-muted-foreground">Complétées</div>
        </div>
        <div className="rounded-lg border p-4 bg-red-500/10 animate-card">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mb-1" />
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats?.urgentCards || 0}
          </div>
          <div className="text-sm text-muted-foreground">Urgentes</div>
        </div>
        <div className="rounded-lg border p-4 bg-orange-500/10 animate-card">
          <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400 mb-1" />
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {stats?.overdueCards || 0}
          </div>
          <div className="text-sm text-muted-foreground">En retard</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
        <Link
          to="/taches/tableaux"
          className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Tableaux Kanban</h3>
              <p className="text-sm text-muted-foreground">
                Visualisez et organisez vos tâches en colonnes
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
        <Link
          to="/taches/liste"
          className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Toutes les tâches</h3>
              <p className="text-sm text-muted-foreground">
                Vue liste de toutes vos tâches avec filtres
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
        <Link
          to="/taches/agenda"
          className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Agenda</h3>
              <p className="text-sm text-muted-foreground">
                Calendrier mensuel de vos tâches planifiées
              </p>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      </div>

      {/* Boards grid */}
      {boards.length > 0 && (
        <div className="animate-fade-in">
          <h2 className="text-lg font-semibold mb-3">Vos tableaux</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => {
              const totalCards = board.columns.reduce(
                (s, c) => s + (c._count?.cards || 0),
                0
              );
              return (
                <Link
                  key={board.id}
                  to={`/taches/tableaux/${board.id}`}
                  className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: board.color }}
                        />
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {board.name}
                        </h3>
                      </div>
                      {board.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {board.description}
                        </p>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{board.columns.length} colonnes</span>
                        <span>{totalCards} tâches</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {boards.length === 0 && (
        <div className="text-center py-12 rounded-lg border bg-card">
          <KanbanSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">Aucun tableau</h3>
          <p className="text-muted-foreground mb-4">
            Créez votre premier tableau pour commencer à organiser vos tâches
          </p>
          <Button onClick={createBoard} disabled={creating}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un tableau
          </Button>
        </div>
      )}
    </div>
  );
}
