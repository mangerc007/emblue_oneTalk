"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Building2,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  BarChart3,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MetaVerificationStatus, CaseStatus } from "@/domain/types";
import { META_STATUS_LABELS } from "@/domain/types";

type CaseListItem = {
  id: string;
  status: CaseStatus;
  progressPct: number;
  businessName: string;
  businessId: string;
  latestMetaStatus: MetaVerificationStatus | null;
  createdAt: Date;
  updatedAt: Date;
};

const statusBadge: Record<CaseStatus, { label: string; variant: "success" | "info" | "warning" | "danger" | "neutral" }> = {
  ACTIVE: { label: "Activo", variant: "info" },
  COMPLETED: { label: "Completado", variant: "success" },
  ABANDONED: { label: "Abandonado", variant: "neutral" },
  BLOCKED: { label: "Bloqueado", variant: "warning" },
};

const metaBadge: Record<MetaVerificationStatus, { label: string; variant: "success" | "info" | "warning" | "danger" | "neutral" | "purple" }> = {
  SUBMITTED: { label: "Enviado a Meta", variant: "info" },
  UNDER_REVIEW: { label: "En revisión", variant: "purple" },
  APPROVED: { label: "Aprobado por Meta", variant: "success" },
  REJECTED: { label: "Rechazado por Meta", variant: "danger" },
  NEEDS_INFORMATION: { label: "Info requerida", variant: "warning" },
};

interface DashboardClientProps {
  cases: CaseListItem[];
}

export function DashboardClient({ cases }: DashboardClientProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [newBizCountry, setNewBizCountry] = useState("");

  const stats = {
    total: cases.length,
    active: cases.filter((c) => c.status === "ACTIVE").length,
    completed: cases.filter((c) => c.status === "COMPLETED").length,
    blocked: cases.filter((c) => c.status === "BLOCKED").length,
  };

  async function handleCreate() {
    if (!newBizName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBizName, country: newBizCountry }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/cases/${data.data.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-900">
                Meta Activation
              </h1>
              <p className="text-xs text-zinc-500">OneTalk — Customer Success</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            icon={<Plus />}
          >
            Nuevo caso
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total casos"
            value={stats.total}
            icon={<BarChart3 className="h-5 w-5 text-zinc-500" />}
          />
          <StatCard
            label="Activos"
            value={stats.active}
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            valueClass="text-blue-600"
          />
          <StatCard
            label="Completados"
            value={stats.completed}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            valueClass="text-emerald-600"
          />
          <StatCard
            label="Bloqueados"
            value={stats.blocked}
            icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
            valueClass="text-amber-600"
          />
        </div>

        {/* New case form */}
        {showForm && (
          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-800">
                Crear nuevo caso de activación
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Nombre del negocio"
                  required
                  placeholder="Ej: Distribuidora Martínez S.A.S."
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <Input
                  label="País"
                  placeholder="Ej: Colombia"
                  value={newBizCountry}
                  onChange={(e) => setNewBizCountry(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} loading={creating} disabled={!newBizName.trim()}>
                  Crear caso
                </Button>
                <Button variant="ghost" onClick={() => { setShowForm(false); setNewBizName(""); }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cases list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">
              Casos de activación
            </h2>
            <span className="text-xs text-zinc-400">{cases.length} casos</span>
          </div>

          {cases.length === 0 ? (
            <EmptyState onNew={() => setShowForm(true)} />
          ) : (
            <div className="grid gap-3">
              {cases.map((c) => (
                <CaseCard key={c.id} caseItem={c} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        {icon}
        <div>
          <p className={cn("text-2xl font-bold tabular-nums", valueClass ?? "text-zinc-800")}>
            {value}
          </p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CaseCard({ caseItem }: { caseItem: CaseListItem }) {
  const sb = statusBadge[caseItem.status];

  return (
    <Link href={`/cases/${caseItem.id}`}>
      <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="py-3">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-zinc-900 text-sm truncate">
                  {caseItem.businessName}
                </span>
                <Badge variant={sb.variant}>{sb.label}</Badge>
                {caseItem.latestMetaStatus && (
                  <Badge variant={metaBadge[caseItem.latestMetaStatus].variant}>
                    {metaBadge[caseItem.latestMetaStatus].label}
                  </Badge>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <ProgressBar value={caseItem.progressPct} className="max-w-[140px]" size="sm" />
                <span className="text-xs text-zinc-500 tabular-nums">
                  {caseItem.progressPct}%
                </span>
                <span className="text-xs text-zinc-400 ml-auto">
                  {formatDate(caseItem.updatedAt)}
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-blue-500 shrink-0 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-white py-16 text-center">
      <Building2 className="h-10 w-10 text-zinc-300 mb-3" />
      <p className="text-sm font-medium text-zinc-600">No hay casos de activación</p>
      <p className="text-xs text-zinc-400 mt-1 mb-4">
        Crea el primer caso para comenzar el proceso de verificación
      </p>
      <Button onClick={onNew} icon={<Plus />}>
        Crear primer caso
      </Button>
    </div>
  );
}
