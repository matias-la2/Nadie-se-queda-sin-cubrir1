const { z } = require('zod');

const crearSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio').max(200),
  descripcion: z.string().nullish(),
  tipo: z.string().min(1, 'El tipo es obligatorio').max(50),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  id_espacio: z.number().int().positive().nullish()
});

const actualizarSchema = crearSchema.partial();

const cambiarEstadoSchema = z.object({
  estado: z.enum(['ABIERTA', 'EN_PROCESO', 'RESUELTA', 'CERRADA'])
});

function validar(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body);
    if (!resultado.success) {
      const err = resultado.error;
      err.name = 'ZodError';
      return next(err);
    }
    req.body = resultado.data;
    next();
  };
}

module.exports = { crearSchema, actualizarSchema, cambiarEstadoSchema, validar };
