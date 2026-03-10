import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Plus,
  KanbanSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  columns: { id: string; name: string; _count: { cards: number } }[];
}

function getToken() {
  return localStorage.getItem("senstock_token") || "";
}

const COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

export default function TaskBoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBoard, setEditBoard] = useState<Board | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#10b981" });
  const navigate = useNavigate();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/boards", { headers });
      if (res.ok) setBoards(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const openCreate = () => {
    setEditBoard(null);
    setForm({ name: "", description: "", color: "#10b981" });
    setDialogOpen(true);
  };

  const openEdit = (board: Board) => {
    setEditBoard(board);
    setForm({ name: board.name, description: board.description, color: board.color });
    setDialogOpen(true);
  };

  const saveBoard = async () => {
    if (!form.name.trim()) return;
    try {
      if (editBoard) {
        await fetch(`/api/tasks/boards/${editBoard.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(form),
        });
      } else {
        const res = await fetch("/api/tasks/boards", {
          method: "POST",
          headers,
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const board = await res.json();
          setDialogOpen(false);
          navigate(`/taches/tableaux/${board.id}`);
          return;
        }
      }
      setDialogOpen(false);
      fetchBoards();
    } catch {}
  };

  const archiveBoard = async (id: string) => {
    if (!confirm("Archiver ce tableau ?")) return;
    try {
      await fetch(`/api/tasks/boards/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ archived: true }),
      });
      fetchBoards();
    } catch {}
  };

  const deleteBoard = async (id: string) => {
    if (!confirm("Supprimer définitivement ce tableau et toutes ses tâches ?")) return;
    try {
      await fetch(`/api/tasks/boards/${id}`, { method: "DELETE", headers });
      fetchBoards();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableaux</h1>
          <p className="text-muted-foreground">
            {boards.length} tableau{boards.length !== 1 ? "x" : ""}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau tableau
        </Button>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-16 rounded-lg border bg-card">
          <KanbanSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">Aucun tableau</h3>
          <p className="text-muted-foreground mb-4">
            Créez votre premier tableau Kanban
          </p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un tableau
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => {
            const totalCards = board.columns.reduce(
              (s, c) => s + (c._count?.cards || 0),
              0
            );
            return (
              <div
                key={board.id}
                className="rounded-lg border bg-card overflow-hidden group animate-card"
              >
                <div
                  className="h-2"
                  style={{ backgroundColor: board.color }}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <Link
                      to={`/taches/tableaux/${board.id}`}
                      className="flex-1"
                    >
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {board.name}
                      </h3>
                      {board.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {board.description}
                        </p>
                      )}
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(board)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => archiveBoard(board.id)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archiver
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteBoard(board.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                    <span>{board.columns.length} colonnes</span>
                    <span>·</span>
                    <span>{totalCards} tâches</span>
                  </div>

                  {/* Column breakdown */}
                  <div className="mt-3 space-y-1">
                    {board.columns.map((col) => (
                      <div
                        key={col.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground">{col.name}</span>
                        <span className="font-medium">{col._count?.cards || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editBoard ? "Modifier le tableau" : "Nouveau tableau"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Projet Marketing"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description optionnelle"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Couleur</label>
              <div className="flex gap-2 mt-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${
                      form.color === c
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveBoard} disabled={!form.name.trim()}>
              {editBoard ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
