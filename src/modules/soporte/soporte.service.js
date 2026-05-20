// src/modules/soporte/soporte.service.js
const nodemailer = require('nodemailer');
const db = require('../../config/database');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? '587'),
  secure: false, // true solo si el puerto es 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const enviarReporte = async ({ nombreColaborador, email, mensaje }) => {
  const mailOptions = {
    from: process.env.SMTP_FROM ?? `"EcoRAEE Soporte" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER, // llega al mismo correo configurado
    subject: `[Soporte EcoRAEE] Reporte de colaborador: ${nombreColaborador}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: #19133B; padding: 24px; text-align: center;">
          <h1 style="color: #B2F333; margin: 0; font-size: 22px;">EcoRAEE — Reporte de Soporte</h1>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 8px;"><strong>Colaborador:</strong> ${nombreColaborador}</p>
          <p style="margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
          <h3 style="color: #19133B; margin-bottom: 8px;">Mensaje:</h3>
          <p style="background: #f4f6f8; padding: 16px; border-radius: 8px; line-height: 1.6; white-space: pre-wrap;">${mensaje}</p>
        </div>
        <div style="background: #f4f6f8; padding: 16px; text-align: center;">
          <small style="color: #888;">Este mensaje fue enviado desde la app EcoRAEE</small>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return { ok: true };
};

const crearSoporteEmpresa = async ({ empresaId, nombre, apellido, asunto, descripcion }) => {
  const query = `
    INSERT INTO soporte_empresa (empresa_id, nombre, apellido, asunto, descripcion)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, empresa_id, nombre, apellido, asunto, descripcion, fecha_creacion, fecha_actualizacion;
  `;
  const values = [empresaId, nombre, apellido, asunto, descripcion];
  const { rows } = await db.query(query, values);
  return rows[0];
};

module.exports = { enviarReporte, crearSoporteEmpresa };


