import { formatearTiempo } from "@/hooks/useAudioPlayback";

type SeekBarProps = {
  /** Segundos reproducidos del <audio> real. */
  progreso: number;
  /** Duración conocida de la canción; 0 hasta que cargan los metadatos. */
  duracion: number;
  /** Mueve la canción a la posición elegida, en segundos. */
  onSeek: (segundos: number) => void;
};

/**
 * Barra de progreso accesible del reproductor: `input[type=range]` nativo, así
 * que tiene teclado, foco y lector de pantalla sin trabajo extra. Sin duración
 * conocida queda deshabilitada — nunca muestra una posición inventada.
 */
export function SeekBar({ progreso, duracion, onSeek }: SeekBarProps) {
  const listo = duracion > 0;
  const actual = listo ? Math.min(progreso, duracion) : 0;
  const restante = Math.max(0, duracion - actual);

  return (
    <div className="seek-bar">
      <span className="seek-bar__time">{formatearTiempo(actual)}</span>
      <input
        className="seek-bar__range"
        type="range"
        min={0}
        max={listo ? duracion : 0}
        step={0.1}
        value={actual}
        disabled={!listo}
        onChange={(evento) => onSeek(Number(evento.target.value))}
        aria-label="Buscar posición dentro de la canción"
      />
      <span className="seek-bar__time">-{formatearTiempo(restante)}</span>
    </div>
  );
}
