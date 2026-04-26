# Juntaditas

Aplicación web para organizar juntadas con amigos: salidas de fin de semana, veranos en balnearios, etc.

---

## Índice

1. [Objetivo](#objetivo)
2. [Stack tecnológico](#stack-tecnológico)
3. [Roles y permisos](#roles-y-permisos)
4. [Modelo de datos](#modelo-de-datos)
5. [Funcionalidades](#funcionalidades)
6. [Lógica de división de gastos](#lógica-de-división-de-gastos)
7. [Sistema de notificaciones](#sistema-de-notificaciones)
8. [Configuración de bebidas](#configuración-de-bebidas)
9. [Plan de fases](#plan-de-fases)
10. [Variables de entorno](#variables-de-entorno)
11. [Comandos útiles](#comandos-útiles)

---

## Objetivo

Gestionar todos los aspectos de una juntada de amigos desde un solo lugar:

- Quién va, cuándo llega y cuándo se va
- Qué se come en cada comida y quién cocina
- Cuánta bebida comprar según las preferencias de cada uno
- Lista de surtido por categorías
- Cosas a llevar con responsables asignados
- División justa de gastos según quien estuvo presente

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Base de datos | Turso (SQLite distribuido) — `file:./local.db` en desarrollo |
| ORM | Drizzle ORM |
| Auth | better-auth con magic link |
| Email | Nodemailer + Gmail SMTP |
| UI | Tailwind CSS + shadcn/ui v4.5 (Base UI) |
| Deploy | Vercel |
| Lenguaje | TypeScript |

> **Nota shadcn:** La versión 4.5 usa Base UI en lugar de Radix. No existe `asChild` — usar el patrón `render` o `buttonVariants` para links.

> **Nota proxy:** Next.js 16 renombró `middleware.ts` → `proxy.ts`. La función exportada debe llamarse `proxy`.

---

## Roles y permisos

| Acción | Admin | Member |
|--------|-------|--------|
| Crear juntada | ✅ | ❌ |
| Editar / eliminar juntada | ✅ | ❌ |
| Unirse a una juntada | ✅ | ✅ |
| Gestionar contenido de una juntada (comidas, bebidas, gastos, etc.) | ✅ | ✅ |

Los usuarios se registran con magic link y son globales (reutilizables en múltiples juntadas).

---

## Modelo de datos

### Juntada
- `id`, `title`, `location`
- `dateStart`, `dateEnd` (formato `YYYY-MM-DD`)
- `description` (opcional)
- `createdBy` → User

### Attendance (asistencia por juntada)
- `userId`, `juntadaId`
- `confirmed` (boolean)
- `arrivalDate`, `arrivalSlot` → `morning | noon | afternoon | night`
- `departureDate`, `departureSlot` → `morning | noon | afternoon | night`

### Meal (comida)
- `juntadaId`, `date`, `type` → `lunch | dinner`
- `description`
- Relaciones: `mealCook[]` (quién cocina), `mealCost[]` (costos opcionales)

### DrinkConfig (configuración de bebidas por juntada)
- `juntadaId`, `drinkType`, `mlPerPersonPerDay`
- Valores por defecto (configurables por juntada):

| Bebida | ml/persona/día |
|--------|---------------|
| Agua | 1500 |
| Refresco | 1500 |
| Cerveza | 500 |
| Fernet | 200 |
| Vino | 375 (media botella) |
| Whisky | 50 |
| Jagger | 50 |

### DrinkPreference
- `userId`, `juntadaId`, `drinkType`, `enabled`

### SupplyItem (surtido)
Categorías: `house` / `food` / `produce` / `breakfast` / `drinks` / `condiments`

| Categoría | Etiqueta |
|-----------|---------|
| house | Cosas de la casa |
| food | Comida |
| produce | Frutas y verduras |
| breakfast | Desayuno / Merienda |
| drinks | Bebidas |
| condiments | Condimentos |

### ThingToBring (cosas a llevar)
- `name`, `checked`
- `responsibles[]` → usuarios encargados

### Expense (gasto)
- `type` → `house | general | meal | custom`
- `amount`, `paidBy`, `date`, `description`
- `mealId` (solo para type=meal)
- `participants[]` (solo para type=custom)

### Notification
- `type` → `attendance_check | bring_reminder_week | bring_reminder_day`
- `scheduledFor`, `sentAt`, `channel` → `email | whatsapp`

---

## Funcionalidades

### Asistencia
- Cualquier usuario puede unirse a cualquier juntada
- Configura fecha de llegada/salida y slot del día
- Vista de todos los asistentes con estado (Confirmado / Pendiente)

### Comidas
- ABM de almuerzos y cenas por día
- Asignación de cocineros
- Cálculo automático de comensales basado en la asistencia de cada persona
- Carga opcional de costo de cada comida y quién pagó

### Bebidas
- Cada persona indica qué piensa tomar
- Cálculo automático de cantidades totales (ml × personas × días)
- Valores por defecto configurables por juntada

### Surtido
- Lista de compras por categoría con checkboxes
- 6 categorías fijas

### Cosas a llevar
- Items con responsables asignados (puede haber más de uno)
- Checkbox de confirmación

### Gastos
- 4 tipos de gasto con lógica de división diferente (ver sección siguiente)
- Vista de balances: quién le debe a quién y cuánto

---

## Lógica de división de gastos

### Gastos de casa (`house`)
Se dividen **por noche**, solo entre quienes estuvieron esa noche.

> Ejemplo: del jueves al domingo (3 noches). Alguien que llega el domingo no paga nada de la casa.

### Gastos generales (`general`)
Se dividen por **porciones de día** (2 por día):
- Porción 1: mañana + mediodía
- Porción 2: tarde + noche

> Ejemplo: del jueves tarde al domingo tarde = 6 porciones (1 jueves + 2 viernes + 2 sábado + 1 domingo).

### Gastos de comida (`meal`)
Se dividen entre los comensales presentes en **esa comida específica**, determinado automáticamente por la asistencia.

Si no es posible identificar los comensales, se carga al gasto general.

### Gastos custom (`custom`)
Se dividen entre un subgrupo explícito de personas.

> Ejemplo: nafta → solo entre los que fueron en ese auto.

---

## Sistema de notificaciones

Un Vercel Cron Job se ejecuta diariamente y envía recordatorios automáticos:

| Trigger | Destinatarios | Contenido |
|---------|--------------|-----------|
| 1 mes antes | Todos los asistentes | "¿Seguís yendo a [Juntada]? Confirmá tu asistencia." |
| 1 semana antes | Responsables de cosas a llevar | "Recordatorio: tenés que llevar [lista]" |
| 1 día antes | Responsables de cosas a llevar | "Mañana es [Juntada], no te olvides: [lista]" |

Canal inicial: **email (Gmail SMTP)**. WhatsApp via Twilio en fase futura.

---

## Configuración de bebidas

Valores por defecto (editables por juntada):

```
agua:     1500 ml/persona/día
refresco: 1500 ml/persona/día
cerveza:   500 ml/persona/día
fernet:    200 ml/persona/día
vino:      375 ml/persona/día
whisky:     50 ml/persona/día
jagger:     50 ml/persona/día
```

El cálculo total considera los días efectivos que cada persona estuvo presente.

---

## Plan de fases

| Fase | Estado | Contenido |
|------|--------|-----------|
| **Fase 1** | ✅ Completa | Scaffold, auth magic link, CRUD juntadas, asistencia |
| **Fase 2** | ⏳ Pendiente | Comidas: ABM, cocineros, comensales automáticos, costos |
| **Fase 3** | ⏳ Pendiente | Bebidas (preferencias + cálculo), surtido, cosas a llevar |
| **Fase 4** | ⏳ Pendiente | División de gastos (motor de split + balances) |
| **Fase 5** | ⏳ Pendiente | Notificaciones automáticas (Vercel Cron + email) |
| **Fase 6** | ⏳ Pendiente | UX polish, mobile-first, resumen exportable |

---

## Variables de entorno

```bash
# Base de datos (Turso)
TURSO_DATABASE_URL="file:./local.db"   # desarrollo
TURSO_DATABASE_URL="libsql://..."      # producción
TURSO_AUTH_TOKEN=""                    # solo producción

# Auth
BETTER_AUTH_SECRET="string-aleatorio-32-chars"
BETTER_AUTH_URL="http://localhost:3000"   # o la URL de producción

# Email (Gmail SMTP)
GMAIL_USER="tu-email@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Comandos útiles

```bash
# Desarrollo
npm run dev              # servidor local en http://localhost:3000
npm run build            # build de producción

# Base de datos
npm run db:generate      # generar migraciones desde el schema
npm run db:migrate       # aplicar migraciones (local)
npm run db:studio        # Drizzle Studio (UI para explorar la DB)
```
