const { z } = require('zod');

const crearSchema = z.object({
  tramo_horario: z.string().min(1, 'El tramo horario es obligatorio'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  comentario: z.string().nullish(),
  hay_tarea: z.boolean().optional(),
  descripcion_tarea: z.string().nullish(),
  id_profesor: z.number().int().positive().optional(),
  espacios: z.array(z.number().int().positive()).optional()
});

const actualizarSchema = z.object({
  tramo_horario: z.string().min(1).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').optional(),
  comentario: z.string().nullish(),
  hay_tarea: z.boolean().optional(),
  descripcion_tarea: z.string().nullish()
});

const cambiarEstadoSchema = z.object({
  estado: z.enum(['PENDIENTE', 'CUBIERTA', 'SIN_CUBRIR'])
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
