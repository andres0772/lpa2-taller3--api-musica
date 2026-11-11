export interface Cancion {
  id: number;
  titulo: string;
  artista: string;
  album: string | null;
  duracion: string;
  duracion_segundos: number;
  duracion_formato: string;
  año: number;
  genero: string;
  fecha_creacion: string;
  archivo_audio: string | null;
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  fecha_registro: string;
}

export interface Favorito {
  id: number;
  id_usuario: number;
  id_cancion: number;
  fecha_marcado: string;
  usuario: Usuario | null;
  cancion: Cancion | null;
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

// La API devuelve archivo_audio como ruta relativa ('/audio/x.mp3');
// el navegador necesita la URL absoluta contra el origen de la API.
export function audioUrl(ruta: string | null): string | null {
  if (!ruta) {
    return null;
  }
  if (/^https?:\/\//.test(ruta)) {
    return ruta;
  }
  return `${API_BASE_URL}${ruta}`;
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    throw new Error(`La API respondió con estado ${response.status}`);
  }

  // Respuestas sin body (204 al quitar favoritos) no tienen JSON que parsear.
  try {
    return (await response.json()) as T;
  } catch {
    return undefined as T;
  }
}

export function listCanciones(page = 1, pageSize = 100): Promise<Cancion[]> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<Cancion[]>(`/api/canciones?${params.toString()}`);
}

export interface BuscarCancionesFiltros {
  titulo?: string;
  genero?: string;
  page?: number;
  pageSize?: number;
}

export function buscarCanciones(filtros: BuscarCancionesFiltros = {}): Promise<Cancion[]> {
  const params = new URLSearchParams();
  if (filtros.titulo) {
    params.set("titulo", filtros.titulo);
  }
  if (filtros.genero) {
    params.set("genero", filtros.genero);
  }
  params.set("page", String(filtros.page ?? 1));
  params.set("page_size", String(filtros.pageSize ?? 12));
  return request<Cancion[]>(`/api/canciones/buscar?${params.toString()}`);
}

export function getUsuario(usuarioId: number): Promise<Usuario> {
  return request<Usuario>(`/api/usuarios/${usuarioId}`);
}

export function getFavoritos(usuarioId: number): Promise<Favorito[]> {
  return request<Favorito[]>(`/api/usuarios/${usuarioId}/favoritos`);
}

export function getCancion(cancionId: number): Promise<Cancion> {
  return request<Cancion>(`/api/canciones/${cancionId}`);
}

export async function crearFavorito(
  usuarioId: number,
  cancionId: number,
): Promise<Favorito> {
  return request<Favorito>(
    `/api/usuarios/${usuarioId}/favoritos/${cancionId}`,
    { method: "POST" },
  );
}

export async function quitarFavorito(
  usuarioId: number,
  cancionId: number,
): Promise<void> {
  await request<void>(
    `/api/usuarios/${usuarioId}/favoritos/${cancionId}`,
    { method: "DELETE" },
  );
}
