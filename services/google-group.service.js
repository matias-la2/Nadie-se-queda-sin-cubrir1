const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

const KEY_PATH = path.join(__dirname, '..', 'service-account.json');

function obtenerCredenciales() {
  if (fs.existsSync(KEY_PATH)) {
    return { keyFile: KEY_PATH };
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
    try {
      return { credentials: JSON.parse(raw) };
    } catch (_) {
      try {
        return { credentials: JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) };
      } catch (err) {
        console.error('[google-group] GOOGLE_SERVICE_ACCOUNT_JSON no es JSON ni Base64 válido:', err.message);
        return null;
      }
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
  if (!creds) return fallbackBD(correo);

  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      ...creds,
      scopes: ['https://www.googleapis.com/auth/admin.directory.group.member.readonly'],
      clientOptions: { subject: process.env.GOOGLE_ADMIN_EMAIL }
    });
  } catch (err) {
    console.error('[google-group] Error al crear GoogleAuth:', err.message);
    return fallbackBD(correo);
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

    const msg = err.message || '';
    if (msg.includes('invalid_grant') || msg.includes('Invalid signature')) {
      console.warn('[google-group] Error de credenciales (' + msg + ') — fallback a BD');
      return fallbackBD(correo);
    }

    console.error('[google-group] Error al verificar membresía:', msg);
    return fallbackBD(correo);
  }
}

async function fallbackBD(correo) {
  try {
    const [[row]] = await pool.query(
      'SELECT id_usuario FROM usuario WHERE correo = ? AND activo = 1',
      [correo]
    );
    const existe = !!row;
    console.warn('[google-group] FALLBACK BD para ' + correo + ' — ' + (existe ? 'usuario activo encontrado' : 'no encontrado o inactivo'));
    return existe;
  } catch (err) {
    console.error('[google-group] Error en fallback BD:', err.message);
    return false;
  }
}

module.exports = { esMiembroDelGrupo };
