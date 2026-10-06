'use strict';

const { cursoActual } = require('./curso.helper');

async function edificiosDeProfesor(connOrPool, idUsuario, curso) {
  curso = curso || cursoActual();
  const [rows] = await connOrPool.query(
    `SELECT DISTINCT e.id_edificio, e.nombre
     FROM guardia_creada gc
     JOIN edificio e ON gc.id_edificio = e.id_edificio
     WHERE gc.id_usuario = ? AND gc.id_edificio IS NOT NULL
       AND gc.curso_escolar = ?`,
    [idUsuario, curso]
  );
  return rows;
}

function sqlExisteEnEdificio(aliasIdUsuario) {
  return `EXISTS (
    SELECT 1 FROM guardia_creada gc_pe
    WHERE gc_pe.id_usuario = ${aliasIdUsuario}
      AND gc_pe.id_edificio = ?
      AND gc_pe.curso_escolar = ?
  )`;
}

const SQL_EDIFICIOS_JOIN = `(
  SELECT DISTINCT gc_pe.id_usuario, gc_pe.id_edificio
  FROM guardia_creada gc_pe
  WHERE gc_pe.id_edificio IS NOT NULL AND gc_pe.curso_escolar = ?
)`;

module.exports = { edificiosDeProfesor, sqlExisteEnEdificio, SQL_EDIFICIOS_JOIN };
