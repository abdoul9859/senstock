import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  GripVertical,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  CheckCircle2,
  Circle,
  MessageSquare,
  ListChecks,
  X,
  ArrowLeft,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface CardLabel {
  id: string;
  label: { id: string; name: string; color: string };
}

interface Card {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate: string | null;
  assignee: string;
  sortOrder: number;
  completed: boolean;
  labels: CardLabel[];
  checklist: ChecklistItem[];
  comments: Comment[];
}

interface Column {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  cards: Card[];
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  columns: Column[];
  labels: Label[];
}

function getToken() {
  return localStorage.getItem("senstock_token") || "";
}

const priorityConfig: Record<string, { label: string; color: string; icon: typeof ArrowUp }> = {
  urgent: { label: "Urgente", color: "text-red-500", icon: AlertTriangle },
  high: { label: "Haute", color: "text-orange-500", icon: ArrowUp },
  medium: { label: "Moyenne", color: "text-blue-500", icon: Minus },
  low: { label: "Basse", color: "text-gray-400", icon: ArrowDown },
};

export default function TaskBoardDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  // Card dialog
  const [cardDialog, setCardDialog] = useState(false);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [cardColumnId, setCardColumnId] = useState("");
  const [cardForm, setCardForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignee: "",
  });

  // Card detail dialog
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [detailColumnId, setDetailColumnId] = useState("");
  const [newCheckItem, setNewCheckItem] = useState("");
  const [newComment, setNewComment] = useState("");

  // Column add
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState("");

  // Drag state
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/boards/${id}`, { headers });
      if (res.ok) setBoard(await res.json());
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // ─── Column actions ───

  const addColumn = async () => {
    if (!newColName.trim()) return;
    try {
      await fetch(`/api/tasks/boards/${id}/columns`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newColName }),
      });
      setNewColName("");
      setAddingColumn(false);
      fetchBoard();
    } catch {}
  };

  const renameColumn = async (colId: string, name: string) => {
    try {
      await fetch(`/api/tasks/columns/${colId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name }),
      });
    } catch {}
  };

  const deleteColumn = async (colId: string) => {
    if (!confirm("Supprimer cette colonne et toutes ses tâches ?")) return;
    try {
      await fetch(`/api/tasks/columns/${colId}`, { method: "DELETE", headers });
      fetchBoard();
    } catch {}
  };

  // ─── Card actions ───

  const openAddCard = (columnId: string) => {
    setEditCard(null);
    setCardColumnId(columnId);
    setCardForm({ title: "", description: "", priority: "medium", dueDate: "", assignee: "" });
    setCardDialog(true);
  };

  const openEditCard = (card: Card, columnId: string) => {
    setEditCard(card);
    setCardColumnId(columnId);
    setCardForm({
      title: card.title,
      description: card.description,
      priority: card.priority,
      dueDate: card.dueDate ? card.dueDate.split("T")[0] : "",
      assignee: card.assignee,
    });
    setCardDialog(true);
  };

  const saveCard = async () => {
    if (!cardForm.title.trim()) return;
    try {
      if (editCard) {
        await fetch(`/api/tasks/cards/${editCard.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(cardForm),
        });
      } else {
        await fetch(`/api/tasks/columns/${cardColumnId}/cards`, {
          method: "POST",
          headers,
          body: JSON.stringify(cardForm),
        });
      }
      setCardDialog(false);
      fetchBoard();
    } catch {}
  };

  const deleteCard = async (cardId: string) => {
    try {
      await fetch(`/api/tasks/cards/${cardId}`, { method: "DELETE", headers });
      setDetailCard(null);
      fetchBoard();
    } catch {}
  };

  const toggleComplete = async (card: Card) => {
    try {
      await fetch(`/api/tasks/cards/${card.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ completed: !card.completed }),
      });
      fetchBoard();
    } catch {}
  };

  // ─── Drag & Drop ───

  const handleDragStart = (cardId: string) => {
    setDragCardId(cardId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDrop = async (colId: string) => {
    if (!dragCardId) return;
    setDragOverCol(null);
    setDragCardId(null);
    try {
      await fetch("/api/tasks/cards/move", {
        method: "PUT",
        headers,
        body: JSON.stringify({ cardId: dragCardId, columnId: colId, sortOrder: 0 }),
      });
      fetchBoard();
    } catch {}
  };

  // ─── Checklist ───

  const addCheckItem = async () => {
    if (!newCheckItem.trim() || !detailCard) return;
    try {
      await fetch(`/api/tasks/cards/${detailCard.id}/checklist`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: newCheckItem }),
      });
      setNewCheckItem("");
      fetchBoard();
    } catch {}
  };

  const toggleCheckItem = async (itemId: string, checked: boolean) => {
    try {
      await fetch(`/api/tasks/checklist/${itemId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ checked: !checked }),
      });
      fetchBoard();
    } catch {}
  };

  const deleteCheckItem = async (itemId: string) => {
    try {
      await fetch(`/api/tasks/checklist/${itemId}`, { method: "DELETE", headers });
      fetchBoard();
    } catch {}
  };

  // ─── Comments ───

  const addComment = async () => {
    if (!newComment.trim() || !detailCard) return;
    try {
      await fetch(`/api/tasks/cards/${detailCard.id}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: newComment }),
      });
      setNewComment("");
      fetchBoard();
    } catch {}
  };

  // Sync detail card with board data
  useEffect(() => {
    if (detailCard && board) {
      for (const col of board.columns) {
        const found = col.cards.find((c) => c.id === detailCard.id);
        if (found) {
          setDetailCard(found);
          setDetailColumnId(col.id);
          break;
        }
      }
    }
  }, [board]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Tableau non trouvé
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/taches/tableaux")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{board.name}</h1>
          {board.description && (
            <p className="text-sm text-muted-foreground">{board.description}</p>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
        {board.columns.map((col) => (
          <div
            key={col.id}
            className={`flex-shrink-0 w-[320px] rounded-lg border bg-muted/30 flex flex-col transition-colors animate-card ${
              dragOverCol === col.id ? "bg-primary/5 border-primary/30" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDrop(col.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                {col.color && (
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                )}
                <h3 className="font-semibold text-sm">{col.name}</h3>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {col.cards.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openAddCard(col.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        const name = prompt("Nom de la colonne:", col.name);
                        if (name) renameColumn(col.id, name).then(fetchBoard);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Renommer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteColumn(col.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {col.cards.map((card) => {
                const p = priorityConfig[card.priority] || priorityConfig.medium;
                const PIcon = p.icon;
                const isOverdue =
                  !card.completed && card.dueDate && new Date(card.dueDate) < new Date();
                const checkDone = card.checklist.filter((c) => c.checked).length;
                const checkTotal = card.checklist.length;

                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => handleDragStart(card.id)}
                    onDragEnd={() => { setDragCardId(null); setDragOverCol(null); }}
                    onClick={() => { setDetailCard(card); setDetailColumnId(col.id); }}
                    className={`rounded-lg border bg-card p-3 cursor-pointer hover:shadow-md transition-all group animate-list-item ${
                      card.completed ? "opacity-60" : ""
                    } ${dragCardId === card.id ? "opacity-40 rotate-2" : ""}`}
                  >
                    {/* Labels */}
                    {card.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {card.labels.map((cl) => (
                          <span
                            key={cl.id}
                            className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                            style={{ backgroundColor: cl.label.color }}
                          >
                            {cl.label.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(card);
                        }}
                        className="shrink-0 mt-0.5"
                      >
                        {card.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                      <span
                        className={`text-sm font-medium flex-1 ${
                          card.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {card.title}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <PIcon className={`h-3 w-3 ${p.color}`} />
                      {card.dueDate && (
                        <span
                          className={`flex items-center gap-1 ${
                            isOverdue ? "text-red-500 font-medium" : ""
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {new Date(card.dueDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                      {checkTotal > 0 && (
                        <span className="flex items-center gap-1">
                          <ListChecks className="h-3 w-3" />
                          {checkDone}/{checkTotal}
                        </span>
                      )}
                      {card.comments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {card.comments.length}
                        </span>
                      )}
                      {card.assignee && (
                        <span className="ml-auto text-[10px] bg-muted rounded-full px-2 py-0.5">
                          {card.assignee}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add card button */}
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => openAddCard(col.id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une tâche
              </Button>
            </div>
          </div>
        ))}

        {/* Add column */}
        <div className="flex-shrink-0 w-[320px]">
          {addingColumn ? (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <Input
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Nom de la colonne"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && addColumn()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addColumn}>
                  Ajouter
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingColumn(false)}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-12 border-dashed"
              onClick={() => setAddingColumn(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une colonne
            </Button>
          )}
        </div>
      </div>

      {/* ─── Add/Edit Card Dialog ─── */}
      <Dialog open={cardDialog} onOpenChange={setCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editCard ? "Modifier la tâche" : "Nouvelle tâche"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titre</label>
              <Input
                value={cardForm.title}
                onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                placeholder="Titre de la tâche"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={cardForm.description}
                onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                placeholder="Description (optionnel)"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Priorité</label>
                <select
                  value={cardForm.priority}
                  onChange={(e) => setCardForm({ ...cardForm, priority: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Date limite</label>
                <Input
                  type="date"
                  value={cardForm.dueDate}
                  onChange={(e) => setCardForm({ ...cardForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Assigné à</label>
              <Input
                value={cardForm.assignee}
                onChange={(e) => setCardForm({ ...cardForm, assignee: e.target.value })}
                placeholder="Nom de la personne"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialog(false)}>
              Annuler
            </Button>
            <Button onClick={saveCard} disabled={!cardForm.title.trim()}>
              {editCard ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Card Detail Dialog ─── */}
      <Dialog
        open={!!detailCard}
        onOpenChange={(open) => !open && setDetailCard(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailCard && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleComplete(detailCard)}>
                      {detailCard.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                    <DialogTitle
                      className={
                        detailCard.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }
                    >
                      {detailCard.title}
                    </DialogTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        openEditCard(detailCard, detailColumnId);
                        setDetailCard(null);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteCard(detailCard.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-2">
                {/* Meta */}
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const p = priorityConfig[detailCard.priority] || priorityConfig.medium;
                    const PIcon = p.icon;
                    return (
                      <Badge variant="outline" className="gap-1">
                        <PIcon className={`h-3 w-3 ${p.color}`} />
                        {p.label}
                      </Badge>
                    );
                  })()}
                  {detailCard.dueDate && (
                    <Badge
                      variant="outline"
                      className={
                        !detailCard.completed &&
                        new Date(detailCard.dueDate) < new Date()
                          ? "border-red-500 text-red-500"
                          : ""
                      }
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(detailCard.dueDate).toLocaleDateString("fr-FR")}
                    </Badge>
                  )}
                  {detailCard.assignee && (
                    <Badge variant="secondary">{detailCard.assignee}</Badge>
                  )}
                </div>

                {/* Labels */}
                {detailCard.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {detailCard.labels.map((cl) => (
                      <span
                        key={cl.id}
                        className="text-xs px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: cl.label.color }}
                      >
                        {cl.label.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                {detailCard.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {detailCard.description}
                    </p>
                  </div>
                )}

                {/* Checklist */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Checklist
                    {detailCard.checklist.length > 0 && (
                      <span className="text-xs text-muted-foreground font-normal">
                        {detailCard.checklist.filter((c) => c.checked).length}/
                        {detailCard.checklist.length}
                      </span>
                    )}
                  </h4>
                  {detailCard.checklist.length > 0 && (
                    <div className="w-full h-1.5 rounded-full bg-muted mb-3">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${
                            (detailCard.checklist.filter((c) => c.checked).length /
                              detailCard.checklist.length) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    {detailCard.checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 group"
                      >
                        <button onClick={() => toggleCheckItem(item.id, item.checked)}>
                          {item.checked ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <span
                          className={`text-sm flex-1 ${
                            item.checked
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {item.text}
                        </span>
                        <button
                          onClick={() => deleteCheckItem(item.id)}
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      placeholder="Ajouter un élément..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && addCheckItem()}
                    />
                    <Button size="sm" variant="outline" onClick={addCheckItem}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Commentaires ({detailCard.comments.length})
                  </h4>
                  <div className="space-y-3">
                    {detailCard.comments.map((comment) => (
                      <div key={comment.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ajouter un commentaire..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && addComment()}
                    />
                    <Button size="sm" onClick={addComment}>
                      Envoyer
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
