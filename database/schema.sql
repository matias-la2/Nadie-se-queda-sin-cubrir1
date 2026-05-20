-- ============================================================
-- Portal Web para Profesores del Instituto
-- schema.sql — DDL completo (17 tablas)
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ───────────────────────────────────────
-- 1. ROL
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS rol (
    id_rol          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    nombre_rol      VARCHAR(50)     NOT NULL UNIQUE
        COMMENT 'Ej: PROFESOR, ADMINISTRADOR, EQUIPO_DIRECTIVO, CONSERJE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 2. USUARIO
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario      INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100)    NOT NULL,
    apellidos       VARCHAR(150)    NOT NULL,
    correo          VARCHAR(150)    NOT NULL UNIQUE,
    google_id       VARCHAR(255)    NOT NULL UNIQUE
        COMMENT 'ID unico de Google OAuth (sub)',
    avatar_url      VARCHAR(500)    NULL
        COMMENT 'URL foto de perfil de Google',
    activo          TINYINT(1)      NOT NULL DEFAULT 1
        COMMENT 'Soft delete: 0 = desactivado',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 3. USUARIO_ROL (N:M)
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_rol (
    id_usuario      INT UNSIGNED    NOT NULL,
    id_rol          INT UNSIGNED    NOT NULL,
    PRIMARY KEY (id_usuario, id_rol),
    CONSTRAINT fk_ur_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_ur_rol FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 4. PROFESOR (subtipo de Usuario)
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS profesor (
    id_usuario      INT UNSIGNED    PRIMARY KEY,
    departamento    VARCHAR(100)    NULL,
    CONSTRAINT fk_profesor_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 5. EQUIPO_DIRECTIVO (subtipo de Usuario)
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipo_directivo (
    id_usuario      INT UNSIGNED    PRIMARY KEY,
    cargo           VARCHAR(100)    NOT NULL
        COMMENT 'Ej: Director, Jefe de Estudios, Secretario',
    CONSTRAINT fk_ed_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 6. EDIFICIO
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS edificio (
    id_edificio     INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(50)     NOT NULL,
    piso            VARCHAR(20)     NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 6b. PROFESOR_EDIFICIO (N:M — un profesor puede estar en varios edificios)
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS profesor_edificio (
    id_usuario      INT UNSIGNED    NOT NULL,
    id_edificio     INT UNSIGNED    NOT NULL,
    PRIMARY KEY (id_usuario, id_edificio),
    CONSTRAINT fk_pe_profesor FOREIGN KEY (id_usuario) REFERENCES profesor(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pe_edificio FOREIGN KEY (id_edificio) REFERENCES edificio(id_edificio)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 7. ESPACIO
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS espacio (
    id_espacio      INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(50)     NOT NULL,
    estado_disponibilidad ENUM('DISPONIBLE','NO_DISPONIBLE','MANTENIMIENTO')
        NOT NULL DEFAULT 'DISPONIBLE',
    capacidad       SMALLINT        NULL,
    id_edificio     INT UNSIGNED    NOT NULL,
    CONSTRAINT fk_espacio_edificio FOREIGN KEY (id_edificio) REFERENCES edificio(id_edificio)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 8. CLASE
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS clase (
    id_clase        INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    curso           VARCHAR(50)     NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 9. INCIDENCIA
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidencia (
    id_incidencia       INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    titulo              VARCHAR(200)    NOT NULL,
    descripcion         TEXT            NULL,
    tipo                VARCHAR(50)     NOT NULL,
    fecha               DATE            NOT NULL,
    estado              ENUM('ABIERTA','EN_PROCESO','RESUELTA','CERRADA')
                        NOT NULL DEFAULT 'ABIERTA',
    id_espacio          INT UNSIGNED    NULL,
    id_usuario_creador  INT UNSIGNED    NOT NULL,
    id_equipo_directivo INT UNSIGNED    NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inc_espacio FOREIGN KEY (id_espacio) REFERENCES espacio(id_espacio)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_inc_creador FOREIGN KEY (id_usuario_creador) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inc_directivo FOREIGN KEY (id_equipo_directivo) REFERENCES equipo_directivo(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 10. AUSENCIA
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ausencia (
    id_ausencia         INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    tramo_horario       VARCHAR(50)     NOT NULL,
    fecha               DATE            NOT NULL,
    comentario          TEXT            NULL,
    estado              ENUM('PENDIENTE','CUBIERTA','SIN_CUBRIR')
                        NOT NULL DEFAULT 'PENDIENTE',
    hay_tarea           TINYINT(1)      NOT NULL DEFAULT 0,
    descripcion_tarea   TEXT            NULL,
    archivo_tarea       VARCHAR(500)    NULL
        COMMENT 'Ruta al archivo adjunto con la tarea (opcional)',
    id_profesor         INT UNSIGNED    NOT NULL,
    id_usuario_creador  INT UNSIGNED    NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_aus_profesor FOREIGN KEY (id_profesor) REFERENCES profesor(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_aus_creador FOREIGN KEY (id_usuario_creador) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 11. AUSENCIA_ESPACIO (N:M)
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ausencia_espacio (
    id_ausencia     INT UNSIGNED    NOT NULL,
    id_espacio      INT UNSIGNED    NOT NULL,
    PRIMARY KEY (id_ausencia, id_espacio),
    CONSTRAINT fk_ae_ausencia FOREIGN KEY (id_ausencia) REFERENCES ausencia(id_ausencia)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_ae_espacio FOREIGN KEY (id_espacio) REFERENCES espacio(id_espacio)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 12. GUARDIA_CREADA
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS guardia_creada (
    id_guardia_creada   INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    fecha               DATE            NULL,
    dia_semana          TINYINT         NULL,
    tramo_horario       VARCHAR(50)     NOT NULL,
    curso_escolar       VARCHAR(10)     NOT NULL,
    id_usuario          INT UNSIGNED    NOT NULL,
    id_espacio          INT UNSIGNED    NULL,
    CONSTRAINT fk_gc_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_gc_espacio FOREIGN KEY (id_espacio) REFERENCES espacio(id_espacio)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 13. GUARDIA_ASIGNADA
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS guardia_asignada (
    id_guardia_asignada INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    fecha               DATE            NOT NULL,
    tramo_horario       VARCHAR(50)     NOT NULL,
    tipo_asignacion     ENUM('AUTOMATICA','MANUAL')
                        NOT NULL DEFAULT 'AUTOMATICA',
    estado              ENUM('PENDIENTE','ACEPTADA','RECHAZADA')
                        NOT NULL DEFAULT 'PENDIENTE',
    comentario          TEXT            NULL,
    id_ausencia         INT UNSIGNED    NOT NULL,
    id_profesor_sustituto INT UNSIGNED  NOT NULL,
    id_clase            INT UNSIGNED    NULL,
    id_guardia_creada   INT UNSIGNED    NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ga_ausencia FOREIGN KEY (id_ausencia) REFERENCES ausencia(id_ausencia)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ga_sustituto FOREIGN KEY (id_profesor_sustituto) REFERENCES profesor(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ga_clase FOREIGN KEY (id_clase) REFERENCES clase(id_clase)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_ga_guardia_creada FOREIGN KEY (id_guardia_creada) REFERENCES guardia_creada(id_guardia_creada)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 14. RESERVA
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS reserva (
    id_reserva      INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    fecha           DATE            NOT NULL,
    tramo_horario   VARCHAR(50)     NOT NULL,
    motivo          VARCHAR(255)    NULL,
    id_profesor     INT UNSIGNED    NOT NULL,
    id_espacio      INT UNSIGNED    NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_res_profesor FOREIGN KEY (id_profesor) REFERENCES profesor(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_res_espacio FOREIGN KEY (id_espacio) REFERENCES espacio(id_espacio)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_reserva_espacio_franja
        UNIQUE (id_espacio, fecha, tramo_horario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 15. BLOQUEO_ESPACIO
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS bloqueo_espacio (
    id_bloqueo      INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    id_espacio      INT UNSIGNED    NOT NULL,
    dia_semana      TINYINT         NULL,
    tramo_horario   VARCHAR(50)     NOT NULL,
    fecha_desde     DATE            NOT NULL,
    fecha_hasta     DATE            NULL,
    motivo          VARCHAR(255)    NULL,
    id_usuario_creador INT UNSIGNED NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_blo_espacio FOREIGN KEY (id_espacio) REFERENCES espacio(id_espacio)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_blo_creador FOREIGN KEY (id_usuario_creador) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 16. NOTIFICACION
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT UNSIGNED    NOT NULL,
    tipo            ENUM('RESERVA_RECORDATORIO','AUSENCIA_ASIGNADA',
                    'GUARDIA_REASIGNADA','INCIDENCIA_CAMBIO',
                    'GUARDIA_PENDIENTE','GUARDIA_RECHAZADA') NOT NULL,
    mensaje         TEXT            NOT NULL,
    leida           TINYINT(1)      NOT NULL DEFAULT 0,
    referencia_id   INT UNSIGNED    NULL,
    referencia_tipo VARCHAR(50)     NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────
-- 17. LOG_ACCIONES
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS log_acciones (
    id_log          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    id_usuario      INT UNSIGNED    NULL,
    accion          VARCHAR(100)    NOT NULL,
    tabla_afectada  VARCHAR(50)     NOT NULL,
    registro_id     INT UNSIGNED    NULL,
    datos_extra     JSON            NULL,
    ip              VARCHAR(45)     NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════
-- INDICES
-- ═══════════════════════════════════════
CREATE INDEX idx_inc_creador        ON incidencia(id_usuario_creador);
CREATE INDEX idx_inc_estado         ON incidencia(estado);
CREATE INDEX idx_aus_profesor       ON ausencia(id_profesor);
CREATE INDEX idx_aus_fecha          ON ausencia(fecha);
CREATE INDEX idx_aus_estado         ON ausencia(estado);
CREATE INDEX idx_gc_usuario         ON guardia_creada(id_usuario);
CREATE INDEX idx_gc_dia             ON guardia_creada(dia_semana, tramo_horario);
CREATE INDEX idx_ga_ausencia        ON guardia_asignada(id_ausencia);
CREATE INDEX idx_ga_sustituto       ON guardia_asignada(id_profesor_sustituto);
CREATE INDEX idx_ga_estado          ON guardia_asignada(estado);
CREATE INDEX idx_res_profesor       ON reserva(id_profesor);
CREATE INDEX idx_res_fecha          ON reserva(fecha);
CREATE INDEX idx_res_espacio_fecha  ON reserva(id_espacio, fecha);
CREATE INDEX idx_notif_usuario      ON notificacion(id_usuario, leida);
CREATE INDEX idx_blo_espacio        ON bloqueo_espacio(id_espacio, dia_semana);
CREATE INDEX idx_log_usuario        ON log_acciones(id_usuario);
CREATE INDEX idx_log_fecha          ON log_acciones(created_at);
