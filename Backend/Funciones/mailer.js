import nodemailer from 'nodemailer';

const getTransporter = () => {
    console.log(process.env.EMAIL_PORT, process.env.EMAIL_HOST, process.env.EMAIL_USER, process.env.EMAIL_PASS)
    // Forzamos el servicio nativo de Gmail para asegurar compatibilidad total
    if (process.env.EMAIL_HOST === 'smtp.gmail.com' || !process.env.EMAIL_HOST) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS, // Asegúrate de que llegue 'vppcsnbhrhipuvpx'
            },
        });
    }

    // Fallback para otros servidores de correo en producción
    const port = parseInt(process.env.EMAIL_PORT || '587');
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.EMAIL_USER || '',
            pass: process.env.EMAIL_PASS || '',
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Send a generic email with support for HTML and attachments.
 */
export const sendEmail = async ({ to, subject, html, attachments }) => {
    try {
        const transporter = getTransporter();
        const mailOptions = {
            from: `"SCS Cabelum" <${process.env.EMAIL_USER || 'no-reply@cabelum.com.ve'}>`,
            to,
            subject,
            html,
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Mensaje enviado con éxito: ${info.messageId} (Destinatario: ${to})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email Error] Error enviando correo:', error);
        return { success: false, error: error.message };
    }
};

const getCommonAttachments = () => [
    {
        filename: 'header.png',
        path: 'public/header.png',
        cid: 'header_banner'
    },
    {
        filename: 'footer.png',
        path: 'public/footer.png',
        cid: 'footer_banner'
    }
];

/**
 * Send password reset email with a modern premium button/layout.
 */
export const sendResetPasswordEmail = async (to, nombres, username, resetLink) => {
    const displayName = nombres || 'Usuario';
    const displayUsername = username || 'usuario';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #333333; margin: 0; padding: 20px; }
            .container { max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; margin: 0 auto; border: 1px solid #e2e8f0; }
            .header-banner-container { width: 100%; margin: 0; padding: 0; overflow: hidden; background-color: #ffffff; border-bottom: 1px solid #edf2f7; }
            .header-banner { width: 100%; height: auto; display: block; }
            .header { background-color: #4169E1; color: #ffffff; padding: 25px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
            .content { padding: 35px 30px; line-height: 1.6; }
            .content p { font-size: 16px; color: #4a5568; margin-top: 0; margin-bottom: 24px; }
            .btn-container { text-align: center; margin: 35px 0; }
            .btn { background-color: #4169E1; color: #ffffff !important; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 6px rgba(65, 105, 225, 0.2); }
            .footer-info { padding: 15px 30px; text-align: center; font-size: 11px; color: #718096; background-color: #f8fafc; border-top: 1px solid #edf2f7; }
            .footer-banner-container { width: 100%; margin: 0; padding: 0; overflow: hidden; }
            .footer-banner { width: 100%; height: auto; display: block; }
            .warning { font-size: 13px; color: #718096; background-color: #f7fafc; padding: 15px; border-left: 4px solid #cbd5e0; border-radius: 4px; margin-top: 25px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header-banner-container">
                <img src="cid:header_banner" alt="Cabelum Cabecera" class="header-banner" />
            </div>
            <div class="header">
                <h1>CVG CABELUM</h1>
            </div>
            <div class="content">
                <p>Hola <strong>${displayName}</strong>,</p>
                <p>Tu usuario asignado es: <strong>${displayUsername}</strong></p>
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de acceso al sistema de Gestión de Solicitudes (SCS).</p>
                <p>Para continuar con el restablecimiento, por favor haz clic en el botón inferior:</p>
                <div class="btn-container">
                    <a href="${resetLink}" class="btn">Restablecer Contraseña</a>
                </div>
                <div class="warning">
                    <strong>Nota de seguridad:</strong> Este enlace expirará en 1 hora. Si tú no realizaste esta solicitud, puedes ignorar este correo de forma segura.
                </div>
            </div>
            <div class="footer-info">
                Sistema de Control de Solicitudes (SCS)<br>
                División de Logística y Tecnología.
            </div>
            <div class="footer-banner-container">
                <img src="cid:footer_banner" alt="Footer Cabelum" class="footer-banner" />
            </div>
        </div>
    </body>
    </html>
    `;

    return sendEmail({
        to,
        subject: 'Recuperación de Contraseña - CVG Cabelum',
        html,
        attachments: getCommonAttachments()
    });
};

/**
 * Send status change notifications.
 */
export const sendStatusChangeEmail = async (to, nombres, idSolicitud, resumen, nuevoEstado) => {
    // Color map based on states
    let badgeColor = '#64748b'; // default
    if (nuevoEstado === 'Pendiente') badgeColor = '#f59e0b';
    else if (nuevoEstado === 'Aprobado Gerencia') badgeColor = '#10b981';
    else if (nuevoEstado === 'En Compras') badgeColor = '#8b5cf6';
    else if (nuevoEstado === 'Aprovadas' || nuevoEstado === 'Finalizado') badgeColor = '#059669';
    else if (nuevoEstado === 'Rechazado') badgeColor = '#ef4444';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #333333; margin: 0; padding: 20px; }
            .container { max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; margin: 0 auto; border: 1px solid #e2e8f0; }
            .header-banner-container { width: 100%; margin: 0; padding: 0; overflow: hidden; background-color: #ffffff; border-bottom: 1px solid #edf2f7; }
            .header-banner { width: 100%; height: auto; display: block; }
            .header { background-color: #4169E1; color: #ffffff; padding: 25px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
            .content { padding: 35px 30px; line-height: 1.6; }
            .content p { font-size: 16px; color: #4a5568; margin-top: 0; margin-bottom: 24px; }
            .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px; }
            .info-row { display: flex; margin-bottom: 10px; font-size: 15px; }
            .info-row:last-child { margin-bottom: 0; }
            .info-label { width: 150px; font-weight: 600; color: #4a5568; }
            .info-value { flex: 1; color: #1a202c; }
            .badge { background-color: ${badgeColor}; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; display: inline-block; }
            .footer-info { padding: 15px 30px; text-align: center; font-size: 11px; color: #718096; background-color: #f8fafc; border-top: 1px solid #edf2f7; }
            .footer-banner-container { width: 100%; margin: 0; padding: 0; overflow: hidden; }
            .footer-banner { width: 100%; height: auto; display: block; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header-banner-container">
                <img src="cid:header_banner" alt="Cabelum Cabecera" class="header-banner" />
            </div>
            <div class="header">
                <h1>Notificación de Solicitud</h1>
            </div>
            <div class="content">
                <p>Hola <strong>${nombres}</strong>,</p>
                <p>Te informamos que tu solicitud de compra ha registrado una actualización de estado en el sistema.</p>
                <div class="info-box">
                    <div class="info-row">
                        <div class="info-label">Solicitud N°:</div>
                        <div class="info-value">#${idSolicitud}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Resumen:</div>
                        <div class="info-value">${resumen}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Nuevo Estado:</div>
                        <div class="info-value"><span class="badge">${nuevoEstado}</span></div>
                    </div>
                </div>
                <p>Puedes verificar los detalles de la solicitud y chatear con los revisores accediendo al portal web.</p>
            </div>
            <div class="footer-info">
                Sistema de Control de Solicitudes (SCS)<br>
                División de Logística y Tecnología.
            </div>
            <div class="footer-banner-container">
                <img src="cid:footer_banner" alt="Footer Cabelum" class="footer-banner" />
            </div>
        </div>
    </body>
    </html>
    `;

    return sendEmail({
        to,
        subject: `Actualización de Solicitud #${idSolicitud} - ${nuevoEstado}`,
        html,
        attachments: getCommonAttachments()
    });
};

/**
 * Send approval email attaching the PDF.
 */
export const sendApprovalEmail = async (to, nombres, idSolicitud, resumen, pdfBuffer) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #333333; margin: 0; padding: 20px; }
            .container { max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; margin: 0 auto; border: 1px solid #e2e8f0; }
            .header-banner-container { width: 100%; margin: 0; padding: 0; overflow: hidden; background-color: #ffffff; border-bottom: 1px solid #edf2f7; }
            .header-banner { width: 100%; height: auto; display: block; }
            .header { background-color: #4169E1; color: #ffffff; padding: 25px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
            .content { padding: 35px 30px; line-height: 1.6; }
            .content p { font-size: 16px; color: #4a5568; margin-top: 0; margin-bottom: 24px; }
            .info-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 25px; }
            .info-row { display: flex; margin-bottom: 10px; font-size: 15px; }
            .info-row:last-child { margin-bottom: 0; }
            .info-label { width: 150px; font-weight: 600; color: #166534; }
            .info-value { flex: 1; color: #14532d; }
            .badge { background-color: #059669; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; display: inline-block; }
            .footer-info { padding: 15px 30px; text-align: center; font-size: 11px; color: #718096; background-color: #f8fafc; border-top: 1px solid #edf2f7; }
            .footer-banner-container { width: 100%; margin: 0; padding: 0; overflow: hidden; }
            .footer-banner { width: 100%; height: auto; display: block; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header-banner-container">
                <img src="cid:header_banner" alt="Cabelum Cabecera" class="header-banner" />
            </div>
            <div class="header">
                <h1>Solicitud Aprobada</h1>
            </div>
            <div class="content">
                <p>Hola <strong>${nombres}</strong>,</p>
                <p>Nos complace informarte que tu solicitud de compra ha sido <strong>APROBADA</strong> oficialmente por el departamento de Procura y Logística.</p>
                <div class="info-box">
                    <div class="info-row">
                        <div class="info-label">Solicitud N°:</div>
                        <div class="info-value">#${idSolicitud}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Resumen:</div>
                        <div class="info-value">${resumen}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Estado:</div>
                        <div class="info-value"><span class="badge">Aprobado / Entregado</span></div>
                    </div>
                </div>
                <p>Hemos generado el comprobante oficial (planilla SCS) correspondiente y lo hemos adjuntado a este correo en formato PDF para tus registros.</p>
            </div>
            <div class="footer-info">
                Sistema de Control de Solicitudes (SCS)<br>
                División de Logística y Suministros
            </div>
            <div class="footer-banner-container">
                <img src="cid:footer_banner" alt="Footer Cabelum" class="footer-banner" />
            </div>
        </div>
    </body>
    </html>
    `;

    return sendEmail({
        to,
        subject: `Comprobante de Solicitud Aprobada #${idSolicitud}`,
        html,
        attachments: [
            ...getCommonAttachments(),
            {
                filename: `Comprobante-SCS-${idSolicitud}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    });
};
