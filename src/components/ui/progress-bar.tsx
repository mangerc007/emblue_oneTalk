import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function ProgressBar({
  value,
  className,
  showLabel = false,
  size = "md",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  const color =
    clamped === 100
      ? "bg-emerald-500"
      : clamped >= 60
      ? "bg-blue-500"
      : clamped >= 30
      ? "bg-amber-500"
      : "bg-zinc-300";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-zinc-100",
          size === "sm" ? "h-1.5" : "h-2"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className="w-10 text-right text-sm font-semibold tabular-nums text-zinc-700">
          {clamped}%
        </span>
      )}
    </div>
  );
}
