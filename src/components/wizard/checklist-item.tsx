"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistItemDTO } from "@/domain/types";

interface ChecklistItemProps {
  item: ChecklistItemDTO;
  stepId: string;
  onChange?: (key: string, completed: boolean) => Promise<void>;
  readOnly?: boolean;
}

export function ChecklistItem({
  item,
  stepId,
  onChange,
  readOnly = false,
}: ChecklistItemProps) {
  const [loading, setLoading] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(item.completed);

  async function handleToggle() {
    if (readOnly || loading) return;
    const next = !localCompleted;
    setLocalCompleted(next);
    setLoading(true);
    try {
      if (onChange) {
        await onChange(item.key, next);
      } else {
        await fetch(`/api/steps/${stepId}/checklist/${item.key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: next }),
        });
      }
    } catch {
      setLocalCompleted(!next); // rollback
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        localCompleted
          ? "border-emerald-200 bg-emerald-50"
          : "border-zinc-200 bg-white hover:border-zinc-300",
        !readOnly && "cursor-pointer"
      )}
      onClick={handleToggle}
      role="checkbox"
      aria-checked={localCompleted}
      tabIndex={readOnly ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") handleToggle();
      }}
    >
      {/* Checkbox */}
      <div
        className={cn(
          "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition-all",
          localCompleted
            ? "border-emerald-500 bg-emerald-500"
            : "border-zinc-300 bg-white",
          loading && "opacity-50"
        )}
        style={{ minWidth: "1.125rem", minHeight: "1.125rem" }}
      >
        {localCompleted && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              localCompleted ? "text-emerald-800 line-through decoration-emerald-400" : "text-zinc-800"
            )}
          >
            {item.label}
          </p>
          {item.required && !localCompleted && (
            <span className="shrink-0 text-xs text-red-500">Requerido</span>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}
