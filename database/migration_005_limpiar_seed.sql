-- ============================================================
-- migration_005_limpiar_seed.sql
-- Elimina los usuarios de prueba (IDs 1-5) y sus datos
-- relacionados, respetando las foreign keys.
-- ============================================================

SET NAMES utf8mb4;

-- ─── 1. Tablas con RESTRICT que referencian profesor ────────
DELETE FROM guardia_asignada
WHERE id_profesor_sustituto IN (1, 2, 5)
   OR id_ausencia IN (SELECT id_ausencia FROM ausencia WHERE id_profesor IN (1, 2, 5));

DELETE FROM reserva
WHERE id_profesor IN (1, 2, 5);

DELETE FROM ausencia_espacio
WHERE id_ausencia IN (SELECT id_ausencia FROM ausencia WHERE id_profesor IN (1, 2, 5));

DELETE FROM ausencia
WHERE id_profesor IN (1, 2, 5)
   OR id_usuario_creador IN (1, 2, 3, 4, 5);

-- ─── 2. Tablas con RESTRICT que referencian usuario ─────────
DELETE FROM guardia_creada
WHERE id_usuario IN (1, 2, 3, 4, 5);

DELETE FROM incidencia
WHERE id_usuario_creador IN (1, 2, 3, 4, 5);

DELETE FROM bloqueo_espacio
WHERE id_usuario_creador IN (1, 2, 3, 4, 5);

-- ─── 3. Eliminar usuarios (CASCADE borra automáticamente:
--        usuario_rol, profesor, equipo_directivo,
--        profesor_edificio, notificacion) ─────────────────────
DELETE FROM usuario WHERE id_usuario IN (1, 2, 3, 4, 5);
