const { z } = require('zod');

const crearEdificioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(50),
  piso: z.string().max(20).nullish()
});

const actualizarEdificioSchema = crearEdificioSchema.partial();

const crearEspacioSchema = z.object({
  id_espacio: z.number().int().positive().nullish(),
  nombre: z.string().min(1, 'El nombre es obligatorio').max(50),
  estado_disponibilidad: z.enum(['DISPONIBLE', 'NO_DISPONIBLE', 'MANTENIMIENTO']).optional(),
  capacidad: z.number().int().positive().nullish(),
  planta: z.string().max(20).nullish(),
  id_edificio: z.number().int().positive('El edificio es obligatorio')
});

const actualizarEspacioSchema = crearEspacioSchema.partial();

const crearBloqueoSchema = z.object({
  id_espacio: z.number().int().positive('El espacio es obligatorio'),
  dia_semana: z.number().int().min(1).max(5).nullish(),
  tramo_horario: z.string().min(1, 'El tramo horario es obligatorio'),
  fecha_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  fecha_hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').nullish(),
  motivo: z.string().max(255).nullish()
});

const nombreCursoSchema = z.object({
  curso_escolar: z.string().min(1, 'El curso escolar es obligatorio').max(10),
  nombre_curso: z.string().min(1, 'El nombre de curso es obligatorio').max(100)
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
  crearEdificioSchema, actualizarEdificioSchema,
  crearEspacioSchema, actualizarEspacioSchema,
  crearBloqueoSchema, nombreCursoSchema,
  validar
};
