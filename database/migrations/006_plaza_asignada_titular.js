'use strict';

exports.up = async function (conn, h) {
  await conn.query('DROP TRIGGER IF EXISTS trg_gc_titular_insert');
  await conn.query('DROP TRIGGER IF EXISTS trg_gc_titular_update');

  await conn.query(`
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
    END
  `);

  await conn.query(`
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
    END
  `);
};
