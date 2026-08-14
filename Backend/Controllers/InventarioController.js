/**
 * InventarioController.js
 * Gestión de categorías, productos, movimientos y servicios.
 */

import pool from '../DataBase/Mysql/ConexionSQL.js';
import hasPermission from '../Milaware/hasPermission.js';
import { connection as connectionAccess } from '../DataBase/Acces/ConexionACCES.js';

// ── Categorías ────────────────────────────────────────────────────────────────

// GET /categorias
export const getCategorias = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categorias ORDER BY nombre_categoria ASC');
        res.json({ data: rows });
    } catch (error) {
        console.error('Error al obtener categorias:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// POST /categorias
export const createCategoria = async (req, res) => {
    if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'crear_categorias')) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    try {
        const { nombre_categoria, descripcion, codigo } = req.body;
        const [result] = await pool.query(
            'INSERT INTO categorias (nombre_categoria, descripcion, codigo) VALUES (?, ?, ?)',
            [nombre_categoria, descripcion, codigo || null]
        );
        const id_categoria = result.insertId;
        const finalCodigo = codigo || String(id_categoria).padStart(4, '0');

        if (!codigo) {
            await pool.query('UPDATE categorias SET codigo = ? WHERE id_categoria = ?', [finalCodigo, id_categoria]);
        }

        // Insertar también en Access tipoRepuesto
        try {
            await connectionAccess.execute(`
                INSERT INTO [tipoRepuesto] ([codigo_tipo], [Descripcion_tipo])
                VALUES ('${finalCodigo.slice(0, 4)}', '${nombre_categoria.replace(/'/g, "''").slice(0, 50)}')
            `);
        } catch (accessErr) {
            console.error('Error al insertar categoría en Access:', accessErr);
        }

        res.status(201).json({ message: 'Categoría creada', id: id_categoria, codigo: finalCodigo });
    } catch (error) {
        console.error('Error al crear categoria:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// ── Productos ─────────────────────────────────────────────────────────────────

// GET /productos
export const getProductos = async (req, res) => {
    try {
        const { id_categoria, search, stock_status } = req.query;
        const usePagination = req.query.page !== undefined;

        // Build dynamic WHERE clause
        const conditions = [];
        const params = [];

        if (id_categoria) {
            conditions.push('p.id_categoria = ?');
            params.push(id_categoria);
        }

        if (search && String(search).trim()) {
            conditions.push('(p.nombre_producto LIKE ? OR p.codigo_producto LIKE ?)');
            params.push(`%${String(search).trim()}%`, `%${String(search).trim()}%`);
        }

        if (stock_status === 'critico') {
            conditions.push('p.stock_actual <= p.stock_minimo');
        } else if (stock_status === 'aceptable') {
            conditions.push('p.stock_actual > p.stock_minimo');
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const baseSelect = `
            SELECT
                p.id_producto,
                p.codigo_producto,
                p.nombre_producto,
                p.descripcion,
                p.id_categoria,
                p.stock_actual,
                p.stock_minimo,
                p.id_unidad,
                c.nombre_categoria,
                c.codigo AS codigo_categoria
            FROM productos_almacen p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            ${whereClause}
        `;

        if (!usePagination) {
            const [rows] = await pool.query(`${baseSelect} ORDER BY p.nombre_producto ASC`, params);
            return res.status(200).json({ data: rows });
        }

        const LIMIT = Math.max(1, parseInt(req.query.limit) || 30);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const offset = (page - 1) * LIMIT;

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM productos_almacen p LEFT JOIN categorias c ON p.id_categoria = c.id_categoria ${whereClause}`,
            params
        );

        const [rows] = await pool.query(`${baseSelect} ORDER BY p.nombre_producto ASC LIMIT ? OFFSET ?`, [...params, LIMIT, offset]);

        return res.status(200).json({
            data: rows,
            total: Number(total) || 0,
            totalPages: Math.ceil((Number(total) || 0) / LIMIT),
            currentPage: page,
            limit: LIMIT
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// POST /productos
export const createProducto = async (req, res) => {
    if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'crear_productos')) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    try {
        const { codigo_producto, nombre_producto, descripcion, id_categoria, stock_minimo, stock_actual } = req.body;
        const [result] = await pool.query(`
            INSERT INTO productos_almacen (codigo_producto, nombre_producto, descripcion, id_categoria, stock_minimo, stock_actual)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [codigo_producto, nombre_producto, descripcion, id_categoria, stock_minimo, stock_actual]);

        // Insertar también en Access (InventarioRepuestos e InventarioFisico)
        try {
            const [catRows] = await pool.query('SELECT codigo FROM categorias WHERE id_categoria = ? LIMIT 1', [id_categoria]);
            const cod_tipo = catRows[0]?.codigo || 'CO01';

            // 1. InventarioRepuestos
            await connectionAccess.execute(`
                INSERT INTO [InventarioRepuestos] ([cod_almacen], [cod_tipo], [cod_repuesto], [descripcion_repuesto], [cant_minima])
                VALUES ('CA', '${cod_tipo.replace(/'/g, "''").slice(0, 10)}', '${codigo_producto.replace(/'/g, "''").slice(0, 5)}', '${nombre_producto.replace(/'/g, "''").slice(0, 100)}', ${Number(stock_minimo) || 0})
            `);

            // 2. InventarioFisico
            await connectionAccess.execute(`
                INSERT INTO [InventarioFisico] ([cod_almacen], [cod_tipo], [cod_repuesto], [inv_fisico], [gRUPO], [fec_fisico])
                VALUES ('CA', '${cod_tipo.replace(/'/g, "''").slice(0, 10)}', '${codigo_producto.replace(/'/g, "''").slice(0, 5)}', ${Number(stock_actual) || 0}, '2', NOW())
            `);
        } catch (accessErr) {
            console.error('Error al insertar producto en Access:', accessErr);
        }

        res.status(201).json({ message: 'Producto creado', id: result.insertId });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// PUT /productos/:id
export const updateProducto = async (req, res) => {
    if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'crear_productos')) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    try {
        const { id } = req.params;
        const { nombre_producto, descripcion, id_categoria, stock_minimo, codigo_producto } = req.body;

        if (!nombre_producto || !id_categoria) {
            return res.status(400).json({ error: 'Nombre y categoría son obligatorios.' });
        }

        const [result] = await pool.query(
            `UPDATE productos_almacen
             SET nombre_producto = ?, descripcion = ?, id_categoria = ?, stock_minimo = ?, codigo_producto = ?
             WHERE id_producto = ?`,
            [nombre_producto, descripcion || null, id_categoria, stock_minimo ?? 0, codigo_producto || null, id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado.' });

        const [[updated]] = await pool.query(
            `SELECT p.*, c.nombre_categoria, c.codigo as codigo_categoria
             FROM productos_almacen p
             LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
             WHERE p.id_producto = ?`,
            [id]
        );

        res.status(200).json({ message: 'Producto actualizado correctamente.', data: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el producto.' });
    }
};

// ── Movimientos de inventario ─────────────────────────────────────────────────

// GET /movimientos
export const getMovimientos = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.*, p.nombre_producto,
                CONCAT(u.nombres, ' ', u.apellidos) AS nombre_usuario,
                s.resumen AS resumen_solicitud
            FROM inventario_movimientos m
            LEFT JOIN productos_almacen p ON m.id_producto = p.id_producto
            LEFT JOIN usuarios          u ON m.id_usuario  = u.id_usuario
            LEFT JOIN solicitudes_compra s ON m.id_solicitud = s.id_solicitud
            ORDER BY m.fecha_movimiento DESC
        `);
        res.json({ data: rows });
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// POST /movimientos
export const createMovimiento = async (req, res) => {
    if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'crear_movimientos')) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    try {
        const { id_producto, tipo_movimiento, cantidad, motivo } = req.body;
        const id_usuario = req.session.userId;

        const [result] = await pool.query(`
            INSERT INTO inventario_movimientos (id_producto, id_usuario, tipo_movimiento, cantidad, motivo)
            VALUES (?, ?, ?, ?, ?)
        `, [id_producto, id_usuario, tipo_movimiento, cantidad, motivo]);

        if (tipo_movimiento === 'Entrada') {
            await pool.query('UPDATE productos_almacen SET stock_actual = stock_actual + ? WHERE id_producto = ?', [cantidad, id_producto]);
        } else if (tipo_movimiento === 'Salida') {
            await pool.query('UPDATE productos_almacen SET stock_actual = stock_actual - ? WHERE id_producto = ?', [cantidad, id_producto]);
        } else if (tipo_movimiento === 'Ajuste') {
            await pool.query('UPDATE productos_almacen SET stock_actual = ? WHERE id_producto = ?', [cantidad, id_producto]);
        }

        res.status(201).json({ message: 'Movimiento registrado', id: result.insertId });
    } catch (error) {
        console.error('Error al registrar movimiento:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// ── Servicios ─────────────────────────────────────────────────────────────────

// GET /Servicios
export const getServicios = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id_servicio, codigo_servicio, nombre_servicio, descripcion FROM servicios
        `);
        res.status(200).json({ data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los servicios' });
    }
};

// POST /Servicios
export const createServicio = async (req, res) => {
    try {
        const { codigo_servicio, nombre_servicio, descripcion } = req.body;
        if (!nombre_servicio) {
            return res.status(400).json({ error: 'El nombre del servicio es obligatorio' });
        }

        const nombre = String(nombre_servicio).trim();
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del servicio no puede quedar vacío.' });
        }

        let codigo = String(codigo_servicio ?? '').trim();
        if (!codigo) {
            const [rows] = await pool.query(`
                SELECT CAST(codigo_servicio AS UNSIGNED) AS ultimo
                FROM servicios
                WHERE codigo_servicio REGEXP '^[0-9]+$'
                ORDER BY CAST(codigo_servicio AS UNSIGNED) DESC
                LIMIT 1
            `);
            const ultimo = Number(rows?.[0]?.ultimo || 0);

            if (ultimo >= 9999) {
                return res.status(400).json({ error: 'Se alcanzó el máximo de 4 dígitos para el código del servicio. El código 9999 ya existe.' });
            }

            codigo = String(ultimo + 1).padStart(4, '0');
        }

        if (!/^\d{1,4}$/.test(codigo)) {
            return res.status(400).json({ error: 'El código del servicio debe tener máximo 4 dígitos numéricos.' });
        }

        const [result] = await pool.query(
            'INSERT INTO servicios (codigo_servicio, nombre_servicio, descripcion) VALUES (?, ?, ?)',
            [codigo, nombre, descripcion || null]
        );
        res.status(201).json({ message: 'Servicio creado con éxito', id: result.insertId, codigo_servicio: codigo });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El código de servicio ya existe' });
        console.error(err);
        res.status(500).json({ error: 'Error al crear el servicio' });
    }
};

// PUT /Servicios/:id
export const updateServicio = async (req, res) => {
    try {
        const { nombre_servicio, descripcion } = req.body;
        const { id } = req.params;
        const [result] = await pool.query(
            'UPDATE servicios SET nombre_servicio = ?, descripcion = ? WHERE codigo_servicio = ?',
            [nombre_servicio, descripcion, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
        res.status(200).json({ message: 'Servicio actualizado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el servicio' });
    }
};
