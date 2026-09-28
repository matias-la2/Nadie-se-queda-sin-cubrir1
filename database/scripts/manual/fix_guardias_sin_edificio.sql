-- ============================================================
-- fix_guardias_sin_edificio.sql
-- ============================================================
--
-- !! SCRIPT MANUAL — NO es una migracion !!
--
-- Asigna el primer espacio del edificio ESO a las guardias
-- creadas que tienen id_espacio = NULL.
--
-- Requiere: espacios reales ya insertados (insertar_espacios_reales.sql)
-- ============================================================

UPDATE guardia_creada
SET id_espacio = (
  SELECT es.id_espacio
  FROM espacio es
  JOIN edificio ed ON es.id_edificio = ed.id_edificio
  WHERE ed.nombre = 'ESO'
  ORDER BY es.id_espacio ASC
  LIMIT 1
)
WHERE id_espacio IS NULL;
