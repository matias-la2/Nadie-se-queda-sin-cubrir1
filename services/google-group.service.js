const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const KEY_PATH = path.join(__dirname, '..', 'service-account.json');

function obtenerCredenciales() {
  if (fs.existsSync(KEY_PATH)) {
    return { keyFile: KEY_PATH };
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      return { credentials };
    } catch (err) {
      console.error('[google-group] GOOGLE_SERVICE_ACCOUNT_JSON no es JSON válido:', err.message);
      return null;
    }
  }

  console.error('[google-group] No se encontró service-account.json ni GOOGLE_SERVICE_ACCOUNT_JSON');
  return null;
}

async function esMiembroDelGrupo(correo) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[google-group] Modo desarrollo — se omite verificación de grupo');
    return true;
  }

  const creds = obtenerCredenciales();
  if (!creds) return false;

  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      ...creds,
      scopes: ['https://www.googleapis.com/auth/admin.directory.group.member.readonly'],
      clientOptions: { subject: process.env.GOOGLE_ADMIN_EMAIL }
    });
  } catch (err) {
    console.error('[google-group] Error al crear GoogleAuth:', err.message);
    return false;
  }

  try {
    const directory = google.admin({ version: 'directory_v1', auth });
    const { data } = await directory.members.hasMember({
      groupKey: process.env.GOOGLE_GROUP_EMAIL,
      memberKey: correo
    });
    return data.isMember === true;
  } catch (err) {
    if (err.code === 404 || err.message?.includes('Member not found')) {
      return false;
    }
    if (err.code === 'ENOENT') {
      console.error('[google-group] ENOENT durante llamada API — service-account.json no accesible en', KEY_PATH);
      return false;
    }
    console.error('[google-group] Error al verificar membresía:', err.message);
    return false;
  }
}

module.exports = { esMiembroDelGrupo };
