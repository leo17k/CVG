import pool, { getNextSolicitudCounter } from "./ConexionSQL.js";
import { insetarSolicitud, insertarDetalleSQL } from "./SQL.js";

const normalizeDetalleItem = (item = {}, tipo_solicitud = 'Compra') => {
    const normalizado = item && typeof item === 'object' ? item : {};
    const itemProducto = normalizado.id_producto ?? normalizado.producto_id ?? null;
    const itemServicio = normalizado.id_servicio ?? normalizado.servicio_id ?? null;
    const cantidad = Number(normalizado.cantidad ?? 1) || 1;
    const tipoNormalizado = String(tipo_solicitud || 'Compra').trim();

    if (['Servicio', 'Obra'].includes(tipoNormalizado)) {
        return {
            id_producto: itemProducto && Number.isFinite(Number(itemProducto)) ? Number(itemProducto) : null,
            id_servicio: itemServicio && Number.isFinite(Number(itemServicio)) ? Number(itemServicio) : (itemProducto && Number.isFinite(Number(itemProducto)) ? Number(itemProducto) : null),
            cantidad
        };
    }

    return {
        id_producto: itemProducto && Number.isFinite(Number(itemProducto)) ? Number(itemProducto) : null,
        id_servicio: itemServicio && Number.isFinite(Number(itemServicio)) ? Number(itemServicio) : null,
        cantidad
    };
};

async function findDefaultServicioObra() {
    const [rows] = await pool.query(`
        SELECT id_servicio
        FROM servicios
        WHERE LOWER(REPLACE(nombre_servicio, ' ', '')) LIKE '%obra%'
           OR LOWER(REPLACE(nombre_servicio, ' ', '')) LIKE '%serviciodeobra%'
           OR LOWER(REPLACE(codigo_servicio, ' ', '')) = '95884'
        ORDER BY id_servicio ASC
        LIMIT 1
    `);

    return rows && rows.length ? Number(rows[0].id_servicio) : null;
}

async function insetSolicitud({
    resumen,
    justificacion,
    justificacion_pdf_url = null,
    requerimientos_texto = null,
    requerimientos_pdf_url = null,
    tipo_solicitud = 'Compra',
    prioridad = 'Media',
    productos = [],       // [{ id_producto, nombre_producto, cantidad }]
    id_usuario,
    id_gerencia
}) {

    if (!resumen || !justificacion || !id_usuario) {
        const datosFaltantes = [];
        if (!resumen) datosFaltantes.push('resumen');
        if (!justificacion) datosFaltantes.push('justificacion');
        if (!id_usuario) datosFaltantes.push('id_usuario');

        return {
            codigo: 400,
            mensaje: "Faltan datos obligatorios",
            campos: datosFaltantes
        };
    }

    // Si no viene id_gerencia, la buscamos desde el usuario
    let gerencia = id_gerencia;
    if (!gerencia) {
        try {
            const [rows] = await pool.execute(
                'SELECT id_gerencia FROM usuarios WHERE id_usuario = ? LIMIT 1',
                [id_usuario]
            );
            gerencia = rows[0]?.id_gerencia || 1;
        } catch {
            gerencia = 1;
        }
    }

    const codigoRes = await getNextSolicitudCounter(tipo_solicitud);

    const values = [
        resumen,                // 1.
        justificacion,          // 2.
        justificacion_pdf_url,  // 3.
        requerimientos_texto,   // 4.
        requerimientos_pdf_url, // 5.
        tipo_solicitud,         // 6.
        codigoRes.codigo,      // 7.
        prioridad,              // 8.
        gerencia,               // 9. id_gerencia
        id_usuario              // 10. id_solicitante
    ];

    try {
        const [result] = await pool.execute(insetarSolicitud, values);
        const idSolicitud = result.insertId;

        const detallesParaInsertar = [];

        if (tipo_solicitud === 'Obra') {
            const servicioObraId = await findDefaultServicioObra();
            if (servicioObraId) {
                detallesParaInsertar.push({ id_producto: null, id_servicio: servicioObraId, cantidad: 1 });
            }
        }

        if (productos && productos.length > 0) {
            for (const p of productos) {
                const detalle = normalizeDetalleItem(p, tipo_solicitud);
                if (!detalle.id_producto && !detalle.id_servicio) continue;
                detallesParaInsertar.push(detalle);
            }
        }

        // Insertar productos/servicios en detalles_solicitud
        for (const detalle of detallesParaInsertar) {
            if (!detalle.id_producto && !detalle.id_servicio) continue;
            await pool.execute(insertarDetalleSQL, [
                idSolicitud,
                detalle.id_producto,
                detalle.id_servicio,
                detalle.cantidad
            ]);
        }

        // NOTE: Chat creation is deferred until a user explicitly sends a message

        await pool.execute(
            `UPDATE solicitudes_compra SET codigo_solicitud = ? WHERE id_solicitud = ?`,
            [codigoRes.codigo, idSolicitud]
        );

        return {
            codigo: 201,
            mensaje: "Solicitud creada con éxito",
            id: idSolicitud,
            codigo_solicitud: codigoRes.codigo
        };
    } catch (error) {
        console.error("Error en la base de datos:", error);
        return {
            codigo: 500,
            mensaje: "Error interno del servidor",
            error: error.message
        };
    }
}

export { insetSolicitud }