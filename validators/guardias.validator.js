const { z } = require('zod');

const crearGuardiaCreadaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').nullish(),
  dia_semana: z.number().int().min(1).max(5).nullish(),
  tramo_horario: z.string().min(1, 'El tramo horario es obligatorio'),
  curso_escolar: z.string().min(1, 'El curso escolar es obligatorio').max(10),
  id_usuario: z.number().int().positive('El usuario es obligatorio'),
  id_espacio: z.number().int().positive().nullish()
});

const actualizarGuardiaCreadaSchema = crearGuardiaCreadaSchema.partial();

const crearGuardiaAsignadaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  tramo_horario: z.string().min(1, 'El tramo horario es obligatorio'),
  tipo_asignacion: z.enum(['AUTOMATICA', 'MANUAL']).optional(),
  comentario: z.string().nullish(),
  id_ausencia: z.number().int().positive('La ausencia es obligatoria'),
  id_profesor_sustituto: z.number().int().positive('El profesor sustituto es obligatorio'),
  id_clase: z.number().int().positive().nullish(),
  id_guardia_creada: z.number().int().positive().nullish()
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

module.exports = {
  crearGuardiaCreadaSchema, actualizarGuardiaCreadaSchema,
  crearGuardiaAsignadaSchema,
  validar
};
