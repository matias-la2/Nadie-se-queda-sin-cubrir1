-- ============================================================
-- seed_test.sql — Datos de prueba realistas
-- Ejecutar DESPUÉS de schema.sql (borra todos los datos previos)
-- ============================================================
-- IMPORTANTE: Los grupos de guardia cambian en cada tramo horario.
-- Un profesor puede estar con compañeros distintos según el día y la hora.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE log_acciones;
TRUNCATE TABLE notificacion;
TRUNCATE TABLE bloqueo_espacio;
TRUNCATE TABLE reserva;
TRUNCATE TABLE guardia_asignada;
TRUNCATE TABLE guardia_creada;
TRUNCATE TABLE ausencia_espacio;
TRUNCATE TABLE ausencia;
TRUNCATE TABLE incidencia;
TRUNCATE TABLE clase;
TRUNCATE TABLE profesor_edificio;
TRUNCATE TABLE equipo_directivo;
TRUNCATE TABLE profesor;
TRUNCATE TABLE espacio;
TRUNCATE TABLE edificio;
TRUNCATE TABLE usuario_rol;
TRUNCATE TABLE usuario;
TRUNCATE TABLE rol;

SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════
-- 1. ROLES
-- ═══════════════════════════════════════════════════════════
INSERT INTO rol (nombre_rol) VALUES
  ('PROFESOR'),           -- id 1
  ('EQUIPO_DIRECTIVO'),   -- id 2
  ('ADMINISTRADOR'),      -- id 3
  ('CONSERJE');           -- id 4

-- ═══════════════════════════════════════════════════════════
-- 2. EDIFICIOS
-- ═══════════════════════════════════════════════════════════
INSERT INTO edificio (nombre, piso) VALUES
  ('ESO',          '3 plantas'),   -- id 1
  ('Bachillerato', '2 plantas');   -- id 2

-- ═══════════════════════════════════════════════════════════
-- 3. ESPACIOS
-- ═══════════════════════════════════════════════════════════
INSERT INTO espacio (nombre, estado_disponibilidad, capacidad, id_edificio) VALUES
  -- ESO (edificio 1)
  ('Aula 1A ESO',             'DISPONIBLE', 30, 1),   -- id 1
  ('Aula 1B ESO',             'DISPONIBLE', 28, 1),   -- id 2
  ('Aula 2A ESO',             'DISPONIBLE', 30, 1),   -- id 3
  ('Aula 2B ESO',             'DISPONIBLE', 28, 1),   -- id 4
  ('Sala de Informática ESO', 'DISPONIBLE', 25, 1),   -- id 5
  -- Bachillerato (edificio 2)
  ('Aula 1A Bach',            'DISPONIBLE', 30, 2),   -- id 6
  ('Aula 1B Bach',            'DISPONIBLE', 28, 2),   -- id 7
  ('Aula 2A Bach',            'DISPONIBLE', 30, 2),   -- id 8
  ('Laboratorio de Ciencias', 'DISPONIBLE', 20, 2),   -- id 9
  ('Salón de Actos',          'DISPONIBLE', 150, 2);  -- id 10

-- ═══════════════════════════════════════════════════════════
-- 4. CLASES
-- ═══════════════════════════════════════════════════════════
INSERT INTO clase (curso) VALUES
  ('1º ESO A'),   -- id 1
  ('1º ESO B'),   -- id 2
  ('2º ESO A'),   -- id 3
  ('2º ESO B'),   -- id 4
  ('3º ESO A'),   -- id 5
  ('4º ESO A'),   -- id 6
  ('1º BACH A'),  -- id 7
  ('1º BACH B'),  -- id 8
  ('2º BACH A');  -- id 9

-- ═══════════════════════════════════════════════════════════
-- 5. USUARIOS (19 personas)
-- ═══════════════════════════════════════════════════════════
-- google_id simulados — en producción vienen de OAuth real.
INSERT INTO usuario (nombre, apellidos, correo, google_id, avatar_url) VALUES
  -- 15 profesores
  ('Elena',     'García Martínez',    'elena@iesrioarba.es',     'gid_001', NULL),  -- 1
  ('Carlos',    'López Fernández',    'carlos@iesrioarba.es',    'gid_002', NULL),  -- 2
  ('Ana',       'Martín Pérez',       'ana@iesrioarba.es',       'gid_003', NULL),  -- 3
  ('Pedro',     'Ruiz Gómez',         'pedro@iesrioarba.es',     'gid_004', NULL),  -- 4
  ('Laura',     'Torres Vidal',       'laura@iesrioarba.es',     'gid_005', NULL),  -- 5
  ('Miguel',    'Sánchez Blanco',     'miguel@iesrioarba.es',    'gid_006', NULL),  -- 6
  ('Carmen',    'Díaz Morales',       'carmen@iesrioarba.es',    'gid_007', NULL),  -- 7
  ('José',      'Fernández Ortega',   'jose@iesrioarba.es',      'gid_008', NULL),  -- 8
  ('Isabel',    'Moreno Castro',      'isabel@iesrioarba.es',    'gid_009', NULL),  -- 9
  ('Francisco', 'Álvarez Luna',       'francisco@iesrioarba.es', 'gid_010', NULL),  -- 10
  ('Rosa',      'Jiménez Prieto',     'rosa@iesrioarba.es',      'gid_011', NULL),  -- 11
  ('Antonio',   'Romero Herrera',     'antonio@iesrioarba.es',   'gid_012', NULL),  -- 12
  ('Lucía',     'Hernández Gil',      'lucia@iesrioarba.es',     'gid_013', NULL),  -- 13
  ('David',     'Muñoz Serrano',      'david@iesrioarba.es',     'gid_014', NULL),  -- 14
  ('Marta',     'Navarro Campos',     'marta@iesrioarba.es',     'gid_015', NULL),  -- 15
  -- Jefe de Estudios (profesor + equipo directivo)
  ('Javier',    'Estudios Arba',      'jefe@iesrioarba.es',      'gid_016', NULL),  -- 16
  -- Directora (equipo directivo)
  ('María',     'Directora Sánchez',  'directora@iesrioarba.es', 'gid_017', NULL),  -- 17
  -- Administrador del sistema
  ('Admin',     'Sistema IES',        'admin@iesrioarba.es',     'gid_018', NULL),  -- 18
  -- Conserje
  ('Ramón',     'Conserje Ruiz',      'conserje@iesrioarba.es',  'gid_019', NULL);  -- 19

-- ═══════════════════════════════════════════════════════════
-- 6. ASIGNACIÓN DE ROLES
-- ═══════════════════════════════════════════════════════════
-- Profesores (1-15) → PROFESOR
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES
  (1,1),(2,1),(3,1),(4,1),(5,1),(6,1),(7,1),(8,1),
  (9,1),(10,1),(11,1),(12,1),(13,1),(14,1),(15,1);
-- Jefe de Estudios → PROFESOR + EQUIPO_DIRECTIVO
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (16,1),(16,2);
-- Directora → EQUIPO_DIRECTIVO
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (17,2);
-- Admin → ADMINISTRADOR
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (18,3);
-- Conserje → CONSERJE
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (19,4);

-- ═══════════════════════════════════════════════════════════
-- 7. DATOS SUBTIPO PROFESOR (16 profesores)
-- ═══════════════════════════════════════════════════════════
INSERT INTO profesor (id_usuario, departamento) VALUES
  (1,  'Matemáticas'),
  (2,  'Lengua Castellana'),
  (3,  'Inglés'),
  (4,  'Ciencias Naturales'),
  (5,  'Física y Química'),
  (6,  'Geografía e Historia'),
  (7,  'Educación Física'),
  (8,  'Tecnología'),
  (9,  'Música'),
  (10, 'Dibujo'),
  (11, 'Filosofía'),
  (12, 'Economía'),
  (13, 'Inglés'),
  (14, 'Matemáticas'),
  (15, 'Lengua Castellana'),
  (16, 'Ciencias Naturales');

-- ═══════════════════════════════════════════════════════════
-- 8. DATOS SUBTIPO EQUIPO DIRECTIVO
-- ═══════════════════════════════════════════════════════════
INSERT INTO equipo_directivo (id_usuario, cargo) VALUES
  (16, 'Jefe de Estudios'),
  (17, 'Directora');

-- ═══════════════════════════════════════════════════════════
-- 9. PROFESOR ↔ EDIFICIO (N:M)
-- ═══════════════════════════════════════════════════════════
-- Solo ESO:   Elena(1), Pedro(4), Miguel(6), José(8), Isabel(9), Lucía(13), Marta(15)
-- Solo Bach:  Carlos(2), Laura(5), Francisco(10), Rosa(11), Antonio(12)
-- Ambos:      Ana(3), Carmen(7), David(14), Javier-Jefe(16)
INSERT INTO profesor_edificio (id_usuario, id_edificio) VALUES
  -- Solo ESO
  (1,1),(4,1),(6,1),(8,1),(9,1),(13,1),(15,1),
  -- Solo Bachillerato
  (2,2),(5,2),(10,2),(11,2),(12,2),
  -- Ambos edificios
  (3,1),(3,2),
  (7,1),(7,2),
  (14,1),(14,2),
  (16,1),(16,2);

-- ═══════════════════════════════════════════════════════════
-- 10. GUARDIAS CREADAS — curso 2025-2026
-- ═══════════════════════════════════════════════════════════
-- ⚠ CLAVE: Los grupos cambian en cada tramo. Un profesor NO siempre
--   está con los mismos compañeros. Esto refleja la planificación real
--   del centro donde las guardias se reparten de forma variable.
-- ─────────────────────────────────────────────────────────────

-- ── LUNES (dia_semana = 1) ──────────────────────────────────
-- Grupo 1ª h: Elena(1)+Pedro(4) [ESO]  |  Laura(5) [Bach]  |  Jefe(16) [ambos]
-- Grupo 3ª h: Ana(3)+Miguel(6) [ESO]   |  Carlos(2)+Francisco(10) [Bach]
-- Grupo 5ª h: José(8)+Lucía(13) [ESO]  |  Antonio(12)+Rosa(11) [Bach]
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio) VALUES
  (1, '1ª hora (08:15-09:10)', '2025-2026', 1,  1),   -- Elena → Aula 1A ESO
  (1, '1ª hora (08:15-09:10)', '2025-2026', 4,  3),   -- Pedro → Aula 2A ESO
  (1, '1ª hora (08:15-09:10)', '2025-2026', 5,  9),   -- Laura → Laboratorio
  (1, '1ª hora (08:15-09:10)', '2025-2026', 16, 2),   -- Jefe  → Aula 1B ESO
  (1, '3ª hora (10:05-11:00)', '2025-2026', 3,  4),   -- Ana → Aula 2B ESO
  (1, '3ª hora (10:05-11:00)', '2025-2026', 6,  5),   -- Miguel → Sala Informática
  (1, '3ª hora (10:05-11:00)', '2025-2026', 2,  6),   -- Carlos → Aula 1A Bach
  (1, '3ª hora (10:05-11:00)', '2025-2026', 10, 8),   -- Francisco → Aula 2A Bach
  (1, '5ª hora (12:25-13:20)', '2025-2026', 8,  2),   -- José → Aula 1B ESO
  (1, '5ª hora (12:25-13:20)', '2025-2026', 13, 1),   -- Lucía → Aula 1A ESO
  (1, '5ª hora (12:25-13:20)', '2025-2026', 12, 7),   -- Antonio → Aula 1B Bach
  (1, '5ª hora (12:25-13:20)', '2025-2026', 11, 10);  -- Rosa → Salón de Actos

-- ── MARTES (dia_semana = 2) — día de prueba para "guardias hoy" ──
-- Grupo 1ª h: Miguel(6)+Marta(15) [ESO]     |  Antonio(12)+Laura(5) [Bach]
-- Grupo 2ª h: Elena(1)+José(8) [ESO]        |  Rosa(11)+David(14) [Bach/ambos]
-- Grupo 3ª h: Ana(3)+Isabel(9) [ESO]        |  Carmen(7)+Francisco(10) [ambos/Bach]
-- Grupo 4ª h: Carmen(7)+Marta(15) [ESO/amb] |  David(14)+Rosa(11) [ambos/Bach]
-- Grupo 5ª h: Pedro(4)+Lucía(13) [ESO]      |  Laura(5)+Carlos(2) [Bach]
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio) VALUES
  -- 1ª hora
  (2, '1ª hora (08:15-09:10)', '2025-2026', 6,  3),   -- Miguel → Aula 2A ESO
  (2, '1ª hora (08:15-09:10)', '2025-2026', 15, 2),   -- Marta → Aula 1B ESO
  (2, '1ª hora (08:15-09:10)', '2025-2026', 12, 8),   -- Antonio → Aula 2A Bach
  (2, '1ª hora (08:15-09:10)', '2025-2026', 5,  9),   -- Laura → Laboratorio
  -- 2ª hora
  (2, '2ª hora (09:10-10:05)', '2025-2026', 1,  1),   -- Elena → Aula 1A ESO
  (2, '2ª hora (09:10-10:05)', '2025-2026', 8,  5),   -- José → Sala Informática
  (2, '2ª hora (09:10-10:05)', '2025-2026', 11, 7),   -- Rosa → Aula 1B Bach
  (2, '2ª hora (09:10-10:05)', '2025-2026', 14, 10),  -- David → Salón de Actos
  -- 3ª hora
  (2, '3ª hora (10:05-11:00)', '2025-2026', 3,  4),   -- Ana → Aula 2B ESO
  (2, '3ª hora (10:05-11:00)', '2025-2026', 9,  2),   -- Isabel → Aula 1B ESO
  (2, '3ª hora (10:05-11:00)', '2025-2026', 7,  6),   -- Carmen → Aula 1A Bach
  (2, '3ª hora (10:05-11:00)', '2025-2026', 10, 8),   -- Francisco → Aula 2A Bach
  -- 4ª hora
  (2, '4ª hora (11:30-12:25)', '2025-2026', 7,  4),   -- Carmen → Aula 2B ESO
  (2, '4ª hora (11:30-12:25)', '2025-2026', 15, 5),   -- Marta → Sala Informática
  (2, '4ª hora (11:30-12:25)', '2025-2026', 14, 8),   -- David → Aula 2A Bach
  (2, '4ª hora (11:30-12:25)', '2025-2026', 11, 9),   -- Rosa → Laboratorio
  -- 5ª hora
  (2, '5ª hora (12:25-13:20)', '2025-2026', 4,  3),   -- Pedro → Aula 2A ESO
  (2, '5ª hora (12:25-13:20)', '2025-2026', 13, 1),   -- Lucía → Aula 1A ESO
  (2, '5ª hora (12:25-13:20)', '2025-2026', 5,  9),   -- Laura → Laboratorio
  (2, '5ª hora (12:25-13:20)', '2025-2026', 2,  6);   -- Carlos → Aula 1A Bach

-- ── MIÉRCOLES (dia_semana = 3) ──────────────────────────────
-- Grupo 1ª h: Ana(3)+Pedro(4) [ESO/ambos]     |  David(14)+Rosa(11) [ambos/Bach]
-- Grupo 3ª h: José(8)+Marta(15) [ESO]         |  Francisco(10)+Laura(5) [Bach]  |  Jefe(16) [ambos]
-- Grupo 5ª h: Carmen(7)+Isabel(9) [ambos/ESO] |  Antonio(12)+Carlos(2) [Bach]
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio) VALUES
  (3, '1ª hora (08:15-09:10)', '2025-2026', 3,  4),   -- Ana → Aula 2B ESO
  (3, '1ª hora (08:15-09:10)', '2025-2026', 4,  1),   -- Pedro → Aula 1A ESO
  (3, '1ª hora (08:15-09:10)', '2025-2026', 14, 6),   -- David → Aula 1A Bach
  (3, '1ª hora (08:15-09:10)', '2025-2026', 11, 7),   -- Rosa → Aula 1B Bach
  (3, '3ª hora (10:05-11:00)', '2025-2026', 8,  5),   -- José → Sala Informática
  (3, '3ª hora (10:05-11:00)', '2025-2026', 15, 2),   -- Marta → Aula 1B ESO
  (3, '3ª hora (10:05-11:00)', '2025-2026', 10, 8),   -- Francisco → Aula 2A Bach
  (3, '3ª hora (10:05-11:00)', '2025-2026', 5,  9),   -- Laura → Laboratorio
  (3, '3ª hora (10:05-11:00)', '2025-2026', 16, 3),   -- Jefe → Aula 2A ESO
  (3, '5ª hora (12:25-13:20)', '2025-2026', 7,  3),   -- Carmen → Aula 2A ESO
  (3, '5ª hora (12:25-13:20)', '2025-2026', 9,  4),   -- Isabel → Aula 2B ESO
  (3, '5ª hora (12:25-13:20)', '2025-2026', 12, 10),  -- Antonio → Salón de Actos
  (3, '5ª hora (12:25-13:20)', '2025-2026', 2,  6);   -- Carlos → Aula 1A Bach

-- ── JUEVES (dia_semana = 4) ──────────────────────────────────
-- Grupo 1ª h: Miguel(6)+Lucía(13) [ESO]       |  Laura(5)+Antonio(12) [Bach]
-- Grupo 3ª h: Carlos(2)+Carmen(7) [Bach/amb]  |  Ana(3)+Rosa(11) [ambos/Bach]  |  Jefe(16) [ambos]
-- Grupo 5ª h: Elena(1)+Pedro(4) [ESO]         |  David(14)+Francisco(10) [ambos/Bach]
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio) VALUES
  (4, '1ª hora (08:15-09:10)', '2025-2026', 6,  3),   -- Miguel → Aula 2A ESO
  (4, '1ª hora (08:15-09:10)', '2025-2026', 13, 2),   -- Lucía → Aula 1B ESO
  (4, '1ª hora (08:15-09:10)', '2025-2026', 5,  9),   -- Laura → Laboratorio
  (4, '1ª hora (08:15-09:10)', '2025-2026', 12, 8),   -- Antonio → Aula 2A Bach
  (4, '3ª hora (10:05-11:00)', '2025-2026', 2,  6),   -- Carlos → Aula 1A Bach
  (4, '3ª hora (10:05-11:00)', '2025-2026', 7,  1),   -- Carmen → Aula 1A ESO
  (4, '3ª hora (10:05-11:00)', '2025-2026', 3,  4),   -- Ana → Aula 2B ESO
  (4, '3ª hora (10:05-11:00)', '2025-2026', 11, 7),   -- Rosa → Aula 1B Bach
  (4, '3ª hora (10:05-11:00)', '2025-2026', 16, 4),   -- Jefe → Aula 2B ESO
  (4, '5ª hora (12:25-13:20)', '2025-2026', 1,  1),   -- Elena → Aula 1A ESO
  (4, '5ª hora (12:25-13:20)', '2025-2026', 4,  5),   -- Pedro → Sala Informática
  (4, '5ª hora (12:25-13:20)', '2025-2026', 14, 10),  -- David → Salón de Actos
  (4, '5ª hora (12:25-13:20)', '2025-2026', 10, 8);   -- Francisco → Aula 2A Bach

-- ── VIERNES (dia_semana = 5) ──────────────────────────────────
-- Grupo 1ª h: Pedro(4)+José(8) [ESO]           |  Francisco(10)+David(14) [Bach/ambos]  |  Jefe(16) [ambos]
-- Grupo 3ª h: Elena(1)+Isabel(9) [ESO]         |  Antonio(12)+Carmen(7) [Bach/ambos]
-- Grupo 5ª h: Ana(3)+Lucía(13) [ambos/ESO]     |  Laura(5)+Rosa(11) [Bach]
INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio) VALUES
  (5, '1ª hora (08:15-09:10)', '2025-2026', 4,  3),   -- Pedro → Aula 2A ESO
  (5, '1ª hora (08:15-09:10)', '2025-2026', 8,  2),   -- José → Aula 1B ESO
  (5, '1ª hora (08:15-09:10)', '2025-2026', 10, 6),   -- Francisco → Aula 1A Bach
  (5, '1ª hora (08:15-09:10)', '2025-2026', 14, 9),   -- David → Laboratorio
  (5, '1ª hora (08:15-09:10)', '2025-2026', 16, 10),  -- Jefe → Salón de Actos
  (5, '3ª hora (10:05-11:00)', '2025-2026', 1,  1),   -- Elena → Aula 1A ESO
  (5, '3ª hora (10:05-11:00)', '2025-2026', 9,  5),   -- Isabel → Sala Informática
  (5, '3ª hora (10:05-11:00)', '2025-2026', 12, 8),   -- Antonio → Aula 2A Bach
  (5, '3ª hora (10:05-11:00)', '2025-2026', 7,  7),   -- Carmen → Aula 1B Bach
  (5, '5ª hora (12:25-13:20)', '2025-2026', 3,  4),   -- Ana → Aula 2B ESO
  (5, '5ª hora (12:25-13:20)', '2025-2026', 13, 3),   -- Lucía → Aula 2A ESO
  (5, '5ª hora (12:25-13:20)', '2025-2026', 5,  10),  -- Laura → Salón de Actos
  (5, '5ª hora (12:25-13:20)', '2025-2026', 11, 9);   -- Rosa → Laboratorio

-- ═══════════════════════════════════════════════════════════
-- 11. AUSENCIAS
-- ═══════════════════════════════════════════════════════════
-- Hoy = 2026-05-19 (martes, dia_semana=2)
-- Fechas pasadas: 2026-05-11 (lunes), 2026-05-14 (jueves),
--                 2026-05-08 (viernes), 2026-05-05 (lunes)

INSERT INTO ausencia (tramo_horario, fecha, comentario, estado, hay_tarea, descripcion_tarea, archivo_tarea, id_profesor, id_usuario_creador) VALUES
  -- HOY — pendientes de cubrir
  ('1ª hora (08:15-09:10)', '2026-05-19', 'Cita médica a primera hora', 'PENDIENTE', 0, NULL, NULL, 4, 4),
    -- id 1: Pedro(4) ausente 1ª hora. Guardias disponibles ESO: Miguel(6), Marta(15)
  ('2ª hora (09:10-10:05)', '2026-05-19', 'Baja por enfermedad', 'PENDIENTE', 1, 'Ejercicios página 34-36 del workbook de inglés', NULL, 13, 13),
    -- id 2: Lucía(13) ausente 2ª hora. Guardias disponibles ESO: Elena(1), José(8)
  ('3ª hora (10:05-11:00)', '2026-05-19', 'Asunto personal', 'PENDIENTE', 0, NULL, NULL, 14, 16),
    -- id 3: David(14) ausente 3ª hora. Guardias Bach: Carmen(7), Francisco(10)
  ('5ª hora (12:25-13:20)', '2026-05-19', 'Formación externa obligatoria', 'PENDIENTE', 1, 'Lectura capítulos 5 y 6 del libro de texto', NULL, 2, 2),
    -- id 4: Carlos(2) ausente 5ª hora. Guardias Bach: Laura(5) — Carlos excluido por ausente

  -- PASADAS — ya cubiertas o sin cubrir
  ('1ª hora (08:15-09:10)', '2026-05-11', NULL, 'CUBIERTA', 1, 'Problemas 1 al 10 de la página 82', NULL, 1, 1),
    -- id 5: Elena(1) ausente lunes 1ª. Cubierta por Pedro(4)
  ('3ª hora (10:05-11:00)', '2026-05-11', 'Reunión departamento', 'CUBIERTA', 0, NULL, NULL, 2, 16),
    -- id 6: Carlos(2) ausente lunes 3ª. Cubierta por Francisco(10)
  ('1ª hora (08:15-09:10)', '2026-05-14', 'Enfermedad', 'SIN_CUBRIR', 1, 'Mapa mudo de Europa — completar ríos y cordilleras', NULL, 6, 6),
    -- id 7: Miguel(6) ausente jueves 1ª. No se cubrió
  ('3ª hora (10:05-11:00)', '2026-05-14', NULL, 'CUBIERTA', 0, NULL, NULL, 11, 11),
    -- id 8: Rosa(11) ausente jueves 3ª. Cubierta por Carlos(2)
  ('1ª hora (08:15-09:10)', '2026-05-08', 'Curso de formación', 'CUBIERTA', 0, NULL, NULL, 8, 16),
    -- id 9: José(8) ausente viernes 1ª. Cubierta por Pedro(4)
  ('3ª hora (10:05-11:00)', '2026-05-05', NULL, 'CUBIERTA', 1, 'Tocar con flauta la partitura de la página 20', NULL, 9, 9);
    -- id 10: Isabel(9) ausente lunes 3ª. Cubierta por Ana(3)

-- ═══════════════════════════════════════════════════════════
-- 12. AUSENCIA ↔ ESPACIO (en qué aula estaba el profesor ausente)
-- ═══════════════════════════════════════════════════════════
INSERT INTO ausencia_espacio (id_ausencia, id_espacio) VALUES
  (1,  3),   -- Pedro → Aula 2A ESO
  (2,  2),   -- Lucía → Aula 1B ESO
  (3,  6),   -- David → Aula 1A Bach
  (4,  7),   -- Carlos → Aula 1B Bach
  (5,  1),   -- Elena → Aula 1A ESO
  (6,  6),   -- Carlos → Aula 1A Bach
  (7,  3),   -- Miguel → Aula 2A ESO
  (8,  7),   -- Rosa → Aula 1B Bach
  (9,  2),   -- José → Aula 1B ESO
  (10, 4);   -- Isabel → Aula 2B ESO

-- ═══════════════════════════════════════════════════════════
-- 13. GUARDIAS ASIGNADAS (ausencias cubiertas)
-- ═══════════════════════════════════════════════════════════
INSERT INTO guardia_asignada (fecha, tramo_horario, tipo_asignacion, comentario, id_ausencia, id_profesor_sustituto, id_clase, id_guardia_creada) VALUES
  ('2026-05-11', '1ª hora (08:15-09:10)', 'AUTOMATICA', NULL, 5, 4,  1, NULL),
    -- Pedro(4) cubre a Elena(1) — 1º ESO A
  ('2026-05-11', '3ª hora (10:05-11:00)', 'MANUAL',     NULL, 6, 10, 7, NULL),
    -- Francisco(10) cubre a Carlos(2) — 1º BACH A
  ('2026-05-14', '3ª hora (10:05-11:00)', 'AUTOMATICA', NULL, 8, 2,  8, NULL),
    -- Carlos(2) cubre a Rosa(11) — 1º BACH B
  ('2026-05-08', '1ª hora (08:15-09:10)', 'MANUAL',     'Sustitución por curso de formación', 9, 4, 3, NULL),
    -- Pedro(4) cubre a José(8) — 2º ESO A
  ('2026-05-05', '3ª hora (10:05-11:00)', 'AUTOMATICA', NULL, 10, 3, 4, NULL);
    -- Ana(3) cubre a Isabel(9) — 2º ESO B

-- ═══════════════════════════════════════════════════════════
-- 14. INCIDENCIAS (variadas en tipo y estado)
-- ═══════════════════════════════════════════════════════════
INSERT INTO incidencia (titulo, descripcion, tipo, fecha, estado, id_espacio, id_usuario_creador, id_equipo_directivo) VALUES
  ('Proyector no enciende en Aula 1A ESO',
   'El proyector del techo no responde al mando ni al botón. La bombilla podría estar fundida.',
   'MATERIAL', '2026-05-18', 'ABIERTA', 1, 1, NULL),

  ('Gotera en el techo del Laboratorio',
   'Hay una gotera en la esquina junto a la ventana. Se ha colocado un cubo provisionalmente.',
   'INFRAESTRUCTURA', '2026-05-15', 'EN_PROCESO', 9, 5, 17),

  ('Ordenador del profesor sin sonido',
   'El PC de la Sala de Informática no emite sonido por los altavoces. Los auriculares funcionan bien.',
   'SOFTWARE', '2026-05-10', 'RESUELTA', 5, 2, 16),

  ('Ventana atascada en Aula 2A ESO',
   'La ventana del lado derecho no se puede abrir. Los alumnos pasan calor por las tardes.',
   'INFRAESTRUCTURA', '2026-05-17', 'ABIERTA', 3, 6, NULL),

  ('Silla rota en Aula 1A Bach',
   'Una silla tiene la pata delantera rota. Puede ser peligrosa. Se ha apartado.',
   'MATERIAL', '2026-05-01', 'CERRADA', 6, 3, 17),

  ('Pizarra digital no responde al táctil',
   'La pizarra digital del Aula 1B ESO no detecta el lápiz ni el dedo. Proyecta bien pero no es interactiva.',
   'MATERIAL', '2026-05-16', 'EN_PROCESO', 2, 4, 16),

  ('Puerta del baño de profesores no cierra',
   'La cerradura del baño de profesores del edificio ESO está rota. No cierra con llave.',
   'INFRAESTRUCTURA', '2026-05-19', 'ABIERTA', NULL, 7, NULL),

  ('Software de diseño gráfico no se instala',
   'Al intentar instalar el programa de dibujo técnico en los PCs de informática da error de permisos.',
   'SOFTWARE', '2026-05-14', 'ABIERTA', 5, 10, NULL);

-- ═══════════════════════════════════════════════════════════
-- 15. RESERVAS
-- ═══════════════════════════════════════════════════════════
INSERT INTO reserva (fecha, tramo_horario, motivo, id_profesor, id_espacio) VALUES
  ('2026-05-20', '2ª hora (09:10-10:05)', 'Práctica de programación con 4º ESO',  14, 5),
  ('2026-05-20', '4ª hora (11:30-12:25)', 'Examen online de recuperación',         2,  5),
  ('2026-05-21', '3ª hora (10:05-11:00)', 'Experimento de densidad de líquidos',    3,  9),
  ('2026-05-22', '4ª hora (11:30-12:25)', 'Presentación de proyectos fin de curso', 1,  10);

-- ═══════════════════════════════════════════════════════════
-- 16. BLOQUEOS DE ESPACIO
-- ═══════════════════════════════════════════════════════════
INSERT INTO bloqueo_espacio (id_espacio, dia_semana, tramo_horario, fecha_desde, fecha_hasta, motivo, id_usuario_creador) VALUES
  (10, NULL, '1ª hora (08:15-09:10)', '2026-05-20', '2026-05-23', 'Ensayo de la obra de teatro de fin de curso', 17),
  (9,  3,    '5ª hora (12:25-13:20)', '2026-05-01', NULL,         'Mantenimiento semanal del laboratorio',       16);

-- ═══════════════════════════════════════════════════════════
-- 17. NOTIFICACIONES
-- ═══════════════════════════════════════════════════════════
INSERT INTO notificacion (id_usuario, tipo, mensaje, leida, referencia_id, referencia_tipo) VALUES
  (4,  'AUSENCIA_ASIGNADA',  'Se te ha asignado una guardia el 2026-05-11 en el tramo 1ª hora (08:15-09:10). Hay tarea para los alumnos.', 1, 1, 'guardia_asignada'),
  (10, 'AUSENCIA_ASIGNADA',  'Se te ha asignado una guardia el 2026-05-11 en el tramo 3ª hora (10:05-11:00).', 1, 2, 'guardia_asignada'),
  (2,  'AUSENCIA_ASIGNADA',  'Se te ha asignado una guardia el 2026-05-14 en el tramo 3ª hora (10:05-11:00).', 0, 3, 'guardia_asignada'),
  (4,  'AUSENCIA_ASIGNADA',  'Se te ha asignado una guardia el 2026-05-08 en el tramo 1ª hora (08:15-09:10).', 1, 4, 'guardia_asignada'),
  (3,  'AUSENCIA_ASIGNADA',  'Se te ha asignado una guardia el 2026-05-05 en el tramo 3ª hora (10:05-11:00). Hay tarea para los alumnos.', 1, 5, 'guardia_asignada'),
  (1,  'INCIDENCIA_CAMBIO',  'El estado de tu incidencia "Proyector no enciende en Aula 1A ESO" ha sido actualizado.', 0, 1, 'incidencia'),
  (14, 'RESERVA_RECORDATORIO','Recuerda tu reserva de mañana: Sala de Informática ESO, 2ª hora.', 0, 1, 'reserva');

-- ═══════════════════════════════════════════════════════════
-- RESUMEN DE DATOS DE PRUEBA
-- ═══════════════════════════════════════════════════════════
-- 4 roles  |  2 edificios  |  10 espacios  |  9 clases
-- 19 usuarios (15 profes + jefe + directora + admin + conserje)
-- 65 guardias creadas (grupos variables por tramo y día)
-- 10 ausencias (4 hoy PENDIENTE, 1 SIN_CUBRIR, 5 CUBIERTA)
-- 5 guardias asignadas
-- 8 incidencias (3 ABIERTA, 2 EN_PROCESO, 1 RESUELTA, 1 CERRADA, 1 ABIERTA)
-- 4 reservas  |  2 bloqueos  |  7 notificaciones
--
-- Conteo de guardias realizadas por profesor (para prioridad justa):
--   Pedro(4): 2 guardias  |  Francisco(10): 1  |  Carlos(2): 1
--   Ana(3): 1             |  Resto: 0
-- ═══════════════════════════════════════════════════════════
