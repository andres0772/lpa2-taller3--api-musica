import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Conecta el elemento <audio> a un AnalyserNode de Web Audio y escribe la
 * amplitud real en las barras del waveform. Sin Web Audio (o sin audio que
 * analizar) el hook queda inerte y la animación decorativa sigue a cargo del
 * CSS vía `data-playing`.
 *
 * Decisiones de performance: el muestreo corre en requestAnimationFrame y
 * escribe `transform` directo sobre las barras — React no re-renderiza por
 * frame, y el hilo principal solo toca propiedades compuestas.
 */

type VentanaConWebAudio = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

// Un elemento solo puede tener UN MediaElementAudioSourceNode en su vida;
// cachear evita el InvalidStateError si el mismo audio se reengancha.
const fuentes = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

function escala(index: number, total: number, nivel: number): string {
  const amplitud = 0.22 + Math.min(1, nivel / 190) * 1.05;
  void index;
  void total;
  return `scaleY(${amplitud.toFixed(3)})`;
}

export function useAudioWaveform(
  audioRef: { current: HTMLAudioElement | null },
  waveRef: { current: HTMLElement | null },
) {
  const [live, setLive] = useState(false);
  const contextoRef = useRef<AudioContext | null>(null);
  const analizadorRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);

  const limpiarBarras = useCallback(() => {
    const barras = waveRef.current?.querySelectorAll("i");
    barras?.forEach((barra) => {
      barra.style.transform = "";
    });
  }, [waveRef]);

  const detenerMuestreo = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (waveRef.current) {
      waveRef.current.setAttribute("data-live", "false");
    }
    setLive(false);
  }, [waveRef]);

  const muestrear = useCallback(() => {
    const analizador = analizadorRef.current;
    const contenedor = waveRef.current;
    if (!analizador || !contenedor) {
      return;
    }

    const datos = new Uint8Array(analizador.frequencyBinCount);
    analizador.getByteFrequencyData(datos);

    const barras = contenedor.querySelectorAll("i");
    if (barras.length === 0) {
      return;
    }

    barras.forEach((barra, index) => {
      // Repartir las barras sobre el 70% útil del espectro (agudos pesan poco)
      const bucket = Math.floor((index / barras.length) * datos.length * 0.7);
      const nivel = datos[Math.min(bucket, datos.length - 1)] ?? 0;
      barra.style.transform = escala(index, barras.length, nivel);
    });
  }, [waveRef]);

  const start = useCallback(() => {
    const audio = audioRef.current;
    const contenedor = waveRef.current;
    if (!audio || !contenedor) {
      return;
    }

    const ConstructorAudio =
      (window as VentanaConWebAudio).AudioContext ??
      (window as VentanaConWebAudio).webkitAudioContext;
    if (!ConstructorAudio) {
      detenerMuestreo();
      return;
    }

    try {
      const contexto = (contextoRef.current ??= new ConstructorAudio());
      const fuente = fuentes.get(audio) ?? contexto.createMediaElementSource(audio);
      fuentes.set(audio, fuente);

      const analizador = (analizadorRef.current ??= contexto.createAnalyser());
      analizador.fftSize = 64;
      analizador.smoothingTimeConstant = 0.72;
      fuente.connect(analizador);
      analizador.connect(contexto.destination);

      if (contexto.state === "suspended") {
        void contexto.resume();
      }

      contenedor.setAttribute("data-live", "true");
      setLive(true);

      if (frameRef.current === null && typeof requestAnimationFrame === "function") {
        const paso = () => {
          muestrear();
          frameRef.current = requestAnimationFrame(paso);
        };
        frameRef.current = requestAnimationFrame(paso);
      } else {
        muestrear();
      }
    } catch {
      // Audio cross-origin sin CORS o formato no soportado: cae al decorativo.
      detenerMuestreo();
    }
  }, [audioRef, waveRef, detenerMuestreo, muestrear]);

  const stop = useCallback(() => {
    detenerMuestreo();
    limpiarBarras();
  }, [detenerMuestreo, limpiarBarras]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      analizadorRef.current?.disconnect();
      void contextoRef.current?.close().catch(() => undefined);
      contextoRef.current = null;
      analizadorRef.current = null;
    };
  }, []);

  return { live, start, stop };
}
