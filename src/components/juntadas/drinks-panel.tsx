"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { upsertDrinkPreference, upsertDrinkConfig } from "@/db/queries/drinks";
import { DRINK_LABELS, DRINK_DEFAULTS } from "@/lib/drink-types";
import type { DrinkType } from "@/lib/drink-types";
import { getDrinkPortionsForUser } from "@/lib/attendance";
import { cn } from "@/lib/utils";

const DRINK_TYPES: DrinkType[] = ["water", "soda_zero", "soda_regular", "beer", "fernet", "wine", "whisky", "jagger"];

type DrinkConfig = { drinkType: string; mlPerPersonPerDay: number };
type DrinkPreference = { userId: string; drinkType: string; enabled: boolean; user: { id: string; name: string; email: string } };

type AttendanceEntry = {
  userId: string;
  arrivalDate: string | null;
  arrivalSlot: string | null;
  departureDate: string | null;
  departureSlot: string | null;
  user: { id: string; name: string; email: string };
};

type Props = {
  juntadaId: string;
  currentUserId: string;
  configs: DrinkConfig[];
  preferences: DrinkPreference[];
  attendance: AttendanceEntry[];
  dates: string[];
};

export function DrinksPanel({ juntadaId, currentUserId, configs, preferences, attendance, dates }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editingConfig, setEditingConfig] = useState<DrinkType | null>(null);
  const [configValue, setConfigValue] = useState("");

  function getConfig(drink: DrinkType) {
    return configs.find((c) => c.drinkType === drink)?.mlPerPersonPerDay ?? DRINK_DEFAULTS[drink];
  }

  function getMyPreference(drink: DrinkType) {
    const pref = preferences.find((p) => p.userId === currentUserId && p.drinkType === drink);
    return pref?.enabled ?? false;
  }

  function togglePreference(drink: DrinkType, enabled: boolean) {
    startTransition(async () => {
      await upsertDrinkPreference(juntadaId, drink, enabled);
    });
  }

  function saveConfig(drink: DrinkType) {
    const val = parseInt(configValue);
    if (isNaN(val) || val < 0) return;
    startTransition(async () => {
      await upsertDrinkConfig(juntadaId, drink, val);
      setEditingConfig(null);
    });
  }

  // Calculate total for each drink weighting each person by their stay (2 portions per day: lunch + dinner)
  function calcTotal(drink: DrinkType): { ml: number; liters: string; buyers: string[] } {
    const mlPerDay = getConfig(drink);
    const buyers = preferences
      .filter((p) => p.drinkType === drink && p.enabled)
      .map((p) => p.user);

    const totalMl = buyers.reduce((sum, buyer) => {
      const record = attendance.find((a) => a.userId === buyer.id);
      const portions = record ? getDrinkPortionsForUser(record as any, dates) : 0;
      return sum + (mlPerDay / 2) * portions;
    }, 0);

    return {
      ml: totalMl,
      liters: (totalMl / 1000).toFixed(1),
      buyers: buyers.map((u) => u.name || u.email.split("@")[0]),
    };
  }

  return (
    <div className="space-y-8">
      {/* My preferences */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Mis bebidas
        </h3>
        <div className="flex flex-wrap gap-2">
          {DRINK_TYPES.map((drink) => {
            const enabled = getMyPreference(drink);
            return (
              <button
                key={drink}
                onClick={() => togglePreference(drink, !enabled)}
                disabled={isPending}
                className={cn(
                  "px-4 py-2 rounded-full text-sm border transition-colors",
                  enabled
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted text-muted-foreground"
                )}
              >
                {DRINK_LABELS[drink]}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Totals */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Cantidades a comprar (según estadía)
        </h3>
        <div className="space-y-2">
          {DRINK_TYPES.map((drink) => {
            const { liters, buyers } = calcTotal(drink);
            const mlPerDay = getConfig(drink);
            const isEditing = editingConfig === drink;

            return (
              <div key={drink} className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <span className="text-sm font-medium">{DRINK_LABELS[drink]}</span>
                  {buyers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {buyers.join(", ")} · {mlPerDay} ml/persona/día
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {buyers.length > 0 ? (
                    <span className="text-sm font-semibold">{liters} L</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className="w-20 h-7 text-xs"
                        placeholder={String(mlPerDay)}
                        value={configValue}
                        onChange={(e) => setConfigValue(e.target.value)}
                        autoFocus
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={() => saveConfig(drink)} disabled={isPending}>Listo</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingConfig(null)}>×</Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => { setEditingConfig(drink); setConfigValue(String(mlPerDay)); }}
                    >
                      {mlPerDay} ml/d
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All preferences summary */}
      {preferences.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Preferencias del grupo
            </h3>
            <div className="space-y-2">
              {attendance.map((a) => {
                const myPrefs = DRINK_TYPES.filter((d) =>
                  preferences.find((p) => p.userId === a.userId && p.drinkType === d && p.enabled)
                );
                return (
                  <div key={a.userId} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-32 truncate">
                      {a.user.name || a.user.email.split("@")[0]}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {myPrefs.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">sin preferencias</span>
                      ) : (
                        myPrefs.map((d) => (
                          <span key={d} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                            {DRINK_LABELS[d]}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
