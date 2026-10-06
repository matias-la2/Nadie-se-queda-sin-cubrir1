const CURSOS_ANTERIORES = 5;
const CURSOS_SIGUIENTES = 4;

function cursoActual() {
  const ahora = new Date();
  const anioInicio = ahora.getMonth() >= 8 ? ahora.getFullYear() : ahora.getFullYear() - 1;
  return `${anioInicio}-${anioInicio + 1}`;
}

function cursoSiguiente() {
  const ahora = new Date();
  const anioInicio = ahora.getMonth() >= 8 ? ahora.getFullYear() + 1 : ahora.getFullYear();
  return `${anioInicio}-${anioInicio + 1}`;
}

function inicioCursoActual() {
  const ahora = new Date();
  const anioInicio = ahora.getMonth() >= 8 ? ahora.getFullYear() : ahora.getFullYear() - 1;
  return `${anioInicio}-09-01`;
}

function rangoCurso(curso) {
  if (curso === 'actual') curso = cursoActual();
  const m = /^(\d{4})-(\d{4})$/.exec(curso);
  if (!m) return null;
  const inicio = parseInt(m[1], 10);
  const fin = parseInt(m[2], 10);
  if (fin !== inicio + 1) return null;
  return { desde: `${inicio}-09-01`, hasta: `${fin}-08-31` };
}

function generarRangoCursos() {
  const actual = cursoActual();
  const anioActual = parseInt(actual.split('-')[0], 10);
  const cursos = [];
  for (let a = anioActual - CURSOS_ANTERIORES; a <= anioActual + CURSOS_SIGUIENTES; a++) {
    cursos.push(`${a}-${a + 1}`);
  }
  return cursos;
}

module.exports = { cursoActual, cursoSiguiente, inicioCursoActual, rangoCurso, generarRangoCursos, CURSOS_ANTERIORES, CURSOS_SIGUIENTES };
