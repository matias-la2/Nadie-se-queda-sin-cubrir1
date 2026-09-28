-- ============================================================
-- Migración 002: Permitir id_usuario + id_plaza_pendiente juntos
-- Requiere la 001 aplicada antes. Usa DELIMITER.
-- Ejecutar con el cliente mysql de terminal:
--   mysql -u root -p portal_ies < database/migrations/002_plaza_asignada_titular.sql
-- ============================================================
--
-- Antes: exactamente uno de (id_usuario, id_plaza_pendiente,
--        id_profesor_pendiente) podía estar relleno.
-- Después: id_usuario + id_plaza_pendiente pueden coexistir
--          (= plaza asignada a un usuario).
--          id_profesor_pendiente sigue siendo exclusivo.
-- ============================================================

SET NAMES utf8mb4;

DROP TRIGGER IF EXISTS trg_gc_titular_insert;
DROP TRIGGER IF EXISTS trg_gc_titular_update;

DELIMITER //
CREATE TRIGGER trg_gc_titular_insert BEFORE INSERT ON guardia_creada
FOR EACH ROW
BEGIN
  IF NEW.id_profesor_pendiente IS NOT NULL THEN
    IF NEW.id_usuario IS NOT NULL OR NEW.id_plaza_pendiente IS NOT NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'id_profesor_pendiente es exclusivo: no combinable con id_usuario ni id_plaza_pendiente';
    END IF;
  ELSEIF NEW.id_usuario IS NULL AND NEW.id_plaza_pendiente IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Debe rellenarse id_usuario, id_plaza_pendiente o id_profesor_pendiente';
  END IF;
END //

CREATE TRIGGER trg_gc_titular_update BEFORE UPDATE ON guardia_creada
FOR EACH ROW
BEGIN
  IF NEW.id_profesor_pendiente IS NOT NULL THEN
    IF NEW.id_usuario IS NOT NULL OR NEW.id_plaza_pendiente IS NOT NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'id_profesor_pendiente es exclusivo: no combinable con id_usuario ni id_plaza_pendiente';
    END IF;
  ELSEIF NEW.id_usuario IS NULL AND NEW.id_plaza_pendiente IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Debe rellenarse id_usuario, id_plaza_pendiente o id_profesor_pendiente';
  END IF;
END //
DELIMITER ;
