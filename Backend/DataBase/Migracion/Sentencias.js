export const centrocosto = `
c.codigo_centro,
g.nombre_gerencia
FROM centro_costo c
INNER JOIN  gerencias g ON g.id_gerencia = c.id_gerencia
`