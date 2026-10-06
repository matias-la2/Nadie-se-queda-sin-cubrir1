# CLAUDE.md

## Proyecto

Portal web "Nadie se queda sin cubrir" del IES Río Arba (Tauste, Zaragoza). Gestiona guardias, ausencias, incidencias y reservas del profesorado. TFG de grado.

## Stack

- Node.js 20+ / Express 4.21 — sin TypeScript
- MySQL 8.0 — SQL directo con mysql2/promise, sin ORM
- Frontend vanilla JS + Bootstrap 5.3 — sin framework
- Autenticación Google OAuth 2.0 + JWT en cookies httpOnly
- Validación con Zod
- Tests: node:test (importador, nombres, vinculación, plazas, pendientes, edificio-guardias, profesor-edificios, selector-curso) + Jest (auth, health, reservas, guardias, incidencias)

## Comandos habituales

```bash
npm run dev                # Arrancar con nodemon
npm run test:all           # Tests de integración (necesita Docker MySQL)
npm run test:nombres       # Solo normalización/emparejamiento
npm run test:importador    # Solo parser XLS
npm run test:endpoints     # Solo endpoints analizar/confirmar
npm run test:vinculacion   # Solo vinculación primer login
npm run test:pendientes    # Solo pendientes de asignar
npm run test:migraciones   # Solo idempotencia de migraciones
npm run test:edificio-guardias # Solo edificio de guardias (helper + buscarCandidatos + PUT)
npm test                   # Tests Jest (no necesitan Docker)
npm run migrate:estado     # Ver estado de migraciones (solo lectura)
npm run migrate            # Aplicar migraciones pendientes
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

### Edificio de guardias (`edificio-guardias.helper.js`)

`edificioDeGuardias(conn, idEdificio)` resuelve qué edificio cubre las guardias de otro. La tabla `edificio` tiene `id_edificio_guardias` (FK auto-referencial): si está configurado, las guardias de ese edificio las cubren profesores del edificio destino. Regla de negocio: un solo nivel de delegación, sin cadenas (A→B→C) ni ciclos (A→B, B→A). La validación se aplica en `PUT /api/v1/espacios/edificios/:id`.

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
- Sistema de migraciones en `database/migrations/` (001-007 como módulos JS). Cada migración exporta `async up(conn, h)` donde `h` son helpers idempotentes. `npm run migrate` aplica las pendientes; en producción exige `--confirmo-backup`. Migración 007: columna `id_edificio_guardias` en edificio (FK auto-referencial, ON DELETE SET NULL)
- La migración 005 usa triggers en vez de CHECK constraints porque MySQL 8.0 no permite CHECK en columnas con FK referencial
- La migración 006 (triggers `trg_gc_titular_insert`/`trg_gc_titular_update`): `id_profesor_pendiente` es exclusivo con `id_usuario`, pero `id_usuario` e `id_plaza_pendiente` pueden coexistir. `id_plaza_pendiente` indica la procedencia de la plaza (qué plaza ocupa el usuario), no es un estado "pendiente"
- La tabla `profesor_edificio` (migración 001) está **obsoleta y vacía**. El edificio de cada profesor se deriva automáticamente de `guardia_creada.id_edificio` del curso actual a través del helper `helpers/profesor-edificios.helper.js` (`edificiosDeProfesor`, `sqlExisteEnEdificio`, `SQL_EDIFICIOS_JOIN`). La delegación (`edificioDeGuardias`) se aplica solo al edificio de la ausencia, nunca al del profesor
- Los tests de integración (`test:all`) necesitan `docker compose up -d db` corriendo
- Los tests node:test y Jest son suites separadas con runners distintos
