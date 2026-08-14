export const normalizarNombreEstado = (nombre) => {
  const valor = String(nombre ?? '').trim();
  if (!valor) return valor;

  const clave = valor.toLowerCase();
  const aliases = {
    aprobadas: 'Aprovadas',
    aprovadas: 'Aprovadas',
    apovadas: 'Aprovadas'
  };

  return aliases[clave] ?? valor;
};

export const obtenerAliasesEstado = (nombre) => {
  const valor = normalizarNombreEstado(nombre);
  const set = new Set([valor, 'Aprovadas', 'Aprobadas'].filter(Boolean));
  return [...set];
};
