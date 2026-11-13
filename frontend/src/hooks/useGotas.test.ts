import { act, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INTERVALO_MINIMO_GOTAS_MS,
  MAX_GOTAS_VIVAS,
  useGotas,
  type OpcionesGotas,
} from "./useGotas";

// Sin JSX para que la prueba viva en .ts, igual que el resto de los hooks.
function Escena({ opciones }: { opciones?: OpcionesGotas }) {
  const escenaRef = useGotas<HTMLDivElement>(opciones);

  return createElement("div", {
    ref: escenaRef,
    className: "login-stage",
    "data-testid": "escena",
  });
}

function montarEscena(opciones?: OpcionesGotas) {
  return render(createElement(Escena, { opciones }));
}

/** El puntero se mueve como evento de tipo pointermove con coordenadas reales. */
function moverEscena(escena: HTMLElement, x: number, y: number) {
  act(() => {
    escena.dispatchEvent(
      new MouseEvent("pointermove", { clientX: x, clientY: y, bubbles: true }),
    );
  });
}

/** Deja correr un fotograma para que el throttle por rAF cree la gota. */
async function fotograma() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 24));
  });
}

function gotasVivas() {
  return document.querySelectorAll(".login-drop").length;
}

describe("useGotas", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("keeps the documented budget of live drops and of time between them", () => {
    expect(INTERVALO_MINIMO_GOTAS_MS).toBe(90);
    expect(MAX_GOTAS_VIVAS).toBe(12);
  });

  it("creates one animated node per move and destroys it when it ends", async () => {
    montarEscena({ ahora: () => 0 });
    const escena = screen.getByTestId("escena");

    moverEscena(escena, 40, 60);
    await fotograma();

    const gotas = escena.querySelectorAll<HTMLElement>(".login-drop");
    expect(gotas).toHaveLength(1);
    expect(gotas[0]).toHaveAttribute("aria-hidden", "true");
    expect(gotas[0].style.left).toBe("40px");
    expect(gotas[0].style.top).toBe("60px");

    act(() => {
      gotas[0].dispatchEvent(new Event("animationend", { bubbles: true }));
    });

    expect(gotasVivas()).toBe(0);
  });

  it("waits at least 90ms between drops", async () => {
    let reloj = 0;
    montarEscena({ ahora: () => reloj });
    const escena = screen.getByTestId("escena");

    moverEscena(escena, 10, 10);
    await fotograma();
    expect(gotasVivas()).toBe(1);

    reloj = 50;
    moverEscena(escena, 20, 20);
    await fotograma();
    expect(gotasVivas()).toBe(1);

    reloj = 89;
    moverEscena(escena, 30, 30);
    await fotograma();
    expect(gotasVivas()).toBe(1);

    reloj = 90;
    moverEscena(escena, 40, 40);
    await fotograma();
    expect(gotasVivas()).toBe(2);
  });

  it("never keeps more than 12 drops alive", async () => {
    let reloj = 0;
    montarEscena({ ahora: () => reloj });
    const escena = screen.getByTestId("escena");

    for (let indice = 0; indice < 20; indice += 1) {
      reloj = indice * 200;
      moverEscena(escena, indice, indice);
      await fotograma();
    }

    expect(gotasVivas()).toBe(MAX_GOTAS_VIVAS);
  });

  it("stays off when the user prefers reduced motion", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));

    montarEscena();
    const escena = screen.getByTestId("escena");

    moverEscena(escena, 15, 15);
    await fotograma();

    expect(gotasVivas()).toBe(0);
  });

  it("removes its drops when the scene unmounts", async () => {
    const { unmount } = montarEscena({ ahora: () => 0 });
    const escena = screen.getByTestId("escena");

    moverEscena(escena, 12, 12);
    await fotograma();
    expect(gotasVivas()).toBe(1);

    unmount();

    expect(gotasVivas()).toBe(0);
  });
});
