"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { upsertMeal, deleteMeal, addMealCost, deleteMealCost } from "@/db/queries/meals";
import { ChefHat, Plus, Trash2, DollarSign, Users, LeafyGreen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Attendee = { id: string; name: string; email: string };

type MealData = {
  id: string;
  description: string | null;
  vegetarianOption: string | null;
  cooks: { user: Attendee }[];
  costs: { id: string; amount: number; description: string | null; paidByUser: Attendee }[];
} | null;

type Props = {
  juntadaId: string;
  date: string;
  type: "lunch" | "dinner";
  label: string;
  meal: MealData;
  attendees: Attendee[];
  presentUserIds: string[];
};

export function MealCard({ juntadaId, date, type, label, meal, attendees, presentUserIds }: Props) {
  const [open, setOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [description, setDescription] = useState(meal?.description ?? "");
  const [vegetarianOption, setVegetarianOption] = useState(meal?.vegetarianOption ?? "");
  const [selectedCooks, setSelectedCooks] = useState<string[]>(
    meal?.cooks.map((c) => c.user.id) ?? []
  );
  const [costAmount, setCostAmount] = useState("");
  const [costDesc, setCostDesc] = useState("");

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

  function handleAddCost() {
    if (!meal || !costAmount) return;
    startTransition(async () => {
      await addMealCost({
        mealId: meal.id,
        juntadaId,
        amount: parseFloat(costAmount),
        description: costDesc || undefined,
      });
      setCostAmount("");
      setCostDesc("");
      setCostOpen(false);
    });
  }

  function handleDeleteCost(costId: string) {
    startTransition(async () => {
      await deleteMealCost(costId, juntadaId);
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
              {/* Add cost */}
              <Dialog open={costOpen} onOpenChange={setCostOpen}>
                <DialogTrigger
                  render={
                    <Button variant="ghost" size="sm">
                      <DollarSign className="w-3.5 h-3.5" />
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar costo — {label}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Monto ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={costAmount}
                        onChange={(e) => setCostAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción (opcional)</Label>
                      <Input
                        placeholder="Ej: verduras del almuerzo"
                        value={costDesc}
                        onChange={(e) => setCostDesc(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Se registrará a tu nombre. Se divide entre {presentAttendees.length} persona{presentAttendees.length !== 1 ? "s" : ""}.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddCost} disabled={isPending || !costAmount}>
                      Agregar
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
