import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ExternalLink,
} from "lucide-react";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

interface AgendaCard {
  _id: string;
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  assignee: string;
  completed: boolean;
  completedAt: string | null;
  columnId: string;
  boardName: string;
  boardColor: string;
  boardId: string;
  columnName: string;
  labels: { label: { id: string; name: string; color: string } }[];
}

interface Board {
  _id: string;
  id: string;
  name: string;
  color: string;
  columns: { id: string; _id: string; name: string }[];
}

const MONTHS_FR = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  urgent: { color: "text-red-500", label: "Urgente" },
  high: { color: "text-orange-500", label: "Haute" },
  medium: { color: "text-blue-500", label: "Moyenne" },
  low: { color: "text-gray-400", label: "Basse" },
};

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export default function TaskAgendaPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cards, setCards] = useState<AgendaCard[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    boardId: "",
    columnId: "",
    dueDate: "",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCards = useCallback(async () => {
    setLoading(true);
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    try {
      const res = await fetch(
        `/api/tasks/agenda?start=${start.toISOString()}&end=${end.toISOString()}`,
        { headers: getHeaders() }
      );
      if (res.ok) setCards(await res.json());
    } catch {}
    setLoading(false);
  }, [year, month]);

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/boards", { headers: getHeaders() });
      if (res.ok) setBoards(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchCards(); }, [fetchCards]);
  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const getCardsForDay = (day: number) => {
    const date = new Date(year, month, day);
    return cards.filter((c) => c.dueDate && isSameDay(new Date(c.dueDate), date));
  };

  const selectedDayCards = selectedDate
    ? cards.filter((c) => c.dueDate && isSameDay(new Date(c.dueDate), selectedDate))
    : [];

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  const openCreateForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setCreateForm({
      title: "",
      description: "",
      priority: "medium",
      boardId: boards[0]?.id || "",
      columnId: "",
      dueDate: dateStr,
    });
    setShowCreate(true);
  };

  const selectedBoard = boards.find((b) => b.id === createForm.boardId);

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.columnId) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/tasks/columns/${createForm.columnId}/cards`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          priority: createForm.priority,
          dueDate: createForm.dueDate,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        fetchCards();
      }
    } catch {}
    setCreating(false);
  };

  const toggleComplete = async (card: AgendaCard) => {
    try {
      await fetch(`/api/tasks/cards/${card._id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ completed: !card.completed }),
      });
      fetchCards();
    } catch {}
  };

  // Count stats for the month
  const totalThisMonth = cards.length;
  const completedThisMonth = cards.filter((c) => c.completed).length;
  const overdueThisMonth = cards.filter(
    (c) => !c.completed && new Date(c.dueDate) < today
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Agenda
          </h1>
          <p className="text-muted-foreground">
            {totalThisMonth} tache{totalThisMonth !== 1 ? "s" : ""} ce mois
            {overdueThisMonth > 0 && (
              <span className="text-red-500 font-medium">
                {" "}— {overdueThisMonth} en retard
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Month KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-xl font-bold">{totalThisMonth}</div>
          <div className="text-xs text-muted-foreground">Planifiees</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-xl font-bold text-green-600">{completedThisMonth}</div>
          <div className="text-xs text-muted-foreground">Terminees</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-xl font-bold text-red-600">{overdueThisMonth}</div>
          <div className="text-xs text-muted-foreground">En retard</div>
        </div>
      </div>

      {/* Calendar navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {MONTHS_FR[month]} {year}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="ml-2 text-xs">
            Aujourd'hui
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b">
            {DAYS_FR.map((day) => (
              <div key={day} className="px-2 py-2 text-xs font-medium text-muted-foreground text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="min-h-[100px] border-b border-r bg-muted/30" />;
              }

              const dayCards = getCardsForDay(day);
              const isToday = isSameDay(new Date(year, month, day), today);
              const isSelected = selectedDate && isSameDay(new Date(year, month, day), selectedDate);
              const hasOverdue = dayCards.some((c) => !c.completed && new Date(c.dueDate) < today);

              return (
                <div
                  key={day}
                  className={`min-h-[100px] border-b border-r p-1 cursor-pointer transition-colors hover:bg-accent/50 ${
                    isSelected ? "bg-primary/5 ring-1 ring-primary/30" : ""
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between px-1">
                    <span
                      className={`text-sm font-medium inline-flex items-center justify-center ${
                        isToday
                          ? "h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs"
                          : "text-foreground"
                      }`}
                    >
                      {day}
                    </span>
                    {dayCards.length > 0 && (
                      <span className={`text-[10px] font-medium ${hasOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                        {dayCards.length}
                      </span>
                    )}
                  </div>

                  {/* Task pills (max 3 visible) */}
                  <div className="mt-0.5 space-y-0.5">
                    {dayCards.slice(0, 3).map((card) => (
                      <div
                        key={card._id}
                        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate ${
                          card.completed
                            ? "bg-green-500/10 text-green-600 line-through"
                            : !card.completed && new Date(card.dueDate) < today
                            ? "bg-red-500/10 text-red-600"
                            : "bg-primary/10 text-primary"
                        }`}
                        style={{
                          borderLeft: `2px solid ${card.boardColor}`,
                        }}
                      >
                        {card.title}
                      </div>
                    ))}
                    {dayCards.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1.5">
                        +{dayCards.length - 3} autres
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day panel */}
      {selectedDate && (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">
              {selectedDate.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCreateForDate(selectedDate)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ajouter une tache
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(null)}
                className="text-xs"
              >
                Fermer
              </Button>
            </div>
          </div>

          {selectedDayCards.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune tache pour ce jour</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => openCreateForDate(selectedDate)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Planifier une tache
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {selectedDayCards.map((card) => {
                const isOverdue = !card.completed && new Date(card.dueDate) < today;
                const pConfig = PRIORITY_CONFIG[card.priority] || PRIORITY_CONFIG.medium;
                return (
                  <div key={card._id} className="p-3 flex items-start gap-3 hover:bg-accent/30 transition-colors animate-list-item">
                    {/* Completion toggle */}
                    <button
                      onClick={() => toggleComplete(card)}
                      className="mt-0.5 shrink-0"
                    >
                      {card.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className={`h-5 w-5 ${isOverdue ? "text-red-400" : "text-muted-foreground"}`} />
                      )}
                    </button>

                    {/* Card info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium text-sm ${card.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {card.title}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pConfig.color}`}>
                          {pConfig.label}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            En retard
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ color: card.boardColor }}
                        >
                          <span
                            className="h-2 w-2 rounded-full inline-block"
                            style={{ backgroundColor: card.boardColor }}
                          />
                          {card.boardName}
                        </span>
                        <span>·</span>
                        <span>{card.columnName}</span>
                        {card.assignee && (
                          <>
                            <span>·</span>
                            <span>{card.assignee}</span>
                          </>
                        )}
                      </div>
                      {card.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {card.description}
                        </p>
                      )}
                      {card.labels?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {card.labels.map((l) => (
                            <span
                              key={l.label.id}
                              className="text-[10px] px-1.5 py-0 rounded-full text-white"
                              style={{ backgroundColor: l.label.color }}
                            >
                              {l.label.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Go to board */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      title="Voir dans le tableau"
                      onClick={() => navigate(`/taches/tableaux/${card.boardId}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create task dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle tache</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Titre de la tache"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optionnel)"
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priorite</Label>
                <Select
                  value={createForm.priority}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={createForm.dueDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Tableau</Label>
              <Select
                value={createForm.boardId}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, boardId: v, columnId: "" }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choisir un tableau" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: b.color }} />
                        {b.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedBoard && (
              <div>
                <Label>Colonne</Label>
                <Select
                  value={createForm.columnId}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, columnId: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choisir une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBoard.columns.map((col) => (
                      <SelectItem key={col.id || col._id} value={col.id || col._id}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !createForm.title.trim() || !createForm.columnId}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
