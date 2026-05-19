-- ============================================================
-- Migración 001: Tabla profesor_edificio (N:M)
-- Permite asignar profesores a edificios (ESO / Bachillerato)
-- ============================================================

CREATE TABLE IF NOT EXISTS profesor_edificio (
    id_usuario      INT UNSIGNED    NOT NULL,
    id_edificio     INT UNSIGNED    NOT NULL,
    PRIMARY KEY (id_usuario, id_edificio),
    CONSTRAINT fk_pe_profesor FOREIGN KEY (id_usuario) REFERENCES profesor(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pe_edificio FOREIGN KEY (id_edificio) REFERENCES edificio(id_edificio)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Actualizar nombres de edificios existentes (si los hay)
-- Si empiezas de cero, el seed.sql ya tiene los nombres correctos
UPDATE edificio SET nombre = 'ESO' WHERE id_edificio = 1;
UPDATE edificio SET nombre = 'Bachillerato' WHERE id_edificio = 2;
