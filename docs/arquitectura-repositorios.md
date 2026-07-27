# Arquitectura de repositorios (el patrón detrás de la capa de datos)

## El problema que resuelve

La app habla con FresaStuff-API (Express), que guarda los datos de flota en
Supabase Postgres. Pero también puede correr sin backend, con datos mock
persistidos en el navegador. Si cada pantalla hiciera `fetch` o leyera
localStorage directamente, soportar ambos modos tocaría **toda** la app.

## La solución: una interfaz en el medio

```
Pantallas → useDataStore (Zustand) → DataSource (interfaz) → ¿quién implementa?
                                                              ├── apiDataSource   (default: FresaStuff-API)
                                                              └── localDataSource (VITE_DATA_SOURCE=local)
```

- `src/data/repositories/types.ts` define `Repository<T>` (list/create/update/remove)
  y `DataSource` (un repositorio por entidad). **Todo devuelve Promise**, así las
  dos implementaciones tienen la misma firma aunque una no haga red.
- `src/data/repositories/api/apiDataSource.ts` es la implementación real:
  `fetch` contra `/fleet/*` mapeando snake_case ↔ camelCase (columnas 1:1 con
  los tipos del dominio). Dos detalles de Postgres viven en los mappers:
  `time` vuelve como `'HH:mm:ss'` (la app usa `'HH:mm'`) y `numeric` puede
  llegar como string (siempre `Number()`).
- `src/data/repositories/local/localDataSource.ts` es el modo offline: lee y
  escribe un store Zustand *vanilla* persistido en localStorage (`localDb.ts`).
- `src/data/repositories/index.ts` → `getDataSource()` elige según
  `VITE_DATA_SOURCE`. Es **el único punto de decisión**: nada más en la app
  sabe qué modo está activo (salvo la UI de login/reset, que usa el flag
  `isLocalDataSource`).

## Métodos compuestos = reglas de negocio

Dos operaciones crean **dos** filas de una:

- `shifts.createWithPayment(shift, payment)` — el pago es 1:1 con el turno.
- `maintenances.createWithExpense(maintenance, expense)` — todo mantenimiento genera su gasto.

Viven en el repositorio (no en la UI) a propósito: en la API cada una es UN
endpoint (`POST /fleet/shifts`, `POST /fleet/maintenances`) que hace ambos
inserts en el servidor. Como supabase-js no tiene transacciones, el backend
compensa: si el segundo insert falla, borra el primero.

Lo mismo con las cascadas de borrado: en Postgres las hace el `ON DELETE
CASCADE` de `schema.sql` (borrar turno → borra pago; borrar mantenimiento →
borra gasto vinculado; borrar auto/chofer/dueño → borra sus filas de
`driver_cars` y `car_owners`); el repositorio local las replica a mano.

## Las tablas puente: CRUD común, diff en el store

`driver_cars` (chofer ↔ auto) y `car_owners` (auto ↔ dueño, con porcentaje)
tienen **su propio `id` uuid y `created_at`**. No hacía falta técnicamente —
la PK podría ser el par de FKs — pero así entran sin cambios en el
`makeCrud`/`makeRepository` genérico y en `registerResource` del backend: cero
código nuevo en la capa de datos, tres líneas en las rutas.

Lo que sí hay que resolver es "reemplazar el conjunto": la UI dice *este
chofer maneja estos tres autos*, no *creá esta fila*. Esa traducción es un
**diff en `dataStore`** (`setDriverCars`, `setCarOwners`): compara con lo que
hay, crea lo que falta, borra lo que sobra, actualiza porcentajes que
cambiaron.

Se eligió el store y no un método compuesto del repositorio a propósito: en el
repositorio habría que escribirlo dos veces (local y api) y encima inventar un
endpoint nuevo. En el store se escribe una vez y funciona igual contra las dos
fuentes. El precio es que un reemplazo de varias filas no es atómico — la
misma concesión que ya hacen los creates compuestos.

## Autenticación (solo JWT)

Las rutas `/fleet/*` de FresaStuff-API usan **solo JWT** (middleware
`verify`), sin `checkHeaders`: un header secreto compartido no puede vivir en
un bundle de frontend público.

- `POST /fleet/auth/login` (email + password contra la colección de usuarios
  existente) devuelve `accessToken` (1 h) y `refreshToken` (7 días).
- Los tokens se guardan en `useAuthStore` (persistido, key `uber-auth`).
- `src/lib/api.ts` agrega `Authorization: Bearer` a cada request; ante un
  401/403 renueva con `POST /fleet/auth/refresh` **una sola vez en vuelo**
  (los 7 requests paralelos de `loadAll` comparten la renovación) y reintenta.
  Si la renovación falla, limpia la sesión y `RequireAuth` redirige a `/login`.

## Por qué los ids se generan en el cliente del backend

`crypto.randomUUID()` en los controllers de FresaStuff-API (y en el
repositorio local) produce ids con la misma forma que los `uuid DEFAULT
gen_random_uuid()` de Postgres — es el mismo patrón que ya usaban los
controllers Supabase existentes (`controllers/notes/supabase.ts`). Los datos
mock y los reales son estructuralmente idénticos.
