const { z } = require('zod');

const crearSchema = z.object({
  curso: z.string().min(1, 'El curso es obligatorio').max(50)
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
