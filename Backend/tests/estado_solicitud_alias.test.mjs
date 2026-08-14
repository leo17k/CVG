import assert from 'node:assert/strict';
import { normalizarNombreEstado, obtenerAliasesEstado } from '../Funciones/estadosSolicitud.js';

assert.equal(normalizarNombreEstado('Aprovadas'), 'Aprobadas');
assert.equal(normalizarNombreEstado('Aprobadas'), 'Aprobadas');
assert.deepEqual(obtenerAliasesEstado('Aprovadas'), ['Aprobadas', 'Aprovadas']);
assert.deepEqual(obtenerAliasesEstado('Aprobadas'), ['Aprobadas', 'Aprovadas']);

console.log('estado_solicitud_alias: OK');
