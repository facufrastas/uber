# Estado con Zustand: tres stores, tres trabajos distintos

## El mapa

| Store | Tipo | ¿Persistido? | Rol |
|---|---|---|---|
| `useAuthStore` (`stores/authStore.ts`) | hook React | ✅ localStorage `uber-auth` | Tokens JWT de la sesión |
| `localDb` (`data/repositories/local/localDb.ts`) | vanilla (`zustand/vanilla`) | ✅ localStorage `uber-db` | **Es la base de datos mock** (solo modo local) |
| `useDataStore` (`stores/dataStore.ts`) | hook React | ❌ | Cache en memoria + acciones |

(El tema claro/oscuro no usa Zustand: es un Context minúsculo en
`components/theme-provider.tsx` con su propia clave de localStorage.)

## ¿Por qué el "DB" es un store vanilla?

`createStore` de `zustand/vanilla` crea un store sin React. Le ponemos el
middleware `persist` y obtenemos gratis:

- serialización automática a localStorage,
- `version: 1` + `migrate` para cuando cambie la forma de los datos,
- una API síncrona (`getState`/`setState`) que el repositorio local usa como
  si fuera un motor de base de datos en miniatura.

## ¿Por qué `useDataStore` NO se persiste?

Es tentador ponerle `persist` también, pero un `useDataStore` persistido
resucitaría datos viejos del localStorage en cada arranque, pisándose con lo
que responde FresaStuff-API. La regla:

> **La persistencia pertenece a la fuente de datos, no a la cache de UI.**

`useDataStore` se llena en el boot (`loadAll()`), y tras cada mutación relee
la colección tocada del DataSource. El repositorio es la fuente de verdad; el
store solo refleja.

## ¿Por qué UN dataStore y no siete (uno por entidad)?

El dominio es chico y está muy interconectado: "ingresos por auto" necesita
turnos + pagos + autos a la vez. Con un solo snapshot, los selectores de
`lib/analytics.ts` reciben todo junto y no hay que sincronizar stores entre sí.

## ¿Y los filtros? No están en Zustand a propósito

Los filtros viven en la URL (ver `docs/filtros-y-derivados.md`). Regla usada
para decidir: *si al copiar el link a otra persona el estado tiene que viajar,
va en la URL; si es preferencia personal del dispositivo (tema), va en
localStorage; si es dato del dominio, va en el DataSource.*
