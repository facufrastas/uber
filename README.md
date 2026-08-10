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
| `/expenses` | Todos los gastos; los de mantenimiento aparecen con badge y se editan desde Mantenimientos |
| `/cars` | Tabs Autos / Choferes; aviso cuando un auto tiene menos de 2 choferes |
| `/maintenance` | Historial de servicio; crear uno genera su gasto vinculado |

Filtros globales en todas las secciones: día / semana / mes / rango custom +
auto + chofer. Viven en la URL, así que un link copiado abre la misma vista.

## Base de datos (Supabase)

`schema.sql` tiene TODO el DDL (tablas y columnas en inglés, espejo 1:1 de los
tipos del código): FKs con sus cascadas, índices, seed de `expense_types` y
notas de RLS. Se ejecuta a mano en el SQL Editor de Supabase; FresaStuff-API
accede con la service key. Cómo está armada la capa de datos y la
autenticación: `docs/arquitectura-repositorios.md`.

## Para leer (docs de aprendizaje)

- `docs/arquitectura-repositorios.md` — el patrón repositorio, los dos modos (API/local) y la autenticación JWT
- `docs/estado-zustand.md` — por qué hay un store vanilla persistido y una cache sin persistir
- `docs/filtros-y-derivados.md` — filtros en la URL, selectores puros, y la trampa de `toISOString()`
