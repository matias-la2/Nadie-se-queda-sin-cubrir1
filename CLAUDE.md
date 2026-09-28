# CLAUDE.md

## Proyecto

Portal web "Nadie se queda sin cubrir" del IES Río Arba (Tauste, Zaragoza). Gestiona guardias, ausencias, incidencias y reservas del profesorado. TFG de grado.

## Stack

- Node.js 20+ / Express 4.21 — sin TypeScript
- MySQL 8.0 — SQL directo con mysql2/promise, sin ORM
- Frontend vanilla JS + Bootstrap 5.3 — sin framework
- Autenticación Google OAuth 2.0 + JWT en cookies httpOnly
- Validación con Zod
- Tests: node:test (importador, nombres, vinculación, plazas, pendientes) + Jest (auth, health, reservas, guardias, incidencias)

## Comandos habituales

```bash
npm run dev                # Arrancar con nodemon
npm run test:all           # Tests de integración (necesita Docker MySQL)
npm run test:nombres       # Solo normalización/emparejamiento
npm run test:importador    # Solo parser XLS
npm run test:endpoints     # Solo endpoints analizar/confirmar
npm run test:vinculacion   # Solo vinculación primer login
npm run test:pendientes    # Solo pendientes de asignar
npm test                   # Tests Jest (no necesitan Docker)
```

## Arquitectura

### Importador de guardias (bloques 1-9)

Flujo en dos fases:
1. `POST /analizar` — sube XLS, parsea con parser BIFF propio (`parseBiffLabels`) o SheetJS, clasifica nombres con `emparejar()` en: resueltos / probables / sinCuenta / plazas
2. `POST /confirmar` — aplica decisiones del usuario en transacción

El parser BIFF (`importador-guardias.service.js`) lee registros LABEL (0x0204) directamente del binario OLE2/BIFF8 porque SheetJS no puede leer estos archivos legacy. Los archivos de muestra en `docs/` están anonimizados.

### Servicio de nombres (`nombres.service.js`)

- `normalizar()`: NFD + quitar diacríticos, expandir abreviaturas (FCO→FRANCISCO, Mª→MARIA, M.→MARIA, J→JOSE)
- `emparejar()`: alias → exacto normalizado → tokens desordenados → Jaro-Winkler ≥ 0.85 → NINGUNO
- `jaroWinkler()`: implementación propia con ventana, coincidencias, transposiciones y bonus de prefijo

### Vinculación (`vinculacion.service.js`)

En primer login con Google, busca coincidencia en `profesor_pendiente_login` y transfiere guardias importadas del Excel al nuevo usuario.

## Datos de prueba

Los archivos XLS en `docs/` y los nombres en tests/seed.sql están **anonimizados**. Los nombres de persona son ficticios. Los 5 usuarios seed (Elena García Martínez, Carlos López Fernández, María Sánchez Ruiz, Admin Sistema IES, Jefe Estudios Arba) son inventados para el entorno de desarrollo.

## Convenciones

- SQL con parámetros preparados, nunca interpolación de strings
- Respuestas API con `response.helper.js`: `{ ok, mensaje, datos }`
- Roles: ADMINISTRADOR, EQUIPO_DIRECTIVO, PROFESOR
- Tramos definidos en `config/tramos.js`, no hardcodeados
- Curso escolar con formato YYYY-YYYY, calculado por `curso.helper.js`
- Códigos de plaza: regex configurable via `PLAZA_CODIGO_REGEX` (default `^[A-Z]{2,4}\d{1,2}$`)
- Las vistas de trabajo diario (dashboard, contadores, sin cubrir) filtran por curso actual con `rangoCurso()` / `curso=actual`; los listados históricos con filtros manuales no filtran por defecto

### Pendientes de asignar (`pendientes-asignar.js`)

Componente IIFE reutilizable (namespace `PA`) que muestra la sección "Plazas vacantes" con búsqueda de usuario, asignación, desvinculación y reasignación. Se integra en `usuarios.html` y `profesores.html` con `initPendientesAsignar(containerId, {onRecargar})`.

### Escapado en onclick (`escapeJs` en `auth.js`)

`escapeJs(str)` aplica doble escapado: primero JS (`\` y `'`) y luego HTML entities (`&`, `"`, `<`, `>`). Es necesario para valores que van en atributos `onclick="fn('...')"` dentro de innerHTML, donde el valor cruza dos contextos (HTML atributo → JS string).

## Cosas a tener en cuenta

- El parser BIFF maneja tanto mini-streams (< 4096 bytes, como Bto.xls) como streams regulares (como ESO.xls) dentro del formato OLE2/CFB
- La migración 001 usa triggers en vez de CHECK constraints porque MySQL 8.0 no permite CHECK en columnas con FK referencial
- La migración 002 (triggers `trg_gc_titular_insert`/`trg_gc_titular_update`): `id_profesor_pendiente` es exclusivo con `id_usuario`, pero `id_usuario` e `id_plaza_pendiente` pueden coexistir. `id_plaza_pendiente` indica la procedencia de la plaza (qué plaza ocupa el usuario), no es un estado "pendiente"
- Los tests de integración (`test:all`) necesitan `docker compose up -d db` corriendo
- Los tests node:test y Jest son suites separadas con runners distintos
