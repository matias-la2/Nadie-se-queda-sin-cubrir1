# Despliegue en producción (Easypanel)

## 1. Copia de seguridad de la base de datos

Desde la consola del servicio MySQL en Easypanel (o una terminal con acceso al contenedor):

```bash
# Crear el dump (--single-transaction evita bloqueos en tablas InnoDB)
BACKUP=/tmp/backup_$(date +%Y%m%d_%H%M%S).sql
mysqldump -u root -p portal_ies \
  --single-transaction --routines --triggers > "$BACKUP"
```

**Comprobar que la copia es válida:**

```bash
# 1. Tamaño mayor que 0
ls -lh "$BACKUP"

# 2. Contiene CREATE TABLE
grep -c 'CREATE TABLE' "$BACKUP"
# Debe ser >= 20 (el numero de tablas de la BD)

# 3. Restaurar en una BD temporal y comparar tablas
mysql -u root -p -e "CREATE DATABASE portal_ies_backup_test"
mysql -u root -p portal_ies_backup_test < "$BACKUP"

mysql -u root -p -e "
  SELECT 'produccion' AS origen, COUNT(*) AS tablas
    FROM information_schema.TABLES WHERE TABLE_SCHEMA='portal_ies'
  UNION ALL
  SELECT 'backup', COUNT(*)
    FROM information_schema.TABLES WHERE TABLE_SCHEMA='portal_ies_backup_test'"

# Las dos filas deben tener el mismo numero de tablas
mysql -u root -p -e "DROP DATABASE portal_ies_backup_test"
```

Descarga el dump a tu máquina local como segunda copia.

## 2. Comprobar estado de migraciones

Desde la consola del contenedor de la app:

```bash
npm run migrate:estado
```

Esto muestra, para cada migración:
- **Reg: sí/no** — si está registrada en `schema_migrations`
- **Esquema: sí/no** — si sus cambios ya existen en la BD
- **Estado** — `✓ OK`, `⚠ Aplicada sin registrar`, `✗ Pendiente`

Si alguna aparece como `⚠ Aplicada sin registrar`, el siguiente paso la registrará y no la re-ejecutará (cada migración comprueba antes de actuar).

## 3. Ejecutar migraciones

```bash
npm run migrate -- --confirmo-backup
```

Sin `--confirmo-backup`, el script se niega a ejecutarse en `NODE_ENV=production`.

Salida esperada: cada migración muestra `✓` o `(ya registrada)`. Si alguna falla, el script se detiene e indica qué paso falló. **No continúes con el deploy hasta resolverlo.**

## 4. Deploy de la app

Desde Easypanel: redeploy del servicio de la app (o `docker compose up -d --build app` si se gestiona manualmente).

## 5. Comprobaciones después del deploy

1. **migrate:estado** — todas las migraciones deben mostrar `✓ OK`:
   ```bash
   npm run migrate:estado
   ```

2. **Endpoints** — verificar que la app responde:
   - `GET /api/v1/health` → 200
   - Abrir el portal en el navegador, hacer login, navegar a guardias

3. **Esquema** — verificar que las nuevas estructuras existen:
   ```bash
   # Desde la consola MySQL
   mysql -u root -p portal_ies -e "DESCRIBE espacio_curso"
   mysql -u root -p portal_ies -e "SHOW COLUMNS FROM espacio LIKE 'planta'"
   mysql -u root -p portal_ies -e "SELECT nombre FROM edificio ORDER BY id_edificio"
   ```

## 6. Volver atrás (rollback)

Si algo va mal después de migrar, restaurar la copia de seguridad:

```bash
# 1. Parar la app para evitar escrituras durante la restauración
#    (en Easypanel: detener el servicio de la app)

# 2. Identificar el backup (usar el nombre exacto del archivo)
ls -lt /tmp/backup_*.sql

# 3. Restaurar (reemplaza todo el contenido de la BD)
mysql -u root -p portal_ies < /tmp/backup_YYYYMMDD_HHMMSS.sql

# 4. Verificar que las tablas están correctas
mysql -u root -p -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='portal_ies'"

# 5. Volver a arrancar la app con la versión anterior del código
#    (en Easypanel: redeploy con el commit anterior)
```

**Importante:** la restauración reemplaza TODO el contenido de la BD, incluyendo la tabla `schema_migrations`. Si después quieres volver a migrar, ejecuta `npm run migrate:estado` primero para ver el estado.

## Scripts manuales (no automáticos)

En `database/scripts/manual/` hay scripts que **nunca** se ejecutan automáticamente:

| Script | Qué hace | Cuándo usarlo |
|---|---|---|
| `insertar_espacios_reales.sql` | Borra todos los espacios y reservas e inserta las aulas reales del plano | Solo en BD nuevas sin datos reales |
| `limpiar_seed.sql` | Elimina los 5 usuarios de prueba (IDs 1-5) | Solo si los IDs 1-5 son usuarios de prueba, nunca si son personas reales |
| `fix_guardias_sin_edificio.sql` | Asigna espacio ESO a guardias sin espacio | Solo después de insertar_espacios_reales.sql |
