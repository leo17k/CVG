---
name: proyecto-svg-instructions
description: "Instrucciones globales para el agente en el proyecto Proyecto-SVG. Aplican al desarrollo frontend (React), Backend (Node/Express) y migraciones SQL. Use cuando se editen `src/**` o `Backend/**`."
applyTo:
  - "src/**"
  - "Backend/**"
author: Cesar
version: "1.0"
---

**Objetivo**
- Proveer reglas y patrones persistentes que el agente debe seguir al editar este repositorio.

**Alcance**
- Workspace-level: aplican a todo el proyecto (carpetas `src/` y `Backend/`).

**Reglas clave (resumidas)**
- Permisos en backend: usar un enfoque basado en permisos, no en números de rol. Preferir una función `hasPermission(userId, 'nombre_permiso')` y verificarla en rutas antes de permitir acciones (ej.: `'crear_productos'`, `'crear_categorias'`, `'crear_movimientos'`).
- Tablas y nombres: para inventario usar la tabla `productos_almacen`. No crear joins obligatorios con `gerencias` para productos (la relación fue eliminada).
- Precio unitario: actualmente no se maneja `precio_unitario`. No agregar lógica relacionada salvo que la columna sea añadida a la BD y el equipo lo solicite explícitamente.
- Frontend — `Select`: usar el componente `Select` con prop `options` (array de `{ value, label }`) en lugar de insertar `<option>` children manuales.
  - Ejemplo: 
    ```jsx
    <Select
      label="Categoría"
      name="id_categoria"
      value={createData.id_categoria || ''}
      onChange={handleCreateChange}
      options={contextData.categorias.map(c => ({ value: c.id_categoria, label: c.nombre_categoria })) || []}
    />
    ```
- Comunicación con backend: usar `fetch` a `http://${window.location.hostname}:5000/...` con `{ credentials: 'include' }` para endpoints internos.
- Props y separación de responsabilidades:
  - Pasar `data`, `loading`, `activeTab` y `onCreated` desde la página padre (`Pages/Almacen.jsx`) a `Tabla.jsx`. Evitar que `Tabla.jsx` haga fetch principal si el padre ya lo maneja.
  - Usar `onCreated()` en `Tabla` tras crear un registro para que el padre refresque datos.
- Modales: usar el componente `Modal` con `title`, `contenido`, `onClose` y `padding` opcional. Mantener el contenido JSX en la prop `contenido`.
- Cambios en código: aplicar cambios mínimos y localizados. Para editar archivos follow the `apply_patch` approach (no reformat unrelated code).
- Tests / correr localmente: usar `npm run dev` (o `npm run serve` + `npm run front` separadamente). Verificar puerto backend `5000`.

**Fragmentos recomendados**

- `hasPermission` (backend):

```js
const hasPermission = async (userId, permissionName) => {
  try {
    const [rows] = await pool.query(`
      SELECT 1 FROM usuario_permisos up
      JOIN permisos p ON up.id_permiso = p.id_permiso
      WHERE up.id_usuario = ? AND p.nombre_permiso = ?
    `, [userId, permissionName]);
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

// Uso ejemplo en rutas
app.post('/productos', async (req, res) => {
  if (!req.session.isLoggedIn || !await hasPermission(req.session.userId, 'crear_productos')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  // ... lógica de creación (INSERT INTO productos_almacen ...)
});
```

**Chequeos y validaciones**
- Verificar que `contextData.categorias` exista y sea un array antes de pasar a `Select`.
- Validar campos numéricos (`stock_actual`, `stock_minimo`) antes de enviar al backend.

**Preguntas abiertas / decisiones a confirmar**
1. ¿Deseas que estas instrucciones se apliquen a TODO el repositorio (`applyTo: "**"`) o solo a `src/**` y `Backend/**`? (actual: `src/**`, `Backend/**`).
2. ¿Quieres que incluya SQL de creación para las tablas `permisos` y `usuario_permisos` aquí mismo? Puedo agregar un `sql/` con migración si lo prefieres.
3. ¿Confirmas que `precio_unitario` NO debe existir en `productos_almacen`? Si se revierte, indicar y lo re-agrego.

**Siguientes pasos sugeridos**
- Confirmar las preguntas abiertas.
- Si confirmas, puedo crear migraciones SQL para `permisos` + `usuario_permisos` y actualizar las rutas restantes para usar `hasPermission`.

---

Archivo generado automáticamente: `copilot-instructions.md` (workspace level). Revisa y dime si quieres ajustes o que lo mueva a `.github/`.
