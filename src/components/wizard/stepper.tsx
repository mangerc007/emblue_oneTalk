"use client";

import { Check, Lock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepDTO, StepType } from "@/domain/types";
import { STEP_ORDER } from "@/domain/types";
import Link from "next/link";

interface StepperProps {
  steps: StepDTO[];
  caseId: string;
  currentStepType?: StepType;
  orientation?: "horizontal" | "vertical";
}

const statusConfig = {
  COMPLETED: {
    dot: "bg-emerald-500 text-white border-emerald-500",
    label: "text-emerald-700",
    connector: "bg-emerald-400",
    icon: <Check className="h-3.5 w-3.5" />,
  },
  IN_PROGRESS: {
    dot: "bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100",
    label: "text-zinc-900 font-semibold",
    connector: "bg-zinc-200",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  BLOCKED: {
    dot: "bg-amber-500 text-white border-amber-500",
    label: "text-amber-700",
    connector: "bg-zinc-200",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  NOT_STARTED: {
    dot: "bg-white text-zinc-400 border-zinc-300",
    label: "text-zinc-400",
    connector: "bg-zinc-200",
    icon: <Lock className="h-3 w-3" />,
  },
};

export function Stepper({
  steps,
  caseId,
  currentStepType,
  orientation = "vertical",
}: StepperProps) {
  const stepMap = Object.fromEntries(steps.map((s) => [s.type, s]));

  if (orientation === "horizontal") {
    return (
      <div className="flex items-center w-full overflow-x-auto pb-1">
        {STEP_ORDER.map((type, idx) => {
          const step = stepMap[type];
          const status = step?.status ?? "NOT_STARTED";
          const cfg = statusConfig[status];
          const isCurrent = type === currentStepType;
          const isAccessible =
            status === "COMPLETED" || status === "IN_PROGRESS" || status === "BLOCKED";
          const isLast = idx === STEP_ORDER.length - 1;

          return (
            <div key={type} className="flex items-center min-w-0">
              <div className="flex flex-col items-center gap-1">
                <ConditionalLink
                  href={`/cases/${caseId}/steps/${type}`}
                  enabled={isAccessible}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                      cfg.dot,
                      isCurrent && "scale-110"
                    )}
                    title={step?.label ?? type}
                  >
                    {cfg.icon}
                  </div>
                </ConditionalLink>
                <span
                  className={cn(
                    "whitespace-nowrap text-[10px] max-w-[64px] text-center leading-tight",
                    cfg.label
                  )}
                >
                  {step?.label ?? type}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 w-6 sm:w-10 shrink-0 mx-1",
                    step?.status === "COMPLETED" ? "bg-emerald-400" : "bg-zinc-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical stepper (sidebar)
  return (
    <nav aria-label="Etapas del proceso">
      <ol className="relative flex flex-col gap-0">
        {STEP_ORDER.map((type, idx) => {
          const step = stepMap[type];
          const status = step?.status ?? "NOT_STARTED";
          const cfg = statusConfig[status];
          const isCurrent = type === currentStepType;
          const isAccessible =
            status === "COMPLETED" ||
            status === "IN_PROGRESS" ||
            status === "BLOCKED";
          const isLast = idx === STEP_ORDER.length - 1;

          return (
            <li key={type} className="relative flex gap-3">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-3.5 top-8 w-0.5 bottom-0",
                    step?.status === "COMPLETED"
                      ? "bg-emerald-400"
                      : "bg-zinc-200"
                  )}
                  style={{ height: "calc(100% - 2rem)" }}
                />
              )}

              {/* Dot */}
              <div className="relative z-10 mt-1 shrink-0">
                <ConditionalLink
                  href={`/cases/${caseId}/steps/${type}`}
                  enabled={isAccessible}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                      cfg.dot,
                      isCurrent && "ring-4 ring-blue-100"
                    )}
                  >
                    {cfg.icon}
                  </div>
                </ConditionalLink>
              </div>

              {/* Label */}
              <div className="pb-6 min-w-0">
                <ConditionalLink
                  href={`/cases/${caseId}/steps/${type}`}
                  enabled={isAccessible}
                >
                  <p
                    className={cn(
                      "text-sm leading-tight transition-colors",
                      cfg.label,
                      isAccessible && "hover:text-blue-600 cursor-pointer"
                    )}
                  >
                    {step?.label ?? type}
                  </p>
                </ConditionalLink>
                {status === "BLOCKED" && step?.blockedReason && (
                  <p className="mt-0.5 text-xs text-amber-600 line-clamp-2">
                    {step.blockedReason}
                  </p>
                )}
                {status === "COMPLETED" && step?.completedAt && (
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Completado
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ConditionalLink({
  href,
  enabled,
  children,
}: {
  href: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return <Link href={href}>{children}</Link>;
}
