"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, CheckCircle2 } from "lucide-react";
import { businessSchema, type BusinessInput, BUSINESS_INFO_REQUIRED_FIELDS } from "@/validations/business.schema";
import type { BusinessDTO, StepDTO } from "@/domain/types";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const INDUSTRY_OPTIONS = [
  { value: "retail", label: "Comercio / Retail" },
  { value: "food", label: "Alimentos y Bebidas" },
  { value: "health", label: "Salud y Bienestar" },
  { value: "education", label: "Educación" },
  { value: "technology", label: "Tecnología" },
  { value: "finance", label: "Finanzas" },
  { value: "real_estate", label: "Inmobiliaria" },
  { value: "logistics", label: "Logística" },
  { value: "services", label: "Servicios profesionales" },
  { value: "other", label: "Otro" },
];

interface BusinessInfoFormProps {
  caseId: string;
  business: BusinessDTO;
  step: StepDTO;
  onSave: () => Promise<void>;
}

export function BusinessInfoForm({ caseId, business, step, onSave }: BusinessInfoFormProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<BusinessInput>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: business.name ?? "",
      legalName: business.legalName ?? "",
      taxId: business.taxId ?? "",
      website: business.website ?? "",
      phone: business.phone ?? "",
      email: business.email ?? "",
      addressLine: business.addressLine ?? "",
      city: business.city ?? "",
      country: business.country ?? "",
      industry: business.industry ?? "",
      description: business.description ?? "",
      metaBusinessId: business.metaBusinessId ?? "",
      metaPageId: business.metaPageId ?? "",
    },
  });

  const completedRequired = BUSINESS_INFO_REQUIRED_FIELDS.filter(
    (f) => !!business[f as keyof BusinessDTO]
  ).length;

  async function onSubmit(data: BusinessInput) {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: data }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        await onSave();
      }
    } finally {
      setSaving(false);
    }
  }

  const isReadOnly = step.status === "COMPLETED";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-800">
            Datos del negocio
          </h2>
          <span className="text-xs text-zinc-500">
            {completedRequired}/{BUSINESS_INFO_REQUIRED_FIELDS.length} campos requeridos
          </span>
        </div>
        {saved && (
          <Alert type="success" className="mt-2">
            <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />
            Información guardada correctamente.
          </Alert>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Identification */}
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Identificación
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Nombre del negocio"
                required
                disabled={isReadOnly}
                error={errors.name?.message}
                {...register("name")}
              />
              <Input
                label="Nombre legal completo"
                required
                disabled={isReadOnly}
                hint="Tal como aparece en el registro mercantil"
                error={errors.legalName?.message}
                {...register("legalName")}
              />
              <Input
                label="NIT / RUT / Tax ID"
                required
                disabled={isReadOnly}
                error={errors.taxId?.message}
                {...register("taxId")}
              />
              <Select
                label="Industria"
                disabled={isReadOnly}
                options={INDUSTRY_OPTIONS}
                placeholder="Seleccionar..."
                {...register("industry")}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Contacto
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Sitio web"
                required
                type="url"
                placeholder="https://minegocio.com"
                disabled={isReadOnly}
                hint="Debe ser un sitio activo y propiedad del negocio"
                error={errors.website?.message}
                {...register("website")}
              />
              <Input
                label="Teléfono del negocio"
                required
                type="tel"
                placeholder="+57 300 000 0000"
                disabled={isReadOnly}
                error={errors.phone?.message}
                {...register("phone")}
              />
              <Input
                label="Email del negocio"
                required
                type="email"
                disabled={isReadOnly}
                error={errors.email?.message}
                {...register("email")}
              />
            </div>
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Dirección
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Dirección"
                required
                disabled={isReadOnly}
                error={errors.addressLine?.message}
                {...register("addressLine")}
              />
              <Input
                label="Ciudad"
                required
                disabled={isReadOnly}
                error={errors.city?.message}
                {...register("city")}
              />
              <Input
                label="País"
                required
                disabled={isReadOnly}
                error={errors.country?.message}
                {...register("country")}
              />
            </div>
          </div>

          {/* Meta fields */}
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Meta (opcional — completar si ya tienes el BM configurado)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Business Manager ID"
                disabled={isReadOnly}
                hint="ID numérico del Business Manager en Meta"
                error={errors.metaBusinessId?.message}
                {...register("metaBusinessId")}
              />
              <Input
                label="Meta Page ID"
                disabled={isReadOnly}
                error={errors.metaPageId?.message}
                {...register("metaPageId")}
              />
            </div>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <Textarea
              label="Descripción del negocio"
              disabled={isReadOnly}
              placeholder="Describe brevemente a qué se dedica el negocio..."
              {...register("description")}
            />
          </div>
        </CardContent>

        {!isReadOnly && (
          <CardFooter>
            <Button
              type="submit"
              loading={saving}
              disabled={!isDirty && completedRequired === BUSINESS_INFO_REQUIRED_FIELDS.length}
              icon={<Save />}
            >
              Guardar información
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
