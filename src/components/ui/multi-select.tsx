"use client";

import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

type Props = {
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
};

export function MultiSelect({ options, selected, onChange, placeholder = "Seleccioná..." }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabels = options
    .filter((o) => selected.includes(o.id))
    .map((o) => o.label);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== id));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<button className="w-full" />}>
        <div className={cn(
          "w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm min-h-8 transition-colors hover:bg-muted/50",
        )}>
          <div className="flex flex-wrap gap-1 flex-1 text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedLabels.map((label, i) => (
                <span
                  key={selected[i]}
                  className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full"
                >
                  {label}
                  <button
                    onClick={(e) => remove(selected[i], e)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
          ) : (
            filtered.map((option) => {
              const isSelected = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => toggle(option.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-left transition-colors",
                    isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                    isSelected ? "bg-primary border-primary" : "border-border"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  {option.label}
                </button>
              );
            })
          )}
        </div>
        {selected.length > 0 && (
          <div className="p-2 border-t">
            <button
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center transition-colors"
            >
              Limpiar selección
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
