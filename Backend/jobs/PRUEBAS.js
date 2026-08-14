import dotenv from 'dotenv';
import ADODB from 'node-adodb';

dotenv.config();

const is64Bit = false;
const db = ADODB.open(
  `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${process.env.ACCESS_COMPRAS_PATH};`,
  is64Bit
);

async function probarInsertManual() {
  const nreq = 'C-2026-451';

  try {
    // 1. Cabecera incluyendo Cod_Prioridad con valor 2
    const sqlCabecera = `
      INSERT INTO [REQCOMPRA] (
        [NReqCompra], [FechaT], [FechaA], [FechaRecC], 
        [Modalidad], [CCosto], [Estado], [Comprador], 
        [TipoCompra], [Cod_Prioridad]
      ) VALUES (
        '${nreq}', NOW(), NOW(), NOW(),
        'UN', 225, 'AP', 1, 
        'CO', 2
      )
    `;
    
    await db.execute(sqlCabecera);
    console.log('✅ CABECERA_OK');

    // 2. Detalle
    const sqlDetalle = `
      INSERT INTO [REQCOMPRADETALLE] (
        [NReqCompra], [NRenglon], [CodRenglon], [Descripcion], [Unidad], [Cantidad], [Cod_Tipo]
      ) VALUES (
        '${nreq}', 1, '00122', 'Prueba manual', 'C/U', 1, '9588'
      )
    `;
    
    await db.execute(sqlDetalle);
    console.log('✅ DETALLE_OK');

  } catch (err) {
    console.error('❌ ERROR:', err?.process?.message || err?.message || err);
  }
}

probarInsertManual();