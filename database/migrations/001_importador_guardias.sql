-- ============================================================
-- Migración 001: Importador de guardias
-- Nuevas tablas, columnas en guardia_creada, tipo notificación
-- y renombrado de etiquetas de tramo horario
-- ============================================================

SET NAMES utf8mb4;

-- ───────────────────────────────────────
-- 1. Nuevas tablas
-- ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS plaza_pendiente (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    codigo          VARCHAR(10)     NOT NULL,
    curso           VARCHAR(9)      NOT NULL COMMENT '2026-2027',
    id_usuario      INT UNSIGNED    NULL,
    fecha_asignacion DATETIME       NULL,
    UNIQUE KEY uq_plaza (codigo, curso),
    CONSTRAINT fk_pp_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alias_profesor (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    nombre_normalizado VARCHAR(150) NOT NULL UNIQUE,
    id_usuario      INT UNSIGNED    NOT NULL,
    creado_en       DATETIME        DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ap_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profesor_pendiente_login (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    nombre_normalizado VARCHAR(150) NOT NULL UNIQUE,
    nombre_original VARCHAR(150)    NOT NULL,
    creado_en       DATETIME        DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 2. Columnas nuevas en guardia_creada
-- ───────────────────────────────────────

-- Permitir id_usuario NULL (para plazas pendientes o profesores sin login)
ALTER TABLE guardia_creada
    MODIFY id_usuario INT UNSIGNED NULL;

-- Nuevas columnas
ALTER TABLE guardia_creada
    ADD COLUMN id_edificio INT UNSIGNED NULL AFTER id_espacio,
    ADD COLUMN id_plaza_pendiente INT NULL AFTER id_edificio,
    ADD COLUMN id_profesor_pendiente INT NULL AFTER id_plaza_pendiente,
    ADD COLUMN origen ENUM('MANUAL','CSV','EXCEL') NOT NULL DEFAULT 'MANUAL' AFTER id_profesor_pendiente;

-- Foreign keys nuevas
ALTER TABLE guardia_creada
    ADD CONSTRAINT fk_gc_edificio FOREIGN KEY (id_edificio) REFERENCES edificio(id_edificio)
        ON UPDATE CASCADE ON DELETE SET NULL,
    ADD CONSTRAINT fk_gc_plaza FOREIGN KEY (id_plaza_pendiente) REFERENCES plaza_pendiente(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_gc_prof_pendiente FOREIGN KEY (id_profesor_pendiente) REFERENCES profesor_pendiente_login(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;

-- Trigger: exactamente uno de los tres titulares debe estar relleno
-- (CHECK no puede usarse en MySQL 8 sobre columnas con FK referencial)
DELIMITER //
CREATE TRIGGER trg_gc_titular_insert BEFORE INSERT ON guardia_creada
FOR EACH ROW
BEGIN
  IF (NEW.id_usuario IS NOT NULL) + (NEW.id_plaza_pendiente IS NOT NULL) + (NEW.id_profesor_pendiente IS NOT NULL) <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Exactamente uno de id_usuario, id_plaza_pendiente, id_profesor_pendiente debe estar relleno';
  END IF;
END //

CREATE TRIGGER trg_gc_titular_update BEFORE UPDATE ON guardia_creada
FOR EACH ROW
BEGIN
  IF (NEW.id_usuario IS NOT NULL) + (NEW.id_plaza_pendiente IS NOT NULL) + (NEW.id_profesor_pendiente IS NOT NULL) <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Exactamente uno de id_usuario, id_plaza_pendiente, id_profesor_pendiente debe estar relleno';
  END IF;
END //
DELIMITER ;

-- Rellenar id_edificio de las filas existentes a partir de id_espacio
UPDATE guardia_creada gc
    JOIN espacio e ON e.id_espacio = gc.id_espacio
    SET gc.id_edificio = e.id_edificio
    WHERE gc.id_edificio IS NULL;

-- Índice para filtrar por edificio
CREATE INDEX idx_gc_edificio ON guardia_creada(id_edificio);

-- ───────────────────────────────────────
-- 3. Nuevo tipo de notificación
-- ───────────────────────────────────────

ALTER TABLE notificacion
    MODIFY tipo ENUM(
        'RESERVA_RECORDATORIO','AUSENCIA_ASIGNADA',
        'GUARDIA_REASIGNADA','INCIDENCIA_CAMBIO',
        'GUARDIA_PENDIENTE','GUARDIA_RECHAZADA',
        'PLAZA_SIN_ASIGNAR'
    ) NOT NULL;

-- ───────────────────────────────────────
-- 4. Renombrar etiquetas de tramo horario
--    (todas las tablas que usan tramo_horario)
-- ───────────────────────────────────────

-- guardia_creada
UPDATE guardia_creada SET tramo_horario = '1a hora (08:30-09:20)' WHERE tramo_horario IN ('1a hora (08:15-09:10)', '1ª hora (08:15-09:10)');
UPDATE guardia_creada SET tramo_horario = '2a hora (09:25-10:15)' WHERE tramo_horario IN ('2a hora (09:10-10:10)', '2ª hora (09:10-10:10)');
UPDATE guardia_creada SET tramo_horario = '3a hora (10:20-11:10)' WHERE tramo_horario IN ('3a hora (10:10-11:05)', '3ª hora (10:10-11:05)');
UPDATE guardia_creada SET tramo_horario = 'Recreo (11:10-11:45)'  WHERE tramo_horario IN ('Recreo (11:05-11:30)');
UPDATE guardia_creada SET tramo_horario = '4a hora (11:45-12:35)' WHERE tramo_horario IN ('4a hora (11:30-12:25)', '4ª hora (11:30-12:25)');
UPDATE guardia_creada SET tramo_horario = '5a hora (12:40-13:30)' WHERE tramo_horario IN ('5a hora (12:25-13:20)', '5ª hora (12:25-13:20)');
UPDATE guardia_creada SET tramo_horario = '6a hora (13:35-14:25)' WHERE tramo_horario IN ('6a hora (13:20-14:15)', '6ª hora (13:20-14:15)');

-- guardia_asignada
UPDATE guardia_asignada SET tramo_horario = '1a hora (08:30-09:20)' WHERE tramo_horario IN ('1a hora (08:15-09:10)', '1ª hora (08:15-09:10)');
UPDATE guardia_asignada SET tramo_horario = '2a hora (09:25-10:15)' WHERE tramo_horario IN ('2a hora (09:10-10:10)', '2ª hora (09:10-10:10)');
UPDATE guardia_asignada SET tramo_horario = '3a hora (10:20-11:10)' WHERE tramo_horario IN ('3a hora (10:10-11:05)', '3ª hora (10:10-11:05)');
UPDATE guardia_asignada SET tramo_horario = 'Recreo (11:10-11:45)'  WHERE tramo_horario IN ('Recreo (11:05-11:30)');
UPDATE guardia_asignada SET tramo_horario = '4a hora (11:45-12:35)' WHERE tramo_horario IN ('4a hora (11:30-12:25)', '4ª hora (11:30-12:25)');
UPDATE guardia_asignada SET tramo_horario = '5a hora (12:40-13:30)' WHERE tramo_horario IN ('5a hora (12:25-13:20)', '5ª hora (12:25-13:20)');
UPDATE guardia_asignada SET tramo_horario = '6a hora (13:35-14:25)' WHERE tramo_horario IN ('6a hora (13:20-14:15)', '6ª hora (13:20-14:15)');

-- ausencia
UPDATE ausencia SET tramo_horario = '1a hora (08:30-09:20)' WHERE tramo_horario IN ('1a hora (08:15-09:10)', '1ª hora (08:15-09:10)');
UPDATE ausencia SET tramo_horario = '2a hora (09:25-10:15)' WHERE tramo_horario IN ('2a hora (09:10-10:10)', '2ª hora (09:10-10:10)');
UPDATE ausencia SET tramo_horario = '3a hora (10:20-11:10)' WHERE tramo_horario IN ('3a hora (10:10-11:05)', '3ª hora (10:10-11:05)');
UPDATE ausencia SET tramo_horario = 'Recreo (11:10-11:45)'  WHERE tramo_horario IN ('Recreo (11:05-11:30)');
UPDATE ausencia SET tramo_horario = '4a hora (11:45-12:35)' WHERE tramo_horario IN ('4a hora (11:30-12:25)', '4ª hora (11:30-12:25)');
UPDATE ausencia SET tramo_horario = '5a hora (12:40-13:30)' WHERE tramo_horario IN ('5a hora (12:25-13:20)', '5ª hora (12:25-13:20)');
UPDATE ausencia SET tramo_horario = '6a hora (13:35-14:25)' WHERE tramo_horario IN ('6a hora (13:20-14:15)', '6ª hora (13:20-14:15)');

-- reserva
UPDATE reserva SET tramo_horario = '1a hora (08:30-09:20)' WHERE tramo_horario IN ('1a hora (08:15-09:10)', '1ª hora (08:15-09:10)');
UPDATE reserva SET tramo_horario = '2a hora (09:25-10:15)' WHERE tramo_horario IN ('2a hora (09:10-10:10)', '2ª hora (09:10-10:10)');
UPDATE reserva SET tramo_horario = '3a hora (10:20-11:10)' WHERE tramo_horario IN ('3a hora (10:10-11:05)', '3ª hora (10:10-11:05)');
UPDATE reserva SET tramo_horario = 'Recreo (11:10-11:45)'  WHERE tramo_horario IN ('Recreo (11:05-11:30)');
UPDATE reserva SET tramo_horario = '4a hora (11:45-12:35)' WHERE tramo_horario IN ('4a hora (11:30-12:25)', '4ª hora (11:30-12:25)');
UPDATE reserva SET tramo_horario = '5a hora (12:40-13:30)' WHERE tramo_horario IN ('5a hora (12:25-13:20)', '5ª hora (12:25-13:20)');
UPDATE reserva SET tramo_horario = '6a hora (13:35-14:25)' WHERE tramo_horario IN ('6a hora (13:20-14:15)', '6ª hora (13:20-14:15)');

-- bloqueo_espacio
UPDATE bloqueo_espacio SET tramo_horario = '1a hora (08:30-09:20)' WHERE tramo_horario IN ('1a hora (08:15-09:10)', '1ª hora (08:15-09:10)');
UPDATE bloqueo_espacio SET tramo_horario = '2a hora (09:25-10:15)' WHERE tramo_horario IN ('2a hora (09:10-10:10)', '2ª hora (09:10-10:10)');
UPDATE bloqueo_espacio SET tramo_horario = '3a hora (10:20-11:10)' WHERE tramo_horario IN ('3a hora (10:10-11:05)', '3ª hora (10:10-11:05)');
UPDATE bloqueo_espacio SET tramo_horario = 'Recreo (11:10-11:45)'  WHERE tramo_horario IN ('Recreo (11:05-11:30)');
UPDATE bloqueo_espacio SET tramo_horario = '4a hora (11:45-12:35)' WHERE tramo_horario IN ('4a hora (11:30-12:25)', '4ª hora (11:30-12:25)');
UPDATE bloqueo_espacio SET tramo_horario = '5a hora (12:40-13:30)' WHERE tramo_horario IN ('5a hora (12:25-13:20)', '5ª hora (12:25-13:20)');
UPDATE bloqueo_espacio SET tramo_horario = '6a hora (13:35-14:25)' WHERE tramo_horario IN ('6a hora (13:20-14:15)', '6ª hora (13:20-14:15)');
