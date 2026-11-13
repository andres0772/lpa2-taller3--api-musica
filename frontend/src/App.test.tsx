import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

describe("App", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
    vi.unstubAllGlobals();
  });

  it("opens the luminous favorites view at /favoritos", async () => {
    window.history.pushState({}, "", "/favoritos");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/favoritos")) {
          return { ok: true, json: async () => [] } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );

    render(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tu archivo luminoso" }),
    ).toBeInTheDocument();
  });

  it("opens the login view at /login", async () => {
    window.history.pushState({}, "", "/login");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/api/canciones")) {
          return { ok: true, json: async () => [] } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );

    render(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tu banda sonora, contigo." }),
    ).toBeInTheDocument();
  });

  it("opens the songs exploration view at /canciones", async () => {
    window.history.pushState({}, "", "/canciones");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/api/canciones")) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                titulo: "Bohemian Rhapsody",
                artista: "Queen",
                album: "A Night at the Opera",
                duracion: "5:55",
                duracion_segundos: 355,
                duracion_formato: "5:55",
                año: 1975,
                genero: "Rock",
                fecha_creacion: "2024-01-15T10:30:00Z",
                archivo_audio: null,
              },
            ],
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );

    render(<App />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Explorar canciones" }),
    ).toBeInTheDocument();
  });
});
