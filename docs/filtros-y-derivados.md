# Filtros en la URL y datos derivados puros

## Filtros = URL search params

`?preset=week&car=<id>&driver=<id>&owner=<id>` (y `preset=custom&from=…&to=…`).

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

- `applyFilters` — shifts por fecha/auto/chofer/dueño; payments siguen a sus
  shifts.
- `computeKpis` / `computeKpisPrevious` — totales y el período anterior de
  igual longitud (para los deltas "% vs. período anterior").
- `ingresosVsGastosPorDia` — serie diaria **sin huecos** (`eachDayOfInterval`
  rellena con 0) para que el gráfico de área no salte días.
- `ingresosPorAuto`, `gastosPorAuto`, `ingresosPorChofer`, `gastosPorTipo`.
- `netByOwner` — neto de cada auto ponderado por el porcentaje de cada dueño
  (`car_owners.percentage`). Deja pasar los negativos: un dueño que pierde
  plata tiene que verse, esconderlo sería mentir.
- `carPayoff` — cuánto del precio del auto pagaron sus propias ganancias.

`hooks/useFilteredData.ts` es el puente: junta dataStore + useFilters y
memoiza `applyFilters` con `useMemo`. Las páginas consumen eso y nunca
filtran a mano — un solo lugar donde la lógica de filtrado puede estar bien
o mal.

## Cómo se combinan los filtros (intersección de autos)

Los gastos no tienen chofer ni dueño: lo único que los ata a algo es su
`carId`. Por eso `applyFilters` arma un **conjunto de autos permitidos** como
intersección de los filtros activos:

| Filtro | Conjunto que aporta |
|---|---|
| auto | `{ ese auto }` |
| dueño | los autos donde el dueño tiene participación (`car_owners`) |
| chofer | los autos que maneja (`driver_cars`) — **solo para gastos** |

Los turnos filtran por `driverId` directo (lo tienen), así que para ellos solo
cuenta auto ∩ dueño. Los gastos usan la intersección completa.

Dos casos que parecen bugs y no lo son:

- Intersección **vacía** (ej. dueño A + chofer que maneja solo autos de B) no
  es lo mismo que "sin filtros": devuelve cero filas, que es la respuesta
  correcta.
- Los gastos generales (`carId: null`, ej. un seguro de la empresa) salen del
  resultado apenas hay cualquier filtro de auto activo: no pertenecen a ningún
  auto, así que no pueden pertenecer a este recorte.

Antes de la relación muchos-a-muchos, el filtro por chofer usaba el único
`driver.carId`. Ahora usa todos sus autos, que es lo que la tabla `driver_cars`
permite decir.

## Recupero de la inversión (payoff)

`carPayoff(data, carId, cotización)` responde "¿cuánto del auto ya se pagó
solo?": ingresos de sus turnos menos gastos del auto, **desde
`purchase_date`**, dividido por la cotización, contra `purchase_cost`.

Tres decisiones a la vista en la firma:

- Recibe `data`, **nunca `filtered`**, y no toma `Filters`: es una cifra de
  toda la vida del auto. Si respetara el rango del dashboard, cambiar a "Día"
  mostraría 0% y no significaría nada.
- El costo está en USD y todo lo demás en ARS. Se convierte con la cotización
  **actual** del dólar oficial sobre el acumulado, sin cotizaciones
  históricas: es una simplificación aceptada. Efecto secundario a saber: si el
  dólar sube más rápido que las ganancias, el porcentaje puede bajar.
- El porcentaje vuelve **sin recortar**: pasar de 100 significa que el auto ya
  se pagó y quien muestra el dato decide (la barra recorta, el texto no).

La cotización sale de DolarAPI en el browser (`lib/exchangeRate.ts`), una vez
por sesión, y nunca se guarda en la base: es un dato de presentación. Si la
API falla, la tarjeta pide el valor a mano.

## Porcentajes de dueños

`car_owners.percentage` tiene un CHECK por fila (0 < pct <= 100), pero que los
porcentajes de un auto sumen 100 lo valida el formulario: un CHECK no puede
sumar filas de otras filas. Como el borrado de un dueño puede dejar un auto en
70%, las pantallas muestran un badge ámbar cuando la suma no da 100.

## Fechas: siempre locales, nunca toISOString()

Las fechas del dominio son strings `YYYY-MM-DD`. Se generan con formateo
LOCAL (`date-fns format`), no con `toISOString()`: en Argentina (UTC-3),
`toISOString()` después de las 21:00 devuelve el día siguiente. Para mostrar,
`formatFecha` parsea el string como UTC y formatea en UTC — simétrico, sin
corrimientos. (Bug real encontrado en la verificación: un mantenimiento creado
de noche caía en "mañana".)
