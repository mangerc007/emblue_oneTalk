import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertType = "info" | "success" | "warning" | "error";

const styles: Record<
  AlertType,
  { container: string; icon: React.ReactNode }
> = {
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />,
  },
  success: {
    container: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />,
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-800",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />,
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />,
  },
};

interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
}

export function Alert({
  type = "info",
  title,
  children,
  className,
  onDismiss,
}: AlertProps) {
  const { container, icon } = styles[type];
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3 text-sm",
        container,
        className
      )}
      role="alert"
    >
      {icon}
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-60 hover:opacity-100"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
