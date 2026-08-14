import { connection, statusconnection } from "../Acces/ConexionACCES.js";
import pool, { statusconnectionsql } from "../Mysql/ConexionSQL.js";

async function verificarconexiones() {
    const isAccessOk = await statusconnection();
    return (isAccessOk === true && statusconnectionsql === true);
}

async function Esnecesariomigrar() {
    try {
        // 1. Contar en Access
        // node-adodb devuelve un array, tomamos el primer elemento
        const resAccess = await connection.query('SELECT COUNT(*) AS total FROM InventarioRepuestos');
        const totalAccess = resAccess[0].total;

        // 2. Contar en MySQL
        const [resMysql] = await pool.query('SELECT COUNT(*) AS total FROM productos_almacen');
        const totalMysql = resMysql[0].total;

        console.log(`📊 Conteo actual -> Access: ${totalAccess} | MySQL: ${totalMysql}`);

        // 3. Retornar true si las cantidades son distintas
        return totalAccess !== totalMysql;

    } catch (error) {
        console.error("Error al comparar cantidades:", error);
        return false; // Por seguridad, si falla el conteo, no migramos
    }
}

async function Migracion() {
    const conexionesListas = await verificarconexiones();

    if (!conexionesListas) {
        console.error("❌ Abortando: Bases de datos no disponibles.");
        return;
    }

    const necesitaMigrar = await Esnecesariomigrar();

    if (!necesitaMigrar) {
        console.log("✅ Las bases de datos ya están sincronizadas.");
        return;
    }

    console.log("🚀 Iniciando migración de datos...");

    try {
        // 1. Obtenemos los datos completos de Access para no perder la relación
        const rows = await connection.query('SELECT codigo_tipo, Descripcion_tipo FROM tipoRepuesto');

        // 2. IMPORTANTE: Para relacionar tablas, lo más seguro es iterar
        // o usar una lógica de inserción uno a uno si necesitas el ID generado.

        for (const row of rows) {
            // A. Insertamos la Gerencia
            const [resGerencia] = await pool.query(
                'INSERT INTO categorias (codigo, nombre_categoria) VALUES (?,?)',
                [row.codigo_tipo, row.Descripcion_tipo]
            );

            // const nuevoIdGerencia = resGerencia.insertId;

            // // B. Insertamos el Centro de Costo usando el ID que acabamos de obtener
            // await pool.query(
            //     'INSERT INTO centro_costo (codigo_centro, id_gerencia) VALUES (?, ?)',
            //     [row.codigo_CC, nuevoIdGerencia]
            // );
        }

        console.log(`✅ Migración completada: ${rows.length} registros procesados.`);

    } catch (error) {
        console.error("❌ Error durante la migración:", error);
    }
}

async function Migracionuni() {
    const conexionesListas = await verificarconexiones();

    if (!conexionesListas) {
        console.error("❌ Abortando: Bases de datos no disponibles.");
        return;
    }

    const necesitaMigrar = await Esnecesariomigrar();


    console.log("🚀 Iniciando migración de datos...");

    try {
        // 1. Obtenemos los datos completos de Access para no perder la relación
        const rows = await connection.query('SELECT unidad, descu FROM unidades');

        // 2. IMPORTANTE: Para relacionar tablas, lo más seguro es iterar
        // o usar una lógica de inserción uno a uno si necesitas el ID generado.

        for (const row of rows) {
            if (row.unidad === null || row.descu === null) {
                continue;
            } else {
                const [resGerencia] = await pool.query(
                    'INSERT INTO unidades_medida (id_unidad, nombre_unidad) VALUES (?,?)',
                    [row.unidad, row.descu]
                );


            }

        }
        console.log(`✅ Migración completada: ${rows.length} registros procesados.`);

    } catch (error) {
        console.error("❌ Error durante la migración:", error);
    }
}
async function sincronizarCategoriasDesdeAccess(connectionMysql) {
    const rows = await connection.query('SELECT codigo_tipo, Descripcion_tipo FROM tipoRepuesto');

    if (!rows || rows.length === 0) {
        console.log('⚠️ No hay categorías en Access para sincronizar.');
        return { insertadas: 0 };
    }

    const valores = rows
        .filter(row => row && String(row.codigo_tipo ?? '').trim() !== '')
        .map(row => [
            String(row.codigo_tipo).trim(),
            String(row.Descripcion_tipo || 'SIN DESCRIPCION').trim().slice(0, 100)
        ]);

    if (valores.length === 0) {
        return { insertadas: 0 };
    }

    const [resultado] = await connectionMysql.query(
        `INSERT INTO categorias (codigo, nombre_categoria)
         VALUES ?
         ON DUPLICATE KEY UPDATE nombre_categoria = VALUES(nombre_categoria)`,
        [valores]
    );

    console.log(`✅ Categorías sincronizadas desde Access. Filas procesadas: ${resultado.affectedRows}`);
    return { insertadas: resultado.affectedRows };
}

async function Migraciondeproductos_almacen_lote(codigosFiltrados = null, connectionMysql) {
    const [categoriasSql] = await connectionMysql.query('SELECT id_categoria, codigo FROM categorias');
    const mapaCategorias = new Map(
        categoriasSql.map(cat => [String(cat.codigo).trim(), cat.id_categoria])
    );

    const queryAccess = 'SELECT descripcion_repuesto, cod_repuesto, cod_tipo, cant_minima FROM InventarioRepuestos';
    const rows = await connection.query(queryAccess);

    let rowsToProcess = rows;
    if (codigosFiltrados && Array.isArray(codigosFiltrados)) {
        const setFiltros = new Set(codigosFiltrados.map(c => String(c).trim()));
        rowsToProcess = rows.filter(row => setFiltros.has(String(row.cod_repuesto || '').trim()));
    }

    console.log(`🚀 Preparando inserción masiva de ${rowsToProcess.length} registros en productos_almacen...`);

    await connectionMysql.beginTransaction();
    try {
        const batchSize = 500;
        let insertados = 0;
        let saltados = 0;

        for (let i = 0; i < rowsToProcess.length; i += batchSize) {
            const lote = rowsToProcess.slice(i, i + batchSize);

            const valoresLote = lote.map(row => {
                const buscar = String(row.cod_tipo || '').trim();
                const idRealCategoria = mapaCategorias.get(buscar) || null;

                if (!idRealCategoria) {
                    saltados++;
                    return null;
                }

                return [
                    row.descripcion_repuesto || 'SIN DESCRIPCION',
                    String(row.cod_repuesto || '').trim(),
                    idRealCategoria,
                    Number(row.cant_minima) || 0,
                    0 // stock_actual inicial
                ];
            }).filter(v => v !== null);

            if (valoresLote.length > 0) {
                await connectionMysql.query(
                    'INSERT INTO productos_almacen (nombre_producto, codigo_producto, id_categoria, stock_minimo, stock_actual) VALUES ? ON DUPLICATE KEY UPDATE nombre_producto = VALUES(nombre_producto), id_categoria = VALUES(id_categoria), stock_minimo = VALUES(stock_minimo)',
                    [valoresLote]
                );
                insertados += valoresLote.length;
            }
        }

        await connectionMysql.commit();
        console.log(`✅ Lote finalizado: ${insertados} insertados/actualizados, ${saltados} saltados por falta de categoría.`);
        return { insertados, saltados };
    } catch (err) {
        await connectionMysql.rollback();
        throw err;
    }
}

async function Migraciondeproductos_almacen() {
    const conexionesListas = await verificarconexiones();
    if (!conexionesListas) return { paso: 2, descripcion: 'Productos Almacén', ok: false, error: 'Conexiones no listas' };

    const connectionMysql = await pool.getConnection();
    try {
        const res = await Migraciondeproductos_almacen_lote(null, connectionMysql);
        return { paso: 2, descripcion: 'Productos Almacén', ok: true, ...res };
    } catch (err) {
        console.error("❌ Error crítico en migración de productos:", err);
        return { paso: 2, descripcion: 'Productos Almacén', ok: false, error: err.message };
    } finally {
        connectionMysql.release();
    }
}

async function MigracionStockAlmacen_interna(connectionMysql) {
    const accessRows = await connection.query('SELECT cod_repuesto, inv_fisico FROM InventarioFisico');
    if (accessRows.length === 0) {
        console.log('⚠️ No hay registros de stock en Access para migrar.');
        return { affectedRows: 0 };
    }

    await connectionMysql.query(`
        CREATE TEMPORARY TABLE IF NOT EXISTS temp_stock_migracion (
            codigo VARCHAR(100),
            stock DECIMAL(10,2),
            INDEX (codigo)
        )
    `);
    await connectionMysql.query('TRUNCATE TABLE temp_stock_migracion');

    const batchSize = 1000;
    for (let i = 0; i < accessRows.length; i += batchSize) {
        const lote = accessRows.slice(i, i + batchSize);
        const values = lote.map(row => [
            String(row.cod_repuesto ?? '').trim(),
            Number(row.inv_fisico) || 0
        ]);

        await connectionMysql.query(
            'INSERT INTO temp_stock_migracion (codigo, stock) VALUES ?',
            [values]
        );
    }

    const [resultado] = await connectionMysql.query(`
        UPDATE productos_almacen p
        INNER JOIN temp_stock_migracion t ON p.codigo_producto = t.codigo
        SET p.stock_actual = t.stock
    `);

    await connectionMysql.query('DROP TEMPORARY TABLE IF EXISTS temp_stock_migracion');
    console.log(`📊 Stock actualizado en MySQL. Filas afectadas: ${resultado.affectedRows}`);
    return { affectedRows: resultado.affectedRows };
}

async function MigracionStockAlmacen() {
    const conexionesListas = await verificarconexiones();
    if (!conexionesListas) return { ok: false, error: 'Conexiones no listas' };

    const connectionMysql = await pool.getConnection();
    try {
        const res = await MigracionStockAlmacen_interna(connectionMysql);
        return { paso: 3, descripcion: 'Stock Almacén', ok: true, ...res };
    } catch (error) {
        console.error('❌ Error en la migración rápida de stock:', error);
        return { paso: 3, descripcion: 'Stock Almacén', ok: false, error: error.message };
    } finally {
        connectionMysql.release();
    }
}

async function limpiarDuplicadosProductos(connectionMysql) {
    try {
        await connectionMysql.query(`
            DELETE p1
            FROM productos_almacen p1
            INNER JOIN productos_almacen p2
                ON p1.codigo_producto = p2.codigo_producto
               AND p1.id_producto > p2.id_producto
            WHERE p1.codigo_producto IS NOT NULL
              AND TRIM(p1.codigo_producto) <> ''
        `);

        try {
            await connectionMysql.query(`
                ALTER TABLE productos_almacen
                ADD UNIQUE INDEX uk_productos_codigo (codigo_producto)
            `);
        } catch (err) {
            const msg = String(err.message || err);
            if (!msg.includes('Duplicate entry') && !msg.includes('already exists') && !msg.includes('1062')) {
                console.warn('[SyncCondicional] No se pudo crear el índice único de productos:', msg);
            }
        }
    } catch (err) {
        console.warn('[SyncCondicional] No se pudieron limpiar duplicados de productos:', err.message || err);
    }
}

async function syncProductosYStockCondicional() {
    const conexionesListas = await verificarconexiones();
    if (!conexionesListas) {
        console.error("❌ Abortando sincronización condicional: Bases de datos no disponibles.");
        return { success: false, reason: "Bases de datos no disponibles" };
    }

    const connectionMysql = await pool.getConnection();

    try {
        await limpiarDuplicadosProductos(connectionMysql);

        // 1. Obtener códigos de Access
        const resAccess = await connection.query('SELECT cod_repuesto FROM InventarioRepuestos');
        const codigosAccess = new Set(resAccess.map(r => String(r.cod_repuesto || '').trim()).filter(Boolean));
        const totalAccess = codigosAccess.size;

        // 2. Obtener códigos de MySQL únicos
        const [resMysql] = await connectionMysql.query('SELECT DISTINCT codigo_producto FROM productos_almacen WHERE codigo_producto IS NOT NULL AND TRIM(codigo_producto) <> ""');
        const codigosMysql = new Set(resMysql.map(r => String(r.codigo_producto || '').trim()).filter(Boolean));
        const totalMysql = codigosMysql.size;

        console.log(`[SyncCondicional] Comparando productos -> Access: ${totalAccess} | MySQL: ${totalMysql}`);

        let syncAction = '';

        // Identificar nuevos y eliminados
        const nuevosCodigos = [...codigosAccess].filter(cod => !codigosMysql.has(cod));
        const eliminadosEnAccess = [...codigosMysql].filter(cod => !codigosAccess.has(cod));

        if (nuevosCodigos.length > 0) {
            syncAction = `Importando ${nuevosCodigos.length} nuevos productos`;
            console.log(`[SyncCondicional] 🚀 Se detectaron nuevos productos en Access. Importando...`);
            await sincronizarCategoriasDesdeAccess(connectionMysql);
            await Migraciondeproductos_almacen_lote(nuevosCodigos, connectionMysql);
            await MigracionStockAlmacen_interna(connectionMysql);
        } else if (totalAccess < totalMysql || eliminadosEnAccess.length > 0) {
            syncAction = `Reescribiendo productos (menos productos en Access, eliminados: ${eliminadosEnAccess.length})`;
            console.log(`[SyncCondicional] ⚠️ Menos productos en Access (MySQL tiene ${eliminadosEnAccess.length} huérfanos). Reescribiendo...`);
            
            if (eliminadosEnAccess.length > 0) {
                const chunkSize = 500;
                for (let i = 0; i < eliminadosEnAccess.length; i += chunkSize) {
                    const chunk = eliminadosEnAccess.slice(i, i + chunkSize);
                    await connectionMysql.query(
                        'DELETE FROM productos_almacen WHERE codigo_producto IN (?)',
                        [chunk]
                    );
                }
                console.log(`[SyncCondicional] 🧹 Eliminados ${eliminadosEnAccess.length} productos sobrantes en MySQL.`);
            }
            await Migraciondeproductos_almacen_lote([...codigosAccess], connectionMysql);
            await MigracionStockAlmacen_interna(connectionMysql);
        } else {
            syncAction = 'Actualización estándar de stock';
            console.log('[SyncCondicional] 🔄 Sin cambios en catálogo. Actualizando stock de productos existentes...');
            await MigracionStockAlmacen_interna(connectionMysql);
        }

        return { success: true, action: syncAction, totalAccess, totalMysql };
    } catch (error) {
        console.error("❌ Error en la sincronización condicional:", error);
        throw error;
    } finally {
        connectionMysql.release();
    }
}

async function contardatos(tabla1, tabla2) {
    try {
        const resAccess = await connection.query(`SELECT COUNT(*) AS total FROM ${tabla1}`);
        const total = resAccess[0].total;
        console.log(`Total de registros en ${tabla1}: ${total}`);

        const [rows2] = await pool.query(`SELECT COUNT(*) as total FROM ${tabla2}`);
        const total2 = rows2[0].total;
        console.log(`Total de registros en ${tabla2}: ${total2}`);
    } catch (error) {
        console.error(`❌ Error al contar datos en ${tabla1} o ${tabla2}:`, error);
    }
}
async function MigrarUnidadesAProductos() {
    const conexionesListas = await verificarconexiones();
    if (!conexionesListas) return;

    const connectionMysql = await pool.getConnection();

    try {
        const unidadesAccessRaw = await connection.query('SELECT TOP 1 * FROM unidades');
        const unidadesAccess = Array.isArray(unidadesAccessRaw) ? unidadesAccessRaw : [];

        if (!unidadesAccess.length) {
            console.log("⚠️ No hay unidades para migrar desde Access.");
            return;
        }

        const unidadColumns = Object.keys(unidadesAccess[0] || {});
        const idUnidadColumn = unidadColumns.find(col => /id.*unidad|unidad/i.test(col)) || 'unidad';
        const nombreUnidadColumn = unidadColumns.find(col => /descu|desc|nombre.*unidad|unidad.*desc/i.test(col)) || 'descu';

        console.log(`🚀 Migrando ${unidadesAccess.length} unidades de medida a MySQL...`);

        const valoresUnidades = unidadesAccess
            .filter(u => u && String(u[idUnidadColumn] ?? '').trim() !== '')
            .map(u => {
                const idUnidad = Number(String(u[idUnidadColumn]).trim());
                const nombreUnidad = String(u[nombreUnidadColumn] ?? 'SIN DESCRIPCION').trim().slice(0, 100);
                return Number.isFinite(idUnidad) && idUnidad > 0
                    ? [idUnidad, nombreUnidad]
                    : null;
            })
            .filter(Boolean);

        if (valoresUnidades.length > 0) {
            await connectionMysql.query(
                'INSERT IGNORE INTO unidades_medida (id_unidad, nombre_unidad) VALUES ?',
                [valoresUnidades]
            );
        }

        console.log("🔄 Relacionando unidades con productos...");

        const relacionesAccess = await connection.query('SELECT cod_repuesto, Und_Med FROM InventarioRepuestos');

        const [unidadesMysql] = await connectionMysql.query('SELECT id_unidad, nombre_unidad FROM unidades_medida');
        const unidadesValidas = new Set(unidadesMysql.map(u => Number(u.id_unidad)).filter(id => Number.isFinite(id) && id > 0));
        const mapaUnidadesPorNombre = new Map(
            unidadesMysql
                .map(u => {
                    const nombre = String(u.nombre_unidad || '').trim().toLowerCase();
                    return nombre ? [nombre, Number(u.id_unidad)] : null;
                })
                .filter(Boolean)
        );

        const rowsValidos = relacionesAccess
            .filter(r => r && String(r.cod_repuesto ?? '').trim() !== '')
            .map(r => {
                const codigoProducto = String(r.cod_repuesto).trim();
                const rawUnidad = r.Und_Med;

                let idUnidad = null;
                if (rawUnidad !== null && rawUnidad !== undefined && String(rawUnidad).trim() !== '') {
                    const texto = String(rawUnidad).trim();
                    const num = Number(texto);
                    if (Number.isFinite(num) && num > 0) {
                        idUnidad = num;
                    } else {
                        idUnidad = mapaUnidadesPorNombre.get(texto.toLowerCase()) ?? null;
                    }
                }

                if (!idUnidad || !unidadesValidas.has(Number(idUnidad))) return null;
                return [codigoProducto, Number(idUnidad)];
            })
            .filter(Boolean);

        await connectionMysql.query(`
            CREATE TEMPORARY TABLE IF NOT EXISTS temp_relacion_unidades (
                cod_prod VARCHAR(100),
                cod_uni INT,
                INDEX (cod_prod)
            )
        `);
        await connectionMysql.query('TRUNCATE TABLE temp_relacion_unidades');

        if (rowsValidos.length > 0) {
            await connectionMysql.query(
                'INSERT INTO temp_relacion_unidades (cod_prod, cod_uni) VALUES ?',
                [rowsValidos]
            );
        }

        const [resultado] = await connectionMysql.query(`
            UPDATE productos_almacen p
            INNER JOIN temp_relacion_unidades t ON p.codigo_producto = t.cod_prod
            SET p.id_unidad = t.cod_uni
            WHERE t.cod_uni IS NOT NULL
        `);

        console.log(`✅ Migración de unidades finalizada.`);
        console.log(`📊 Productos actualizados: ${resultado.affectedRows}`);

    } catch (error) {
        console.error("❌ Error crítico en la migración de unidades:", error);
    } finally {
        await connectionMysql.query('DROP TEMPORARY TABLE IF EXISTS temp_relacion_unidades');
        connectionMysql.release();
    }
}
export {
    MigracionStockAlmacen, MigrarUnidadesAProductos, contardatos, Migraciondeproductos_almacen, syncProductosYStockCondicional
}