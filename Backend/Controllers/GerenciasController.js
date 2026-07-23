/**
 * GerenciasController.js
 * Obtiene gerencias con cálculo de presupuesto, saldo y notificaciones automáticas.
 */

import pool from '../DataBase/Mysql/ConexionSQL.js';
import { gerenciassqladmin, gerenciassqluser } from '../DataBase/Mysql/SQL.js';

// GET /gerencias
export const getGerencias = async (req, res) => {
    try {
        const page   = parseInt(req.query.page)  || 1;
        const limit  = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const isAdmin = req.session.rol === 1 || req.session.rol === 5;
        const sql     = isAdmin ? gerenciassqladmin : gerenciassqluser;
        const values  = isAdmin ? [] : [req.session.userId];

        // Total de registros
        const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM (${sql}) as subquery`, values);
        const totalRows = countResult[0].total;

        // Página actual
        const [gerencias] = await pool.query(`${sql} LIMIT ? OFFSET ?`, [...values, limit, offset]);

        // ── Notificaciones de presupuesto crítico ────────────────────────────
        for (const g of gerencias) {
            const presupuesto = Number(g.presupuesto_asignado) || 0;
            const restante    = Number(g.saldo_disponible)     || 0;
            const porcentaje  = presupuesto > 0 ? (restante / presupuesto) * 100 : 100;

            if (porcentaje <= 20 && presupuesto > 0) {
                const [existing] = await pool.query(
                    'SELECT id_not_soli FROM notificaciones_not_solisitud WHERE id_gerencia = ? AND status = "warning" LIMIT 1',
                    [g.id_gerencia]
                );
                if (existing.length === 0) {
                    const contenido = `ALERTA: Presupuesto crítico (${porcentaje.toFixed(1)}%). Disponible: $${restante.toLocaleString('es-VE')}`;
                    await pool.query(
                        'INSERT INTO notificaciones_not_solisitud (id_gerencia, contenido, status) VALUES (?, ?, ?)',
                        [g.id_gerencia, contenido, 'warning']
                    );
                }
            } else {
                // Si el presupuesto se recuperó, eliminamos la alerta
                await pool.query(
                    'DELETE FROM notificaciones_not_solisitud WHERE id_gerencia = ? AND status = "warning"',
                    [g.id_gerencia]
                );
            }
        }

        res.status(200).json({
            gerencias,
            total:       totalRows,
            totalPages:  Math.ceil(totalRows / limit),
            currentPage: page
        });
    } catch (e) {
        console.error('Error en el módulo de gerencias:', e);
        res.status(500).json({ error: 'Error al procesar presupuestos' });
    }
};
