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
borra gasto vinculado); el repositorio local las replica a mano.

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
