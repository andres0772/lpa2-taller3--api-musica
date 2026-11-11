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

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    throw new Error(`La API respondió con estado ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function listCanciones(): Promise<Cancion[]> {
  return request<Cancion[]>("/api/canciones?page_size=100");
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
