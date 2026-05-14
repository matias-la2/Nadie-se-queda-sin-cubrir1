const { z } = require('zod');

const crearSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  tramo_horario: z.string().min(1, 'El tramo horario es obligatorio'),
  motivo: z.string().max(255).nullish(),
  id_espacio: z.number().int().positive('El espacio es obligatorio')
});

const actualizarSchema = crearSchema.partial();

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

module.exports = { crearSchema, actualizarSchema, validar };
