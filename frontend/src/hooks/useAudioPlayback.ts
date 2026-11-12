import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Estado de transporte del <audio> real: progreso actual, duración y búsqueda
 * de posición. No decide qué suena ni cómo se ve: eso queda en la página y en
 * el waveform. Escucha los eventos nativos del elemento, así que no corre
 * ningún timer propio y se resetea solo cuando cambia la canción (`emptied`).
 */

/** Segundos a `mm:ss`; entradas inválidas caen a `0:00` sin romper la UI. */
export function formatearTiempo(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) {
    return "0:00";
  }
  const total = Math.floor(segundos);
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  return `${minutos}:${String(resto).padStart(2, "0")}`;
}

type Opciones = {
  /** Avisa a la página cuando el tema termina para que resetee su estado. */
  onEnded?: () => void;
};

export function useAudioPlayback(
  audioRef: { current: HTMLAudioElement | null },
  opciones: Opciones = {},
) {
  const [progreso, setProgreso] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const onEndedRef = useRef(opciones.onEnded);

  useEffect(() => {
    onEndedRef.current = opciones.onEnded;
  }, [opciones.onEnded]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const alTiempo = () => setProgreso(audio.currentTime || 0);
    const alMetadata = () =>
      setDuracion(Number.isFinite(audio.duration) ? audio.duration : 0);
    const alVaciar = () => {
      setProgreso(0);
      setDuracion(0);
    };
    const alTerminar = () => onEndedRef.current?.();

    audio.addEventListener("timeupdate", alTiempo);
    audio.addEventListener("loadedmetadata", alMetadata);
    audio.addEventListener("durationchange", alMetadata);
    audio.addEventListener("emptied", alVaciar);
    audio.addEventListener("ended", alTerminar);

    return () => {
      audio.removeEventListener("timeupdate", alTiempo);
      audio.removeEventListener("loadedmetadata", alMetadata);
      audio.removeEventListener("durationchange", alMetadata);
      audio.removeEventListener("emptied", alVaciar);
      audio.removeEventListener("ended", alTerminar);
    };
  }, [audioRef]);

  const buscar = useCallback(
    (segundos: number) => {
      const audio = audioRef.current;
      const tope =
        audio && Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : Number.POSITIVE_INFINITY;
      const destino = Math.max(0, Math.min(segundos, tope));

      if (audio) {
        audio.currentTime = destino;
      }
      // Reflejo inmediato: el elemento puede tardar un frame en emitir
      // `timeupdate` y la barra no debe quedarse atrás del clic.
      setProgreso(destino);
    },
    [audioRef],
  );

  return { progreso, duracion, buscar };
}
