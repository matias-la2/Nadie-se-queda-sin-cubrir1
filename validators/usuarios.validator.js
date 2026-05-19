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
  validar
};
