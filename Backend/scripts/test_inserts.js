import { connectionCompras } from '../DataBase/Acces/ConexionACCES.js';

async function test() {
    console.log('Starting diagnostic test...');
    
    // Test 1: Header INSERT with Comprador as number and CCosto as number
    try {
        console.log('Test 1: Comprador=number, CCosto=number');
        const q1 = `
          INSERT INTO [REQCOMPRA] (
            [NReqCompra], [FechaT], [FechaA], [Descripción], [Modalidad], [MontoRC], 
            [CCosto], [Estado], [FechaRecC], [Comprador], [FechaRecC1], [Fecha], 
            [TipoCompra], [CodigoPresup], [TipoAdqui], [ControlPrevio], [Cod_Prioridad], [Cod_linea]
          ) VALUES (
            'TEST-1', #2026-05-18 14:24:36#, #2026-05-18 14:24:36#, 'Test 1', 'UN', 0, 
            300, 'IN', #2026-05-18 14:24:36#, 6, #2026-05-18 14:24:36#, #2026-05-18 14:24:36#, 
            'SV', '', '', 'No', 1, ''
          )
        `;
        await connectionCompras.execute(q1);
        console.log('Test 1 Success! Clean up...');
        await connectionCompras.execute(`DELETE FROM [REQCOMPRA] WHERE [NReqCompra] = 'TEST-1'`);
    } catch (e) {
        console.error('Test 1 Failed:', e.message || e);
    }

    // Test 2: Header INSERT with Comprador as string and CCosto as number
    try {
        console.log('Test 2: Comprador=string, CCosto=number');
        const q2 = `
          INSERT INTO [REQCOMPRA] (
            [NReqCompra], [FechaT], [FechaA], [Descripción], [Modalidad], [MontoRC], 
            [CCosto], [Estado], [FechaRecC], [Comprador], [FechaRecC1], [Fecha], 
            [TipoCompra], [CodigoPresup], [TipoAdqui], [ControlPrevio], [Cod_Prioridad], [Cod_linea]
          ) VALUES (
            'TEST-2', #2026-05-18 14:24:36#, #2026-05-18 14:24:36#, 'Test 2', 'UN', 0, 
            300, 'IN', #2026-05-18 14:24:36#, '6', #2026-05-18 14:24:36#, #2026-05-18 14:24:36#, 
            'SV', '', '', 'No', 1, ''
          )
        `;
        await connectionCompras.execute(q2);
        console.log('Test 2 Success! Clean up...');
        await connectionCompras.execute(`DELETE FROM [REQCOMPRA] WHERE [NReqCompra] = 'TEST-2'`);
    } catch (e) {
        console.error('Test 2 Failed:', e.message || e);
    }

    // Test 3: Header INSERT with Comprador as number and CCosto as string
    try {
        console.log('Test 3: Comprador=number, CCosto=string');
        const q3 = `
          INSERT INTO [REQCOMPRA] (
            [NReqCompra], [FechaT], [FechaA], [Descripción], [Modalidad], [MontoRC], 
            [CCosto], [Estado], [FechaRecC], [Comprador], [FechaRecC1], [Fecha], 
            [TipoCompra], [CodigoPresup], [TipoAdqui], [ControlPrevio], [Cod_Prioridad], [Cod_linea]
          ) VALUES (
            'TEST-3', #2026-05-18 14:24:36#, #2026-05-18 14:24:36#, 'Test 3', 'UN', 0, 
            '300', 'IN', #2026-05-18 14:24:36#, 6, #2026-05-18 14:24:36#, #2026-05-18 14:24:36#, 
            'SV', '', '', 'No', 1, ''
          )
        `;
        await connectionCompras.execute(q3);
        console.log('Test 3 Success! Clean up...');
        await connectionCompras.execute(`DELETE FROM [REQCOMPRA] WHERE [NReqCompra] = 'TEST-3'`);
    } catch (e) {
        console.error('Test 3 Failed:', e.message || e);
    }

    // Test 4: Header INSERT with Comprador as string and CCosto as string
    try {
        console.log('Test 4: Comprador=string, CCosto=string');
        const q4 = `
          INSERT INTO [REQCOMPRA] (
            [NReqCompra], [FechaT], [FechaA], [Descripción], [Modalidad], [MontoRC], 
            [CCosto], [Estado], [FechaRecC], [Comprador], [FechaRecC1], [Fecha], 
            [TipoCompra], [CodigoPresup], [TipoAdqui], [ControlPrevio], [Cod_Prioridad], [Cod_linea]
          ) VALUES (
            'TEST-4', #2026-05-18 14:24:36#, #2026-05-18 14:24:36#, 'Test 4', 'UN', 0, 
            '300', 'IN', #2026-05-18 14:24:36#, '6', #2026-05-18 14:24:36#, #2026-05-18 14:24:36#, 
            'SV', '', '', 'No', 1, ''
          )
        `;
        await connectionCompras.execute(q4);
        console.log('Test 4 Success! Clean up...');
        await connectionCompras.execute(`DELETE FROM [REQCOMPRA] WHERE [NReqCompra] = 'TEST-4'`);
    } catch (e) {
        console.error('Test 4 Failed:', e.message || e);
    }
}
test();
