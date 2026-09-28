const { z } = require('zod');

const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellidos: z.string().min(1).max(150).optional(),
  correo: z.string().email('Correo no válido').max(150).optional(),
  activo: z.boolean().optional()
});

const cambiarRolesSchema = z.object({
  roles: z.array(z.string().min(1)).min(1, 'Debe asignar al menos un rol')
});

const crearProfesorSchema = z.object({
  id_usuario: z.number().int().positive('El usuario es obligatorio'),
  departamento: z.string().max(100).nullish(),
  edificios: z.array(z.number().int().positive()).optional()
});

const actualizarProfesorSchema = z.object({
  departamento: z.string().max(100).nullish(),
  edificios: z.array(z.number().int().positive()).optional()
});

const crearDirectivoSchema = z.object({
  id_usuario: z.number().int().positive('El usuario es obligatorio'),
  cargo: z.string().min(1, 'El cargo es obligatorio').max(100)
});

const actualizarDirectivoSchema = z.object({
  cargo: z.string().min(1, 'El cargo es obligatorio').max(100)
});

const asignarPlazaSchema = z.object({
  codigo: z.string().min(1, 'El código de plaza es obligatorio').transform(s => s.toUpperCase()),
});

const asignarPendienteSchema = z.object({
  id_pendiente: z.number().int().positive('El pendiente es obligatorio'),
});

const reasignarPlazaSchema = z.object({
  id_plaza: z.number().int().positive('La plaza es obligatoria'),
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
  actualizarUsuarioSchema, cambiarRolesSchema,
  crearProfesorSchema, actualizarProfesorSchema,
  crearDirectivoSchema, actualizarDirectivoSchema,
  asignarPlazaSchema, asignarPendienteSchema, reasignarPlazaSchema,
  validar
};
