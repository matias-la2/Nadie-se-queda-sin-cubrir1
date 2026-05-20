function paginar(query) {
  const page  = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function respuestaPaginada(datos, total, { page, limit }) {
  return {
    registros: datos,
    paginacion: {
      total,
      pagina: page,
      porPagina: limit,
      totalPaginas: Math.ceil(total / limit)
    }
  };
}

module.exports = { paginar, respuestaPaginada };
