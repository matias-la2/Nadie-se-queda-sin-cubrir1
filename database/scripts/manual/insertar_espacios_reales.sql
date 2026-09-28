-- ============================================================
-- insertar_espacios_reales.sql
-- ============================================================
--
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- !!  ATENCION: ESTE SCRIPT BORRA DATOS                     !!
-- !!                                                        !!
-- !!  - DELETE FROM reserva    (TODAS las reservas)          !!
-- !!  - DELETE FROM espacio    (TODOS los espacios)          !!
-- !!    Cascada: ausencia_espacio, bloqueo_espacio           !!
-- !!                                                        !!
-- !!  SOLO para BD nuevas o de desarrollo sin datos reales.  !!
-- !!  En produccion, migrar los espacios manualmente.        !!
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
--
-- Requiere: migration 004 aplicada (tabla espacio_curso,
--           columna planta, edificio Ciclos)
-- ============================================================

SET NAMES utf8mb4;

SET @id_eso    = (SELECT id_edificio FROM edificio WHERE nombre = 'ESO' LIMIT 1);
SET @id_bach   = (SELECT id_edificio FROM edificio WHERE nombre = 'Bachillerato' LIMIT 1);
SET @id_ciclos = (SELECT id_edificio FROM edificio WHERE nombre = 'Ciclos' LIMIT 1);

-- Eliminar dependencias con ON DELETE RESTRICT
DELETE FROM reserva;
-- El resto se borra en cascada o se pone a NULL
DELETE FROM espacio;

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
  (57,  'Aula 57',             'DISPONIBLE', 30,   'Primera', @id_eso),
  (58,  'Aula 58',             'DISPONIBLE', 30,   'Primera', @id_eso),
  (59,  'Aula 59',             'DISPONIBLE', 30,   'Primera', @id_eso),
  (61,  'Aula 61',             'DISPONIBLE', 30,   'Primera', @id_eso),
  (62,  'Aula 62',             'DISPONIBLE', 30,   'Primera', @id_eso),
  (63,  'Aula 63',             'DISPONIBLE', 30,   'Primera', @id_eso),
  (64,  'Aula 64',             'DISPONIBLE', 30,   'Primera', @id_eso),
  (6,   'Desdoble 2 ESO',      'DISPONIBLE', NULL, 'Primera', @id_eso),
  (52,  'Informatica 1',       'DISPONIBLE', 25,   'Primera', @id_eso),
  (100, 'Aula Tecnologia',     'DISPONIBLE', 25,   'Primera', @id_eso),
  (106, 'Informatica 2',       'DISPONIBLE', 25,   'Primera', @id_eso),
  (210, 'Informatica Tec',     'DISPONIBLE', 25,   'Primera', @id_eso),
  (211, 'Taller Tecnologia',   'DISPONIBLE', NULL, 'Primera', @id_eso),
  (212, 'Aula PT 1',           'DISPONIBLE', NULL, 'Primera', @id_eso),
  (213, 'Sala Profesores ESO', 'DISPONIBLE', NULL, 'Primera', @id_eso);

-- === EDIFICIO BACHILLERATO — Planta Baja ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (19,  'Aula 19',               'DISPONIBLE', 30,   'Baja', @id_bach),
  (20,  'Aula 20',               'DISPONIBLE', 30,   'Baja', @id_bach),
  (21,  'Aula 21',               'DISPONIBLE', 30,   'Baja', @id_bach),
  (22,  'Desdoble 1 Bach',       'DISPONIBLE', NULL, 'Baja', @id_bach),
  (30,  'Biblioteca Bach',       'DISPONIBLE', NULL, 'Baja', @id_bach),
  (214, 'Sala Estudio',          'DISPONIBLE', NULL, 'Baja', @id_bach),
  (215, 'Sala Profesores Bach',  'DISPONIBLE', NULL, 'Baja', @id_bach);

-- === EDIFICIO BACHILLERATO — Planta Primera ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (5,   'Desdoble 2 Bach',    'DISPONIBLE', NULL, 'Primera', @id_bach),
  (7,   'Aula 7',             'DISPONIBLE', 30,   'Primera', @id_bach),
  (46,  'Desdoble 3 Bach',    'DISPONIBLE', NULL, 'Primera', @id_bach),
  (101, 'Aula 101',           'DISPONIBLE', 30,   'Primera', @id_bach),
  (104, 'Informatica Aula',   'DISPONIBLE', 25,   'Primera', @id_bach),
  (216, 'Laboratorio FQ',     'DISPONIBLE', 25,   'Primera', @id_bach),
  (217, 'Laboratorio BG',     'DISPONIBLE', 25,   'Primera', @id_bach),
  (218, 'Taller Informatica', 'DISPONIBLE', NULL, 'Primera', @id_bach);

-- === EDIFICIO CICLOS — Planta Baja ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (47,  'Desdoble 4',     'DISPONIBLE', NULL, 'Baja',    @id_ciclos),
  (144, 'Salon de Actos', 'DISPONIBLE', 150,  'Baja',    @id_ciclos);

-- === EDIFICIO CICLOS — Planta Primera ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (40, 'Aula 40', 'DISPONIBLE', 30, 'Primera', @id_ciclos),
  (41, 'Aula 41', 'DISPONIBLE', 30, 'Primera', @id_ciclos);

-- === EDIFICIO CICLOS — Planta Segunda ===
INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES
  (4,  'Aula 4',  'DISPONIBLE', 30, 'Segunda', @id_ciclos),
  (44, 'Aula 44', 'DISPONIBLE', 30, 'Segunda', @id_ciclos),
  (45, 'Aula 45', 'DISPONIBLE', 30, 'Segunda', @id_ciclos);

ALTER TABLE espacio AUTO_INCREMENT = 300;

-- === Nombres de curso 2025-2026 ===

INSERT INTO espacio_curso (id_espacio, curso_escolar, nombre_curso) VALUES
  (76,  '2025-2026', '1ºA'),
  (77,  '2025-2026', '1ºC'),
  (79,  '2025-2026', '1ºB'),
  (80,  '2025-2026', '2ºA'),
  (81,  '2025-2026', '2ºB'),
  (82,  '2025-2026', '2ºC'),
  (83,  '2025-2026', '2ºPAI'),
  (57,  '2025-2026', '3ºA'),
  (58,  '2025-2026', '3ºB'),
  (59,  '2025-2026', '3ºC'),
  (61,  '2025-2026', '4ºA'),
  (62,  '2025-2026', '4ºB'),
  (63,  '2025-2026', '4ºDIV'),
  (64,  '2025-2026', '3ºDIV'),
  (19,  '2025-2026', '6ºA'),
  (20,  '2025-2026', '5ºB'),
  (21,  '2025-2026', '6ºB'),
  (7,   '2025-2026', '2ºFPB'),
  (101, '2025-2026', '1ºFPB'),
  (40,  '2025-2026', '2ºCFGM INF'),
  (41,  '2025-2026', '1ºCFGM INF'),
  (4,   '2025-2026', '5ºA'),
  (44,  '2025-2026', '2ºDAW'),
  (45,  '2025-2026', '1ºDAW');
