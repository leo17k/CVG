/**
 * GoeyToaster.jsx
 * Wrapper que re-exporta el paquete goey-toast para mantener compatibilidad
 * con todos los imports existentes en el proyecto.
 *
 * USO:
 *   import { toast } from '../Componets/GoeyToaster';
 *   toast.success('Mensaje')  →  gooeyToast.success('Mensaje')
 */
import { GooeyToaster, gooeyToast } from 'goey-toast';

// Adaptador: mapea la API antigua { toast.success / toast.error / ... }
// a la nueva API de gooeyToast para que todos los archivos sigan funcionando
export const toast = {

  success: (message, opts) => gooeyToast.success(message, { showTimestamp: false, ...opts }),
  error: (message, opts) => gooeyToast.error(message, { showTimestamp: false, ...opts }),
  info: (message, opts) => gooeyToast.info(message, { showTimestamp: false, ...opts }),
  warn: (message, opts) => gooeyToast.warning(message, { showTimestamp: false, ...opts }),
  warning: (message, opts) => gooeyToast.warning(message, { showTimestamp: false, ...opts }),
};

// Re-exportamos gooeyToast directamente por si algún archivo lo necesita
export { gooeyToast, GooeyToaster };

export default GooeyToaster;
