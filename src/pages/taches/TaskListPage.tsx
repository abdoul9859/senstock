import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  Filter,
} from "lucide-react";

interface Card {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate: string | null;
  assignee: string;
  completed: boolean;
  completedAt: string | null;
  columnId: string;
  createdAt: string;
  columnName?: string;
  boardName?: string;
}

interface Board {
  id: string;
  name: string;
  columns: {
    id: string;
    name: string;
    cards: Card[];
  }[];
}

function getToken() {
  return localStorage.getItem("mbayestock_token") || "";
}

const priorityConfig: Record<string, { label: string; color: string; icon: typeof ArrowUp }> = {
  urgent: { label: "Urgente", color: "bg-red-500/10 text-red-600 dark:text-red-400", icon: AlertTriangle },
  high: { label: "Haute", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", icon: ArrowUp },
  medium: { label: "Moyenne", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: Minus },
  low: { label: "Basse", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400", icon: ArrowDown },
};

export default function TaskListPage() {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/boards", { headers });
      if (res.ok) {
        const boards: Board[] = await res.json();
        const cards: Card[] = [];
        boards.forEach((board) => {
          board.columns.forEach((col) => {
            if (col.cards) {
              col.cards.forEach((card) => {
                cards.push({
                  ...card,
                  columnName: col.name,
                  boardName: board.name,
                });
              });
            }
          });
        });
        setAllCards(cards);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleComplete = async (card: Card) => {
    try {
      await fetch(`/api/tasks/cards/${card.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ completed: !card.completed }),
      });
      setAllCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, completed: !c.completed, completedAt: !c.completed ? new Date().toISOString() : null }
            : c
        )
      );
    } catch {}
  };

  const filtered = allCards.filter((card) => {
    if (search && !card.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== "all" && card.priority !== filterPriority) return false;
    if (filterStatus === "completed" && !card.completed) return false;
    if (filterStatus === "active" && card.completed) return false;
    if (filterStatus === "overdue" && (card.completed || !card.dueDate || new Date(card.dueDate) > new Date())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Toutes les tâches</h1>
        <p className="text-muted-foreground">
          {filtered.length} tâche{filtered.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une tâche..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="all">Toutes priorités</option>
          <option value="urgent">Urgente</option>
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Tous statuts</option>
          <option value="active">En cours</option>
          <option value="completed">Terminées</option>
          <option value="overdue">En retard</option>
        </select>
      </div>

      {/* Task list */}
      <div className="rounded-lg border bg-card">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucune tâche trouvée</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((card) => {
              const p = priorityConfig[card.priority] || priorityConfig.medium;
              const PIcon = p.icon;
              const isOverdue = !card.completed && card.dueDate && new Date(card.dueDate) < new Date();
              return (
                <div
                  key={card.id}
                  className={`flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors animate-row ${
                    card.completed ? "opacity-60" : ""
                  }`}
                >
                  <button
                    onClick={() => toggleComplete(card)}
                    className="shrink-0"
                  >
                    {card.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          card.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {card.title}
                      </span>
                      <Badge variant="outline" className={`text-xs ${p.color}`}>
                        <PIcon className="h-3 w-3 mr-1" />
                        {p.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{card.boardName}</span>
                      <span>·</span>
                      <span>{card.columnName}</span>
                      {card.assignee && (
                        <>
                          <span>·</span>
                          <span>{card.assignee}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {card.dueDate && (
                    <div
                      className={`text-xs flex items-center gap-1 shrink-0 ${
                        isOverdue
                          ? "text-red-500 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {new Date(card.dueDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
