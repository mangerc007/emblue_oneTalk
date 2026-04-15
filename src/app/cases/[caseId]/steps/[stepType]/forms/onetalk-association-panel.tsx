"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link2, CheckCircle2, PartyPopper, AlertTriangle } from "lucide-react";
import type { CaseDTO, StepDTO } from "@/domain/types";
import { oneTalkAssociationSchema, type OneTalkAssociationInput } from "@/validations/document.schema";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

// Mock OneTalk inboxes (in real integration, fetched from OneTalk API)
const MOCK_INBOXES = [
  { value: "inbox_001", label: "Bandeja Principal — WhatsApp Business" },
  { value: "inbox_002", label: "Soporte Comercial" },
  { value: "inbox_003", label: "Atención al Cliente" },
  { value: "inbox_004", label: "Ventas y Distribución" },
];

interface OneTalkAssociationPanelProps {
  caseId: string;
  caseData: CaseDTO;
  step: StepDTO;
  onComplete: () => Promise<void>;
}

export function OneTalkAssociationPanel({
  caseId,
  caseData,
  step,
  onComplete,
}: OneTalkAssociationPanelProps) {
  const router = useRouter();
  const [associating, setAssociating] = useState(false);
  const [done, setDone] = useState(step.status === "COMPLETED");

  const metaApproved =
    caseData.statusLogs[caseData.statusLogs.length - 1]?.status === "APPROVED";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OneTalkAssociationInput>({
    resolver: zodResolver(oneTalkAssociationSchema),
    defaultValues: {
      oneTalkInboxId: caseData.oneTalkInboxId ?? "",
      oneTalkInboxName: caseData.oneTalkInboxName ?? "",
    },
  });

  const selectedInboxId = watch("oneTalkInboxId");
  const selectedInbox = MOCK_INBOXES.find((i) => i.value === selectedInboxId);

  async function onSubmit(data: OneTalkAssociationInput) {
    if (!metaApproved) return;
    setAssociating(true);
    try {
      // Auto-fill inbox name from selection
      const inboxName =
        selectedInbox?.label ?? data.oneTalkInboxName;
      const res = await fetch(`/api/cases/${caseId}/onetalk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oneTalkInboxId: data.oneTalkInboxId,
          oneTalkInboxName: inboxName,
        }),
      });
      if (res.ok) {
        setDone(true);
        await onComplete();
        // Redirect to case dashboard after a brief moment
        setTimeout(() => router.push(`/cases/${caseId}`), 1500);
      }
    } finally {
      setAssociating(false);
    }
  }

  if (done || step.status === "COMPLETED") {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <PartyPopper className="h-12 w-12 text-emerald-500" />
          <h2 className="text-xl font-bold text-emerald-800">
            ¡Activación completada!
          </h2>
          <p className="text-sm text-emerald-700 max-w-sm">
            El negocio <strong>{caseData.business.name}</strong> fue verificado
            en Meta y asociado correctamente con{" "}
            <strong>{caseData.oneTalkInboxName ?? "OneTalk"}</strong>.
          </p>
          <p className="text-xs text-emerald-600">
            Los mensajes de WhatsApp Business se enrutarán automáticamente a la bandeja configurada.
          </p>
          <Button
            variant="secondary"
            onClick={() => router.push(`/cases/${caseId}`)}
          >
            Ver resumen del caso
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metaApproved) {
    return (
      <Alert type="warning" title="Verificación de Meta pendiente">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Solo puedes asociar OneTalk una vez que Meta haya aprobado la
            verificación del negocio. Completa el paso de Revisión de Meta
            primero.
          </p>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert type="success" title="Meta aprobado — listo para asociar">
        El negocio fue verificado por Meta. Selecciona la bandeja de OneTalk
        para completar la activación.
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-zinc-800">
              Configuración de bandeja OneTalk
            </h2>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Prerequisites */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">
                Verificación de prerequisitos
              </p>
              <PrereqItem
                label="Verificación Meta aprobada"
                ok={metaApproved}
              />
              <PrereqItem
                label="Business Manager activo"
                ok={caseData.steps.find((s) => s.type === "BUSINESS_MANAGER")?.status === "COMPLETED"}
              />
              <PrereqItem
                label="Información del negocio completa"
                ok={caseData.steps.find((s) => s.type === "BUSINESS_INFO")?.status === "COMPLETED"}
              />
            </div>

            {/* Inbox selection */}
            <Select
              label="Bandeja OneTalk de destino"
              required
              options={MOCK_INBOXES}
              placeholder="Seleccionar bandeja..."
              error={errors.oneTalkInboxId?.message}
              {...register("oneTalkInboxId")}
            />

            {selectedInbox && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs text-blue-600 font-medium">Bandeja seleccionada:</p>
                <p className="text-sm font-semibold text-blue-800 mt-0.5">
                  {selectedInbox.label}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Los mensajes de WhatsApp Business serán enrutados a esta bandeja.
                </p>
              </div>
            )}

            {/* WhatsApp number */}
            <Input
              label="Número de WhatsApp Business (opcional)"
              placeholder="+57 300 000 0000"
              hint="El número que los clientes usarán para contactar al negocio"
            />
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              loading={associating}
              disabled={!selectedInboxId}
              icon={<Link2 />}
            >
              Completar asociación con OneTalk
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function PrereqItem({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      )}
      <span className={ok ? "text-emerald-700" : "text-amber-700"}>{label}</span>
    </div>
  );
}
