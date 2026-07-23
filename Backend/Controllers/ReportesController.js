/**
 * ReportesController.js
 * Genera reportes PDF generales y planillas individuales de solicitudes.
 */

import { generarPDF, generarPlanillaPDF } from '../Milaware/PDF.js';

// GET /reporte
export const getReporte = async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-logistica.pdf');
    generarPDF(req, res);
};

// GET /reporte/:id
export const getReportePlanilla = async (req, res) => {
    try {
        const { id } = req.params;
        // `generarPDF` es la función que genera la planilla para una solicitud concreta
        // y escribe directamente en `res` usando PDFKit. Usamos esa implementación
        // pasando `id` para garantizar que se envíe la respuesta correctamente.
        await generarPDF(req, res, id);
    } catch (e) {
        console.error(e);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generando la planilla' });
        }
    }
};
