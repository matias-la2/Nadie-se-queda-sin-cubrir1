const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const KEY_PATH = path.join(__dirname, '..', 'service-account.json');

async function esMiembroDelGrupo(correo) {
  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      keyFile: KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/admin.directory.group.member.readonly'],
      clientOptions: { subject: process.env.GOOGLE_ADMIN_EMAIL }
    });
  } catch (err) {
    if (err.code === 'ENOENT' && process.env.NODE_ENV !== 'production') {
      console.warn('[google-group] service-account.json no encontrado — se omite verificación en desarrollo');
      return true;
    }
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
    console.error('[google-group] Error al verificar membresía:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[google-group] Se omite verificación en desarrollo por error de API');
      return true;
    }
    return false;
  }
}

module.exports = { esMiembroDelGrupo };
