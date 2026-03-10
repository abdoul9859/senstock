import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Star, Plus, Loader2, Users, MessageSquare } from "lucide-react";
import { StockLoader } from "@/components/StockLoader";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface Supplier {
  _id: string;
  name: string;
  rating: number;
  ratingCount: number;
}

interface Rating {
  _id: string;
  qualityScore: number;
  deliveryScore: number;
  priceScore: number;
  serviceScore: number;
  comment: string;
  createdAt: string;
}

function StarDisplay({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < Math.round(score)
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-muted-foreground/40"
          }`}
        />
      ))}
    </span>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  const val = rating.toFixed(1);
  if (rating >= 4) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-500/15 px-2.5 py-1 text-sm font-bold text-green-700 dark:text-green-400">
        {val}
      </span>
    );
  }
  if (rating >= 3) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-1 text-sm font-bold text-amber-700 dark:text-amber-400">
        {val}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-1 text-sm font-bold text-red-700 dark:text-red-400">
      {val}
    </span>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function NotationsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail panel
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // Add rating form
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    qualityScore: 3,
    deliveryScore: 3,
    priceScore: 3,
    serviceScore: 3,
    comment: "",
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers", { headers: getHeaders() });
      if (res.ok) setSuppliers(await res.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openDetail = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailOpen(true);
    setRatingsLoading(true);
    try {
      const res = await fetch(`/api/supplier-ratings/${supplier._id}`, {
        headers: getHeaders(),
      });
      if (res.ok) setRatings(await res.json());
      else setRatings([]);
    } catch {
      setRatings([]);
    }
    setRatingsLoading(false);
  };

  const openAddRating = () => {
    setForm({
      qualityScore: 3,
      deliveryScore: 3,
      priceScore: 3,
      serviceScore: 3,
      comment: "",
    });
    setFormOpen(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedSupplier) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/supplier-ratings", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          supplierId: selectedSupplier._id,
          qualityScore: form.qualityScore,
          deliveryScore: form.deliveryScore,
          priceScore: form.priceScore,
          serviceScore: form.serviceScore,
          comment: form.comment,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Note ajoutee avec succes");
      setFormOpen(false);
      // Refresh ratings and suppliers
      openDetail(selectedSupplier);
      fetchSuppliers();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'ajout");
    }
    setSubmitting(false);
  };

  if (loading) return <StockLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-xl font-semibold text-foreground">
          Notations fournisseurs
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Evaluez et suivez la performance de vos fournisseurs
        </p>
      </div>

      {/* Supplier Grid */}
      {suppliers.length === 0 ? (
        <div className="py-16 text-center animate-fade-in">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucun fournisseur</h3>
          <p className="text-muted-foreground">
            Ajoutez des fournisseurs pour commencer les evaluations
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <div
              key={supplier._id}
              onClick={() => openDetail(supplier)}
              className="group relative rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-pointer animate-card"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-card-foreground truncate">
                  {supplier.name}
                </h3>
                {supplier.rating > 0 && (
                  <RatingBadge rating={supplier.rating} />
                )}
              </div>

              <div className="flex items-center gap-2">
                <StarDisplay score={supplier.rating || 0} />
                <span className="text-xs text-muted-foreground">
                  ({supplier.ratingCount || 0}{" "}
                  {(supplier.ratingCount || 0) <= 1
                    ? "evaluation"
                    : "evaluations"}
                  )
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {selectedSupplier && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedSupplier.name}</span>
                {selectedSupplier.rating > 0 && (
                  <RatingBadge rating={selectedSupplier.rating} />
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-3">
                <StarDisplay score={selectedSupplier.rating || 0} />
                <span className="text-sm text-muted-foreground">
                  {selectedSupplier.ratingCount || 0} evaluation(s)
                </span>
              </div>

              {/* Add Rating Button */}
              <Button onClick={openAddRating} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une note
              </Button>

              {/* Ratings List */}
              {ratingsLoading ? (
                <StockLoader />
              ) : ratings.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Aucune evaluation pour ce fournisseur
                </div>
              ) : (
                <div className="space-y-3">
                  {ratings.map((r) => (
                    <div
                      key={r._id}
                      className="rounded-lg border border-border bg-muted/20 p-4 animate-fade-in"
                    >
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Qualite</span>
                          <StarDisplay score={r.qualityScore} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Livraison
                          </span>
                          <StarDisplay score={r.deliveryScore} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Prix</span>
                          <StarDisplay score={r.priceScore} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Service</span>
                          <StarDisplay score={r.serviceScore} />
                        </div>
                      </div>

                      {r.comment && (
                        <div className="flex items-start gap-2 text-sm mt-2">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-card-foreground">{r.comment}</p>
                        </div>
                      )}

                      {r.createdAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {fmtDate(r.createdAt)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Rating Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une note</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Quality */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Qualite</Label>
                <span className="text-sm font-medium">
                  {form.qualityScore}/5
                </span>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[form.qualityScore]}
                onValueChange={([v]) =>
                  setForm((f) => ({ ...f, qualityScore: v }))
                }
              />
            </div>

            {/* Delivery */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Livraison</Label>
                <span className="text-sm font-medium">
                  {form.deliveryScore}/5
                </span>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[form.deliveryScore]}
                onValueChange={([v]) =>
                  setForm((f) => ({ ...f, deliveryScore: v }))
                }
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prix</Label>
                <span className="text-sm font-medium">
                  {form.priceScore}/5
                </span>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[form.priceScore]}
                onValueChange={([v]) =>
                  setForm((f) => ({ ...f, priceScore: v }))
                }
              />
            </div>

            {/* Service */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Service</Label>
                <span className="text-sm font-medium">
                  {form.serviceScore}/5
                </span>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[form.serviceScore]}
                onValueChange={([v]) =>
                  setForm((f) => ({ ...f, serviceScore: v }))
                }
              />
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea
                value={form.comment}
                onChange={(e) =>
                  setForm((f) => ({ ...f, comment: e.target.value }))
                }
                placeholder="Commentaire optionnel..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitRating} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
