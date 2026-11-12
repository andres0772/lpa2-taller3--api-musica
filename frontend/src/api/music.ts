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
  portada: string | null;
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

// Mismo espejo para las portadas deterministas ('/portadas/x.svg').
export function portadaUrl(ruta: string | null): string | null {
  return audioUrl(ruta);
}

export interface UsuarioSesion {
  id: number;
  nombre: string;
  correo: string;
}

const TOKEN_KEY = "yourmusic.token";
const USUARIO_KEY = "yourmusic.usuario";

// Error de API que conserva el mensaje honesto del backend (detail) y su
// estado HTTP, para que la UI muestre la razón real en vez de un genérico.
export class ApiError extends Error {
  estado: number;
  detalle: string | null;

  constructor(estado: number, detalle: string | null) {
    super(detalle ?? `La API respondió con estado ${estado}`);
    this.name = "ApiError";
    this.estado = estado;
    this.detalle = detalle;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    let detalle: string | null = null;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") {
        detalle = body.detail;
      }
    } catch {
      // Sin cuerpo JSON (o vacío): queda el mensaje por estado.
    }
    throw new ApiError(response.status, detalle);
  }

  // Respuestas sin body (204 al quitar favoritos) no tienen JSON que parsear.
  try {
    return (await response.json()) as T;
  } catch {
    return undefined as T;
  }
}

function conToken(token: string | null, body?: unknown): RequestInit {
  const init: RequestInit = { method: "POST" };
  if (token) {
    init.headers = { "X-Session-Token": token };
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { ...init.headers, "Content-Type": "application/json" };
  }
  return init;
}

export function leerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function guardarSesion(token: string, usuario: UsuarioSesion): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function usuarioGuardado(): UsuarioSesion | null {
  const crudo = localStorage.getItem(USUARIO_KEY);
  if (!crudo) {
    return null;
  }
  try {
    return JSON.parse(crudo) as UsuarioSesion;
  } catch {
    return null;
  }
}

export function borrarSesion(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

export async function registrarUsuario(datos: {
  nombre: string;
  correo: string;
  contraseña: string;
}): Promise<UsuarioSesion> {
  return request<UsuarioSesion>(
    "/api/auth/registro",
    conToken(null, datos),
  );
}

export async function iniciarSesion(datos: {
  correo: string;
  contraseña: string;
}): Promise<{ token: string; usuario: UsuarioSesion }> {
  return request<{ token: string; usuario: UsuarioSesion }>(
    "/api/auth/login",
    conToken(null, datos),
  );
}

export async function cerrarSesion(token: string): Promise<void> {
  await request<void>("/api/auth/logout", conToken(token));
}

export async function usuarioDeToken(token: string): Promise<UsuarioSesion> {
  return request<UsuarioSesion>("/api/auth/me", {
    headers: { "X-Session-Token": token },
  });
}

export function listCanciones(page = 1, pageSize = 100): Promise<Cancion[]> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<Cancion[]>(`/api/canciones?${params.toString()}`);
}

export interface BuscarCancionesFiltros {
  titulo?: string;
  artista?: string;
  modo?: "todas" | "cualquiera";
  genero?: string;
  page?: number;
  pageSize?: number;
}

export function buscarCanciones(filtros: BuscarCancionesFiltros = {}): Promise<Cancion[]> {
  const params = new URLSearchParams();
  if (filtros.titulo) {
    params.set("titulo", filtros.titulo);
  }
  if (filtros.artista) {
    params.set("artista", filtros.artista);
  }
  if (filtros.modo) {
    params.set("modo", filtros.modo);
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
