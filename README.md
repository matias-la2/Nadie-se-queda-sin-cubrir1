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

- Matías La Rosa
- Antonio
- Saray

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
│   └── passport.js          # Estrategia Google OAuth 2.0
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
│   └── pagination.helper.js # Paginación con límites
├── services/
│   ├── email.service.js          # Envío de emails (Nodemailer)
│   └── google-group.service.js   # Verificación de grupo Google Workspace
├── database/
│   ├── schema.sql           # DDL completo (17 tablas)
│   └── seed.sql             # Datos de prueba
└── public/                  # Frontend servido con express.static
    ├── index.html           # Login con Google
    ├── css/                 # Estilos por página
    ├── js/
    │   ├── auth.js          # Sesión y helpers de API
    │   └── sidebar.js       # Menú dinámico según rol
    └── pages/
        ├── admin/           # Vistas de administrador
        ├── profesor/        # Vistas de profesor
        └── compartido/      # Formularios reutilizables
```
