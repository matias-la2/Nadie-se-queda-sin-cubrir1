const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
const { esMiembroDelGrupo } = require('../services/google-group.service');

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const correo   = profile.emails[0].value;
      const nombre   = profile.name.givenName  || '';
      const apellidos = profile.name.familyName || '';
      const avatarUrl = profile.photos[0]?.value || null;

      const perteneceAlGrupo = await esMiembroDelGrupo(correo);
      if (!perteneceAlGrupo) {
        console.warn(`[passport] Acceso denegado: ${correo} no pertenece al grupo`);
        return done(null, false, { message: 'No tienes acceso al portal. Contacta con el administrador del centro.' });
      }

      const [rows] = await pool.query(
        'SELECT id_usuario FROM usuario WHERE google_id = ?',
        [googleId]
      );

      let idUsuario;

      if (rows.length > 0) {
        idUsuario = rows[0].id_usuario;
        await pool.query(
          'UPDATE usuario SET avatar_url = ? WHERE id_usuario = ?',
          [avatarUrl, idUsuario]
        );
      } else {
        const [result] = await pool.query(
          `INSERT INTO usuario (nombre, apellidos, correo, google_id, avatar_url)
           VALUES (?, ?, ?, ?, ?)`,
          [nombre, apellidos, correo, googleId, avatarUrl]
        );
        idUsuario = result.insertId;

        const [rolRows] = await pool.query(
          "SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR'"
        );
        if (rolRows.length > 0) {
          await pool.query(
            'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)',
            [idUsuario, rolRows[0].id_rol]
          );
        }

        await pool.query(
          'INSERT IGNORE INTO profesor (id_usuario, departamento) VALUES (?, NULL)',
          [idUsuario]
        );
      }

      const [roles] = await pool.query(
        `SELECT r.nombre_rol
         FROM usuario_rol ur
         JOIN rol r ON r.id_rol = ur.id_rol
         WHERE ur.id_usuario = ?`,
        [idUsuario]
      );

      const [activoRows] = await pool.query(
        'SELECT activo FROM usuario WHERE id_usuario = ?',
        [idUsuario]
      );
      if (!activoRows[0]?.activo) {
        return done(null, false, { message: 'Tu cuenta está desactivada. Contacta con el administrador.' });
      }

      const usuario = {
        id: idUsuario,
        nombre,
        apellidos,
        correo,
        avatar_url: avatarUrl,
        roles: roles.map(r => r.nombre_rol)
      };

      return done(null, usuario);
    } catch (err) {
      return done(err, null);
    }
  }
));

module.exports = passport;
