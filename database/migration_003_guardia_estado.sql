-- migration_003_guardia_estado.sql
-- Añade campo estado a guardia_asignada y tipo GUARDIA_PENDIENTE a notificacion

ALTER TABLE guardia_asignada
  ADD COLUMN estado ENUM('PENDIENTE','ACEPTADA','RECHAZADA')
  NOT NULL DEFAULT 'PENDIENTE'
  AFTER tipo_asignacion;

ALTER TABLE notificacion
  MODIFY COLUMN tipo ENUM(
    'RESERVA_RECORDATORIO',
    'AUSENCIA_ASIGNADA',
    'GUARDIA_REASIGNADA',
    'INCIDENCIA_CAMBIO',
    'GUARDIA_PENDIENTE',
    'GUARDIA_RECHAZADA'
  ) NOT NULL;

CREATE INDEX idx_ga_estado ON guardia_asignada(estado);
