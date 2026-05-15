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
import { addExpense, updateExpense, deleteExpense } from "@/db/queries/expenses";
import { addExpenseDependency, deleteExpenseDependency } from "@/db/queries/expense-dependencies";
import { pushToSplitwise } from "@/db/queries/splitwise";
import { calculateSplit, calculateSimplifiedSplit, calculateExpenseShares, type ExpenseShare } from "@/lib/splits";
import { getAttendeesForMeal } from "@/lib/attendance";
import { getDatesInRange } from "@/lib/dates";
import { EXPENSE_TYPE_LABELS, SPLIT_METHOD_LABELS } from "@/lib/expense-types";
import type { ExpenseType, SplitMethod } from "@/lib/expense-types";
import { Plus, Trash2, ArrowRight, ChevronDown, ChevronUp, Pencil, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Attendee = { id: string; name: string; email: string };
type Currency = "UYU" | "USD";

const CURRENCY_SYMBOL: Record<Currency, string> = { UYU: "$", USD: "U$S" };

type Expense = {
  id: string;
  type: string;
  splitMethod: SplitMethod | null;
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

type Dependency = {
  id: string;
  dependentId: string;
  coveredById: string;
  dependent: Attendee;
  coveredBy: Attendee;
};

type PushResult = {
  created: number;
  skipped: { description: string; reason: string }[];
  errors: { description: string; error: string }[];
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
  dependencies: Dependency[];
  isAdmin: boolean;
  splitwiseGroupId: string | null;
};

const EXPENSE_TYPES: ExpenseType[] = ["house", "meal", "general"];

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
  dependencies,
  isAdmin,
  splitwiseGroupId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showBalances, setShowBalances] = useState(false);
  const [showSimplified, setShowSimplified] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);
  const [newDependent, setNewDependent] = useState("");
  const [newCoveredBy, setNewCoveredBy] = useState("");
  const [swPushing, setSwPushing] = useState(false);
  const [swResult, setSwResult] = useState<PushResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add form state
  const [type, setType] = useState<ExpenseType>("general");
  const [scope, setScope] = useState<"all" | "custom">("all");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("portions");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("UYU");
  const [date, setDate] = useState(dateStart);
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  // Edit form state
  const [editOpen, setEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editType, setEditType] = useState<ExpenseType>("general");
  const [editScope, setEditScope] = useState<"all" | "custom">("all");
  const [editSplitMethod, setEditSplitMethod] = useState<SplitMethod>("portions");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState<Currency>("UYU");
  const [editDate, setEditDate] = useState(dateStart);
  const [editPaidBy, setEditPaidBy] = useState("");
  const [editParticipantIds, setEditParticipantIds] = useState<string[]>([]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleEditParticipant(id: string) {
    setEditParticipantIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function openEdit(e: Expense) {
    setEditingExpense(e);
    setEditType(e.type as ExpenseType);
    setEditScope(e.participants.length > 0 ? "custom" : "all");
    setEditSplitMethod(e.splitMethod ?? "portions");
    setEditDescription(e.description);
    setEditAmount(String(e.amount));
    setEditCurrency(e.currency);
    setEditDate(e.date);
    setEditPaidBy(e.paidBy);
    setEditParticipantIds(e.participants.map((p) => p.userId));
    setEditOpen(true);
  }

  function handleAdd() {
    if (!description || !amount) return;
    startTransition(async () => {
      await addExpense({
        juntadaId,
        type,
        splitMethod: type === "general" ? splitMethod : undefined,
        description,
        amount: parseFloat(amount),
        currency,
        date,
        paidBy,
        participantIds: type === "general" && scope === "custom" ? participantIds : undefined,
      });
      setDescription("");
      setAmount("");
      setCurrency("UYU");
      setDate(dateStart);
      setScope("all");
      setSplitMethod("portions");
      setPaidBy(currentUserId);
      setParticipantIds([]);
      setOpen(false);
    });
  }

  function handleEdit() {
    if (!editingExpense || !editDescription || !editAmount) return;
    startTransition(async () => {
      await updateExpense({
        id: editingExpense.id,
        juntadaId,
        type: editType,
        splitMethod: editType === "general" ? editSplitMethod : undefined,
        description: editDescription,
        amount: parseFloat(editAmount),
        currency: editCurrency,
        date: editDate,
        paidBy: editPaidBy,
        participantIds: editType === "general" && editScope === "custom" ? editParticipantIds : undefined,
      });
      setEditOpen(false);
      setEditingExpense(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExpense(id, juntadaId);
    });
  }

  function handleAddDependency() {
    if (!newDependent || !newCoveredBy || newDependent === newCoveredBy) return;
    startTransition(async () => {
      await addExpenseDependency({ juntadaId, dependentId: newDependent, coveredById: newCoveredBy });
      setNewDependent("");
      setNewCoveredBy("");
    });
  }

  async function handlePushToSplitwise() {
    setSwPushing(true);
    setSwResult(null);
    try {
      const result = await pushToSplitwise(juntadaId);
      setSwResult(result);
    } catch (e) {
      setSwResult({ created: 0, skipped: [], errors: [{ description: "General", error: String(e) }] });
    } finally {
      setSwPushing(false);
    }
  }

  function handleDeleteDependency(id: string) {
    startTransition(async () => {
      await deleteExpenseDependency(id, juntadaId);
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
  const simplifiedSplit = calculateSimplifiedSplit(split, dependencies);

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
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-4 text-sm text-muted-foreground">
          {totalUYU > 0 && <span>$ <span className="font-semibold text-foreground">{totalUYU.toFixed(2)}</span></span>}
          {totalUSD > 0 && <span>U$S <span className="font-semibold text-foreground">{totalUSD.toFixed(2)}</span></span>}
          {totalUYU === 0 && totalUSD === 0 && <span>Sin gastos registrados</span>}
        </div>
        <div className="flex gap-2 shrink-0">
          {isAdmin && splitwiseGroupId && (
            <Button size="sm" variant="outline" onClick={handlePushToSplitwise} disabled={swPushing || isPending}>
              {swPushing ? "Exportando..." : "Exportar a Splitwise"}
            </Button>
          )}
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
                {type === "house" && <p className="text-xs text-muted-foreground">Se divide por noches entre quienes estuvieron.</p>}
                {type === "meal" && <p className="text-xs text-muted-foreground">Se divide en partes iguales entre todos los asistentes.</p>}
              </div>
              {type === "general" && (
                <>
                  <div className="space-y-2">
                    <Label>Alcance</Label>
                    <div className="flex gap-2">
                      {(["all", "custom"] as const).map((s) => (
                        <button key={s} type="button" onClick={() => setScope(s)}
                          className={cn("flex-1 py-1.5 rounded-lg text-sm border transition-colors",
                            scope === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                          )}>
                          {s === "all" ? "Todos" : "Específicos"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Método de división</Label>
                    <div className="flex gap-2">
                      {(["portions", "linear"] as const).map((m) => (
                        <button key={m} type="button" onClick={() => setSplitMethod(m)}
                          className={cn("flex-1 py-1.5 rounded-lg text-sm border transition-colors",
                            splitMethod === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                          )}>
                          {SPLIT_METHOD_LABELS[m]}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {scope === "all" && splitMethod === "portions" && "Se divide entre todos, proporcionalmente a las porciones de día de cada uno."}
                      {scope === "all" && splitMethod === "linear" && "Se divide en partes iguales entre todos los asistentes."}
                      {scope === "custom" && splitMethod === "portions" && "Se divide entre los seleccionados, proporcionalmente a sus porciones de día."}
                      {scope === "custom" && splitMethod === "linear" && "Se divide en partes iguales entre los seleccionados."}
                    </p>
                  </div>
                  {scope === "custom" && (
                    <div className="space-y-2">
                      <Label>Participantes</Label>
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
                </>
              )}
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
              <div className="space-y-2">
                <Label>Pagó</Label>
                <Select value={paidBy} onValueChange={(v) => v && setPaidBy(v)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(() => { const a = attendees.find((a) => a.id === paidBy); return a?.name || a?.email.split("@")[0] || ""; })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {attendees.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name || a.email.split("@")[0]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isPending || !description || !amount}>
                Agregar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Splitwise export result */}
      {swResult && (
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-medium">
              {swResult.created > 0
                ? `✓ ${swResult.created} gasto${swResult.created !== 1 ? "s" : ""} exportado${swResult.created !== 1 ? "s" : ""} a Splitwise`
                : "No se exportaron gastos"}
            </p>
            <button type="button" className="text-muted-foreground hover:text-foreground text-xs" onClick={() => setSwResult(null)}>Cerrar</button>
          </div>
          {swResult.skipped.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Omitidos ({swResult.skipped.length})</p>
              {swResult.skipped.map((s, i) => (
                <p key={i} className="text-xs text-muted-foreground">· {s.description}: {s.reason}</p>
              ))}
            </div>
          )}
          {swResult.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-destructive font-medium">Errores ({swResult.errors.length})</p>
              {swResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive">· {e.description}: {e.error}</p>
              ))}
            </div>
          )}
        </div>
      )}

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
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(ev) => { ev.stopPropagation(); openEdit(e); }} disabled={isPending}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
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

      {/* Dependencias de gastos */}
      {attendees.length > 1 && (
        <>
          <Separator />
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowDependencies((v) => !v)}
              className="flex items-center gap-2 w-full text-left"
            >
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Quién cubre a quién
              </h3>
              {showDependencies
                ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
            </button>
            {showDependencies && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Si alguien cubre los gastos de otro (ej. una pareja), los saldos del dependiente se absorben en el balance simplificado.
                </p>
                {dependencies.length > 0 && (
                  <div className="divide-y border rounded-lg">
                    {dependencies.map((dep) => (
                      <div key={dep.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <span className="font-medium">{dep.coveredBy.name || dep.coveredBy.email.split("@")[0]}</span>
                        <span className="text-muted-foreground text-xs">cubre a</span>
                        <span className="font-medium">{dep.dependent.name || dep.dependent.email.split("@")[0]}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-auto"
                          onClick={() => handleDeleteDependency(dep.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Select value={newCoveredBy} onValueChange={(v) => v && setNewCoveredBy(v)}>
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue>
                        {newCoveredBy
                          ? (() => { const a = attendees.find((a) => a.id === newCoveredBy); return a?.name || a?.email.split("@")[0] || ""; })()
                          : <span className="text-muted-foreground">Quién cubre</span>}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {attendees.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name || a.email.split("@")[0]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground shrink-0">cubre a</span>
                  <Select value={newDependent} onValueChange={(v) => v && setNewDependent(v)}>
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue>
                        {newDependent
                          ? (() => { const a = attendees.find((a) => a.id === newDependent); return a?.name || a?.email.split("@")[0] || ""; })()
                          : <span className="text-muted-foreground">Quién depende</span>}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {attendees.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name || a.email.split("@")[0]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={handleAddDependency}
                    disabled={isPending || !newDependent || !newCoveredBy || newDependent === newCoveredBy}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Balances */}
      {split.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowBalances((v) => !v)}
              className="flex items-center gap-2 w-full text-left"
            >
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Balances
              </h3>
              {showBalances
                ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
            </button>
            {showBalances && (
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
            )}
          </div>

          <Separator />
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowSimplified((v) => !v)}
              className="flex items-center gap-2 w-full text-left"
            >
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Balance simplificado
              </h3>
              {showSimplified
                ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />}
            </button>
            {showSimplified && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Mínima cantidad de transferencias para saldar todas las deudas.
                </p>
                {simplifiedSplit.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todo está saldado.</p>
                ) : (
                  (() => {
                    // Group by creditor (owes) and currency
                    const byCreditor = simplifiedSplit.reduce<Record<string, typeof simplifiedSplit>>((acc, s) => {
                      const key = `${s.owes}__${s.currency}`;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(s);
                      return acc;
                    }, {});
                    return Object.entries(byCreditor).map(([key, entries]) => {
                      const creditorId = entries[0].owes;
                      const currency = entries[0].currency;
                      const total = entries.reduce((sum, e) => sum + e.amount, 0);
                      return (
                        <div key={key} className="space-y-1">
                          <div className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-lg font-semibold text-sm",
                            creditorId === currentUserId ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-muted/50 text-foreground"
                          )}>
                            <span>{userName(creditorId)} recupera</span>
                            <span>{CURRENCY_SYMBOL[currency]} {total.toFixed(2)}</span>
                          </div>
                          <div className="divide-y border rounded-lg">
                            {entries.map((s, rowIdx) => {
                              const rowKey = `${key}__${rowIdx}`;
                              const isBreakdownOpen = expandedBreakdown === rowKey;
                              const hasBreakdown = !!(s.breakdown && s.breakdown.length >= 1);
                              return (
                                <div key={rowIdx}>
                                  <div
                                    className={cn("flex items-center gap-2 text-sm px-3 py-2", hasBreakdown && "cursor-pointer hover:bg-muted/30")}
                                    onClick={() => hasBreakdown && setExpandedBreakdown(isBreakdownOpen ? null : rowKey)}
                                  >
                                    <span className={cn("font-medium", s.userId === currentUserId && "text-destructive")}>
                                      {userName(s.userId)}
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className={cn("text-muted-foreground", s.owes === currentUserId && "text-green-600 font-medium")}>
                                      {userName(s.owes)}
                                    </span>
                                    <span className="ml-auto font-semibold">{CURRENCY_SYMBOL[currency]} {s.amount.toFixed(2)}</span>
                                    {hasBreakdown && (
                                      isBreakdownOpen
                                        ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    )}
                                  </div>
                                  {hasBreakdown && isBreakdownOpen && (
                                    <div className="px-4 pb-2 pt-0.5 space-y-1 bg-muted/20 border-t">
                                      {s.breakdown!.map((b) => (
                                        <div key={b.userId} className="flex justify-between text-xs text-muted-foreground pl-2">
                                          <span>{userName(b.userId)}</span>
                                          <span>{CURRENCY_SYMBOL[currency]} {b.amount.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            )}
          </div>
        </>
      )}

      {expenses.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No hay gastos registrados todavía.</p>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={editType} onValueChange={(v) => v && setEditType(v as ExpenseType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{EXPENSE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editType === "house" && <p className="text-xs text-muted-foreground">Se divide por noches entre quienes estuvieron.</p>}
              {editType === "meal" && <p className="text-xs text-muted-foreground">Se divide en partes iguales entre todos los asistentes.</p>}
            </div>
            {editType === "general" && (
              <>
                <div className="space-y-2">
                  <Label>Alcance</Label>
                  <div className="flex gap-2">
                    {(["all", "custom"] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setEditScope(s)}
                        className={cn("flex-1 py-1.5 rounded-lg text-sm border transition-colors",
                          editScope === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                        )}>
                        {s === "all" ? "Todos" : "Específicos"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Método de división</Label>
                  <div className="flex gap-2">
                    {(["portions", "linear"] as const).map((m) => (
                      <button key={m} type="button" onClick={() => setEditSplitMethod(m)}
                        className={cn("flex-1 py-1.5 rounded-lg text-sm border transition-colors",
                          editSplitMethod === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                        )}>
                        {SPLIT_METHOD_LABELS[m]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editScope === "all" && editSplitMethod === "portions" && "Se divide entre todos, proporcionalmente a las porciones de día de cada uno."}
                    {editScope === "all" && editSplitMethod === "linear" && "Se divide en partes iguales entre todos los asistentes."}
                    {editScope === "custom" && editSplitMethod === "portions" && "Se divide entre los seleccionados, proporcionalmente a sus porciones de día."}
                    {editScope === "custom" && editSplitMethod === "linear" && "Se divide en partes iguales entre los seleccionados."}
                  </p>
                </div>
                {editScope === "custom" && (
                  <div className="space-y-2">
                    <Label>Participantes</Label>
                    <div className="flex flex-wrap gap-2">
                      {attendees.map((a) => (
                        <button key={a.id} type="button" onClick={() => toggleEditParticipant(a.id)}
                          className={cn("px-3 py-1 rounded-full text-sm border transition-colors",
                            editParticipantIds.includes(a.id) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                          )}>
                          {a.name || a.email.split("@")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-1">
                <Label>Moneda</Label>
                <Select value={editCurrency} onValueChange={(v) => v && setEditCurrency(v as Currency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UYU">$ Pesos</SelectItem>
                    <SelectItem value="USD">U$S Dólares</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Monto</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pagó</Label>
              <Select value={editPaidBy} onValueChange={(v) => v && setEditPaidBy(v)}>
                <SelectTrigger>
                  <SelectValue>
                    {(() => { const a = attendees.find((a) => a.id === editPaidBy); return a?.name || a?.email.split("@")[0] || ""; })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {attendees.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name || a.email.split("@")[0]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEdit} disabled={isPending || !editDescription || !editAmount}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
