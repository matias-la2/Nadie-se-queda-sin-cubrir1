const { z } = require('zod');

const envSchema = z.object({
  PORT: z.string().refine((v) => !isNaN(Number(v)), { message: 'PORT debe ser un número válido' }).default('3000'),
  DB_HOST: z.string().min(1, 'DB_HOST es requerido'),
  DB_USER: z.string().min(1, 'DB_USER es requerido'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD es requerido'),
  DB_NAME: z.string().min(1, 'DB_NAME es requerido'),
  JWT_SECRET: z.string().min(20, 'JWT_SECRET debe tener al menos 20 caracteres'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID es requerido'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET es requerido'),
  GOOGLE_CALLBACK_URL: z.string().url('GOOGLE_CALLBACK_URL debe ser una URL válida'),
  GOOGLE_GROUP_EMAIL: z.string().email('GOOGLE_GROUP_EMAIL debe ser un email válido'),
  GOOGLE_ADMIN_EMAIL: z.string().email('GOOGLE_ADMIN_EMAIL debe ser un email válido'),
  FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida').default('http://localhost:3000'),
});

function validarEntorno() {
  const resultado = envSchema.safeParse(process.env);

  if (!resultado.success) {
    console.error('[env] Error en las variables de entorno:');
    for (const error of resultado.error.errors) {
      console.error(`  - ${error.path.join('.')}: ${error.message}`);
    }
    process.exit(1);
  }

  console.log('[env] Variables de entorno validadas correctamente');
}

module.exports = { validarEntorno };
