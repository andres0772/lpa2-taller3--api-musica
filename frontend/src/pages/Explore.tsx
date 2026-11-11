import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import {
  buscarCanciones,
  crearFavorito,
  listCanciones,
  quitarFavorito,
  type Cancion,
} from "@/api/music";

const DEMO_USER_ID = 1;
const PAGE_SIZE = 12;
const DEBOUNCE_MS = 300;

// Géneros expuestos por la API (musica_api/models.py, enum Genero).
const GENEROS = [
  "Rock",
  "Pop",
  "Jazz",
  "Electronic",
  "Hip Hop",
  "Clasica",
  "Reggae",
  "Country",
  "Otro",
];

export default function Explore() {
  const [texto, setTexto] = useState(
    () => new URLSearchParams(window.location.search).get("q") ?? "",
  );
  const [titulo, setTitulo] = useState(texto);
  const [genero, setGenero] = useState(
    () => new URLSearchParams(window.location.search).get("genero") ?? "",
  );
  const [page, setPage] = useState(1);
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [favoritas, setFavoritas] = useState<number[]>([]);
  const [pendingFavorite, setPendingFavorite] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setStatus("loading");

    try {
      const busqueda = titulo.trim().length > 0 || genero.length > 0;
      const songs = busqueda
        ? await buscarCanciones({
            titulo: titulo.trim() || undefined,
            genero: genero || undefined,
            page,
            pageSize: PAGE_SIZE,
          })
        : await listCanciones(page, PAGE_SIZE);

      setCanciones(songs);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [titulo, genero, page]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function buscar(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setTitulo(texto.trim());
  }

  function filtrarGenero(value: string) {
    setPage(1);
    setGenero(value);
  }

  function limpiarFiltros() {
    setTexto("");
    setTitulo("");
    setGenero("");
    setPage(1);
  }

  // La escritura se aplica con debounce: varios keystrokes, un solo request.
  useEffect(() => {
    if (texto.trim() === titulo) {
      return;
    }
    const temporizador = setTimeout(() => {
      setPage(1);
      setTitulo(texto.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(temporizador);
  }, [texto, titulo]);

  // Los filtros vigentes quedan en la URL para compartir o recargar.
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    if (titulo) {
      parametros.set("q", titulo);
    } else {
      parametros.delete("q");
    }
    if (genero) {
      parametros.set("genero", genero);
    } else {
      parametros.delete("genero");
    }
    const consulta = parametros.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${consulta ? `?${consulta}` : ""}`,
    );
  }, [titulo, genero]);

  async function toggleFavorito(song: Cancion) {
    try {
      if (favoritas.includes(song.id)) {
        await quitarFavorito(DEMO_USER_ID, song.id);
        setFavoritas((previas) => previas.filter((id) => id !== song.id));
        toast.success("Canción quitada de favoritos");
      } else {
        await crearFavorito(DEMO_USER_ID, song.id);
        setFavoritas((previas) => [...previas, song.id]);
        toast.success("Canción guardada en favoritos");
      }
    } catch {
      toast.error("No pudimos actualizar favoritos");
    } finally {
      setPendingFavorite(null);
    }
  }

  return (
    <div className="cinematic-page explore-page">
      <Navbar />

      <main className="explore-main">
        <header className="explore-heading">
          <span className="eyebrow">Catálogo completo</span>
          <h1>Explorar canciones</h1>
          <p>
            Buscá por título o artista, filtrá por género y guardá lo que merezca
            volver a sonar.
          </p>
        </header>

        <form className="explore-toolbar" role="search" onSubmit={buscar}>
          <div className="explore-field">
            <label htmlFor="explore-search">Buscar por título o artista</label>
            <input
              id="explore-search"
              name="titulo"
              type="search"
              value={texto}
              placeholder="Queen, jazz, 1975…"
              onChange={(event) => setTexto(event.target.value)}
            />
          </div>

          <div className="explore-field">
            <label htmlFor="explore-genero">Género</label>
            <select
              id="explore-genero"
              name="genero"
              value={genero}
              onChange={(event) => filtrarGenero(event.target.value)}
            >
              <option value="">Todos los géneros</option>
              {GENEROS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="action-button action-primary">
            Buscar
          </button>
        </form>

        {status === "loading" ? (
          <div className="explore-grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="song-skeleton" key={index} />
            ))}
          </div>
        ) : status === "error" ? (
          <div className="archive-state" role="alert">
            <h2>No pudimos cargar el catálogo</h2>
            <p>Revisá que la API esté disponible y volvé a intentarlo.</p>
            <button type="button" onClick={() => void cargar()}>
              Reintentar
            </button>
          </div>
        ) : canciones.length === 0 ? (
          <div className="archive-state empty-state">
            <span className="empty-disc" aria-hidden="true" />
            <h2>No encontramos canciones</h2>
            <p>Probá con otro título, artista o género del catálogo.</p>
            <button type="button" onClick={limpiarFiltros}>
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <ol className="explore-grid">
            {canciones.map((song, index) => {
              const guardada = favoritas.includes(song.id);

              return (
                <li className="song-card" key={song.id}>
                  <span className="song-cover" aria-hidden="true">
                    {String(index + 1 + (page - 1) * PAGE_SIZE).padStart(2, "0")}
                  </span>
                  <div className="song-copy">
                    <h3>{song.titulo}</h3>
                    <p className="song-artist">
                      {song.artista}
                      {song.album ? ` · ${song.album}` : ""}
                    </p>
                  </div>
                  <div className="song-meta">
                    <span>{song.duracion_formato}</span>
                    <span>{song.genero}</span>
                  </div>
                  <div className="song-actions">
                    <button
                      className="song-play"
                      type="button"
                      disabled={!song.archivo_audio}
                      aria-label={
                        song.archivo_audio
                          ? `Reproducir ${song.titulo}`
                          : `Audio no disponible para ${song.titulo}`
                      }
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <button
                      className={guardada ? "song-favorite is-saved" : "song-favorite"}
                      type="button"
                      disabled={pendingFavorite === song.id}
                      aria-label={
                        guardada
                          ? `Quitar "${song.titulo}" de favoritos`
                          : `Guardar "${song.titulo}" en favoritos`
                      }
                      onClick={() => void toggleFavorito(song)}
                    >
                      {guardada ? "Guardada" : "Guardar en favoritos"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {status === "ready" && canciones.length > 0 && (
          <nav className="explore-pagination" aria-label="Paginación del catálogo">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </button>
            <span aria-live="polite">Página {page}</span>
            <button type="button" onClick={() => setPage((prev) => prev + 1)}>
              Siguiente
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
