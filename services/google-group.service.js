const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const KEY_PATH = path.join(__dirname, '..', 'service-account.json');

async function esMiembroDelGrupo(correo) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[google-group] Modo desarrollo — se omite verificación de grupo');
    return true;
  }

  if (!fs.existsSync(KEY_PATH)) {
    console.error('[google-group] FALTA service-account.json en', KEY_PATH, '— asegúrate de que el archivo existe en el contenedor Docker');
    return false;
  }

  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      keyFile: KEY_PATH,
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
