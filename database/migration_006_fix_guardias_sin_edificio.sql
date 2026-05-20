-- migration_006_fix_guardias_sin_edificio.sql
-- Asigna un espacio por defecto (primer espacio del edificio ESO) a todas las
-- guardias creadas que actualmente tienen id_espacio = NULL.

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
