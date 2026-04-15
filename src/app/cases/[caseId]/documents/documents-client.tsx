"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Building2,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { CaseDTO, DocumentDTO, DocumentStatus } from "@/domain/types";
import { DOCUMENT_LABELS, DOCUMENT_STATUS_LABELS } from "@/domain/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

const statusConfig: Record<
  DocumentStatus,
  { badge: "success" | "info" | "warning" | "danger" | "neutral"; icon: React.ReactNode; label: string }
> = {
  MISSING: {
    badge: "neutral",
    icon: <FileText className="h-4 w-4 text-zinc-400" />,
    label: "Faltante",
  },
  UPLOADED: {
    badge: "info",
    icon: <Upload className="h-4 w-4 text-blue-500" />,
    label: "Cargado",
  },
  VALIDATED: {
    badge: "success",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: "Validado",
  },
  OBSERVED: {
    badge: "warning",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    label: "Con observaciones",
  },
  REJECTED: {
    badge: "danger",
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    label: "Rechazado",
  },
};

interface DocumentsClientProps {
  caseData: CaseDTO;
}

export function DocumentsClient({ caseData: initialCase }: DocumentsClientProps) {
  const [caseData, setCaseData] = useState(initialCase);
  const [uploading, setUploading] = useState<string | null>(null);

  const docs = caseData.documents;
  const missing = docs.filter((d) => d.status === "MISSING").length;
  const uploaded = docs.filter((d) => d.status === "UPLOADED" || d.status === "VALIDATED").length;
  const issues = docs.filter((d) => d.status === "OBSERVED" || d.status === "REJECTED").length;

  async function refreshCase() {
    const res = await fetch(`/api/cases/${caseData.id}`);
    if (res.ok) {
      const data = await res.json();
      setCaseData(data.data);
    }
  }

  async function simulateUpload(docId: string) {
    setUploading(docId);
    try {
      // Simulate a file upload — sets status to UPLOADED with a mock URL
      await fetch(`/api/cases/${caseData.id}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docId,
          status: "UPLOADED",
          fileUrl: `https://example.com/docs/${docId}.pdf`,
          fileName: "documento.pdf",
        }),
      });
      await refreshCase();
    } finally {
      setUploading(null);
    }
  }

  async function changeStatus(docId: string, status: DocumentStatus) {
    await fetch(`/api/cases/${caseData.id}/documents`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, status }),
    });
    await refreshCase();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex items-center gap-2 border-b border-zinc-200 bg-white px-5 py-3 shrink-0">
          <Link
            href={`/cases/${caseData.id}`}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <Building2 className="h-3.5 w-3.5" />
            {caseData.business.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="text-sm font-semibold text-zinc-800">Documentos</span>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status summary */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard label="Faltantes" value={missing} color="zinc" />
            <SummaryCard label="Cargados" value={uploaded} color="emerald" />
            <SummaryCard label="Con problemas" value={issues} color="amber" />
          </div>

          {issues > 0 && (
            <Alert type="warning" title={`${issues} documento(s) requieren atención`}>
              Revisa los documentos con observaciones o rechazados y vuelve a cargarlos.
            </Alert>
          )}

          {missing === 0 && issues === 0 && (
            <Alert type="success" title="Todos los documentos están en orden">
              Puedes proceder con el inicio de la verificación.
            </Alert>
          )}

          {/* Documents list */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-800">
                  Documentos del caso
                </h2>
                <span className="text-xs text-zinc-400">{docs.length} documentos</span>
              </div>
            </CardHeader>
            <div className="divide-y divide-zinc-100">
              {docs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onUpload={() => simulateUpload(doc.id)}
                  onStatusChange={(status) => changeStatus(doc.id, status)}
                  uploading={uploading === doc.id}
                />
              ))}
            </div>
          </Card>

          {/* Info */}
          <Card className="border-zinc-100">
            <CardContent className="py-3">
              <p className="text-xs font-semibold text-zinc-600 mb-2">Requisitos de documentos</p>
              <ul className="space-y-1.5">
                {[
                  "Los documentos deben ser legibles y de alta calidad.",
                  "Formatos aceptados: PDF, JPG, PNG. Tamaño máximo: 10MB.",
                  "El registro mercantil no debe tener más de 3 meses de antigüedad.",
                  "Los documentos deben coincidir con los datos del negocio registrados.",
                  "La ID del representante legal debe estar vigente.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <AssistantPanel
        caseId={caseData.id}
        messages={caseData.messages}
        currentStepType="LEGAL_DOCUMENTS"
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

function DocumentRow({
  doc,
  onUpload,
  onStatusChange,
  uploading,
}: {
  doc: DocumentDTO;
  onUpload: () => void;
  onStatusChange: (status: DocumentStatus) => void;
  uploading: boolean;
}) {
  const cfg = statusConfig[doc.status];
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 transition-colors">
      <div className="shrink-0">{cfg.icon}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-zinc-800">{doc.label}</p>
          <Badge variant={cfg.badge}>{cfg.label}</Badge>
        </div>
        {doc.fileName && (
          <p className="text-xs text-zinc-500 mt-0.5">
            {doc.fileName} · {formatDate(doc.uploadedAt)}
          </p>
        )}
        {doc.notes && (
          <p className={cn("text-xs mt-0.5", doc.status === "OBSERVED" ? "text-amber-600" : "text-zinc-500")}>
            {doc.notes}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {doc.fileUrl && (
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-blue-600"
          >
            <Eye className="h-4 w-4" />
          </a>
        )}

        {/* Status simulator for demo */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {showActions && (
            <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
              {(["MISSING", "UPLOADED", "VALIDATED", "OBSERVED", "REJECTED"] as DocumentStatus[]).map(
                (s) => (
                  <button
                    key={s}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-50 text-zinc-700"
                    onClick={() => {
                      onStatusChange(s);
                      setShowActions(false);
                    }}
                  >
                    {DOCUMENT_STATUS_LABELS[s]}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {(doc.status === "MISSING" || doc.status === "REJECTED") && (
          <Button size="sm" loading={uploading} onClick={onUpload} icon={<Upload />}>
            Cargar
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "zinc" | "emerald" | "amber";
}) {
  const colors = {
    zinc: "text-zinc-700",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  };
  return (
    <Card>
      <CardContent className="py-3 text-center">
        <p className={cn("text-2xl font-bold tabular-nums", colors[color])}>
          {value}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
