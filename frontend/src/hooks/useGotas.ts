import { useEffect, useRef, type RefObject } from "react";

/** Milisegundos mínimos entre gotas: mantiene el trabajo del compositor bajo. */
export const INTERVALO_MINIMO_GOTAS_MS = 90;

/** Tope de gotas vivas al mismo tiempo sobre la escena. */
export const MAX_GOTAS_VIVAS = 12;

export interface OpcionesGotas {
  /** Milisegundos mínimos entre gotas (por defecto 90). */
  intervaloMinimoMs?: number;
  /** Tope de gotas vivas (por defecto 12). */
  maxVivas?: number;
  /** Reloj inyectable, para probar el throttle sin depender del reloj real. */
  ahora?: () => number;
}

/**
 * Engancha las gotas a una escena concreta y devuelve la función de
 * limpieza. Fuera del hook para que el elemento llegue sin nulidad.
 */
function conectarGotas(
  escena: HTMLElement,
  config: RefObject<OpcionesGotas>,
): () => void {
  let vivas = 0;
  let ultima = Number.NEGATIVE_INFINITY;
  let frame = 0;

  function crearGota(x: number, y: number) {
    frame = 0;
    const { maxVivas = MAX_GOTAS_VIVAS } = config.current ?? {};
    if (vivas >= maxVivas) {
      return;
    }

    const gota = document.createElement("span");
    gota.className = "login-drop";
    gota.setAttribute("aria-hidden", "true");
    gota.style.left = `${x}px`;
    gota.style.top = `${y}px`;
    // La gota se borra sola al terminar su animación: sin temporizadores.
    gota.addEventListener(
      "animationend",
      () => {
        gota.remove();
        vivas -= 1;
      },
      { once: true },
    );

    escena.appendChild(gota);
    vivas += 1;
  }

  function alMover(evento: PointerEvent) {
    const {
      intervaloMinimoMs = INTERVALO_MINIMO_GOTAS_MS,
      maxVivas = MAX_GOTAS_VIVAS,
      ahora = () => performance.now(),
    } = config.current ?? {};
    const marca = ahora();
    if (marca - ultima < intervaloMinimoMs || vivas >= maxVivas) {
      return;
    }
    ultima = marca;

    const caja = escena.getBoundingClientRect();
    const x = evento.clientX - caja.left;
    const y = evento.clientY - caja.top;
    if (frame) {
      cancelAnimationFrame(frame);
    }
    frame = requestAnimationFrame(() => crearGota(x, y));
  }

  escena.addEventListener("pointermove", alMover);

  return () => {
    escena.removeEventListener("pointermove", alMover);
    if (frame) {
      cancelAnimationFrame(frame);
    }
    escena.querySelectorAll(".login-drop").forEach((gota) => gota.remove());
    vivas = 0;
  };
}

/**
 * Gotas al pasar el puntero sobre una escena: un nodo por gota, animado solo
 * con `transform`/`opacity` (`.login-drop`), creado con throttle por rAF y
 * autodestruido al terminar la animación. Nada de canvas ni de blur animado,
 * y apagado por completo con `prefers-reduced-motion`.
 */
export function useGotas<T extends HTMLElement>(
  opciones: OpcionesGotas = {},
): RefObject<T | null> {
  const escenaRef = useRef<T | null>(null);
  const config = useRef(opciones);
  config.current = opciones;

  useEffect(() => {
    const escena = escenaRef.current;
    if (!escena) {
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    return conectarGotas(escena, config);
  }, []);

  return escenaRef;
}
