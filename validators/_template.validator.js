// ╔═══════════════════════════════════════════════════════════╗
// ║  PLANTILLA DE VALIDATOR — Copiar y renombrar            ║
// ║  Ejemplo: incidencias.validator.js                      ║
// ╚═══════════════════════════════════════════════════════════╝

const { z } = require('zod');

// Schema para crear un recurso (POST)
const crearSchema = z.object({
  campo1: z.string().min(1, 'El campo1 es obligatorio').max(200),
  campo2: z.string().optional(),
  campo_numerico: z.number().int().positive().optional(),
  campo_enum: z.enum(['VALOR_A', 'VALOR_B', 'VALOR_C']).optional(),
  campo_fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').optional()
});

// Schema para actualizar (PUT) — todos opcionales
const actualizarSchema = crearSchema.partial();

// Middleware de validación reutilizable
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
