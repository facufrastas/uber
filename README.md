# Uber — dashboard de administración de autos y choferes

SPA en React para administrar una flota estilo Uber: autos, choferes, turnos
con pagos, gastos por tipo y mantenimientos (que generan su gasto
automáticamente).

## Stack

- **Vite + React 19 + TypeScript** (SPA pura, sin framework de servidor)
- **React Router** — rutas + filtros globales en la URL
- **Zustand** — cache de datos en memoria, sesión JWT y "base de datos" mock del modo local
- **Tailwind v4 + shadcn/ui** — UI responsive con tema claro/oscuro (default: sistema)
- **Recharts** — gráficos del dashboard
- **react-hook-form + zod** — formularios validados
- **pnpm** — package manager

## Correr

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # typecheck + build de producción
```

La app habla con FresaStuff-API (`/fleet/*`, ver `.env.example`
para `VITE_API_URL`) y pide login. Autenticación: **solo JWT** — access token
de 1 h renovado automáticamente con el refresh token de 7 días.

## Secciones

| Ruta | Qué hay |
|---|---|
| `/` | KPIs (ingresos, gastos, neto, turnos) con delta vs. período anterior + 4 gráficos |
| `/income` | Turnos con su pago (1 turno = 1 pago; método por defecto: transferencia) |
| `/expenses` | Gastos pendientes; los de mantenimiento aparecen con badge y se editan desde Mantenimientos. Cada gasto guarda quién lo pagó y cómo se reparte entre dueños |
| `/settled-expenses` | Misma tabla que Gastos, con los que están marcados como saldados (`expenses.payed = true`); el toggle los devuelve a Gastos |
| `/debts` | Saldos entre dueños (quién le debe a quién) y registro de pagos de deuda. Sin filtro de fechas: una deuda no pertenece a un período |
| `/cars` | Tabs Autos / Choferes; aviso cuando un auto tiene menos de 2 choferes |
| `/maintenance` | Historial de servicio; crear uno genera su gasto vinculado |

Filtros globales en todas las secciones: día / semana / mes / rango custom +
auto + chofer. Viven en la URL, así que un link copiado abre la misma vista.

## Base de datos (Supabase)

`schema.sql` tiene TODO el DDL (tablas y columnas en inglés, espejo 1:1 de los
tipos del código): FKs con sus cascadas, índices, seed de `expense_types` y
notas de RLS. Se ejecuta a mano en el SQL Editor de Supabase; FresaStuff-API
accede con la service key. Para una base que ya existe, los cambios posteriores
viven en `migrations/` (idempotentes, se corren una vez en el SQL Editor).

### Gastos compartidos y deudas

Un gasto guarda **quién lo pagó** (`expenses.paid_by_owner_id`) y **cómo se
reparte** (`expense_shares`: una fila por participante con su parte en ARS).
La parte de quien pagó es su costo, no una deuda: lo que debe alguien es su
share de un gasto que pagó otro. Una parte de 0 es válida (100/0: uno se hace
cargo de todo y el otro igual queda listado, sin deber nada). Los pagos entre dueños (`settlements`) van en
la dirección opuesta y cancelan el saldo — nunca cuentan como gasto de la flota
ni entran en los KPIs. Aparte de eso, `expenses.payed` es una marca manual ("ya lo saldé") que sólo
decide en qué tabla aparece el gasto: no toca las deudas ni los KPIs, que
siguen contando todos los gastos del período. Los selectores viven en `src/lib/analytics.ts`
(`debtEntries`, `debtBalances`, `debtNetByOwner`). Cómo está armada la capa de datos y la
autenticación: `docs/arquitectura-repositorios.md`.

## Para leer (docs de aprendizaje)

- `docs/arquitectura-repositorios.md` — el patrón repositorio, los dos modos (API/local) y la autenticación JWT
- `docs/estado-zustand.md` — por qué hay un store vanilla persistido y una cache sin persistir
- `docs/filtros-y-derivados.md` — filtros en la URL, selectores puros, y la trampa de `toISOString()`
