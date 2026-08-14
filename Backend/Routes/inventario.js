import express from 'express';
import * as InventarioController from '../Controllers/InventarioController.js';

const router = express.Router();

router.get('/categorias', InventarioController.getCategorias);
router.post('/categorias', InventarioController.createCategoria);
router.get('/unidades', InventarioController.getUnidades);

router.get('/productos', InventarioController.getProductos);
router.post('/productos', InventarioController.createProducto);
router.put('/productos/:id', InventarioController.updateProducto);

router.get('/movimientos', InventarioController.getMovimientos);
router.post('/movimientos', InventarioController.createMovimiento);

router.get('/Servicios', InventarioController.getServicios);
router.post('/Servicios', InventarioController.createServicio);
router.put('/Servicios/:id', InventarioController.updateServicio);

export default router;
