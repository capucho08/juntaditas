"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { upsertMeal, deleteMeal, addMealCosts, deleteMealCost, addMealIngredient, deleteMealIngredient, updateMealIngredient, exportSingleMealIngredients } from "@/db/queries/meals";
import { toast } from "sonner";
import { ChefHat, Plus, Trash2, DollarSign, Users, LeafyGreen, ShoppingBasket, Pencil, Check, X, ChevronDown, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Attendee = { id: string; name: string; email: string };

type Ingredient = {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
};

type MealData = {
  id: string;
  description: string | null;
  vegetarianOption: string | null;
  cooks: { user: Attendee }[];
  costs: { id: string; amount: number; description: string | null; paidByUser: Attendee }[];
  ingredients: Ingredient[];
} | null;

type CostRow = { amount: string; description: string; paidBy: string };

type Props = {
  juntadaId: string;
  date: string;
  type: "lunch" | "dinner";
  label: string;
  meal: MealData;
  attendees: Attendee[];
  presentUserIds: string[];
  isAdmin: boolean;
  currentUserId: string;
};

export function MealCard({ juntadaId, date, type, label, meal, attendees, presentUserIds, isAdmin, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [description, setDescription] = useState(meal?.description ?? "");
  const [vegetarianOption, setVegetarianOption] = useState(meal?.vegetarianOption ?? "");
  const [selectedCooks, setSelectedCooks] = useState<string[]>(
    meal?.cooks.map((c) => c.user.id) ?? []
  );
  const [costRows, setCostRows] = useState<CostRow[]>([{ amount: "", description: "", paidBy: currentUserId }]);
  const [ingName, setIngName] = useState("");
  const [ingQty, setIngQty] = useState("");
  const [ingUnit, setIngUnit] = useState("unid");

  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const [editingIngId, setEditingIngId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("unid");

  const presentAttendees = attendees.filter((a) => presentUserIds.includes(a.id));

  function toggleCook(userId: string) {
    setSelectedCooks((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function handleSave() {
    startTransition(async () => {
      await upsertMeal({ juntadaId, date, type, description, cookIds: selectedCooks, vegetarianOption });
      setOpen(false);
    });
  }

  function handleDelete() {
    if (!meal) return;
    startTransition(async () => {
      await deleteMeal(meal.id, juntadaId);
    });
  }

  function addCostRow() {
    setCostRows((prev) => [...prev, { amount: "", description: "", paidBy: currentUserId }]);
  }

  function removeCostRow(idx: number) {
    setCostRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCostRow(idx: number, field: keyof CostRow, value: string) {
    setCostRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function handleAddCosts() {
    if (!meal) return;
    const valid = costRows.filter((r) => r.amount && parseFloat(r.amount) > 0 && r.paidBy);
    if (valid.length === 0) return;
    startTransition(async () => {
      await addMealCosts({
        mealId: meal.id,
        juntadaId,
        costs: valid.map((r) => ({
          amount: parseFloat(r.amount),
          description: r.description || undefined,
          paidBy: r.paidBy,
        })),
      });
      setCostRows([{ amount: "", description: "", paidBy: currentUserId }]);
      setCostOpen(false);
    });
  }

  function handleDeleteCost(costId: string) {
    startTransition(async () => {
      await deleteMealCost(costId, juntadaId);
    });
  }

  function handleExportMeal() {
    if (!meal) return;
    startTransition(async () => {
      try {
        await exportSingleMealIngredients(meal.id, juntadaId);
        toast.success(`Ingredientes de ${label} exportados al Surtido`);
      } catch {
        toast.error("Error al exportar ingredientes");
      }
    });
  }

  function handleAddIngredient() {
    if (!meal || !ingName) return;
    startTransition(async () => {
      await addMealIngredient({
        mealId: meal.id,
        juntadaId,
        name: ingName,
        quantity: ingQty || undefined,
        unit: ingUnit || undefined,
      });
      setIngName("");
      setIngQty("");
      setIngUnit("unid");
    });
  }

  function handleDeleteIngredient(id: string) {
    startTransition(async () => {
      await deleteMealIngredient(id, juntadaId);
    });
  }

  function handleStartEditIngredient(ing: Ingredient) {
    setEditingIngId(ing.id);
    setEditName(ing.name);
    setEditQty(ing.quantity ?? "");
    setEditUnit(ing.unit ?? "unid");
  }

  function handleCancelEditIngredient() {
    setEditingIngId(null);
  }

  function handleUpdateIngredient() {
    if (!editName) return;
    startTransition(async () => {
      await updateMealIngredient({
        id: editingIngId!,
        juntadaId,
        name: editName,
        quantity: editQty || undefined,
        unit: editUnit || undefined,
      });
      setEditingIngId(null);
    });
  }

  const totalCost = meal?.costs.reduce((sum, c) => sum + c.amount, 0) ?? 0;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{label}</span>
        <div className="flex gap-2">
          {meal && (
            <>
              {/* Export meal ingredients */}
              {isAdmin && meal.ingredients.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportMeal}
                  disabled={isPending}
                  title="Exportar ingredientes al Surtido"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              )}

              {/* Add cost */}
              <Dialog open={costOpen} onOpenChange={(v) => {
                setCostOpen(v);
                if (v) setCostRows([{ amount: "", description: "", paidBy: currentUserId }]);
              }}>
                <DialogTrigger
                  render={
                    <Button variant="ghost" size="sm">
                      <DollarSign className="w-3.5 h-3.5" />
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar costos — {label}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[5rem_1fr_8rem_1.5rem] gap-2 text-xs text-muted-foreground px-0.5">
                      <span>Monto ($)</span>
                      <span>Descripción</span>
                      <span>Pagó</span>
                      <span />
                    </div>
                    {costRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-[5rem_1fr_8rem_1.5rem] gap-2 items-center">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.amount}
                          onChange={(e) => updateCostRow(idx, "amount", e.target.value)}
                        />
                        <Input
                          placeholder="opcional"
                          value={row.description}
                          onChange={(e) => updateCostRow(idx, "description", e.target.value)}
                        />
                        <Select value={row.paidBy} onValueChange={(v) => v && updateCostRow(idx, "paidBy", v)}>
                          <SelectTrigger>
                            <SelectValue>
                              {(() => { const a = attendees.find((a) => a.id === row.paidBy); return a?.name || a?.email.split("@")[0] || ""; })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {attendees.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name || a.email.split("@")[0]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {costRows.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeCostRow(idx)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : <span />}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addCostRow}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Agregar otro
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddCosts}
                      disabled={isPending || !costRows.some((r) => r.amount && parseFloat(r.amount) > 0)}
                    >
                      Guardar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete meal */}
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </>
          )}

          {/* Edit / Create */}
          <Dialog open={open} onOpenChange={(v) => {
            setOpen(v);
            if (v) {
              setDescription(meal?.description ?? "");
              setVegetarianOption(meal?.vegetarianOption ?? "");
              setSelectedCooks(meal?.cooks.map((c) => c.user.id) ?? []);
            }
          }}>
            <DialogTrigger
              render={
                <Button variant={meal ? "outline" : "default"} size="sm">
                  {meal ? "Editar" : <><Plus className="w-3.5 h-3.5 mr-1" />Cargar</>}
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{meal ? "Editar" : "Cargar"} {label}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>¿Qué se come?</Label>
                  <Input
                    placeholder="Ej: Asado, ensalada rusa..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><LeafyGreen className="w-4 h-4" style={{ color: "#16a34a" }} /> Opción vegetariana (opcional)</Label>
                  <Input
                    placeholder="Ej: Pizza, empanadas de verdura..."
                    value={vegetarianOption}
                    onChange={(e) => setVegetarianOption(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cocineros</Label>
                  <div className="flex flex-wrap gap-2">
                    {attendees.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleCook(a.id)}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm border transition-colors",
                          selectedCooks.includes(a.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        {a.name || a.email}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave} disabled={isPending || !description}>
                  {isPending ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {meal ? (
        <div className="space-y-2 text-sm">
          <p className="text-foreground">{meal.description}</p>
          {meal.vegetarianOption && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <LeafyGreen className="w-3.5 h-3.5 shrink-0" style={{ color: "#16a34a" }} />
              {meal.vegetarianOption}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-muted-foreground">
            {meal.cooks.length > 0 && (
              <span className="flex items-center gap-1">
                <ChefHat className="w-3.5 h-3.5" />
                {meal.cooks.map((c) => c.user.name || c.user.email).join(", ")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {presentAttendees.length} comensal{presentAttendees.length !== 1 ? "es" : ""}
              {presentAttendees.length > 0 && (
                <span className="text-xs">
                  ({presentAttendees.map((a) => a.name || a.email.split("@")[0]).join(", ")})
                </span>
              )}
            </span>
          </div>

          <Separator />
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setIngredientsOpen((v) => !v)}
              className="text-xs font-semibold text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors w-full text-left"
            >
              {ingredientsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <ShoppingBasket className="w-3 h-3" /> Ingredientes
              {meal.ingredients.length > 0 && (
                <span className="ml-auto font-normal opacity-60">{meal.ingredients.length}</span>
              )}
            </button>
            {ingredientsOpen && (<>
            {meal.ingredients.map((ing) =>
              editingIngId === ing.id ? (
                <div key={ing.id} className="flex items-center gap-1">
                  <Input
                    className="h-6 text-xs flex-1 px-2"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateIngredient();
                      if (e.key === "Escape") handleCancelEditIngredient();
                    }}
                    autoFocus
                  />
                  <Input
                    className="h-6 text-xs w-12 px-2"
                    placeholder="Cant."
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateIngredient();
                      if (e.key === "Escape") handleCancelEditIngredient();
                    }}
                  />
                  <Select value={editUnit} onValueChange={(v) => v && setEditUnit(v)}>
                    <SelectTrigger size="sm" className="h-6 text-xs w-16 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unid">unid</SelectItem>
                      <SelectItem value="gr">gr</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={handleUpdateIngredient}
                    disabled={isPending || !editName}
                    className="h-6 w-6 shrink-0 flex items-center justify-center rounded border border-border hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCancelEditIngredient}
                    className="h-6 w-6 shrink-0 flex items-center justify-center rounded border border-border hover:border-destructive hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div key={ing.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {ing.name}
                    {(ing.quantity || ing.unit) && (
                      <span className="ml-1 opacity-70">({[ing.quantity, ing.unit].filter(Boolean).join(" ")})</span>
                    )}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleStartEditIngredient(ing)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteIngredient(ing.id)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            )}
            <div className="flex items-center gap-1 pt-0.5">
              <Input
                className="h-6 text-xs flex-1 px-2"
                placeholder="Agregar ingrediente..."
                value={ingName}
                onChange={(e) => setIngName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
              />
              <Input
                className="h-6 text-xs w-12 px-2"
                placeholder="Cant."
                value={ingQty}
                onChange={(e) => setIngQty(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
              />
              <Select value={ingUnit} onValueChange={(v) => v && setIngUnit(v)}>
                <SelectTrigger size="sm" className="h-6 text-xs w-16 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unid">unid</SelectItem>
                  <SelectItem value="gr">gr</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="l">l</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={handleAddIngredient}
                disabled={isPending || !ingName}
                className="h-6 w-6 shrink-0 flex items-center justify-center rounded border border-border hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            </>)}
          </div>

          {meal.costs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                {meal.costs.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      ${c.amount.toFixed(2)} — {c.paidByUser.name || c.paidByUser.email}
                      {c.description && ` (${c.description})`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => handleDeleteCost(c.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs font-medium">Total: ${totalCost.toFixed(2)}</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin cargar</p>
      )}
    </div>
  );
}
