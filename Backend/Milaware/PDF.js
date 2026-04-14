import PDFDocument from 'pdfkit';

import { solicitudESCOMPRA } from '../DataBase/ConsultasSQL.js';
import pool from '../DataBase/ConexionSQL.js';


const azulPrimario = '#155dfc';
const tituloColor = '#2c3e50'
export const generarPDF = async (req, res) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=reporte-final.pdf');
    doc.pipe(res);

    const azulClaro = '#3498db';
    const grisFondo = '#f2f2f2';
    const datosSolicitudes = await solicitudESCOMPRA({ limit: 1000 });
    const datos = datosSolicitudes.rows;
    const datosgrafico = await pool.query(`
SELECT 
    g.nombre_gerencia AS etiqueta,
    SUM(s.monto_estimado) AS monto_real,
    ROUND(
        (SUM(s.monto_estimado) * 100 / (SELECT SUM(monto_estimado) FROM solicitudes_compra WHERE estado = 'Aprobado')), 
        1
    ) AS valor
FROM gerencias g
INNER JOIN solicitudes_compra s ON g.id_gerencia = s.id_gerencia
WHERE s.estado = 'Aprobado'
GROUP BY g.id_gerencia;`)
    console.log(datos.length);
    console.log(datosgrafico[0]);

    // --- ENCABEZADO ---
    doc.rect(0, 0, 612, 100).fill(azulPrimario);
    doc.fillColor('white').fontSize(25).text('REPORTE DE SOLICITUDES', 50, 40);
    doc.fontSize(8).text('CVG CABELUM - SISTEMA DE GESTIÓN DE SOLICITUDES DE COMPRA Y VENTA', 50, 70);

    // --- VARIABLE DE CONTROL DE POSICIÓN ---
    let yActual = 130;

    // Título de Sección
    doc.fillColor(tituloColor).fontSize(16).text('Resumen de Solicitudes', 50, yActual);
    doc.moveTo(50, yActual + 20).lineTo(550, yActual + 20).lineWidth(1).stroke(azulPrimario);

    yActual += 40; // Bajamos el cursor después del título

    // --- TABLA ---
    doc.fillColor(tituloColor).fontSize(12).font('Helvetica-Bold');
    doc.text('ID', 50, yActual);
    doc.text('Gerencia', 150, yActual);
    doc.text('Resumen', 300, yActual);
    doc.text('Monto Estimado', 400, yActual, { align: 'right' });

    yActual += 20;
    doc.moveTo(50, yActual).lineTo(550, yActual).lineWidth(1).stroke(azulPrimario);
    yActual += 10;



    datos.forEach((item, index) => {
        if (index % 2 === 0) doc.rect(50, yActual - 5, 500, 20).fill(grisFondo);
        doc.fillColor('#333333').font('Helvetica').fontSize(10);
        doc.text(item.id_solicitud, 50, yActual);
        doc.text(item.nombre_gerencia, 150, yActual);
        doc.text(item.resumen, 300, yActual);
        doc.text(item.monto_estimado + ' $', 400, yActual, { align: 'right' });
        yActual += 20;
    });

    doc.addPage();


    doc.rect(0, 0, 612, 100).fill(azulPrimario);
    doc.fillColor('white').fontSize(25).text('REPORTE DE SOLICITUDES', 50, 40);
    doc.fontSize(8).text('CVG CABELUM - SISTEMA DE GESTIÓN DE SOLICITUDES DE COMPRA Y VENTA', 50, 70);

    // Reiniciar la coordenada Y al margen superior de la nueva hoja
    yActual = 130; // Espacio extra antes de las barras


    // doc.fillColor('#2c3e50')
    //     .font('Helvetica-Bold')
    //     .fontSize(14)
    //     .text('Rendimiento de Solicitudes', 50, yActual, { characterSpacing: 1 });

    // doc.moveTo(50, yActual + 20).lineTo(550, yActual + 20).lineWidth(1).strokeColor(azulPrimario).stroke();

    yActual += 40;



    // // dibujarBarra(doc, 'Backend', 85, 50, yActual);
    // // yActual += 25;
    // // dibujarBarra(doc, 'Frontend', 60, 50, yActual);
    // // yActual += 25;
    // // dibujarBarra(doc, 'Base de Datos', 95, 50, yActual);

    // yActual += 80; // <--- ESTE ESPACIO evita que el pastel choque con las barras

    // --- SECCIÓN: ESTADO (Pastel) ---
    const datosGrafico = datosgrafico[0];
    doc.y += 50;


    // Llamamos a la versión Pro que tiene título interno
    dibujarGraficoPastel(doc, 'Porcentaje gastado por gerencia', datosGrafico, 50, yActual, 80);
    yActual += 200;

    // --- TABLA ---
    doc.fillColor(tituloColor).fontSize(12).font('Helvetica-Bold');
    doc.text('ID', 50, yActual);
    doc.text('Gerencia', 150, yActual);
    doc.text('Monto', 300, yActual);
    doc.text('Porcentaje', 400, yActual, { align: 'right' });

    yActual += 20;
    doc.moveTo(50, yActual).lineTo(550, yActual).lineWidth(1).stroke(azulPrimario);
    yActual += 10;

    datosGrafico.forEach((item, index) => {
        if (index % 2 === 0) doc.rect(50, yActual - 5, 500, 20).fill(grisFondo);

        doc.fillColor('#333333').font('Helvetica').fontSize(10);
        doc.text(index + 1, 50, yActual);
        doc.text(item.etiqueta, 150, yActual);
        doc.text(item.monto_real + ' $', 300, yActual);
        doc.text(item.valor + ' %', 400, yActual, { align: 'right' });
        yActual += 20;
    });
    // --- PIE DE PÁGINA ---
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.fillColor('grey').fontSize(8).text(`Página ${i + 1} de ${totalPages}`, 50, doc.page.height - 50, { align: 'center' });
    }

    doc.end();
};


// Función para dibujar una barra con etiqueta
const dibujarBarra = (doc, etiqueta, valor, x, y) => {
    const anchoMaximo = 200;
    const altoBarra = 15;
    const porcentaje = valor / 100;

    // Etiqueta
    doc.fillColor('#2c3e50').fontSize(10).text(etiqueta, x, y);

    // Fondo de la barra (gris)
    doc.rect(x + 80, y - 2, anchoMaximo, altoBarra).fill('#ecf0f1');

    // Barra de datos (azul)
    doc.rect(x + 80, y - 2, anchoMaximo * porcentaje, altoBarra).fill('#3498db');

    // Valor en texto
    doc.fillColor('#2c3e50').text(`${valor}%`, x + 80 + anchoMaximo + 10, y);
};
const dibujarGraficoPastel = (doc, titulo, datos, x, y, radio) => {
    // --- Configuración de Colores ---
    const colores = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'];
    const grisSuave = '#f8f9fc';
    const bordeColor = '#eaecf4';

    // Dimensiones de la "Tarjeta"
    const anchoCard = 500;
    const altoCard = (radio * 2) + 80;

    doc.y += 50;

    // 2. Título Estilizado
    doc.fillColor('#2c3e50')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(titulo.toUpperCase(), x, y - 38, { characterSpacing: 1 });

    // Línea divisoria bajo el título
    doc.moveTo(x, y - 20).lineTo(x + anchoCard, y - 20).lineWidth(1).strokeColor(azulPrimario).stroke();

    // 3. Dibujar Donut (con sombra sutil)
    const centroX = x + radio;
    const centroY = y + radio + 10;
    const radioInterior = radio * 0.65; // Agujero un poco más grande
    let anguloInicial = -Math.PI / 2;

    datos.forEach((segmento, index) => {
        const anguloSegmento = (segmento.valor / 100) * (2 * Math.PI);
        const anguloFinal = anguloInicial + anguloSegmento;
        const color = colores[index % colores.length];

        const largeArcFlag = anguloSegmento > Math.PI ? 1 : 0;

        // Coordenadas
        const sX = centroX + radio * Math.cos(anguloInicial);
        const sY = centroY + radio * Math.sin(anguloInicial);
        const eX = centroX + radio * Math.cos(anguloFinal);
        const eY = centroY + radio * Math.sin(anguloFinal);
        const sXi = centroX + radioInterior * Math.cos(anguloFinal);
        const sYi = centroY + radioInterior * Math.sin(anguloFinal);
        const eXi = centroX + radioInterior * Math.cos(anguloInicial);
        const eYi = centroY + radioInterior * Math.sin(anguloInicial);

        const pathData = `M ${sX} ${sY} A ${radio} ${radio} 0 ${largeArcFlag} 1 ${eX} ${eY} L ${sXi} ${sYi} A ${radioInterior} ${radioInterior} 0 ${largeArcFlag} 0 ${eXi} ${eYi} Z`;

        doc.path(pathData).fill(color).lineWidth(1.5).stroke('white');
        anguloInicial = anguloFinal;
    });

    // 4. Texto Central (KPI)
    doc.fillColor('#5a5c69').fontSize(12).font('Helvetica-Bold')
        .text(`TOTAL`, centroX - 25, centroY - 15, { width: 50, align: 'center' });
    doc.fontSize(10).font('Helvetica').text('100%', centroX - 25, centroY + 5, { width: 50, align: 'center' });

    // 5. Leyenda en Dos Columnas (Alineada)
    const inicioLeyendaX = x + (radio * 2) + 40;
    const itemsPorColumna = Math.ceil(datos.length / 2);

    datos.forEach((segmento, index) => {
        const col = index < itemsPorColumna ? 0 : 1;
        const fila = index < itemsPorColumna ? index : index - itemsPorColumna;

        const itemX = inicioLeyendaX + (col * 140);
        const itemY = (y + 20) + (fila * 25);
        const color = colores[index % colores.length];

        // Bullet con borde
        doc.circle(itemX, itemY + 3, 5).fill(color).lineWidth(1).strokeColor('#fff').stroke();

        // Texto
        doc.fillColor('#5a5c69').font('Helvetica').fontSize(9)
            .text(segmento.etiqueta, itemX + 15, itemY, { width: 85, ellipsis: true });

        // Badge de Valor (pequeño cuadro gris para el %)
        doc.roundedRect(itemX + 100, itemY - 4, 30, 14, 3).fill('#eaecf4');
        doc.fillColor('#4e73df').font('Helvetica-Bold').fontSize(8)
            .text(`${segmento.valor}%`, itemX + 100, itemY - 0.5, { align: 'center', width: 30 });
    });

    doc.restore();

    // Retornamos la nueva posición Y para que el siguiente elemento sepa dónde empezar
    return y + altoCard;
};


export const generarPlanillaPDF = async (req, res, id) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Configurar respuesta como PDF adjunto
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Planilla_Solicitud_${id}.pdf`);
    
    doc.pipe(res);

    try {
        // Consultar info en DB
        const [soliData] = await pool.query(`
            SELECT s.*, u.nombres, u.apellidos, u.cedula, g.nombre_gerencia 
            FROM solicitudes_compra s
            JOIN usuarios u ON s.id_solicitante = u.id_usuario
            JOIN gerencias g ON u.id_gerencia = g.id_gerencia
            WHERE s.id_solicitud = ?
        `, [id]);

        if (soliData.length === 0) {
            doc.fontSize(16).text("Error: Solicitud no encontrada", 50, 50);
            doc.end();
            return;
        }

        const solicitud = soliData[0];

        // --- ENCABEZADO PLANILLA ---
        doc.rect(0, 0, 612, 100).fill(azulPrimario);
        doc.fillColor('white').fontSize(20).text('PLANILLA DE APROBACIÓN DE SOLICITUD', 50, 40);
        doc.fontSize(10).text('CVG CABELUM - GESTIÓN DE COMPRAS E INVENTARIO', 50, 70);

        doc.fillColor('#2c3e50').fontSize(14).font('Helvetica-Bold').text(`N° Expediente: #${solicitud.id_solicitud}`, 50, 130);
        
        const fechaAprobacion = new Date().toLocaleDateString('es-VE');
        doc.font('Helvetica').fontSize(10).text(`Fecha Impresión: ${fechaAprobacion}`, 400, 133);

        doc.moveTo(50, 150).lineTo(550, 150).lineWidth(1.5).stroke(azulPrimario);

        // --- DATOS DEL SOLICITANTE ---
        doc.fillColor('#2c3e50').fontSize(12).font('Helvetica-Bold').text('Datos del Solicitante', 50, 170);
        doc.fillColor('#555').font('Helvetica').fontSize(11);
        doc.text(`Nombre Completo: ${solicitud.nombres} ${solicitud.apellidos}`, 50, 195);
        doc.text(`Cédula de Identidad: ${solicitud.cedula || 'N/A'}`, 50, 215);
        doc.text(`Gerencia / Departamento: ${solicitud.nombre_gerencia}`, 50, 235);

        // --- DETALLES DE LA SOLICITUD ---
        doc.fillColor('#2c3e50').fontSize(12).font('Helvetica-Bold').text('Especificaciones de la Solicitud', 50, 275);
        
        doc.fillColor('#333').font('Helvetica-Bold').fontSize(11).text('Estado Actual:', 50, 305);
        let colorEstado = '#f39c12'; // Pendiente amarillo
        if (solicitud.estado === 'Aprobado') colorEstado = '#27ae60'; // Verde
        if (solicitud.estado === 'Rechazado') colorEstado = '#e74c3c'; // Rojo
        doc.fillColor(colorEstado).text(solicitud.estado.toUpperCase(), 150, 305);

        doc.fillColor('#333').font('Helvetica-Bold').text('Monto Estimado:', 50, 325);
        doc.fillColor('#2c3e50').font('Helvetica').text(`$${Number(solicitud.monto_estimado).toLocaleString('en-US')}`, 150, 325);

        doc.fillColor('#333').font('Helvetica-Bold').text('Resumen del Proyecto:', 50, 345);
        doc.fillColor('#555').font('Helvetica').text(solicitud.resumen, 50, 365, { width: 480 });

        doc.fillColor('#333').font('Helvetica-Bold').text('Justificación Detallada:', 50, 420);
        doc.fillColor('#555').font('Helvetica').text(solicitud.justificacion || 'Sin especificación detallada obligatoria por el usuario.', 50, 440, {
            width: 500,
            align: 'justify'
        });

        // --- ÁREA DE FIRMAS ---
        // Línea divisoria
        doc.moveTo(50, 620).lineTo(550, 620).lineWidth(1).stroke('#e0e0e0');

        // Firmante 1
        doc.moveTo(80, 710).lineTo(230, 710).lineWidth(1).stroke('#333');
        doc.font('Helvetica-Bold').fillColor('#2c3e50').fontSize(10).text('Firma del Solicitante', 80, 720, { width: 150, align: 'center' });

        // Firmante 2
        doc.moveTo(380, 710).lineTo(530, 710).lineWidth(1).stroke('#333');
        doc.font('Helvetica-Bold').fillColor('#2c3e50').fontSize(10).text('Sello y Firma Aprobatoria', 380, 720, { width: 150, align: 'center' });

        doc.end();
    } catch (error) {
        console.error("Error al generar planilla en PDF:", error);
        doc.text("Error crítico obteniendo los datos.");
        doc.end();
    }
};