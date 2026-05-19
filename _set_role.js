const mysql = require('mysql2/promise');
const ROL = process.argv[2] || 'ADMINISTRADOR';

(async () => {
  const p = mysql.createPool({ host:'localhost', port:3306, user:'root', password:'admin', database:'portal_ies' });
  const [u] = await p.query("SELECT id_usuario, nombre FROM usuario WHERE correo = '24mlaiseca@iesrioarba.es'");
  if (!u.length) { console.log('Usuario no encontrado. Inicia sesion primero.'); await p.end(); return; }
  const id = u[0].id_usuario;
  await p.query('DELETE FROM usuario_rol WHERE id_usuario = ?', [id]);
  await p.query("INSERT INTO usuario_rol (id_usuario, id_rol) SELECT ?, id_rol FROM rol WHERE nombre_rol = ?", [id, ROL]);
  const [r] = await p.query('SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON ur.id_rol = r.id_rol WHERE ur.id_usuario = ?', [id]);
  console.log(u[0].nombre + ' -> rol: ' + r.map(x => x.nombre_rol).join(', '));
  await p.end();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
