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
import { calculateSplit } from "@/lib/splits";
import { EXPENSE_TYPE_LABELS } from "@/lib/expense-types";
import type { ExpenseType } from "@/lib/expense-types";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Attendee = { id: string; name: string; email: string };
type Expense = {
  id: string;
  type: string;
  description: string;
  amount: number;
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

type Props = {
  juntadaId: string;
  dateStart: string;
  dateEnd: string;
  expenses: Expense[];
  attendance: AttendanceRecord[];
  attendees: Attendee[];
  currentUserId: string;
};

const EXPENSE_TYPES: ExpenseType[] = ["house", "general", "meal", "custom"];

function userName(attendees: Attendee[], userId: string) {
  const u = attendees.find((a) => a.id === userId);
  return u?.name || u?.email.split("@")[0] || userId;
}

export function ExpensesPanel({
  juntadaId,
  dateStart,
  dateEnd,
  expenses,
  attendance,
  attendees,
  currentUserId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<ExpenseType>("general");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
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
        date,
        participantIds: type === "custom" ? participantIds : undefined,
      });
      setDescription("");
      setAmount("");
      setParticipantIds([]);
      setOpen(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExpense(id, juntadaId);
    });
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const split = calculateSplit(
    expenses.map((e) => ({ ...e, type: e.type })),
    attendance,
    dateStart,
    dateEnd
  );

  return (
    <div className="space-y-8">
      {/* Add expense */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total registrado: <span className="font-semibold text-foreground">${total.toFixed(2)}</span>
        </p>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Monto ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
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
      {expenses.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Gastos</h3>
          <div className="divide-y border rounded-lg">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{e.description}</span>
                    <Badge variant="secondary" className="text-xs">{EXPENSE_TYPE_LABELS[e.type as ExpenseType]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {e.date} · pagó {e.paidByUser.name || e.paidByUser.email.split("@")[0]}
                    {e.type === "custom" && e.participants.length > 0 && (
                      <> · entre {e.participants.length} personas</>
                    )}
                  </p>
                </div>
                <span className="text-sm font-semibold">${e.amount.toFixed(2)}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(e.id)} disabled={isPending}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
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
                    {userName(attendees, s.userId)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className={cn("font-medium", s.owes === currentUserId && "text-green-600")}>
                    {userName(attendees, s.owes)}
                  </span>
                  <span className="ml-auto font-semibold">${s.amount.toFixed(2)}</span>
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
