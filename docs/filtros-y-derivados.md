# Filtros en la URL y datos derivados puros

## Filtros = URL search params

`?preset=week&car=<id>&driver=<id>` (y `preset=custom&from=…&to=…`).

Decisión (y por qué no un store):

- La app la usan **3 admins**: un link copiado tiene que abrir exactamente la
  misma vista — misma fecha, mismo auto, mismo chofer. Un store no viaja.
- Refresh y botón "atrás" funcionan gratis.
- Los links del sidebar (`AppSidebar.tsx`) preservan `location.search`, así los
  filtros te siguen al cambiar de sección — la objeción clásica contra URL
  params ("se pierden al navegar") desaparece con esa línea.

Todo pasa por el hook `useFilters()` (`hooks/useFilters.ts`): parsea los
params (con defaults si faltan o son inválidos) y expone setters que hacen
`setSearchParams(..., { replace: true })` para no ensuciar el historial con
cada click.

Detalle: los presets `day/week/month` guardan solo el preset en la URL y el
rango se calcula **relativo a hoy** al leer — un link con `?preset=day` abierto
mañana muestra el día de mañana. Solo `custom` fija `from`/`to` absolutos.

## Derivados = funciones puras + useMemo

`lib/analytics.ts` no tiene hooks ni estado: son funciones
`(datos, filtros) => resultado`:

- `applyFilters` — shifts por fecha/auto/chofer; payments siguen a sus shifts.
- `computeKpis` / `computeKpisPrevious` — totales y el período anterior de
  igual longitud (para los deltas "% vs. período anterior").
- `ingresosVsGastosPorDia` — serie diaria **sin huecos** (`eachDayOfInterval`
  rellena con 0) para que el gráfico de área no salte días.
- `ingresosPorAuto`, `gastosPorAuto`, `ingresosPorChofer`, `gastosPorTipo`.

`hooks/useFilteredData.ts` es el puente: junta dataStore + useFilters y
memoiza `applyFilters` con `useMemo`. Las páginas consumen eso y nunca
filtran a mano — un solo lugar donde la lógica de filtrado puede estar bien
o mal.

## Una decisión de producto documentada

Los gastos no tienen chofer. Cuando filtrás por chofer, los gastos se
restringen **al auto asignado a ese chofer** (`applyFilters`). Es una
aproximación razonable para preguntas tipo "¿cuánto me cuesta la operación de
Marcos?" — si algún día no alcanza, el lugar a tocar es ese único selector.

## Fechas: siempre locales, nunca toISOString()

Las fechas del dominio son strings `YYYY-MM-DD`. Se generan con formateo
LOCAL (`date-fns format`), no con `toISOString()`: en Argentina (UTC-3),
`toISOString()` después de las 21:00 devuelve el día siguiente. Para mostrar,
`formatFecha` parsea el string como UTC y formatea en UTC — simétrico, sin
corrimientos. (Bug real encontrado en la verificación: un mantenimiento creado
de noche caía en "mañana".)
