const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function enviarEmail({ para, asunto, html }) {
  const info = await transporter.sendMail({
    from: `"IES Río Arba" <${process.env.SMTP_USER}>`,
    to: para,
    subject: asunto,
    html
  });
  return info;
}

function plantillaNotificacion({ titulo, cuerpo, enlace }) {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1152d4; color: #fff; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">IES Río Arba</h2>
      </div>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <h3 style="color: #1e293b; margin-top: 0;">${titulo}</h3>
        <p style="color: #64748b; line-height: 1.6;">${cuerpo}</p>
        ${enlace ? `<a href="${enlace}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #1152d4; color: #fff; text-decoration: none; border-radius: 6px;">Ver detalle</a>` : ''}
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
        Este email fue enviado automáticamente. No responder.
      </p>
    </div>
  `;
}

module.exports = { enviarEmail, plantillaNotificacion };
