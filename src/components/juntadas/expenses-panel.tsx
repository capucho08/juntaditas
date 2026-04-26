"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { addExpense, deleteExpense } from "@/db/queries/expenses";
import { calculateSplit, calculateExpenseShares, type ExpenseShare } from "@/lib/splits";
import { getAttendeesForMeal } from "@/lib/attendance";
import { getDatesInRange } from "@/lib/dates";
import { EXPENSE_TYPE_LABELS } from "@/lib/expense-types";
import type { ExpenseType } from "@/lib/expense-types";
import { Plus, Trash2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Attendee = { id: string; name: string; email: string };
type Currency = "UYU" | "USD";

const CURRENCY_SYMBOL: Record<Currency, string> = { UYU: "$", USD: "U$S" };

type Expense = {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: Currency;
  date: string;
  paidBy: string;
  mealId: string | null;
  paidByUser: Attendee;
  participants: { userId: string }[];
};

type AttendanceRecord = {
  userId: string;
  arrivalDate: string | null;
  arrivalSlot: "morning" | "noon" | "afternoon" | "night" | null;
  departureDate: string | null;
  departureSlot: "morning" | "noon" | "afternoon" | "night" | null;
};

type MealCost = {
  id: string;
  amount: number;
  description: string | null;
  paidByUser: Attendee;
};

type Meal = {
  id: string;
  date: string;
  type: "lunch" | "dinner";
  description: string | null;
  costs: MealCost[];
};

type Props = {
  juntadaId: string;
  dateStart: string;
  dateEnd: string;
  expenses: Expense[];
  meals: Meal[];
  attendance: AttendanceRecord[];
  attendees: Attendee[];
  currentUserId: string;
};

const EXPENSE_TYPES: ExpenseType[] = ["house", "general", "meal", "custom"];

const MEAL_TYPE_LABEL = { lunch: "Almuerzo", dinner: "Cena" };

export function ExpensesPanel({
  juntadaId,
  dateStart,
  dateEnd,
  expenses,
  meals,
  attendance,
  attendees,
  currentUserId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<ExpenseType>("general");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("UYU");
  const [date, setDate] = useState(dateStart);
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleAdd() {
    if (!description || !amount) return;
    startTransition(async () => {
      await addExpense({
        juntadaId,
        type,
        description,
        amount: parseFloat(amount),
        currency,
        date,
        participantIds: type === "custom" ? participantIds : undefined,
      });
      setDescription("");
      setAmount("");
      setCurrency("UYU");
      setParticipantIds([]);
      setOpen(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExpense(id, juntadaId);
    });
  }

  // Convert meal costs to expense records splitting among attendees present at each meal
  const mealExpenseRecords = meals.flatMap((m) => {
    const presentUserIds = getAttendeesForMeal(attendance, m.date, m.type);
    return m.costs.map((c) => ({
      id: `meal-cost-${c.id}`,
      type: "custom" as const,
      amount: c.amount,
      currency: "UYU" as const,
      paidBy: c.paidByUser.id,
      date: m.date,
      mealId: m.id,
      // If we can't determine attendees, fall back to all confirmed attendees
      participants: (presentUserIds.length > 0 ? presentUserIds : attendance.map((a) => a.userId))
        .map((userId) => ({ userId })),
    }));
  });

  const mealCostsTotal = meals.flatMap((m) => m.costs).reduce((s, c) => s + c.amount, 0);
  const totalUYU = expenses.filter((e) => e.currency === "UYU").reduce((s, e) => s + e.amount, 0) + mealCostsTotal;
  const totalUSD = expenses.filter((e) => e.currency === "USD").reduce((s, e) => s + e.amount, 0);

  const allExpenseRecords = [
    ...expenses.map((e) => ({ ...e, currency: e.currency ?? "UYU" as const })),
    ...mealExpenseRecords,
  ];

  const dates = getDatesInRange(dateStart, dateEnd);
  const split = calculateSplit(allExpenseRecords, attendance, dateStart, dateEnd);

  function getShares(record: typeof allExpenseRecords[0]): ExpenseShare[] {
    return calculateExpenseShares(record, attendance, dates);
  }

  function userName(userId: string) {
    const u = attendees.find((a) => a.id === userId);
    return u?.name || u?.email.split("@")[0] || "?";
  }

  return (
    <div className="space-y-8">
      {/* Add expense */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-muted-foreground">
          {totalUYU > 0 && <span>$ <span className="font-semibold text-foreground">{totalUYU.toFixed(2)}</span></span>}
          {totalUSD > 0 && <span>U$S <span className="font-semibold text-foreground">{totalUSD.toFixed(2)}</span></span>}
          {totalUYU === 0 && totalUSD === 0 && <span>Sin gastos registrados</span>}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Agregar gasto</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo gasto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => v && setType(v as ExpenseType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{EXPENSE_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {type === "house" && "Se divide por noches entre quienes estuvieron."}
                  {type === "general" && "Se divide por porciones de día (mañana+mediodía / tarde+noche)."}
                  {type === "meal" && "Se divide entre los comensales presentes en esa comida."}
                  {type === "custom" && "Se divide entre las personas que selecciones."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input placeholder="Ej: Alquiler casa, nafta..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-1">
                  <Label>Moneda</Label>
                  <Select value={currency} onValueChange={(v) => v && setCurrency(v as Currency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UYU">$ Pesos</SelectItem>
                      <SelectItem value="USD">U$S Dólares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Monto</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              {type === "custom" && (
                <div className="space-y-2">
                  <Label>Entre quiénes se divide</Label>
                  <div className="flex flex-wrap gap-2">
                    {attendees.map((a) => (
                      <button key={a.id} type="button" onClick={() => toggleParticipant(a.id)}
                        className={cn("px-3 py-1 rounded-full text-sm border transition-colors",
                          participantIds.includes(a.id) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                        )}>
                        {a.name || a.email.split("@")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Se registrará como pagado por vos.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isPending || !description || !amount}>
                Agregar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expense list */}
      {(expenses.length > 0 || meals.some((m) => m.costs.length > 0)) && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Todos los gastos</h3>
          <div className="divide-y border rounded-lg">
            {expenses.map((e) => {
              const record = allExpenseRecords.find((r) => r.id === e.id)!;
              const shares = record ? getShares(record) : [];
              const isExpanded = expandedId === e.id;
              return (
                <div key={e.id}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : e.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{e.description}</span>
                        <Badge variant="secondary" className="text-xs">{EXPENSE_TYPE_LABELS[e.type as ExpenseType]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {e.date} · pagó {e.paidByUser.name || e.paidByUser.email.split("@")[0]}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{CURRENCY_SYMBOL[e.currency ?? "UYU"]} {e.amount.toFixed(2)}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} disabled={isPending}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {isExpanded && shares.length > 0 && (
                    <div className="px-4 pb-3 space-y-1 bg-muted/20">
                      <p className="text-xs text-muted-foreground font-medium mb-2">División</p>
                      {shares.map((s) => (
                        <div key={s.userId} className="flex justify-between text-xs">
                          <span className={cn(s.userId === e.paidBy ? "font-medium" : "text-muted-foreground")}>
                            {userName(s.userId)}{s.userId === e.paidBy ? " (pagó)" : ""}
                          </span>
                          <span>{CURRENCY_SYMBOL[e.currency ?? "UYU"]} {s.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {meals.flatMap((m) =>
              m.costs.map((c) => {
                const rowId = `meal-cost-${c.id}`;
                const record = mealExpenseRecords.find((r) => r.id === rowId);
                const shares = record ? getShares(record) : [];
                const isExpanded = expandedId === rowId;
                return (
                  <div key={rowId}>
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : rowId)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {MEAL_TYPE_LABEL[m.type]} {m.date}{m.description ? ` — ${m.description}` : ""}
                            {c.description ? ` (${c.description})` : ""}
                          </span>
                          <Badge variant="secondary" className="text-xs">Comida</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {m.date} · pagó {c.paidByUser.name || c.paidByUser.email.split("@")[0]}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">$ {c.amount.toFixed(2)}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>
                    {isExpanded && shares.length > 0 && (
                      <div className="px-4 pb-3 space-y-1 bg-muted/20">
                        <p className="text-xs text-muted-foreground font-medium mb-2">División</p>
                        {shares.map((s) => (
                          <div key={s.userId} className="flex justify-between text-xs">
                            <span className={cn(s.userId === c.paidByUser.id ? "font-medium" : "text-muted-foreground")}>
                              {userName(s.userId)}{s.userId === c.paidByUser.id ? " (pagó)" : ""}
                            </span>
                            <span>$ {s.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Balances */}
      {split.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Balances</h3>
            <div className="space-y-2">
              {split.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-3 border rounded-lg">
                  <span className={cn("font-medium", s.userId === currentUserId && "text-destructive")}>
                    {userName(s.userId)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className={cn("font-medium", s.owes === currentUserId && "text-green-600")}>
                    {userName(s.owes)}
                  </span>
                  <span className="ml-auto font-semibold">{CURRENCY_SYMBOL[s.currency]} {s.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {expenses.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No hay gastos registrados todavía.</p>
      )}
    </div>
  );
}
