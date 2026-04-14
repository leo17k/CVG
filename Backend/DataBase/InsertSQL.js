
import pool from "./ConexionSQL.js";
import bcrypt from 'bcrypt'

import { insetarSolicitud } from "./SQL.js";

async function insetSolicitud({ titulo, justificacion, monto, id_usuario }) {

    if (!titulo || !justificacion || !monto || !id_usuario) {
        const datos = { titulo, justificacion, monto, id_usuario };
        const datosFaltantes = [];


        Object.entries(datos).forEach(([nombreCampo, valor]) => {
            if (!valor) {
                datosFaltantes.push(nombreCampo);
            }
        });

        return {
            codigo: 400,
            mensaje: "Faltan datos obligatorios",
            campos: datosFaltantes
    };
    }
    const values = [titulo, justificacion, monto, id_usuario];

    try {
    const [result] = await pool.execute(insetarSolicitud, values);
        return {
            codigo: 201,
            mensaje: "Solicitud creada con éxito",
            id: result.insertId
        };
    } catch (error) {
        console.error("Error en la base de datos:", error);
        return {
            codigo:500,
            mensaje: "Error interno del servidor",
            error: error.message
        };
    }


}


export {insetSolicitud}