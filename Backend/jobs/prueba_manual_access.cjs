const fs = require('fs');
const dotenv = require('dotenv');
const ADODB = require('node-adodb');

dotenv.config();

const path = process.env.ACCESS_COMPRAS_PATH;
console.log('ACCESS_COMPRAS_PATH=', path);
console.log('EXISTS=', path ? fs.existsSync(path) : false);

if (!path || !fs.existsSync(path)) {
  console.error('No existe la base de Access configurada.');
  process.exit(1);
}

const connection = ADODB.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${path};`);

async function main() {
  const nreq = 'S-PRUEBA-999';
  const sql = `INSERT INTO [REQCOMPRADETALLE] ([NReqCompra],[NRenglon],[CodRenglon],[Descripcion],[Unidad],[Cantidad],[Cod_Tipo]) VALUES ('${nreq}', 1, '4569', 'Prueba manual', 'C/U', 1, '95884')`;

  console.log('SQL=', sql);

  try {
    const preview = await connection.query('SELECT TOP 1 * FROM [REQCOMPRADETALLE]');
    console.log('Preview rows=', preview?.length ?? 0, preview?.[0] ?? null);
  } catch (previewErr) {
    console.error('Preview error=', previewErr && previewErr.message ? previewErr.message : previewErr);
  }

  try {
    const result = await connection.execute(sql);
    console.log('INSERT_OK', result);
  } catch (insertErr) {
    console.error('INSERT_ERROR', insertErr && insertErr.message ? insertErr.message : insertErr);
  }

  try {
    const rows = await connection.query(`SELECT * FROM [REQCOMPRADETALLE] WHERE [NReqCompra] = '${nreq}'`);
    console.log('ROWS=', rows?.length ?? 0, rows);
  } catch (selectErr) {
    console.error('SELECT_ERROR', selectErr && selectErr.message ? selectErr.message : selectErr);
  }
}

main().catch((err) => {
  console.error('UNHANDLED', err && err.message ? err.message : err);
  process.exit(1);
});
