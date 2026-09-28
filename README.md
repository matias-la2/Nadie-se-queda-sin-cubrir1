# Portal IES Río Arba — Nadie Se Queda Sin Cubrir

Portal web para la gestión de guardias, incidencias, ausencias y reservas del profesorado.

## Requisitos

- Docker y Docker Compose (recomendado)
- O: Node.js 20+, MySQL 8

## Arranque rápido con Docker

1. Clona el repositorio
2. `cp .env.example .env` y rellena los valores (Google OAuth, JWT_SECRET, etc.)
3. Coloca el archivo `service-account.json` en la raíz (para verificación de grupo Google)
4. `docker compose up -d`
5. Abre http://localhost:3000

La base de datos se crea automáticamente en el primer arranque.

### Migraciones

Tras el primer arranque, aplica las migraciones pendientes:

```bash
# Migración 001: Importador de guardias (tablas plaza_pendiente, alias_profesor,
# profesor_pendiente_login; columnas nuevas en guardia_creada; tipo PLAZA_SIN_ASIGNAR
# en notificación; renombrado de tramos horarios)
docker compose exec db mysql -u root -padmin portal_ies < database/migrations/001_importador_guardias.sql
```

### Variables de entorno opcionales

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PLAZA_CODIGO_REGEX` | Expresión regular para detectar códigos de plaza en los archivos de horarios (ej: SIF1, GH1). El punto de entrada es Guardias > Planificadas > Importar Excel | `^[A-Z]{2,4}\d{1,2}$` |

## Arranque sin Docker (desarrollo)

1. `npm install`
2. Crea la BD: `mysql -u root -p -e "CREATE DATABASE portal_ies"`
3. Carga el schema: `mysql -u root -p portal_ies < database/schema.sql`
4. Carga datos iniciales: `mysql -u root -p portal_ies < database/seed.sql`
5. `cp .env.example .env` y rellena los valores
6. `npm run dev`

## Tecnologías

- **Backend:** Node.js + Express
- **Base de datos:** MySQL 8 (SQL directo con mysql2)
- **Frontend:** HTML5, CSS3, JavaScript vanilla, Bootstrap 5.3
- **Autenticación:** Google OAuth 2.0 + JWT
- **Validación:** Zod
- **Email:** Nodemailer

## Equipo

- Matías
- Antonio
- Saray

## Tests

Los tests de integración del importador necesitan Docker MySQL corriendo:

```bash
docker compose up -d db

npm run test:all          # Todos los tests de importador/vinculación/plazas
npm run test:nombres      # Solo normalización y emparejamiento
npm run test:importador   # Solo parser XLS
npm run test:endpoints    # Solo endpoints analizar/confirmar
npm run test:vinculacion  # Solo vinculación en primer login
npm run test:plazas       # Solo gestión de plazas pendientes
npm run test:curso        # Filtro por curso actual
```

Los tests de Jest (health, auth, reservas, guardias, incidencias) van aparte:

```bash
npm test
```

## Estructura del proyecto

```
├── server.js                # Entry point Express
├── package.json
├── .env.example             # Plantilla de variables de entorno
├── Dockerfile
├── docker-compose.yml
├── wait-for-db.js           # Espera a MySQL antes de arrancar
├── service-account.json     # Cuenta de servicio Google (no versionado)
├── config/
│   ├── db.js                # Pool MySQL (mysql2/promise)
│   ├── passport.js          # Estrategia Google OAuth 2.0
│   ├── tramos.js            # 7 tramos horarios (6 lectivos + recreo)
│   └── env.validator.js     # Validación de variables de entorno
├── controllers/             # Lógica de negocio por módulo
│   ├── auth.controller.js
│   ├── ausencias.controller.js
│   ├── clases.controller.js
│   ├── espacios.controller.js
│   ├── guardias.controller.js
│   ├── incidencias.controller.js
│   ├── notificaciones.controller.js
│   ├── reservas.controller.js
│   └── usuarios.controller.js
├── routes/                  # Definición de endpoints REST
├── validators/              # Schemas Zod por módulo
├── middleware/
│   ├── auth.middleware.js   # Verificación JWT
│   ├── rol.middleware.js    # Control de acceso por rol
│   ├── log.middleware.js    # Auditoría de acciones
│   └── error.middleware.js  # Manejo global de errores
├── helpers/
│   ├── response.helper.js   # Formato estándar de respuestas
│   ├── pagination.helper.js # Paginación con límites
│   └── curso.helper.js      # cursoActual() e inicioCursoActual()
├── services/
│   ├── email.service.js               # Envío de emails (Nodemailer)
│   ├── google-group.service.js        # Verificación de grupo Google Workspace
│   ├── nombres.service.js             # Normalización, Jaro-Winkler, emparejamiento
│   ├── importador-guardias.service.js # Parser XLS/XLSX de archivos de horarios
│   └── vinculacion.service.js         # Vinculación automática en primer login
├── database/
│   ├── schema.sql           # DDL completo (20 tablas)
│   ├── seed.sql             # Datos de prueba
│   └── migrations/
│       └── 001_importador_guardias.sql
├── tests/
│   ├── nombres.service.test.js             # Normalización y emparejamiento
│   ├── importador-guardias.service.test.js # Parser XLS con archivos reales
│   ├── importador.endpoints.test.js        # Endpoints analizar/confirmar
│   ├── vinculacion.service.test.js         # Vinculación en primer login
│   ├── plazas.test.js                      # Gestión de plazas pendientes
│   ├── health.test.js, auth.test.js, ...   # Tests Jest originales
├── docs/
│   ├── spec-importador-guardias.md    # Especificación del importador
│   ├── Guardias ESO.xls              # Archivo de muestra ESO (anonimizado)
│   ├── Guardias Bto.xls              # Archivo de muestra Bachillerato (anonimizado)
│   └── CAMBIOS_MEMORIA_TFG.md
└── public/                  # Frontend servido con express.static
    ├── index.html           # Login con Google
    ├── css/                 # Estilos por página
    ├── js/
    │   ├── auth.js          # Sesión y helpers de API
    │   └── sidebar.js       # Menú dinámico según rol + campana de notificaciones
    └── pages/
        ├── admin/           # Vistas de administrador (usuarios, importar Excel)
        ├── profesor/        # Vistas de profesor
        └── compartido/      # Formularios reutilizables
```
