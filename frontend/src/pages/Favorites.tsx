import { useCallback, useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import {
  getCancion,
  getFavoritos,
  getUsuario,
  quitarFavorito,
  type Cancion,
  type Favorito,
  type Usuario,
} from "@/api/music";

const DEMO_USER_ID = 1;

interface SavedTrack {
  favorite: Favorito;
  song: Cancion;
}

export default function Favorites() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [tracks, setTracks] = useState<SavedTrack[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const loadFavorites = useCallback(async () => {
    setStatus("loading");

    try {
      const [user, favorites] = await Promise.all([
        getUsuario(DEMO_USER_ID),
        getFavoritos(DEMO_USER_ID),
      ]);
      const savedTracks = await Promise.all(
        favorites.map(async (favorite) => ({
          favorite,
          song: favorite.cancion ?? (await getCancion(favorite.id_cancion)),
        })),
      );

      setUsuario(user);
      setTracks(savedTracks);
      setSelectedId(savedTracks[0]?.song.id ?? null);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const selected =
    tracks.find(({ song }) => song.id === selectedId) ?? tracks[0] ?? null;

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !selected?.song.archivo_audio) return;

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }

  async function removeSelected() {
    if (!selected) return;

    await quitarFavorito(DEMO_USER_ID, selected.song.id);
    const remaining = tracks.filter(({ song }) => song.id !== selected.song.id);
    setTracks(remaining);
    setSelectedId(remaining[0]?.song.id ?? null);
    setIsPlaying(false);
  }

  return (
    <div className="luminous-page">
      <Navbar active="favorites" />

      <main className="luminous-layout">
        <aside className="archive-index" aria-labelledby="archive-title">
          <div className="archive-index-heading">
            <strong id="archive-title">Índice del archivo</strong>
            <span>{tracks.length} guardadas</span>
          </div>

          {status === "ready" && tracks.length > 0 ? (
            <ol className="archive-list">
              {tracks.map(({ song }, index) => (
                <li
                  className="archive-item"
                  aria-current={selected?.song.id === song.id ? "true" : undefined}
                  key={song.id}
                >
                  <button type="button" onClick={() => setSelectedId(song.id)}>
                    <span className="archive-number">{String(index + 1).padStart(2, "0")}</span>
                    <span>{song.titulo}</span>
                    <span className="archive-genre">{song.genero}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="archive-caption">
              Tu música guardada aparece aquí como un índice de descubrimientos.
            </p>
          )}

          <div className="archive-index-footer">
            <p>
              {usuario
                ? `Perfil de demostración · ${usuario.nombre}`
                : "Perfil de demostración"}
            </p>
            <a className="archive-action" href="/canciones">
              Volver al catálogo <span aria-hidden="true">↘</span>
            </a>
          </div>
        </aside>

        <section
          className="luminous-stage"
          aria-label="Archivo de canciones guardadas"
          data-playing={isPlaying ? "true" : "false"}
        >
          <span className="luminous-label">Archivo · música guardada</span>
          <div className="luminous-orbit orbit-one" aria-hidden="true" />
          <div className="luminous-orbit orbit-two" aria-hidden="true" />
          <div className="luminous-disc" aria-hidden="true">
            <span className="luminous-disc-label">
              <b>YourMusic</b>
              <small>Favorite archive</small>
            </span>
          </div>
          <div className="floating-glyph glyph-one" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M9 18V6l10-2v12" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="16" cy="16" r="3" />
            </svg>
          </div>
          <div className="floating-glyph glyph-two" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 14c2.5-5 4.5 5 7 0s4.5 5 7 0 2-1 2-1" />
            </svg>
          </div>
        </section>

        <aside className="now-playing" aria-labelledby="now-playing-title">
          <h1 id="now-playing-title">Tu archivo luminoso</h1>

          {status === "loading" ? (
            <div className="archive-state" role="status">
              <span className="loading-pulse" aria-hidden="true" />
              <p>Abriendo tu colección…</p>
            </div>
          ) : status === "error" ? (
            <div className="archive-state" role="alert">
              <h2>No pudimos abrir el archivo</h2>
              <p>Revisá que la API esté disponible y volvé a intentarlo.</p>
              <button type="button" onClick={() => void loadFavorites()}>
                Reintentar
              </button>
            </div>
          ) : tracks.length === 0 ? (
            <div className="archive-state empty-state">
              <span className="empty-disc" aria-hidden="true" />
              <h2>Tu archivo todavía está en silencio</h2>
              <p>
                Guardá canciones desde el catálogo y acá vas a poder verlas y
                escucharlas cuando la API incluya el archivo de audio.
              </p>
              <a href="/canciones">Explorar el catálogo</a>
            </div>
          ) : selected ? (
            <article className="now-card">
              <div className="now-kicker">
                <span>En reproducción</span>
                <span>{selected.song.duracion_formato}</span>
              </div>
              <h2>{selected.song.titulo}</h2>
              <p className="now-byline">
                {selected.song.artista} · {selected.song.album} · {selected.song.año}
              </p>

              <div className="luminous-wave" aria-hidden="true" data-playing={isPlaying ? "true" : "false"}>
                {Array.from({ length: 20 }, (_, index) => (
                  <i
                    key={index}
                    style={
                      {
                        "--bar-height": `${12 + (index * 11) % 38}px`,
                        "--bar-index": index,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>

              <audio
                ref={audioRef}
                src={selected.song.archivo_audio ?? undefined}
                preload="metadata"
                onEnded={() => setIsPlaying(false)}
              />

              <div className="now-actions">
                <button
                  className="now-play"
                  type="button"
                  onClick={togglePlayback}
                  disabled={!selected.song.archivo_audio}
                  aria-label={
                    selected.song.archivo_audio
                      ? `${isPlaying ? "Pausar" : "Reproducir"} ${selected.song.titulo}`
                      : `Audio no disponible para ${selected.song.titulo}`
                  }
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    {isPlaying ? (
                      <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
                    ) : (
                      <path d="M8 5v14l11-7z" />
                    )}
                  </svg>
                </button>
                <button
                  className="remove-favorite"
                  type="button"
                  onClick={() => void removeSelected()}
                >
                  Quitar de favoritos
                </button>
              </div>

              {!selected.song.archivo_audio && (
                <p className="audio-notice">
                  La API todavía no asocia un archivo de audio a esta canción.
                </p>
              )}
            </article>
          ) : null}
        </aside>
      </main>

      <footer className="luminous-footer">
        Tu próxima canción está más cerca de lo que parece
      </footer>
    </div>
  );
}
