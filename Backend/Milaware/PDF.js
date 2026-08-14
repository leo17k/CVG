/**
 * FORMATO OFICIAL: SOLICITUD DE COMPRA Y SUMINISTROS (SCS)
 * Diseñado para CVG Cabelum - División de Logística
 */

import pool from '../DataBase/Mysql/ConexionSQL.js';
import { PDFDocument as PDFLibDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

// Configuración de Estilo Corporativo
const PALETTE = {
   primary: '#1a237e',    // Azul Cabelum
   secondary: '#4169E1',  // Royal Blue
   accent: '#f8faff',     // Fondo suave
   text: '#1e293b',       // Gris oscuro para lectura
   muted: '#64748b',      // Gris para etiquetas
   border: '#e2e8f0',     // Bordes finos
   white: '#ffffff',
   bg: '#1447e6'
};




// =========================================================================
// 1. CONTROLADOR PRINCIPAL DE EXPRESS (PDFKit)
// =========================================================================
// =========================================================================
// 1. CONTROLADOR PRINCIPAL DE EXPRESS (PDFKit)
// =========================================================================
export const generarPDFBuffer = async (id) => {
   return new Promise(async (resolve, reject) => {
      try {
         // Obtención de datos de la solicitud con JOINs precisos
         const [rows] = await pool.query(
            `SELECT s.*, 
                    s.justificacion_pdf_url, 
                    s.requerimientos_pdf_url, 
                    s.requerimientos_texto, 
                    s.justificacion, 
                    s.tipo_solicitud, 
                    u.nombres, 
                    u.apellidos, 
                    u.cedula,
                    g.nombre_gerencia AS departamento, 
                    e.nombre AS estado_actual,
                    IF(s.justificacion_pdf_url IS NOT NULL AND s.justificacion_pdf_url != '', 1, 0) AS tiene_justificacion_pdf,
                    IF(s.requerimientos_pdf_url IS NOT NULL AND s.requerimientos_pdf_url != '', 1, 0) AS tiene_requerimientos_pdf
             FROM solicitudes_compra s
             JOIN usuarios u ON s.id_solicitante = u.id_usuario
             JOIN gerencias g ON s.id_gerencia = g.id_gerencia
             JOIN estados_solicitud e ON s.id_estado = e.id_estado
             WHERE s.id_solicitud = ?`, [id]
         );

         if (!rows.length) return reject(new Error('Solicitud no encontrada'));
         const sol = rows[0];

         // Obtención de los ítems asociados a la solicitud
         const [items] = await pool.query(
            `SELECT ds.*, 
                    COALESCE(p.nombre_producto, s.nombre_servicio) as descripcion,
                    COALESCE(p.codigo_producto, s.codigo_servicio) as nro_parte,
                    um.abreviatura as unidad
             FROM detalles_solicitud ds
             LEFT JOIN productos_almacen p ON ds.id_producto = p.id_producto
             LEFT JOIN servicios s ON ds.id_servicio = s.id_servicio
             LEFT JOIN unidades_medida um ON p.id_unidad = um.id_unidad
             WHERE ds.id_solicitud = ?`, [id]
         );

         // Configuración de la instancia de PDFKit
         const doc = new PDFDocument({ 
            size: 'A4', 
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            bufferPages: true 
         });
         
         const fragments = [];
         doc.on('data', (chunk) => fragments.push(chunk));

         let currentY = 20;

         // --- COMPONENTES VISUALES INTERNOS ---
         const dibujarCabeceraLogos = (yCoord) => {
            doc.image('public/desarrollo.png', 40, yCoord, { height: 40, width: 290 });
            doc.image('public/cvg.png', 450, yCoord - 9, { width: 50, height: 50 });
            doc.moveTo(509, yCoord).lineTo(509, yCoord + 35).lineWidth(0.5).strokeColor(PALETTE.primary).stroke();
            doc.image('public/CVG2.png', 510, yCoord - 6, { height: 50, width: 50 });
         };

         const dibujarTitulosFormulario = (yCoord) => {
            doc.fillColor(PALETTE.text).font('Helvetica-Bold').fontSize(14).text('SOLICITUD DE COMPRA Y SUMINISTROS', 165, yCoord + 16);
            doc.fontSize(8).fillColor(PALETTE.muted).font('Helvetica').text('CÓDIGO: FOR-LOG-001 | REVISIÓN: 04', 40, yCoord + 55);
         };

         const dibujarSubHeaderTabla = (yCoord) => {
            doc.rect(40, yCoord, 515, 20).fill(PALETTE.primary);
            const headers = ['#', 'DESCRIPCIÓN TÉCNICA', 'NRO. PARTE', 'CANT.', 'UNIDAD'];
            let startX = 45;
            headers.forEach((h, i) => {
               doc.fillColor(PALETTE.white).fontSize(8).font('Helvetica-Bold').text(h, startX, yCoord + 6);
               startX += i === 0 ? 30 : i === 1 ? 280 : i === 2 ? 80 : 60;
            });
         };

         // --- CONSTRUCCIÓN MAQUETA BASE ---
         dibujarCabeceraLogos(currentY);
         currentY += 60;
         dibujarTitulosFormulario(currentY);
         currentY += 55;
         
         // Indicador de control numérico correlativo
         doc.roundedRect(420, currentY, 135, 45, 8).fill(PALETTE.accent);
         doc.fillColor(PALETTE.primary).fontSize(7).font('Helvetica-Bold').text('NRO. CONTROL', 430, currentY + 10);
         doc.fontSize(14).text(`SCS-${String(id).padStart(5, '0')}`, 430, currentY + 22);
         doc.fontSize(8).fillColor(PALETTE.muted).font('Helvetica').text('Tipo de solicitud:', 40, currentY + 15);
         doc.fontSize(9).fillColor(PALETTE.primary).font('Helvetica-Bold').text(sol.tipo_solicitud, 101, currentY + 15);
         currentY += 60;

         // Bloque de identificación de metadata
         const drawField = (label, value, x, y, width) => {
            doc.fillColor(PALETTE.muted).fontSize(7).font('Helvetica-Bold').text(label, x, y);
            doc.fillColor(PALETTE.text).fontSize(9).font('Helvetica').text(value || 'N/A', x, y + 12, { width: width });
         };
         doc.rect(40, currentY, 515, 60).strokeColor(PALETTE.border).stroke();
         drawField('DEPARTAMENTO SOLICITANTE', sol.departamento.toUpperCase(), 55, currentY + 10, 200);
         drawField('FECHA DE EMISIÓN', new Date(sol.fecha_creacion).toLocaleDateString('es-VE'), 300, currentY + 10, 100);
         drawField('PRIORIDAD', (sol.prioridad || 'NORMAL').toUpperCase(), 450, currentY + 10, 80);
         drawField('SOLICITANTE', `${sol.nombres} ${sol.apellidos} (V-${sol.cedula})`, 55, currentY + 35, 250);
         drawField('ESTADO ACTUAL', sol.estado_actual.toUpperCase(), 300, currentY + 35, 200);
         currentY += 80;

         // Sección de justificación estructurada
         doc.fillColor(PALETTE.primary).fontSize(10).font('Helvetica-Bold').text('JUSTIFICACIÓN Y ALCANCE', 40, currentY);
         doc.rect(40, currentY + 15, 515, 50).fill(PALETTE.accent);
         doc.fillColor(PALETTE.text).fontSize(8).font('Helvetica').text(sol.justificacion || 'Sin justificación detallada.', 50, currentY + 23, { width: 495, align: 'justify' });
         currentY += 85;

         // Renderizado del subencabezado de la tabla
         dibujarSubHeaderTabla(currentY);
         currentY += 20;

         // Ciclo dinámico de ítems cargados
         items.forEach((item, index) => {
            if (currentY > 680) {
               doc.addPage(); 
               currentY = 20;
               dibujarCabeceraLogos(currentY);
               currentY += 60;
               dibujarTitulosFormulario(currentY);
               currentY += 75;
               dibujarSubHeaderTabla(currentY);
               currentY += 20;
            }
            const isEven = index % 2 === 0;
            if (isEven) doc.rect(40, currentY, 515, 20).fill('#f1f5f9');

            doc.fillColor(PALETTE.text).fontSize(8).font('Helvetica');
            doc.text(index + 1, 45, currentY + 6);
            doc.text(item.descripcion, 75, currentY + 6, { width: 270, height: 10, ellipsis: true });
            doc.text(item.nro_parte || 'S/C', 355, currentY + 6);
            doc.text(item.cantidad, 435, currentY + 6);
            doc.text(item.unidad || 'UND', 495, currentY + 6);
            currentY += 20; 
         });

         // Cuadro inferior reglamentario de firmas
         if (currentY > 640) {
            doc.addPage(); currentY = 20; dibujarCabeceraLogos(currentY); dibujarTitulosFormulario(currentY); currentY += 90;
         } else {
            currentY = Math.max(currentY + 30, 580);
         }
         const SIGNATURE_BOX_HEIGHT = 80;
         doc.rect(40, currentY, 515, SIGNATURE_BOX_HEIGHT).strokeColor(PALETTE.border).stroke();

         const drawSignature = (title, x) => {
            doc.moveTo(x, currentY + 50).lineTo(x + 140, currentY + 50).strokeColor(PALETTE.muted).stroke();
            doc.fillColor(PALETTE.primary).fontSize(7).font('Helvetica-Bold').text(title, x, currentY + 55, { width: 140, align: 'center' });
            doc.fillColor(PALETTE.muted).fontSize(6).font('Helvetica').text('FIRMA Y SELLO', x, currentY + 65, { width: 140, align: 'center' });
         };
         drawSignature('SOLICITANTE', 60);
         drawSignature('GERENTE DE ÁREA', 227);
         drawSignature('RECEPCIÓN PROCURA', 395);

         // Estampado de cintillo inferior institucional
         const totalPages = doc.bufferedPageRange().count;
         for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);
            doc.image('public/footer.png', 0, 705, { width: 595.28, height: 140 });
         }

         // Interceptor del fin del flujo de PDFKit
         doc.on('end', async () => {
            try {
               // 1. Inicializamos el buffer dinámico con el resultado maestro de PDFKit
               let pdfBufferActual = Buffer.concat(fragments);

               // ====================================================================
               // FASE B: PROCESAR BLOQUE DE JUSTIFICACIÓN Y ALCANCE
               // ====================================================================
               const rutaPdfJustificacion = `Backend/uploads/solicitudes/${sol.justificacion_pdf_url}`;

               if (sol.tiene_justificacion_pdf === 1 && fs.existsSync(rutaPdfJustificacion)) {
                  console.log('Acoplando archivo PDF físico de Justificación...');
                  pdfBufferActual = await adjuntarAnexosConEstilo(pdfBufferActual, rutaPdfJustificacion, 'Justificación y Alcance');
               } else {
                  console.log('No se detectó PDF de justificación. Generando desde campo de texto...');
                  const textoJustificacion = sol.justificacion || 'No se registró justificación detallada en texto.';
                  pdfBufferActual = await generarHojaTextoAlternativo(pdfBufferActual, textoJustificacion, 'Justificación y Alcance');
               }

               // ====================================================================
               // FASE A: PROCESAR BLOQUE DE REQUERIMIENTOS TÉCNICOS
               // ====================================================================
               const rutaPdfRequerimientos = `Backend/uploads/solicitudes/${sol.requerimientos_pdf_url}`;

               if (sol.tiene_requerimientos_pdf === 1 && fs.existsSync(rutaPdfRequerimientos)) {
                  console.log('Acoplando archivo PDF físico de Requerimientos...');
                  pdfBufferActual = await adjuntarAnexosConEstilo(pdfBufferActual, rutaPdfRequerimientos, 'Especificaciones Técnicas');
               } else {
                  console.log('No se detectó PDF de requerimientos. Generando desde campo de texto...');
                  const textoRequerimientos = sol.requerimientos_texto || 'No se registraron especificaciones técnicas en texto.';
                  pdfBufferActual = await generarHojaTextoAlternativo(pdfBufferActual, textoRequerimientos, 'Requerimientos Técnicos');
               }

               resolve(pdfBufferActual);
            } catch (err) {
               console.error('Error crítico procesando la fase final del PDF:', err);
               reject(err);
            }
         });

         // Cerramos de forma definitiva el documento maestro
         doc.end();

      } catch (error) {
         console.error('Error crítico general:', error);
         reject(error);
      }
   });
};

export const generarPDF = async (req, res, id) => {
   try {
      const buffer = await generarPDFBuffer(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=SCS-${id}.pdf`);
      return res.send(Buffer.from(buffer));
   } catch (error) {
      console.error('Error crítico general:', error);
      if (!res.headersSent) {
         res.status(500).json({ error: 'Fallo al procesar documento SCS base' });
      }
   }
};

const generarHojaTextoAlternativo = async (baseBuffer, textoAlternativo, titulo) => {
   // 1. Cargamos el PDF maestro construido por PDFKit
   const pdfDestino = await PDFLibDocument.load(baseBuffer);
   
   // 2. Creamos una hoja limpia A4 (595.28 x 841.89) para las especificaciones en texto
   const nuevaHoja = pdfDestino.addPage([595.28, 841.89]);
   const anchoHoja = 595.28;

   // 3. Carga binaria e inserción de recursos gráficos corporativos
   const logoDesarrolloBytes = fs.readFileSync('public/desarrollo.png');
   const logoCvgBytes = fs.readFileSync('public/cvg.png');
   const logoCvg2Bytes = fs.readFileSync('public/CVG2.png');
   const bannerFooterBytes = fs.readFileSync('public/footer.png');

   const imgDesarrollo = await pdfDestino.embedPng(logoDesarrolloBytes);
   const imgCvg = await pdfDestino.embedPng(logoCvgBytes);
   const imgCvg2 = await pdfDestino.embedPng(logoCvg2Bytes);
   const imgFooter = await pdfDestino.embedPng(bannerFooterBytes);
   
   const fuenteHelvetica = await pdfDestino.embedFont(StandardFonts.Helvetica);
   const fuenteHelveticaBold = await pdfDestino.embedFont(StandardFonts.HelveticaBold);

   // ====================================================================
   // ENMARCADO E IDENTIDAD CORPORATIVA SUPERIOR (Cabecera limpia)
   // ====================================================================
   nuevaHoja.drawImage(imgDesarrollo, { x: 40, y: 782, height: 40, width: 290 });
   nuevaHoja.drawImage(imgCvg, { x: 450, y: 773, width: 50, height: 50 });
   nuevaHoja.drawImage(imgCvg2, { x: 510, y: 776, height: 50, width: 50 });
   
   nuevaHoja.drawLine({
      start: { x: 509, y: 822 },
      end: { x: 509, y: 787 },
      thickness: 0.5,
      color: rgb(0.11, 0.22, 0.42)
   });

   // ====================================================================
   // CÁLCULO DE CENTRADO DINÁMICO PARA EL TÍTULO
   // ====================================================================
   const tamanoTitulo = 14;
   // Medimos de forma estricta cuánto espacio ocupa el texto enviado por parámetro
   const anchoTextoTitulo = fuenteHelveticaBold.widthOfTextAtSize(titulo, tamanoTitulo);
   // Fórmula de alineación central equilibrada
   const tituloX = (anchoHoja - anchoTextoTitulo) / 2;

   // Título en NEGRITA centrado dinámicamente
   nuevaHoja.drawText(titulo, {
      x: tituloX, // <-- Usamos la variable calculada
      y: 750, 
      size: tamanoTitulo, 
      font: fuenteHelveticaBold, 
      color: rgb(0.1, 0.1, 0.1)
   });

   nuevaHoja.drawText('CÓDIGO: FOR-LOG-001 | REVISIÓN: 04', {
      x: 40, y: 720, size: 8, font: fuenteHelvetica, color: rgb(0.4, 0.4, 0.4)
   });

   // ====================================================================
   // RENDERIZADO DEL TEXTO CON AJUSTE DE LÍNEA AUTOMÁTICO (Word Wrap)
   // ====================================================================
   const textoAProcesar = textoAlternativo || 'No se adjuntaron especificaciones técnicas en texto para esta solicitud.';
   
   // Definimos márgenes internos de lectura para el texto (Margen izquierdo de 40)
   let inicioX = 40;
   let inicioY = 670; // Empezamos debajo de la línea de revisión
   const interlineado = 14;
   const tamanoFuente = 10;
   const anchoMaximoTexto = 515; // 595 - 40 (izq) - 40 (der)

   // Función auxiliar para cortar el texto en renglones sin romper palabras
   const dividirTextoEnLineas = (text, font, size, maxWidth) => {
      const palabras = text.split(' ');
      const lineas = [];
      let lineaActual = '';

      palabras.forEach((palabra) => {
         const testLinea = lineaActual + (lineaActual ? ' ' : '') + palabra;
         const anchoTest = font.widthOfTextAtSize(testLinea, size);
         
         if (anchoTest > maxWidth) {
            lineas.push(lineaActual);
            lineaActual = palabra;
         } else {
            lineaActual = testLinea;
         }
      });
      if (lineaActual) lineas.push(lineaActual);
      return lineas;
   };

   // Ejecutamos la división de párrafos y textos
   const lineasFinales = dividirTextoEnLineas(textoAProcesar, fuenteHelvetica, tamanoFuente, anchoMaximoTexto);

   // Dibujamos cada línea calculando que no pise el área del footer (Y: 140)
   lineasFinales.forEach((linea) => {
      if (inicioY > 150) { // Límite de seguridad antes del footer
         nuevaHoja.drawText(linea, {
            x: inicioX,
            y: inicioY,
            size: tamanoFuente,
            font: fuenteHelvetica,
            color: rgb(0.15, 0.15, 0.15)
         });
         inicioY -= interlineado;
      }
   });

   // ====================================================================
   // ENMARCADO E IDENTIDAD CORPORATIVA INFERIOR (Footer de barras alto 140)
   // ====================================================================
   nuevaHoja.drawImage(imgFooter, { x: 0, y: 0, width: anchoHoja, height: 140 });

   // Guardamos y devolvemos la matriz final de bytes modificada
   return await pdfDestino.save();
};

// =========================================================================
// 2. NUEVA SUBFUNCIÓN DE PROCESAMIENTO Y ENLACE DE ADJUNTOS (PDF-LIB)
// =========================================================================
const adjuntarAnexosConEstilo = async (baseBuffer, rutaAdjunto, heading = 'Documento Adjunto') => {
   try {
      const pdfDestino = await PDFLibDocument.load(baseBuffer);

      if (!fs.existsSync(rutaAdjunto)) return baseBuffer;

      const bytesAdjunto = fs.readFileSync(rutaAdjunto);
      const pdfOrigen = await PDFLibDocument.load(bytesAdjunto);

      // Recursos gráficos
      const logoDesarrolloBytes = fs.existsSync('public/desarrollo.png') ? fs.readFileSync('public/desarrollo.png') : null;
      const logoCvgBytes = fs.existsSync('public/cvg.png') ? fs.readFileSync('public/cvg.png') : null;
      const logoCvg2Bytes = fs.existsSync('public/CVG2.png') ? fs.readFileSync('public/CVG2.png') : null;
      const bannerFooterBytes = fs.existsSync('public/footer.png') ? fs.readFileSync('public/footer.png') : null;

      const imgDesarrollo = logoDesarrolloBytes ? await pdfDestino.embedPng(logoDesarrolloBytes) : null;
      const imgCvg = logoCvgBytes ? await pdfDestino.embedPng(logoCvgBytes) : null;
      const imgCvg2 = logoCvg2Bytes ? await pdfDestino.embedPng(logoCvg2Bytes) : null;
      const imgFooter = bannerFooterBytes ? await pdfDestino.embedPng(bannerFooterBytes) : null;

      const fuenteHelvetica = await pdfDestino.embedFont(StandardFonts.Helvetica);
      const fuenteHelveticaBold = await pdfDestino.embedFont(StandardFonts.HelveticaBold);

      const paginasIncrustadas = await pdfDestino.embedPages(pdfOrigen.getPages());

      paginasIncrustadas.forEach((paginaIncrustada) => {
         const nuevaHoja = pdfDestino.addPage([595.28, 841.89]);
         nuevaHoja.drawPage(paginaIncrustada, { x: 0, y: 75, width: 595.5, height: 640 });
         if (imgDesarrollo) nuevaHoja.drawImage(imgDesarrollo, { x: 40, y: 782, height: 40, width: 290 });
         if (imgCvg) nuevaHoja.drawImage(imgCvg, { x: 450, y: 773, width: 50, height: 50 });
         if (imgCvg2) nuevaHoja.drawImage(imgCvg2, { x: 510, y: 776, height: 50, width: 50 });
         nuevaHoja.drawLine({ start: { x: 509, y: 822 }, end: { x: 509, y: 787 }, thickness: 0.5, color: rgb(0.11,0.22,0.42) });
         nuevaHoja.drawText(heading, { x: 210, y: 750, size: 16, font: fuenteHelveticaBold, color: rgb(0.1,0.1,0.1) });
         nuevaHoja.drawText('CÓDIGO: FOR-LOG-001 | REVISIÓN: 04', { x: 40, y: 720, size: 8, font: fuenteHelvetica, color: rgb(0.4,0.4,0.4) });
         if (imgFooter) nuevaHoja.drawImage(imgFooter, { x: 0, y: 0, width: 595.28, height: 140 });
      });

      const pdfFinalBytes = await pdfDestino.save();
      return Buffer.from(pdfFinalBytes);

   } catch (error) {
      console.error('Error en adjuntarAnexosConEstilo:', error);
      return baseBuffer;
   }
};



const dirname = path.dirname(fileURLToPath(import.meta.url));
const W = 595.28;
const H = 841.89;
const ML = 45;
const MR = 45;
const CW = W - ML - MR;

const COLOR_PRIMARY = '#0F3B5C';
const COLOR_SECONDARY = '#2C6E9E';
const COLOR_ACCENT = '#F0F7FF';
const COLOR_TEXT = '#2D3E50';
const COLOR_TEXT_MUTED = '#6C7A89';
const COLOR_BORDER = '#E4E7EC';
const COLOR_ROW_EVEN = '#FFFFFF';
const COLOR_ROW_ODD = '#F9FBFD';
const COLOR_SUCCESS = '#2E7D32';
const COLOR_WARNING = '#ED6C02';

// --------------------------------------------------------------
// Datos de ejemplo (simulan una solicitud real)
// --------------------------------------------------------------
const solicitudEjemplo = {
   id_solicitud: 12345,
   prioridad: 'Alta',
   estado_nombre: 'Aprobado Gerencia',
   fecha_creacion: new Date('2025-02-18'),
   resumen: 'Adquisición de equipos informáticos para la oficina central',
   justificacion: 'Se requiere actualizar el parque tecnológico debido al aumento de personal y la necesidad de mayor rendimiento en procesos administrativos. Los equipos actuales tienen más de 5 años y generan retrasos.',
   nombre_completo: 'María Fernanda López',
   cedula: 'V-12.345.678',
   nombre_gerencia: 'Tecnología de la Información',
   cargo_solicitante: 'Coordinadora de Infraestructura TI',
   aprobador: 'Leda Judith González',
   cargo_aprobador: 'Gerente de Relaciones Interinstitucionales'
};

const detallesEjemplo = [
   { nombre_item: 'Laptop Empresarial 14"', codigo_item: 'NB-HP-14G9', cantidad: 5, unidad_abreviatura: 'UND' },
   { nombre_item: 'Monitor 24" Full HD', codigo_item: 'MON-LG-24MK', cantidad: 5, unidad_abreviatura: 'UND' },
   { nombre_item: 'Teclado y Mouse inalámbrico', codigo_item: 'KM-LOGI-MK235', cantidad: 5, unidad_abreviatura: 'KIT' },
   { nombre_item: 'Silla ergonómica ejecutiva', codigo_item: 'SILL-ERGO-01', cantidad: 3, unidad_abreviatura: 'UND' },
   { nombre_item: 'Licencia Microsoft 365 Business', codigo_item: 'LIC-MS365-5U', cantidad: 5, unidad_abreviatura: 'LIC' }
];

// --------------------------------------------------------------
// Funciones de dibujo (adaptadas de tu código original)
// --------------------------------------------------------------
function drawEnhancedHeader(doc, titulo, subtitulo, fecha, logoIzqPath, logoDerPath) {
   const top = 25;
   const headerHeight = 90;
   doc.roundedRect(ML, top, CW, headerHeight, 8)
      .strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();

   const leftLogoX = ML;
   const leftLogoW = 90;
   doc.roundedRect(leftLogoX, top, leftLogoW, headerHeight, 8)
      .strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();
   if (fs.existsSync(logoIzqPath)) {
      const imgWidth = 70, imgHeight = 60;
      const imgX = leftLogoX + (leftLogoW - imgWidth) / 2;
      const imgY = top + (headerHeight - imgHeight) / 2;
      doc.image(logoIzqPath, imgX, imgY, { width: imgWidth, height: imgHeight });
   } else {
      doc.fontSize(8).fillColor(COLOR_TEXT_MUTED).text('LOGO', leftLogoX + leftLogoW / 2, top + headerHeight / 2, { align: 'center' });
   }

   const centerX = leftLogoX + leftLogoW;
   const centerW = CW - 180;
   doc.roundedRect(centerX, top, centerW, headerHeight, 8)
      .strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();
   doc.fontSize(14).font('Helvetica-Bold').fillColor(COLOR_PRIMARY)
      .text(titulo.toUpperCase(), centerX + 5, top + 28, { width: centerW - 10, align: 'center' });
   if (subtitulo) {
      doc.fontSize(8).font('Helvetica').fillColor(COLOR_TEXT_MUTED)
         .text(subtitulo, centerX + 5, top + 54, { width: centerW - 10, align: 'center' });
   }

   const rightLogoX = centerX + centerW;
   const rightLogoW = 90;
   doc.roundedRect(rightLogoX, top, rightLogoW, headerHeight, 8)
      .strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();
   if (fs.existsSync(logoDerPath)) {
      const imgWidth = 70, imgHeight = 40;
      const imgX = rightLogoX + (rightLogoW - imgWidth) / 2;
      const imgY = top + 15;
      doc.image(logoDerPath, imgX, imgY, { width: imgWidth, height: imgHeight });
   } else {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR_SECONDARY)
         .text('Cabelum', rightLogoX + rightLogoW / 2, top + 28, { align: 'center' });
   }
   doc.fontSize(7).font('Helvetica').fillColor(COLOR_TEXT_MUTED)
      .text(fecha, rightLogoX + 5, top + 62, { width: rightLogoW - 10, align: 'center' });
}

function drawInfoCards(doc, sol, startY) {
   const cardHeight = 70;
   const gap = 15;
   const cardWidth = (CW - gap * 3) / 4;
   let y = startY;
   let x = ML;
   const cards = [
      { label: 'Solicitud', value: sol.codigo_solicitud || `#${sol.id_solicitud}` },
      { label: 'Prioridad', value: sol.prioridad || 'Media', colorBadge: true },
      { label: 'Estado', value: sol.estado_nombre || 'Pendiente', colorBadge: true },
      { label: 'Fecha', value: new Date(sol.fecha_creacion).toLocaleDateString('es-VE') }
   ];
   for (let i = 0; i < cards.length; i++) {
      doc.roundedRect(x, y, cardWidth, cardHeight, 6)
         .fillColor('#FFFFFF').fill()
         .strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
      doc.fontSize(7).font('Helvetica-Bold').fillColor(COLOR_TEXT_MUTED)
         .text(cards[i].label, x + 12, y + 12);
      let value = cards[i].value;
      let textColor = COLOR_TEXT;
      if (cards[i].colorBadge) {
         if (value === 'Alta') textColor = COLOR_WARNING;
         else if (value === 'Aprobado Gerencia') textColor = COLOR_SUCCESS;
      }
      doc.fontSize(12).font('Helvetica-Bold').fillColor(textColor)
         .text(value, x + 12, y + 32);
      x += cardWidth + gap;
      if ((i + 1) % 4 === 0) { x = ML; y += cardHeight + 15; }
   }
   return y;
}

function drawModernItemsTable(doc, detalles, startY) {
   const cols = [40, 210, 80, 65, 70];
   const heads = ['#', 'Descripción', 'Código', 'Cantidad', 'Unidad'];
   const rowH = 28;
   let y = startY;
   let tableX = ML;
   const tableW = CW;
   doc.roundedRect(tableX, y, tableW, rowH, 4)
      .fillColor(COLOR_ACCENT).fill()
      .rect(tableX, y, tableW, rowH)
      .strokeColor(COLOR_BORDER).lineWidth(0.6).stroke();
   let hx = tableX;
   for (let i = 0; i < heads.length; i++) {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLOR_PRIMARY)
         .text(heads[i], hx + 6, y + 9, { width: cols[i] - 12, align: i === 1 ? 'left' : 'center' });
      hx += cols[i];
   }
   y += rowH;
   detalles.forEach((item, idx) => {
      if (y > H - 120) return;
      const bgColor = idx % 2 === 0 ? COLOR_ROW_EVEN : COLOR_ROW_ODD;
      let vx = tableX;
      doc.roundedRect(vx, y, tableW, rowH, 4)
         .fillColor(bgColor).fill()
         .rect(vx, y, tableW, rowH)
         .strokeColor(COLOR_BORDER).lineWidth(0.4).stroke();
      const vals = [
         String(idx + 1),
         item.nombre_item || '—',
         item.codigo_item || '—',
         String(item.cantidad || 1),
         item.unidad_abreviatura || 'UND'
      ];
      for (let i = 0; i < vals.length; i++) {
         doc.fontSize(8).font('Helvetica').fillColor(COLOR_TEXT)
            .text(vals[i], vx + 6, y + 9, { width: cols[i] - 12, align: i === 1 ? 'left' : 'center', lineBreak: false });
         vx += cols[i];
      }
      y += rowH;
   });
   if (detalles.length) {
      doc.fontSize(7).font('Helvetica-Oblique').fillColor(COLOR_TEXT_MUTED)
         .text('* Los ítems mostrados corresponden a la solicitud actual.', ML, y + 10);
      y += 20;
   }
   return y;
}

function drawTechnicalSpecsPage(doc, sol, detalles) {
   doc.addPage();
   doc.moveTo(ML, 40).lineTo(W - MR, 40).strokeColor(COLOR_PRIMARY).lineWidth(0.8).stroke();
   doc.fontSize(22).font('Helvetica-Bold').fillColor(COLOR_PRIMARY)
      .text('Especificaciones Técnicas', 0, 55, { align: 'center' });
   doc.fontSize(10).font('Helvetica').fillColor(COLOR_TEXT_MUTED)
      .text(sol.resumen || 'Detalle de la solicitud', 0, 85, { align: 'center' });
   doc.moveTo(ML, 100).lineTo(W - MR, 100).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();

   const infoY = 120;
   const leftCol = ML;
   const rightCol = W / 2 + 20;
   doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text('SOLICITANTE:', leftCol, infoY);
   doc.font('Helvetica').fillColor(COLOR_TEXT).text(sol.nombre_completo, leftCol, infoY + 16);
   doc.fontSize(8).fillColor(COLOR_TEXT_MUTED)
      .text(`Cédula: ${sol.cedula}`, leftCol, infoY + 32)
      .text(`Gerencia: ${sol.nombre_gerencia}`, leftCol, infoY + 48);
   doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text('DESTINATARIO:', rightCol, infoY);
   doc.font('Helvetica').fillColor(COLOR_TEXT).text('GCIA DE PROCURA', rightCol, infoY + 16);
   doc.fontSize(8).fillColor(COLOR_TEXT_MUTED).text('Para atención de compras y contrataciones', rightCol, infoY + 32);

   const justY = infoY + 90;
   doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text('Justificación:', ML, justY);
   doc.font('Helvetica').fillColor(COLOR_TEXT)
      .text(sol.justificacion, ML, justY + 18, { width: CW, align: 'justify', lineGap: 4, indent: 12 });

   let tableY = justY + 80;
   if (detalles && detalles.length) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text('Ítems solicitados:', ML, tableY);
      tableY += 20;
      tableY = drawModernItemsTable(doc, detalles, tableY);
   }

   const signaturesY = Math.max(tableY + 40, 620);
   doc.roundedRect(ML, signaturesY, CW, 130, 8).strokeColor(COLOR_BORDER).lineWidth(0.8).stroke();
   const leftSigX = ML + 25, rightSigX = W / 2 + 20;
   doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text('ELABORADO POR:', leftSigX, signaturesY + 20);
   doc.font('Helvetica').fillColor(COLOR_TEXT).text(sol.nombre_completo, leftSigX, signaturesY + 38);
   doc.fontSize(8).fillColor(COLOR_TEXT_MUTED).text(`Cargo: ${sol.cargo_solicitante}`, leftSigX, signaturesY + 54);
   doc.moveTo(leftSigX, signaturesY + 85).lineTo(leftSigX + 180, signaturesY + 85).stroke();
   doc.fontSize(7).fillColor(COLOR_TEXT_MUTED).text('Firma', leftSigX, signaturesY + 92)
      .text(`Fecha: ${new Date().toLocaleDateString('es-VE')}`, leftSigX + 100, signaturesY + 92);

   doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text('APROBADO POR:', rightSigX, signaturesY + 20);
   doc.font('Helvetica').fillColor(COLOR_TEXT).text(sol.aprobador, rightSigX, signaturesY + 38);
   doc.fontSize(8).fillColor(COLOR_TEXT_MUTED).text(`Cargo: ${sol.cargo_aprobador}`, rightSigX, signaturesY + 54);
   doc.moveTo(rightSigX, signaturesY + 85).lineTo(rightSigX + 180, signaturesY + 85).stroke();
   doc.fontSize(7).fillColor(COLOR_TEXT_MUTED).text('Firma', rightSigX, signaturesY + 92)
      .text(`Fecha: ${new Date().toLocaleDateString('es-VE')}`, rightSigX + 100, signaturesY + 92);
}

async function pdfkitToBuffer(doc) {
   return new Promise((resolve, reject) => {
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
   });
}

// --------------------------------------------------------------
// Función principal que genera el PDF de ejemplo
// --------------------------------------------------------------
// Versión que retorna el Buffer (no guarda en disco)
export async function generarPlanillaPDF() {
   const fechaStr = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
   const logoIzqPath = path.join(dirname, 'assets', 'images', 'logo_izquierda.png');
   const logoDerPath = path.join(dirname, 'assets', 'images', 'logo_derecha.png');

   const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });

   // Página 1 - Portada
   doc.addPage();
   drawEnhancedHeader(doc, 'JUSTIFICACIÓN DE PEDIDO', solicitudEjemplo.resumen, fechaStr, logoIzqPath, logoDerPath);
   let currentY = 140;
   currentY = drawInfoCards(doc, solicitudEjemplo, currentY);
   doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text('Resumen de la solicitud', ML, currentY + 15);
   doc.fontSize(9).font('Helvetica').fillColor(COLOR_TEXT).text(solicitudEjemplo.resumen, ML, currentY + 35, { width: CW, align: 'justify' });
   doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text('Justificación', ML, currentY + 85);
   doc.fontSize(9).font('Helvetica').fillColor(COLOR_TEXT).text(solicitudEjemplo.justificacion, ML, currentY + 105, { width: CW, align: 'justify' });

   // Página 2 - Detalle
   doc.addPage();
   drawEnhancedHeader(doc, 'DETALLE DE LA SOLICITUD', 'Lista de productos y/o servicios solicitados', fechaStr, logoIzqPath, logoDerPath);
   drawModernItemsTable(doc, detallesEjemplo, 140);

   // Página 3 - Especificaciones
   drawTechnicalSpecsPage(doc, solicitudEjemplo, detallesEjemplo);

   const pdfkitBuffer = await pdfkitToBuffer(doc);
   const mainDoc = await PDFLibDocument.load(pdfkitBuffer);
   const helv = await mainDoc.embedFont(StandardFonts.Helvetica);
   const pages = mainDoc.getPages();

   for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const fy = 35;
      page.drawText(`Elaborado por: ${solicitudEjemplo.nombre_completo}`, {
         x: ML, y: fy, size: 7, font: helv, color: rgb(0.47, 0.52, 0.60)
      });
      page.drawText(`Página ${i + 1} de ${pages.length}`, {
         x: width - MR - 50, y: fy, size: 7, font: helv, color: rgb(0.47, 0.52, 0.60)
      });
      page.drawLine({
         start: { x: ML, y: fy + 12 }, end: { x: width - MR, y: fy + 12 },
         thickness: 0.3, color: rgb(0.8, 0.82, 0.85)
      });
   }

   const finalBuffer = Buffer.from(await mainDoc.save());
   return finalBuffer;  // ← retorna el buffer, no guarda archivo
}

