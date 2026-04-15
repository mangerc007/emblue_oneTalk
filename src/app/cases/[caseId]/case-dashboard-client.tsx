"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { CaseDTO, StepType } from "@/domain/types";
import { STEP_ORDER, META_STATUS_LABELS } from "@/domain/types";
import { evaluateStep, getCurrentStep } from "@/domain/rules";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Stepper } from "@/components/wizard/stepper";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

const stepStatusConfig = {
  COMPLETED: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, badge: "success" as const },
  IN_PROGRESS: { icon: <Clock className="h-4 w-4 text-blue-500" />, badge: "info" as const },
  BLOCKED: { icon: <AlertCircle className="h-4 w-4 text-amber-500" />, badge: "warning" as const },
  NOT_STARTED: { icon: <div className="h-4 w-4 rounded-full border-2 border-zinc-300" />, badge: "neutral" as const },
};

const statusLabels = {
  COMPLETED: "Completado",
  IN_PROGRESS: "En progreso",
  BLOCKED: "Bloqueado",
  NOT_STARTED: "No iniciado",
};

export function CaseDashboardClient({ initialCase }: { initialCase: CaseDTO }) {
  const [caseData, setCaseData] = useState(initialCase);
  const currentStepType = getCurrentStep(caseData.steps) ?? STEP_ORDER[STEP_ORDER.length - 1];
  const currentStep = caseData.steps.find((s) => s.type === currentStepType);
  const latestMetaStatus = caseData.statusLogs[caseData.statusLogs.length - 1];

  const blockers = caseData.steps.filter((s) => s.status === "BLOCKED");
  const completedSteps = caseData.steps.filter((s) => s.status === "COMPLETED").length;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-5 py-3 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Casos
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-zinc-800">
              {caseData.business.name}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {caseData.status === "COMPLETED" && (
              <Badge variant="success">Proceso completado</Badge>
            )}
            {latestMetaStatus && (
              <Badge
                variant={
                  latestMetaStatus.status === "APPROVED"
                    ? "success"
                    : latestMetaStatus.status === "REJECTED"
                    ? "danger"
                    : latestMetaStatus.status === "NEEDS_INFORMATION"
                    ? "warning"
                    : "info"
                }
              >
                Meta: {META_STATUS_LABELS[latestMetaStatus.status]}
              </Badge>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar stepper */}
          <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white overflow-y-auto">
            <div className="p-4 border-b border-zinc-100">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                Progreso
              </p>
              <ProgressBar value={caseData.progressPct} showLabel size="md" />
              <p className="mt-1 text-xs text-zinc-500">
                {completedSteps} de {STEP_ORDER.length} etapas
              </p>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <Stepper
                steps={caseData.steps}
                caseId={caseData.id}
                currentStepType={currentStepType}
                orientation="vertical"
              />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 min-w-0">
            {/* Blockers alert */}
            {blockers.length > 0 && (
              <Alert type="warning" title={`${blockers.length} etapa(s) bloqueada(s)`}>
                <ul className="mt-1 space-y-1">
                  {blockers.map((b) => (
                    <li key={b.id} className="text-xs">
                      <strong>{b.label}:</strong>{" "}
                      {b.blockedReason ?? "Revisar requisitos previos"}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Summary card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">
                      {caseData.business.name}
                    </h2>
                    {caseData.business.legalName && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {caseData.business.legalName}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold tabular-nums text-blue-600">
                      {caseData.progressPct}%
                    </p>
                    <p className="text-xs text-zinc-500">completado</p>
                  </div>
                </div>
                <ProgressBar
                  value={caseData.progressPct}
                  className="mt-3"
                  size="md"
                />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                  <InfoItem label="Creado" value={formatDate(caseData.createdAt)} />
                  <InfoItem label="Actualizado" value={formatDate(caseData.updatedAt)} />
                  <InfoItem label="País" value={caseData.business.country ?? "—"} />
                  <InfoItem
                    label="Bandeja OneTalk"
                    value={caseData.oneTalkInboxName ?? "Pendiente"}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Current step CTA */}
            {currentStep && caseData.status !== "COMPLETED" && (
              <CurrentStepCard caseId={caseData.id} step={caseData.steps.find(s => s.type === currentStepType)!} />
            )}

            {/* All steps overview */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-zinc-800">
                  Etapas del proceso
                </h3>
              </CardHeader>
              <div className="divide-y divide-zinc-100">
                {caseData.steps.map((step) => {
                  const rule = evaluateStep(
                    step.type as StepType,
                    caseData.steps,
                    caseData.documents,
                    caseData.statusLogs
                  );
                  const cfg = stepStatusConfig[step.status];
                  const isAccessible =
                    step.status !== "NOT_STARTED";

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 transition-colors",
                        isAccessible && "hover:bg-zinc-50"
                      )}
                    >
                      {cfg.icon}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-800 truncate">
                            {step.label}
                          </p>
                          <Badge variant={cfg.badge}>
                            {statusLabels[step.status]}
                          </Badge>
                        </div>
                        {step.status === "BLOCKED" && rule.blockers[0] && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            {rule.blockers[0].message}
                          </p>
                        )}
                      </div>
                      {isAccessible && (
                        <Link href={`/cases/${caseData.id}/steps/${step.type}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Timeline */}
            {caseData.statusLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-zinc-800">
                    Historial de verificación Meta
                  </h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...caseData.statusLogs].reverse().map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-800">
                          {log.label}
                        </p>
                        {log.notes && (
                          <p className="text-xs text-zinc-500 mt-0.5">{log.notes}</p>
                        )}
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {formatDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Assistant panel */}
      <AssistantPanel
        caseId={caseData.id}
        messages={caseData.messages}
        currentStepType={currentStepType}
        steps={caseData.steps}
        documents={caseData.documents}
        statusLogs={caseData.statusLogs}
        businessName={caseData.business.name}
        onMessagesUpdate={(msgs) =>
          setCaseData((prev) => ({ ...prev, messages: msgs }))
        }
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-800">{value}</p>
    </div>
  );
}

function CurrentStepCard({
  caseId,
  step,
}: {
  caseId: string;
  step: CaseDTO["steps"][number];
}) {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              Etapa actual
            </p>
            <p className="text-base font-bold text-zinc-900 mt-0.5">
              {step.label}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5 max-w-sm">
              {step.description}
            </p>
          </div>
          <Link href={`/cases/${caseId}/steps/${step.type}`}>
            <Button>
              Continuar
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
