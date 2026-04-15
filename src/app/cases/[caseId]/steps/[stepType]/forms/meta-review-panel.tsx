"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import type { StepDTO, VerificationLogDTO, MetaVerificationStatus } from "@/domain/types";
import { META_STATUS_LABELS } from "@/domain/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";

const statusConfig: Record<
  MetaVerificationStatus,
  {
    icon: React.ReactNode;
    badge: "success" | "danger" | "warning" | "info" | "purple";
    alert: "success" | "error" | "warning" | "info";
    description: string;
  }
> = {
  SUBMITTED: {
    icon: <Send className="h-5 w-5 text-blue-500" />,
    badge: "info",
    alert: "info",
    description: "La solicitud fue enviada a Meta y está en cola.",
  },
  UNDER_REVIEW: {
    icon: <Clock className="h-5 w-5 text-violet-500" />,
    badge: "purple",
    alert: "info",
    description: "Meta está evaluando la información. Espera entre 1 y 7 días hábiles.",
  },
  APPROVED: {
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    badge: "success",
    alert: "success",
    description: "¡Meta aprobó la verificación! Puedes proceder con OneTalk.",
  },
  REJECTED: {
    icon: <XCircle className="h-5 w-5 text-red-500" />,
    badge: "danger",
    alert: "error",
    description: "Meta rechazó la verificación. Revisa y corrige los datos.",
  },
  NEEDS_INFORMATION: {
    icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
    badge: "warning",
    alert: "warning",
    description: "Meta requiere información adicional. Revisa el Business Manager.",
  },
};

const SIMULATOR_OPTIONS: { value: MetaVerificationStatus; label: string }[] = [
  { value: "SUBMITTED", label: "Enviado a Meta" },
  { value: "UNDER_REVIEW", label: "En revisión" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "REJECTED", label: "Rechazado" },
  { value: "NEEDS_INFORMATION", label: "Requiere información adicional" },
];

interface MetaReviewPanelProps {
  caseId: string;
  statusLogs: VerificationLogDTO[];
  step: StepDTO;
  onUpdate: () => Promise<void>;
}

export function MetaReviewPanel({
  caseId,
  statusLogs,
  step,
  onUpdate,
}: MetaReviewPanelProps) {
  const [simStatus, setSimStatus] = useState<MetaVerificationStatus>("SUBMITTED");
  const [simNotes, setSimNotes] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const latestLog = statusLogs[statusLogs.length - 1];
  const currentStatus = latestLog?.status;
  const cfg = currentStatus ? statusConfig[currentStatus] : null;

  async function handleSimulate() {
    setSimulating(true);
    try {
      await fetch(`/api/cases/${caseId}/meta-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: simStatus, notes: simNotes }),
      });
      setSimNotes("");
      await onUpdate();
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Current status */}
      {cfg && (
        <Alert type={cfg.alert} title={META_STATUS_LABELS[currentStatus!]}>
          {cfg.description}
        </Alert>
      )}

      {!currentStatus && (
        <Alert type="info" title="Sin estado de Meta aún">
          Una vez completado el wizard de verificación, el estado de Meta aparecerá aquí.
        </Alert>
      )}

      {/* Status card */}
      {currentStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {cfg?.icon}
              <div>
                <p className="text-sm font-semibold text-zinc-800">
                  Estado actual de Meta
                </p>
                <Badge variant={cfg?.badge}>{META_STATUS_LABELS[currentStatus]}</Badge>
              </div>
            </div>
          </CardHeader>
          {latestLog?.notes && (
            <CardContent>
              <p className="text-sm text-zinc-600">{latestLog.notes}</p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Status history */}
      {statusLogs.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-zinc-800">
              Historial de estados
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...statusLogs].reverse().map((log, i) => {
              const c = statusConfig[log.status];
              return (
                <div key={log.id} className="flex items-start gap-3">
                  <div className={cn("mt-0.5", i === 0 ? "opacity-100" : "opacity-40")}>
                    {c.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={c.badge} className={i > 0 ? "opacity-60" : ""}>
                        {META_STATUS_LABELS[log.status]}
                      </Badge>
                      <span className="text-xs text-zinc-400">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-zinc-600 mt-0.5">{log.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Simulator (demo mode) */}
      <Card className="border-violet-100 bg-violet-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-violet-800">
                Simulador de respuesta Meta
              </h3>
              <p className="text-xs text-violet-600 mt-0.5">
                Modo demo — simula la respuesta de Meta para probar el flujo
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSimulator(!showSimulator)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {showSimulator ? "Ocultar" : "Simular"}
            </Button>
          </div>
        </CardHeader>

        {showSimulator && (
          <CardContent className="space-y-3">
            <Select
              label="Estado a simular"
              value={simStatus}
              onChange={(e) => setSimStatus(e.target.value as MetaVerificationStatus)}
              options={SIMULATOR_OPTIONS}
            />
            <Textarea
              label="Notas (opcional)"
              placeholder="Ej: Documentación insuficiente..."
              value={simNotes}
              onChange={(e) => setSimNotes(e.target.value)}
              rows={2}
            />
            <Button
              onClick={handleSimulate}
              loading={simulating}
              variant="secondary"
            >
              Aplicar estado simulado
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Next steps when approved */}
      {currentStatus === "APPROVED" && step.status !== "COMPLETED" && (
        <Alert type="success" title="¡Verificación aprobada!">
          El negocio fue verificado por Meta. El paso fue completado automáticamente.
          Continúa con la asociación en OneTalk.
        </Alert>
      )}
    </div>
  );
}
