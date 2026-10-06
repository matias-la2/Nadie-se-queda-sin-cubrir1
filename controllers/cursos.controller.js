'use strict';
const pool = require('../config/db');
const { success } = require('../helpers/response.helper');
const { cursoActual, cursoSiguiente } = require('../helpers/curso.helper');

async function listarCursos(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT curso_escolar FROM (
         SELECT curso_escolar FROM guardia_creada
         UNION
         SELECT curso_escolar FROM espacio_curso
       ) t ORDER BY curso_escolar DESC`
    );
    const actual = cursoActual();
    const siguiente = cursoSiguiente();
    const cursos = rows.map(r => r.curso_escolar);
    if (!cursos.includes(actual)) cursos.push(actual);
    cursos.sort().reverse();
    return success(res, { cursos, actual, siguiente });
  } catch (err) {
    next(err);
  }
}

module.exports = { listarCursos };
