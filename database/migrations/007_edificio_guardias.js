'use strict';

exports.up = async function (conn, h) {
  if (!(await h.columnaExiste('edificio', 'id_edificio_guardias'))) {
    await conn.query(
      'ALTER TABLE edificio ADD COLUMN id_edificio_guardias INT UNSIGNED NULL'
    );
  }

  if (!(await h.fkExiste('edificio', 'fk_edificio_guardias'))) {
    await conn.query(
      `ALTER TABLE edificio ADD CONSTRAINT fk_edificio_guardias
       FOREIGN KEY (id_edificio_guardias) REFERENCES edificio(id_edificio)
       ON UPDATE CASCADE ON DELETE SET NULL`
    );
  }

  const [ciclos] = await conn.query(
    "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%CICLOS%'"
  );
  const [bach] = await conn.query(
    "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%BACHILLERATO%'"
  );

  if (ciclos.length > 0 && bach.length > 0) {
    await conn.query(
      'UPDATE edificio SET id_edificio_guardias = ? WHERE id_edificio = ? AND id_edificio_guardias IS NULL',
      [bach[0].id_edificio, ciclos[0].id_edificio]
    );
  }
};
