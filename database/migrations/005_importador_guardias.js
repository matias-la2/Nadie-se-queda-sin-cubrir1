'use strict';

exports.up = async function (conn, h) {
  // --- 1. Nuevas tablas ---

  if (!await h.tablaExiste('plaza_pendiente')) {
    await conn.query(`
      CREATE TABLE plaza_pendiente (
        id               INT             AUTO_INCREMENT PRIMARY KEY,
        codigo           VARCHAR(10)     NOT NULL,
        curso            VARCHAR(9)      NOT NULL COMMENT '2026-2027',
        id_usuario       INT UNSIGNED    NULL,
        fecha_asignacion DATETIME        NULL,
        UNIQUE KEY uq_plaza (codigo, curso),
        CONSTRAINT fk_pp_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
          ON UPDATE CASCADE ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  if (!await h.tablaExiste('alias_profesor')) {
    await conn.query(`
      CREATE TABLE alias_profesor (
        id                 INT             AUTO_INCREMENT PRIMARY KEY,
        nombre_normalizado VARCHAR(150)    NOT NULL UNIQUE,
        id_usuario         INT UNSIGNED    NOT NULL,
        creado_en          DATETIME        DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ap_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  if (!await h.tablaExiste('profesor_pendiente_login')) {
    await conn.query(`
      CREATE TABLE profesor_pendiente_login (
        id                 INT             AUTO_INCREMENT PRIMARY KEY,
        nombre_normalizado VARCHAR(150)    NOT NULL UNIQUE,
        nombre_original    VARCHAR(150)    NOT NULL,
        creado_en          DATETIME        DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  // --- 2. Hacer id_usuario nullable en guardia_creada ---

  const [colInfo] = await conn.query(
    "SELECT IS_NULLABLE FROM information_schema.COLUMNS " +
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guardia_creada' AND COLUMN_NAME = 'id_usuario'"
  );
  if (colInfo.length > 0 && colInfo[0].IS_NULLABLE === 'NO') {
    await conn.query('ALTER TABLE guardia_creada MODIFY id_usuario INT UNSIGNED NULL');
  }

  // --- 3. Columnas nuevas en guardia_creada ---

  if (!await h.columnaExiste('guardia_creada', 'id_edificio')) {
    await conn.query('ALTER TABLE guardia_creada ADD COLUMN id_edificio INT UNSIGNED NULL AFTER id_espacio');
  }
  if (!await h.columnaExiste('guardia_creada', 'id_plaza_pendiente')) {
    await conn.query('ALTER TABLE guardia_creada ADD COLUMN id_plaza_pendiente INT NULL AFTER id_edificio');
  }
  if (!await h.columnaExiste('guardia_creada', 'id_profesor_pendiente')) {
    await conn.query('ALTER TABLE guardia_creada ADD COLUMN id_profesor_pendiente INT NULL AFTER id_plaza_pendiente');
  }
  if (!await h.columnaExiste('guardia_creada', 'origen')) {
    await conn.query(
      "ALTER TABLE guardia_creada ADD COLUMN origen ENUM('MANUAL','CSV','EXCEL') NOT NULL DEFAULT 'MANUAL' AFTER id_profesor_pendiente"
    );
  }

  // --- 4. Foreign keys ---

  if (!await h.fkExiste('guardia_creada', 'fk_gc_edificio')) {
    await conn.query(`
      ALTER TABLE guardia_creada ADD CONSTRAINT fk_gc_edificio
        FOREIGN KEY (id_edificio) REFERENCES edificio(id_edificio)
        ON UPDATE CASCADE ON DELETE SET NULL
    `);
  }
  if (!await h.fkExiste('guardia_creada', 'fk_gc_plaza')) {
    await conn.query(`
      ALTER TABLE guardia_creada ADD CONSTRAINT fk_gc_plaza
        FOREIGN KEY (id_plaza_pendiente) REFERENCES plaza_pendiente(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
    `);
  }
  if (!await h.fkExiste('guardia_creada', 'fk_gc_prof_pendiente')) {
    await conn.query(`
      ALTER TABLE guardia_creada ADD CONSTRAINT fk_gc_prof_pendiente
        FOREIGN KEY (id_profesor_pendiente) REFERENCES profesor_pendiente_login(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
    `);
  }

  // --- 5. Triggers (v1: exactamente uno de los tres) ---
  // Solo se crean si no existen; la migración 006 los reemplaza con la v2

  if (!await h.triggerExiste('trg_gc_titular_insert')) {
    await conn.query(`
      CREATE TRIGGER trg_gc_titular_insert BEFORE INSERT ON guardia_creada
      FOR EACH ROW
      BEGIN
        IF (NEW.id_usuario IS NOT NULL) + (NEW.id_plaza_pendiente IS NOT NULL) + (NEW.id_profesor_pendiente IS NOT NULL) <> 1 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Exactamente uno de id_usuario, id_plaza_pendiente, id_profesor_pendiente debe estar relleno';
        END IF;
      END
    `);
  }
  if (!await h.triggerExiste('trg_gc_titular_update')) {
    await conn.query(`
      CREATE TRIGGER trg_gc_titular_update BEFORE UPDATE ON guardia_creada
      FOR EACH ROW
      BEGIN
        IF (NEW.id_usuario IS NOT NULL) + (NEW.id_plaza_pendiente IS NOT NULL) + (NEW.id_profesor_pendiente IS NOT NULL) <> 1 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Exactamente uno de id_usuario, id_plaza_pendiente, id_profesor_pendiente debe estar relleno';
        END IF;
      END
    `);
  }

  // --- 6. Rellenar id_edificio desde espacio ---

  await conn.query(`
    UPDATE guardia_creada gc
      JOIN espacio e ON e.id_espacio = gc.id_espacio
      SET gc.id_edificio = e.id_edificio
      WHERE gc.id_edificio IS NULL
  `);

  // --- 7. Indice ---

  if (!await h.indiceExiste('guardia_creada', 'idx_gc_edificio')) {
    await conn.query('CREATE INDEX idx_gc_edificio ON guardia_creada(id_edificio)');
  }

  // --- 8. Nuevo tipo de notificacion ---

  const valores = await h.valoresEnum('notificacion', 'tipo');
  if (!valores.includes('PLAZA_SIN_ASIGNAR')) {
    const todos = [...valores, 'PLAZA_SIN_ASIGNAR'];
    const enumStr = todos.map(v => "'" + v + "'").join(',');
    await conn.query('ALTER TABLE notificacion MODIFY COLUMN tipo ENUM(' + enumStr + ') NOT NULL');
  }

  // --- 9. Renombrar tramos horarios ---

  const tramos = [
    ['1a hora (08:30-09:20)', ['1a hora (08:15-09:10)', '1ª hora (08:15-09:10)']],
    ['2a hora (09:25-10:15)', ['2a hora (09:10-10:10)', '2ª hora (09:10-10:10)']],
    ['3a hora (10:20-11:10)', ['3a hora (10:10-11:05)', '3ª hora (10:10-11:05)']],
    ['Recreo (11:10-11:45)',  ['Recreo (11:05-11:30)']],
    ['4a hora (11:45-12:35)', ['4a hora (11:30-12:25)', '4ª hora (11:30-12:25)']],
    ['5a hora (12:40-13:30)', ['5a hora (12:25-13:20)', '5ª hora (12:25-13:20)']],
    ['6a hora (13:35-14:25)', ['6a hora (13:20-14:15)', '6ª hora (13:20-14:15)']]
  ];
  var tablas = ['guardia_creada', 'guardia_asignada', 'ausencia', 'reserva', 'bloqueo_espacio'];
  for (var i = 0; i < tramos.length; i++) {
    var nuevo = tramos[i][0];
    var antiguos = tramos[i][1];
    for (var j = 0; j < tablas.length; j++) {
      await conn.query(
        'UPDATE `' + tablas[j] + '` SET tramo_horario = ? WHERE tramo_horario IN (?)',
        [nuevo, antiguos]
      );
    }
  }
};
