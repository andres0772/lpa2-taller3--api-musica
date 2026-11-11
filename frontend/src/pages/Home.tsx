import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useSesion } from "@/hooks/useSesion";
import { useAudioWaveform } from "@/hooks/useAudioWaveform";
import {
  audioUrl,
  crearFavorito,
  listCanciones,
  type Cancion,
} from "@/api/music";
import { DEMO_SONGS } from "@/data/demoSongs";

export default function Home() {
  const { usuarioId } = useSesion();
  const [canciones, setCanciones] = useState<Cancion[]>(DEMO_SONGS);
  const [featuredId, setFeaturedId] = useState<number | null>(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [favoriteState, setFavoriteState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const { start: iniciarWaveform, stop: detenerWaveform } = useAudioWaveform(
    audioRef,
    waveRef,
  );

  useEffect(() => {
    let active = true;

    listCanciones()
      .then((songs) => {
        if (!active || songs.length === 0) return;
        setCanciones(songs);
        setApiConnected(true);
      })
      .catch(() => {
        if (active) setApiConnected(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const featured =
    canciones.find((cancion) => cancion.id === featuredId) ?? canciones[0] ?? DEMO_SONGS[0];
  const secondarySongs = canciones.slice(1, 4);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !featured.archivo_audio) return;

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
      iniciarWaveform();
    } else {
      audio.pause();
      setIsPlaying(false);
      detenerWaveform();
    }
  }

  function seleccionarDestacada(song: Cancion) {
    setFeaturedId(song.id);
    // El <audio> pausa solo al cambiar de src: sincronizamos el estadovisible.
    audioRef.current?.pause();
    setIsPlaying(false);
    detenerWaveform();

    const reducedMotion = window.matchMedia
      ?.("(prefers-reduced-motion: reduce)")
      .matches;
    document
      .querySelector(".performance")
      ?.scrollIntoView?.({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  }

  async function saveFeatured() {
    setFavoriteState("saving");

    try {
      await crearFavorito(usuarioId, featured.id);
      setFavoriteState("saved");
      toast.success("Canción guardada en favoritos");
    } catch {
      setFavoriteState("error");
      toast.error("No pudimos guardar la canción");
    }
  }

  return (
    <div className="cinematic-page">
      <Navbar active="home" />

      <main className="cinematic-main">
        <section className="cinematic-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow">Un espacio para escuchar distinto</span>
            <h1 id="hero-title">
              Tu banda sonora <span>en movimiento.</span>
            </h1>
            <p>
              Explorá canciones, encontrá tu próxima obsesión y guardá todo lo
              que merece volver a sonar.
            </p>
            <div className="hero-actions">
              <a className="action-button action-primary" href="/canciones">
                Explorar canciones <span aria-hidden="true">→</span>
              </a>
              <a className="action-button action-secondary" href="/favoritos">
                Ver favoritos <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="demo-note" aria-label="Catálogo de demostración">
              <span className="demo-stack" aria-hidden="true">
                <span>YM</span>
                <span>Q</span>
                <span>10</span>
              </span>
              <span>
                <strong>10 canciones demo</strong>
                <br />
                Rock, pop, jazz y electrónica
              </span>
            </div>
          </div>

          <section
          className="performance"
          aria-label="Canción destacada"
          data-playing={isPlaying ? "true" : "false"}
        >
            <span className="light-beam beam-left" aria-hidden="true" />
            <span className="light-beam beam-right" aria-hidden="true" />
            <span className="stage-halo" aria-hidden="true" />
            <div className="vinyl-record" aria-hidden="true">
              <span className="record-label">
                <b>YourMusic</b>
                <small>Side A · Demo 01</small>
              </span>
            </div>

            <div className="glass-player">
              <div className="player-heading">
                <button
                  className="play-button"
                  type="button"
                  onClick={togglePlayback}
                  disabled={!featured.archivo_audio}
                  aria-label={
                    featured.archivo_audio
                      ? `${isPlaying ? "Pausar" : "Reproducir"} ${featured.titulo}`
                      : `Audio no disponible para ${featured.titulo}`
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
                <div className="track-copy">
                  <h2>{featured.titulo}</h2>
                  <span>
                    {featured.artista} · {featured.genero} · Catálogo demo
                  </span>
                </div>
                <span className="track-duration">{featured.duracion_formato}</span>
              </div>

              <div className="waveform" aria-hidden="true" ref={waveRef}>
                {Array.from({ length: 18 }, (_, index) => (
                  <i
                    key={index}
                    style={
                      {
                        "--bar-height": `${8 + (index * 7) % 30}px`,
                        "--bar-index": index,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
              <div className="player-time" aria-hidden="true">
                <span>0:00</span>
                <span>{featured.duracion_formato}</span>
              </div>

              <audio
                ref={audioRef}
                crossOrigin="anonymous"
                src={audioUrl(featured.archivo_audio) ?? undefined}
                preload="metadata"
                onEnded={() => {
                  setIsPlaying(false);
                  detenerWaveform();
                }}
              />
            </div>
          </section>
        </section>

        <section
          id="discovery"
          className="editorial-discovery"
          aria-labelledby="discovery-title"
        >
          <div className="editorial-shell">
            <header className="editorial-heading">
              <span className="editorial-kicker">Issue 02 · Catálogo demo</span>
              <div>
                <h2 id="discovery-title">Descubriendo ahora</h2>
                <p>
                  Una selección editorial para mirar, comparar y elegir la
                  próxima canción con intención.
                </p>
              </div>
            </header>

            <div className="editorial-grid">
              <button
                className="lead-card"
                type="button"
                onClick={() => seleccionarDestacada(featured)}
              >
                <span className="lead-art" aria-hidden="true">
                  <svg viewBox="0 0 160 160" fill="none">
                    <circle cx="80" cy="80" r="58" stroke="currentColor" strokeOpacity=".32" />
                    <circle cx="80" cy="80" r="40" stroke="currentColor" strokeOpacity=".52" />
                    <path d="M20 102c20-38 31 24 52-12 16-27 31 18 68-24" stroke="currentColor" strokeWidth="2" />
                    <circle cx="80" cy="80" r="4" fill="currentColor" />
                  </svg>
                  <span className="lead-number">01</span>
                </span>
                <div className="lead-copy">
                  <span className="lead-label">En portada</span>
                  <h3>{featured.titulo}</h3>
                  <p className="lead-artist">
                    {featured.artista} · {featured.album ?? "Catálogo demo"}
                  </p>
                  <div className="lead-meta">
                    <span>
                      <span>Género</span>
                      <strong>{featured.genero}</strong>
                    </span>
                    <span>
                      <span>Año</span>
                      <strong>{featured.año}</strong>
                    </span>
                    <span>
                      <span>Duración</span>
                      <strong>{featured.duracion_formato}</strong>
                    </span>
                  </div>
                  <span className="lead-action">Escuchar la selección →</span>
                </div>
              </button>

              <div className="secondary-stack">
                {secondarySongs.map((song, index) => (
                  <button
                    className="secondary-card"
                    type="button"
                    key={song.id}
                    onClick={() => seleccionarDestacada(song)}
                  >
                    <span className="secondary-cover" aria-hidden="true">
                      {String(index + 2).padStart(2, "0")}
                    </span>
                    <span className="secondary-copy">
                      <strong>{song.titulo}</strong>
                      <span>
                        {song.artista} · {song.album ?? "Catálogo demo"}
                      </span>
                    </span>
                    <span className="secondary-meta">
                      <strong>{song.duracion_formato}</strong>
                      <span>{song.genero}</span>
                    </span>
                    <span className="secondary-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="cuenta" className="cinematic-footer">
        <span>YOURMUSIC · Prototipo visual</span>
        <span>
          {apiConnected
            ? "Catálogo conectado a la API"
            : "Vista de demostración · API no disponible"}
        </span>
        <button
          className="save-favorite"
          type="button"
          onClick={saveFeatured}
          disabled={!apiConnected || favoriteState === "saving"}
        >
          {favoriteState === "saved"
            ? "Guardada en favoritos"
            : favoriteState === "error"
              ? "No se pudo guardar"
              : favoriteState === "saving"
                ? "Guardando…"
                : "Guardar en favoritos"}
        </button>
      </footer>
    </div>
  );
}
