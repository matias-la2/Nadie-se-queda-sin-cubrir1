-- migration_002_archivo_tarea.sql
-- Añade columna para adjuntar archivo de tarea en ausencias
ALTER TABLE ausencia
  ADD COLUMN archivo_tarea VARCHAR(500) NULL
  COMMENT 'Ruta al archivo adjunto con la tarea (opcional)'
  AFTER descripcion_tarea;
