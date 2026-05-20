-- migration_004_espacio_curso.sql
-- Sistema de aulas con ID fijo y nombre variable por curso escolar
-- Crea tabla espacio_curso, añade planta a espacio,
-- inserta edificio Ciclos y todos los espacios reales del centro (planos)

SET NAMES utf8mb4;

-- ─── 1. Nueva tabla espacio_curso ─────────────────────────
CREATE TABLE IF NOT EXISTS espacio_curso (
    id_espacio      INT UNSIGNED    NOT NULL,
    curso_escolar   VARCHAR(10)     NOT NULL,
    nombre_curso    VARCHAR(100)    NOT NULL
        COMMENT 'Nombre del aula para ese curso (ej: 1ºA, 3ºB)',
    PRIMARY KEY (id_espacio, curso_escolar),
    CONSTRAINT fk_ec_espacio FOREIGN KEY (id_espacio) REFERENCES espacio(id_espacio)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ec_curso ON espacio_curso(curso_escolar);

-- ─── 2. Añadir columna planta a espacio ───────────────────
ALTER TABLE espacio ADD COLUMN planta VARCHAR(20) NULL
    COMMENT 'Planta del edificio: Baja, Primera, Segunda'
    AFTER capacidad;

-- ─── 3. Insertar edificio Ciclos ──────────────────────────
INSERT IGNORE INTO edificio (nombre, piso) VALUES ('Ciclos', '3 plantas');

-- Corregir plantas de edificios existentes
UPDATE edificio SET piso = '2 plantas' WHERE nombre = 'ESO';
UPDATE edificio SET piso = '2 plantas' WHERE nombre = 'Bachillerato';

-- ─── 4. Obtener IDs de edificios ──────────────────────────
SET @id_eso    = (SELECT id_edificio FROM edificio WHERE nombre = 'ESO' LIMIT 1);
SET @id_bach   = (SELECT id_edificio FROM edificio WHERE nombre = 'Bachillerato' LIMIT 1);
SET @id_ciclos = (SELECT id_edificio FROM edificio WHERE nombre = 'Ciclos' LIMIT 1);

-- ─── 5. Limpiar datos de prueba ───────────────────────────
-- Eliminar dependencias con ON DELETE RESTRICT
DELETE FROM reserva;
-- El resto se borra en cascada o se pone a NULL
DELETE FROM espacio;

-- ─── 6. Insertar espacios reales (IDs fijos de los planos) ─

-- === EDIFICIO ESO — Planta Baja ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (76,  'Aula 76',          'DISPONIBLE', 30,   'Baja', @id_eso),
  (77,  'Aula 77',          'DISPONIBLE', 30,   'Baja', @id_eso),
  (79,  'Aula 79',          'DISPONIBLE', 30,   'Baja', @id_eso),
  (80,  'Aula 80',          'DISPONIBLE', 30,   'Baja', @id_eso),
  (81,  'Aula 81',          'DISPONIBLE', 30,   'Baja', @id_eso),
  (82,  'Aula 82',          'DISPONIBLE', 30,   'Baja', @id_eso),
  (83,  'Aula 83',          'DISPONIBLE', 30,   'Baja', @id_eso),
  (99,  'Desdoble PT',      'DISPONIBLE', NULL, 'Baja', @id_eso),
  (200, 'Gimnasio',         'DISPONIBLE', NULL, 'Baja', @id_eso),
  (201, 'Biblioteca ESO',   'DISPONIBLE', NULL, 'Baja', @id_eso),
  (202, 'Dpto Ed Fisica',   'DISPONIBLE', NULL, 'Baja', @id_eso),
  (203, 'Dpto Orientacion', 'DISPONIBLE', NULL, 'Baja', @id_eso),
  (204, 'Desdoble 1 ESO',   'DISPONIBLE', NULL, 'Baja', @id_eso),
  (205, 'Aula Abierta',     'DISPONIBLE', NULL, 'Baja', @id_eso),
  (206, 'Aula Musica 2',    'DISPONIBLE', NULL, 'Baja', @id_eso),
  (207, 'Laboratorio ESO',  'DISPONIBLE', NULL, 'Baja', @id_eso),
  (208, 'Aula Plastica',    'DISPONIBLE', NULL, 'Baja', @id_eso),
  (209, 'Aula Musica 1',    'DISPONIBLE', NULL, 'Baja', @id_eso);

-- === EDIFICIO ESO — Planta Primera ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (57,  'Aula 57',            'DISPONIBLE', 30,   'Primera', @id_eso),
  (58,  'Aula 58',            'DISPONIBLE', 30,   'Primera', @id_eso),
  (59,  'Aula 59',            'DISPONIBLE', 30,   'Primera', @id_eso),
  (61,  'Aula 61',            'DISPONIBLE', 30,   'Primera', @id_eso),
  (62,  'Aula 62',            'DISPONIBLE', 30,   'Primera', @id_eso),
  (63,  'Aula 63',            'DISPONIBLE', 30,   'Primera', @id_eso),
  (64,  'Aula 64',            'DISPONIBLE', 30,   'Primera', @id_eso),
  (6,   'Desdoble 2 ESO',     'DISPONIBLE', NULL, 'Primera', @id_eso),
  (52,  'Informatica 1',      'DISPONIBLE', 25,   'Primera', @id_eso),
  (100, 'Aula Tecnologia',    'DISPONIBLE', 25,   'Primera', @id_eso),
  (106, 'Informatica 2',      'DISPONIBLE', 25,   'Primera', @id_eso),
  (210, 'Informatica Tec',    'DISPONIBLE', 25,   'Primera', @id_eso),
  (211, 'Taller Tecnologia',  'DISPONIBLE', NULL, 'Primera', @id_eso),
  (212, 'Aula PT 1',          'DISPONIBLE', NULL, 'Primera', @id_eso),
  (213, 'Sala Profesores ESO', 'DISPONIBLE', NULL, 'Primera', @id_eso);

-- === EDIFICIO BACHILLERATO — Planta Baja ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (19, 'Aula 19',               'DISPONIBLE', 30,   'Baja', @id_bach),
  (20, 'Aula 20',               'DISPONIBLE', 30,   'Baja', @id_bach),
  (21, 'Aula 21',               'DISPONIBLE', 30,   'Baja', @id_bach),
  (22, 'Desdoble 1 Bach',       'DISPONIBLE', NULL, 'Baja', @id_bach),
  (30, 'Biblioteca Bach',       'DISPONIBLE', NULL, 'Baja', @id_bach),
  (214, 'Sala Estudio',         'DISPONIBLE', NULL, 'Baja', @id_bach),
  (215, 'Sala Profesores Bach', 'DISPONIBLE', NULL, 'Baja', @id_bach);

-- === EDIFICIO BACHILLERATO — Planta Primera ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (5,   'Desdoble 2 Bach',   'DISPONIBLE', NULL, 'Primera', @id_bach),
  (7,   'Aula 7',            'DISPONIBLE', 30,   'Primera', @id_bach),
  (46,  'Desdoble 3 Bach',   'DISPONIBLE', NULL, 'Primera', @id_bach),
  (101, 'Aula 101',          'DISPONIBLE', 30,   'Primera', @id_bach),
  (104, 'Informatica Aula',  'DISPONIBLE', 25,   'Primera', @id_bach),
  (216, 'Laboratorio FQ',    'DISPONIBLE', 25,   'Primera', @id_bach),
  (217, 'Laboratorio BG',    'DISPONIBLE', 25,   'Primera', @id_bach),
  (218, 'Taller Informatica', 'DISPONIBLE', NULL, 'Primera', @id_bach);

-- === EDIFICIO CICLOS — Planta Baja ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (47,  'Desdoble 4',       'DISPONIBLE', NULL, 'Baja',    @id_ciclos),
  (144, 'Salon de Actos',   'DISPONIBLE', 150,  'Baja',    @id_ciclos);

-- === EDIFICIO CICLOS — Planta Primera ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (40, 'Aula 40', 'DISPONIBLE', 30, 'Primera', @id_ciclos),
  (41, 'Aula 41', 'DISPONIBLE', 30, 'Primera', @id_ciclos);

-- === EDIFICIO CICLOS — Planta Segunda ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (4,  'Aula 4',  'DISPONIBLE', 30, 'Segunda', @id_ciclos),
  (44, 'Aula 44', 'DISPONIBLE', 30, 'Segunda', @id_ciclos),
  (45, 'Aula 45', 'DISPONIBLE', 30, 'Segunda', @id_ciclos);

-- ─── 7. Ajustar AUTO_INCREMENT ────────────────────────────
ALTER TABLE espacio AUTO_INCREMENT = 300;

-- ─── 8. Nombres de curso 2025-2026 ───────────────────────

-- ESO Planta Baja
INSERT INTO espacio_curso (id_espacio, curso_escolar, nombre_curso) VALUES
  (76,  '2025-2026', '1ºA'),
  (77,  '2025-2026', '1ºC'),
  (79,  '2025-2026', '1ºB'),
  (80,  '2025-2026', '2ºA'),
  (81,  '2025-2026', '2ºB'),
  (82,  '2025-2026', '2ºC'),
  (83,  '2025-2026', '2ºPAI');

-- ESO Planta Primera
INSERT INTO espacio_curso (id_espacio, curso_escolar, nombre_curso) VALUES
  (57,  '2025-2026', '3ºA'),
  (58,  '2025-2026', '3ºB'),
  (59,  '2025-2026', '3ºC'),
  (61,  '2025-2026', '4ºA'),
  (62,  '2025-2026', '4ºB'),
  (63,  '2025-2026', '4ºDIV'),
  (64,  '2025-2026', '3ºDIV');

-- Bachillerato Planta Baja
INSERT INTO espacio_curso (id_espacio, curso_escolar, nombre_curso) VALUES
  (19,  '2025-2026', '6ºA'),
  (20,  '2025-2026', '5ºB'),
  (21,  '2025-2026', '6ºB');

-- Bachillerato Planta Primera
INSERT INTO espacio_curso (id_espacio, curso_escolar, nombre_curso) VALUES
  (7,   '2025-2026', '2ºFPB'),
  (101, '2025-2026', '1ºFPB');

-- Ciclos Planta Primera
INSERT INTO espacio_curso (id_espacio, curso_escolar, nombre_curso) VALUES
  (40,  '2025-2026', '2ºCFGM INF'),
  (41,  '2025-2026', '1ºCFGM INF');

-- Ciclos Planta Segunda
INSERT INTO espacio_curso (id_espacio, curso_escolar, nombre_curso) VALUES
  (4,   '2025-2026', '5ºA'),
  (44,  '2025-2026', '2ºDAW'),
  (45,  '2025-2026', '1ºDAW');
