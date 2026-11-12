/**
 * Cola de reproducción circular: desde cualquier canción, siguiente y anterior
 * nunca se quedan sin destino — el último vuelve al primero y viceversa.
 */

type Identificable = { id: number };

export function siguienteCancion<T extends Identificable>(
  cola: T[],
  idActual: number,
): T | null {
  if (cola.length === 0) {
    return null;
  }
  const indice = cola.findIndex((cancion) => cancion.id === idActual);
  if (indice === -1) {
    return cola[0] ?? null;
  }
  return cola[(indice + 1) % cola.length] ?? null;
}

export function anteriorCancion<T extends Identificable>(
  cola: T[],
  idActual: number,
): T | null {
  if (cola.length === 0) {
    return null;
  }
  const indice = cola.findIndex((cancion) => cancion.id === idActual);
  if (indice === -1) {
    return cola[cola.length - 1] ?? null;
  }
  return cola[(indice - 1 + cola.length) % cola.length] ?? null;
}
