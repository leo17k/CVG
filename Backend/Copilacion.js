import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['Backend/App.js'],
  bundle: true,
  platform: 'node',
  target: 'node24', // Versión moderna que usas
  outfile: 'dist-backend/server.cjs',
  format: 'cjs',
  // Evitamos empaquetar librerías que contienen binarios nativos de C++ o ejecutables externos
  external: [
    'bcrypt', 
    'mysql2', 
    'puppeteer', 
    'node-adodb', 
    'fsevents', 
    'express', 
    'express-session',
    'cors',
    'morgan',
    'dotenv',
    'ejs'
  ],
});
console.log('✅ Backend y subrutas unificados con éxito en dist-backend/server.cjs');
