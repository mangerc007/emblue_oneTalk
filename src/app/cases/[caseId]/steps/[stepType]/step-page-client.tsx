"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lock,
  ChevronRight,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseDTO, StepType } from "@/domain/types";
import { STEP_ORDER, STEP_LABELS } from "@/domain/types";
import { evaluateStep, getNextStep } from "@/domain/rules";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ChecklistItem } from "@/components/wizard/checklist-item";
import { Stepper } from "@/components/wizard/stepper";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { BusinessInfoForm } from "./forms/business-info-form";
import { MetaReviewPanel } from "./forms/meta-review-panel";
import { OneTalkAssociationPanel } from "./forms/onetalk-association-panel";

const stepStatusBadge = {
  COMPLETED: <Badge variant="success">Completado</Badge>,
  IN_PROGRESS: <Badge variant="info">En progreso</Badge>,
  BLOCKED: <Badge variant="warning">Bloqueado</Badge>,
  NOT_STARTED: <Badge variant="neutral">No iniciado</Badge>,
};

interface StepPageClientProps {
  caseData: CaseDTO;
  stepType: StepType;
}

export function StepPageClient({ caseData: initialCase, stepType }: StepPageClientProps) {
  const router = useRouter();
  const [caseData, setCaseData] = useState(initialCase);
  const [completing, setCompleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const step = caseData.steps.find((s) => s.type === stepType)!;
  const ruleResult = evaluateStep(stepType, caseData.steps, caseData.documents, caseData.statusLogs);
  const nextStep = getNextStep(stepType);
  const currentIdx = STEP_ORDER.indexOf(stepType);

  const refreshCase = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/cases/${caseData.id}`);
      if (res.ok) {
        const data = await res.json();
        setCaseData(data.data);
      }
    } finally {
      setRefreshing(false);
    }
  }, [caseData.id]);

  async function handleCompleteStep() {
    if (!ruleResult.canAdvance || completing) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/cases/${caseData.id}/steps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepType, status: "COMPLETED" }),
      });
      if (res.ok) {
        const data = await res.json();
        setCaseData(data.data);
        // Navigate to next step or case dashboard
        if (nextStep) {
          router.push(`/cases/${caseData.id}/steps/${nextStep}`);
        } else {
          router.push(`/cases/${caseData.id}`);
        }
      }
    } finally {
      setCompleting(false);
    }
  }

  const requiredItems = step.checklistItems.filter((i) => i.required);
  const completedRequired = requiredItems.filter((i) => i.completed).length;
  const checklistProgress =
    requiredItems.length > 0
      ? Math.round((completedRequired / requiredItems.length) * 100)
      : 100;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex items-center gap-2 border-b border-zinc-200 bg-white px-5 py-3 shrink-0 flex-wrap gap-y-2">
          <Link href={`/cases/${caseData.id}`} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            <Building2 className="h-3.5 w-3.5" />
            {caseData.business.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="text-sm font-semibold text-zinc-800">{step.label}</span>
          <div className="ml-2">{stepStatusBadge[step.status]}</div>
        </header>

        {/* Horizontal stepper on mobile / top */}
        <div className="border-b border-zinc-200 bg-white px-5 py-3 md:hidden overflow-x-auto">
          <Stepper steps={caseData.steps} caseId={caseData.id} currentStepType={stepType} orientation="horizontal" />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar stepper */}
          <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-zinc-200 bg-white overflow-y-auto">
            <div className="p-4">
              <Stepper steps={caseData.steps} caseId={caseData.id} currentStepType={stepType} orientation="vertical" />
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-w-0">
            {/* Step header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Etapa {currentIdx + 1} de {STEP_ORDER.length}
                </span>
              </div>
              <h1 className="text-xl font-bold text-zinc-900">{step.label}</h1>
              <p className="text-sm text-zinc-600 mt-1 max-w-2xl leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Blockers */}
            {!ruleResult.canAdvance && ruleResult.blockers.length > 0 && (
              <div className="space-y-2">
                {ruleResult.blockers.map((b) => (
                  <Alert key={b.code} type="warning" title={b.message}>
                    {b.actionable && <p className="text-xs mt-1">{b.actionable}</p>}
                  </Alert>
                ))}
              </div>
            )}

            {/* Step completed */}
            {step.status === "COMPLETED" && (
              <Alert type="success" title="Etapa completada">
                Esta etapa fue completada correctamente.{" "}
                {nextStep && (
                  <Link
                    href={`/cases/${caseData.id}/steps/${nextStep}`}
                    className="font-semibold underline"
                  >
                    Ir a {STEP_LABELS[nextStep]}
                  </Link>
                )}
              </Alert>
            )}

            {/* Special step content */}
            {stepType === "BUSINESS_INFO" && (
              <BusinessInfoForm
                caseId={caseData.id}
                business={caseData.business}
                step={step}
                onSave={refreshCase}
              />
            )}

            {stepType === "META_REVIEW" && (
              <MetaReviewPanel
                caseId={caseData.id}
                statusLogs={caseData.statusLogs}
                step={step}
                onUpdate={refreshCase}
              />
            )}

            {stepType === "ONETALK_ASSOCIATION" && (
              <OneTalkAssociationPanel
                caseId={caseData.id}
                caseData={caseData}
                step={step}
                onComplete={refreshCase}
              />
            )}

            {/* Checklist */}
            {step.checklistItems.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-800">
                      Checklist de verificación
                    </h2>
                    <span className="text-xs text-zinc-500">
                      {completedRequired}/{requiredItems.length} requeridos
                    </span>
                  </div>
                  {/* Mini progress */}
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        checklistProgress === 100 ? "bg-emerald-500" : "bg-blue-500"
                      )}
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {step.checklistItems.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      stepId={step.id}
                      readOnly={step.status === "COMPLETED"}
                      onChange={async (key, completed) => {
                        await fetch(`/api/steps/${step.id}/checklist/${key}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ completed }),
                        });
                        await refreshCase();
                      }}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Suggestions */}
            {ruleResult.suggestions.length > 0 && (
              <Card className="border-blue-100 bg-blue-50/50">
                <CardContent className="py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2">
                    Sugerencias
                  </p>
                  <ul className="space-y-1.5">
                    {ruleResult.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-blue-800">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer action bar */}
        {step.status !== "COMPLETED" && stepType !== "META_REVIEW" && stepType !== "ONETALK_ASSOCIATION" && (
          <footer className="border-t border-zinc-200 bg-white px-5 py-3 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                {ruleResult.canAdvance ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-zinc-700">Listo para completar</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-zinc-500 text-xs">
                      {ruleResult.blockers[0]?.message ?? "Completa los requisitos"}
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {currentIdx > 0 && (
                  <Link href={`/cases/${caseData.id}/steps/${STEP_ORDER[currentIdx - 1]}`}>
                    <Button variant="secondary" size="sm">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Anterior
                    </Button>
                  </Link>
                )}
                <Button
                  onClick={handleCompleteStep}
                  disabled={!ruleResult.canAdvance || step.status === "NOT_STARTED" && step.checklistItems.filter(i => i.required).some(i => !i.completed)}
                  loading={completing || refreshing}
                  icon={ruleResult.canAdvance ? undefined : <Lock />}
                >
                  {ruleResult.nextAction ?? "Completar etapa"}
                  {ruleResult.canAdvance && nextStep && (
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </footer>
        )}
      </div>

      {/* Assistant panel */}
      <AssistantPanel
        caseId={caseData.id}
        messages={caseData.messages}
        currentStepType={stepType}
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
