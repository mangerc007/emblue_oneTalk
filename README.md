# Meta Verification Assistant — OneTalk MVP

Asistente de activación para acompañar a usuarios en el proceso de **verificación de negocio en Meta** y su posterior **asociación con una bandeja OneTalk**.

---

## Objetivo

Reducir fricción, abandono y necesidad de soporte manual durante el onboarding de negocios que desean usar WhatsApp Business a través de OneTalk. El asistente guía al usuario paso a paso, valida requisitos, detecta bloqueos, orienta con mensajes claros y deja trazabilidad operativa del avance.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) con TypeScript |
| UI | React + Tailwind CSS v4 |
| Formularios | React Hook Form + Zod v4 |
| ORM | Prisma v6 |
| Base de datos | PostgreSQL |
| Iconos | Lucide React |
| Estado | Server-first; client state solo donde aporta valor |

---

## Cómo correr localmente

### Prerequisitos
- Node.js 20+
- PostgreSQL 14+ corriendo localmente
- npm 9+

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd emblue_oneTalk
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de PostgreSQL:

```env
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/emblue_onetalk?schema=public"
```

### 3. Configurar la base de datos

```bash
# Generar el cliente Prisma
npm run db:generate

# Crear las tablas (push schema sin migraciones)
npm run db:push

# Cargar datos de prueba (5 escenarios)
npm run db:seed
```

O ejecutar todo en un paso:

```bash
npm run setup
```

### 4. Levantar el servidor

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:generate` | Genera el cliente Prisma |
| `npm run db:push` | Sincroniza el esquema a la DB sin migraciones |
| `npm run db:migrate` | Crea y aplica una migración |
| `npm run db:seed` | Carga los datos de prueba |
| `npm run db:studio` | Abre Prisma Studio (GUI) |
| `npm run db:reset` | Resetea la DB y re-siembra |
| `npm run setup` | Setup completo desde cero |

---

## Arquitectura

### Principios

1. **Dominio aislado**: las reglas de negocio están en `src/domain/rules/` — nunca en componentes UI.
2. **Server-first**: los datos se cargan en server components siempre que sea posible.
3. **Capa de servicios**: toda la lógica de persistencia pasa por `src/services/` — las API routes no hablan directo con Prisma.
4. **Validaciones compartidas**: los schemas Zod en `src/validations/` son usados tanto por el cliente como por el servidor.
5. **Tipos claros**: todos los DTOs están definidos en `src/domain/types.ts`.

### Estructura de carpetas

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── cases/                # CRUD de casos
│   │   │   └── [caseId]/
│   │   │       ├── steps/        # Actualizar etapas
│   │   │       ├── documents/    # Gestión de documentos
│   │   │       ├── meta-status/  # Estados de verificación Meta
│   │   │       ├── onetalk/      # Asociación OneTalk
│   │   │       └── messages/     # Mensajes del asistente
│   │   └── steps/
│   │       └── [stepId]/checklist/[itemKey]/  # Actualizar checklist
│   ├── dashboard/                # Lista de casos
│   └── cases/[caseId]/           # Dashboard del caso
│       ├── steps/[stepType]/     # Wizard por etapas
│       └── documents/            # Gestión de documentos
├── components/
│   ├── ui/                       # Primitivos: Button, Badge, Card, Input, etc.
│   ├── wizard/                   # Stepper, ChecklistItem
│   ├── assistant/                # AssistantPanel, MessageBubble
│   └── dashboard/                # Componentes del dashboard
├── domain/
│   ├── types.ts                  # Tipos y enums del dominio
│   ├── rules/                    # Motor de reglas de negocio
│   │   ├── canAdvance.ts         # Evaluación de cada etapa
│   │   ├── progress.ts           # Cálculo de progreso y etapa actual
│   │   └── index.ts              # Exports centralizados
│   └── assistant/
│       └── messages.ts           # Mensajes contextuales del asistente
├── services/                     # Capa de acceso a datos
│   ├── case.service.ts           # Operaciones sobre casos
│   ├── step.service.ts           # Actualización de etapas y checklist
│   ├── document.service.ts       # Gestión de documentos
│   └── assistant.service.ts      # Mensajes del asistente
├── validations/                  # Schemas Zod compartidos
│   ├── business.schema.ts
│   ├── step.schema.ts
│   └── document.schema.ts
└── lib/
    ├── prisma.ts                 # Singleton del cliente Prisma
    └── utils.ts                  # Helpers (cn, formatDate, etc.)
```

---

## Modelo de datos

### Entidades principales

| Entidad | Descripción |
|---|---|
| `User` | Agente o administrador del sistema |
| `Business` | Datos del negocio a verificar |
| `ActivationCase` | Proceso de activación (1 por negocio activo) |
| `ActivationStep` | Una de las 7 etapas del wizard |
| `StepChecklistItem` | Ítems de checklist por etapa |
| `BusinessDocument` | Documentos legales con estado de revisión |
| `VerificationStatusLog` | Historial de estados de Meta |
| `AssistantMessage` | Historial del asistente lateral |

### Flujo de etapas

```
BUSINESS_MANAGER
    │ (completado)
    ▼
BUSINESS_INFO
    │ (completado)
    ▼
LEGAL_DOCUMENTS
    │ (completado)
    ▼
START_VERIFICATION
    │ (completado)
    ▼
VERIFICATION_WIZARD
    │ (completado)
    ▼
META_REVIEW ──── REJECTED / NEEDS_INFO ──→ (vuelve a etapa accionable)
    │ (APPROVED)
    ▼
ONETALK_ASSOCIATION
    │ (completado)
    ▼
CASO COMPLETADO ✓
```

### Estados de una etapa

```
NOT_STARTED → IN_PROGRESS → COMPLETED
                   │
                   └→ BLOCKED → IN_PROGRESS (cuando se resuelve el bloqueo)
```

---

## Reglas de negocio

Las reglas están centralizadas en `src/domain/rules/canAdvance.ts`. Nunca dispersas en la UI.

| Regla | Descripción |
|---|---|
| `BUSINESS_MANAGER` | Solo avanza si el checklist requerido está 100% completo |
| `BUSINESS_INFO` | Requiere BM completado + todos los campos obligatorios del formulario |
| `LEGAL_DOCUMENTS` | Requiere BUSINESS_INFO completado + 3 documentos cargados sin rechazos |
| `START_VERIFICATION` | Requiere BUSINESS_INFO + LEGAL_DOCUMENTS completados, sin documentos con problemas |
| `VERIFICATION_WIZARD` | Requiere START_VERIFICATION completado + checklist propio completo |
| `META_REVIEW` | Avanza solo si el estado de Meta es `APPROVED` |
| `ONETALK_ASSOCIATION` | Requiere META_REVIEW completado con estado `APPROVED` |

**Regla de Meta rechazado/necesita info**: cuando Meta responde `REJECTED` o `NEEDS_INFORMATION`, el paso META_REVIEW queda en estado `BLOCKED` con mensaje accionable para el usuario.

---

## Escenarios de prueba (seed)

El seed carga 5 casos con datos reales para probar todos los estados:

| # | Negocio | Escenario | Progreso |
|---|---|---|---|
| 1 | Papelería El Punto S.A.S. | Incompleto (solo BM en progreso) | 14% |
| 2 | Distribuidora Martínez S.A.S. | Listo para iniciar verificación | 43% |
| 3 | Clínica Bienestar Total Ltda. | En revisión por Meta | 71% |
| 4 | Tech Solutions Colombia S.A.S. | Aprobado y asociado con OneTalk | 100% |
| 5 | Restaurante La Fogata S.A.S. | Rechazado por Meta | 71% |

---

## Pantallas

| Pantalla | URL | Descripción |
|---|---|---|
| Dashboard | `/dashboard` | Lista de todos los casos con progreso y estado |
| Caso | `/cases/[caseId]` | Dashboard completo del caso + timeline |
| Etapa | `/cases/[caseId]/steps/[stepType]` | Wizard con checklist, formularios y validaciones |
| Documentos | `/cases/[caseId]/documents` | Gestión de documentos con estados |

---

## Integraciones previstas (no implementadas en MVP)

### Meta Business Verification API
- Webhooks de Meta para recibir actualizaciones de estado en tiempo real
- Configurar en: `src/app/api/webhooks/meta/route.ts`
- Variables: `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`

### OneTalk API
- Endpoint para listar bandejas disponibles: reemplazar mock en `OneTalkAssociationPanel`
- Endpoint para confirmar asociación: enviar datos reales a OneTalk API
- Variables: `ONETALK_API_URL`, `ONETALK_API_KEY`

### Autenticación
- Implementar NextAuth.js con roles `ADMIN`, `AGENT`, `CLIENT`
- Filtrar casos por usuario asignado

---

## Backlog sugerido — Siguientes fases

### Fase 2 — Integraciones reales
- [ ] Webhook de Meta para actualizaciones de estado automáticas
- [ ] Integración real con OneTalk API para listar/asociar bandejas
- [ ] Auth con NextAuth.js y roles de usuario

### Fase 3 — Operaciones y notificaciones
- [ ] Sistema de notificaciones (email/Slack) para eventos clave
- [ ] Panel de métricas: tiempo promedio por etapa, tasa de rechazo
- [ ] Exportar reporte PDF del caso

### Fase 4 — Escala y producto
- [ ] Multi-tenant: organizaciones con múltiples agentes
- [ ] Asistente con LLM real (Claude API) para respuestas más inteligentes
- [ ] API pública para integración con otros sistemas
- [ ] Modo cliente: vista simplificada para el usuario final del negocio
- [ ] Internacionalización (i18n)

---

## Decisiones de arquitectura

### ¿Por qué `evaluateStep()` centralizado?
Todas las reglas de negocio pasan por `src/domain/rules/canAdvance.ts`. Esto garantiza que:
- Una regla cambiada se refleja en toda la app automáticamente
- Los componentes UI no tienen lógica de negocio
- Las reglas son testeables de forma unitaria sin render

### ¿Por qué `formData` como JSON en el step?
Cada etapa puede tener datos específicos sin necesidad de columnas adicionales. Esto permite extender los datos de cada paso sin migraciones nuevas. Los datos críticos del negocio viven en la entidad `Business`.

### ¿Por qué server components para los datos iniciales?
Los datos se cargan en el servidor, evitando loading states innecesarios y mejorando el SEO y tiempo de carga. El client state solo se usa para interacciones (checklist toggling, formularios, chat del asistente).

### ¿Por qué Prisma v6 en lugar de v7?
Prisma v7 eliminó el soporte de `url` en el bloque `datasource` del schema, requiriendo un adaptador de base de datos adicional (`@prisma/adapter-pg`). Para el MVP, Prisma v6 ofrece la misma funcionalidad con una configuración más simple.

---

## Contribuir

1. Crea una rama desde `main`
2. Implementa tu feature o bugfix
3. Asegúrate de que `npm run build` pasa sin errores
4. Abre un PR describiendo los cambios
