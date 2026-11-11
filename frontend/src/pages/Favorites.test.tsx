import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Favorites from "@/pages/Favorites";

const usuario = {
  id: 1,
  nombre: "Juan Pérez",
  correo: "juan.perez@email.com",
  fecha_registro: "2024-01-15T10:30:00Z",
};

const cancion = {
  id: 2,
  titulo: "Stairway to Heaven",
  artista: "Led Zeppelin",
  album: "Led Zeppelin IV",
  duracion: "8:02",
  duracion_segundos: 482,
  duracion_formato: "8:02",
  año: 1971,
  genero: "Rock",
  fecha_creacion: "2024-01-22T10:30:00Z",
  archivo_audio: "/audio/stairway.mp3",
};

class FakeAudioContext {
  static instanciado = false;
  state = "running";
  createMediaElementSource = () => ({
    connect: () => undefined,
    disconnect: () => undefined,
  });
  createAnalyser = () => ({
    fftSize: 0,
    smoothingTimeConstant: 0,
    frequencyBinCount: 16,
    connect: () => undefined,
    disconnect: () => undefined,
    getByteFrequencyData: (data: Uint8Array) => data.fill(200),
  });
  resume = async () => undefined;
  close = async () => undefined;
  constructor() {
    FakeAudioContext.instanciado = true;
  }
}

function stubWebAudio() {
  FakeAudioContext.instanciado = false;
  vi.stubGlobal("AudioContext", FakeAudioContext);
  return FakeAudioContext;
}

function mockFavorites(favorites: unknown[]) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/api/usuarios/1/favoritos")) {
      return { ok: true, json: async () => favorites } as Response;
    }
    if (url.includes("/api/usuarios/1")) {
      return { ok: true, json: async () => usuario } as Response;
    }
    if (url.includes("/api/canciones/2")) {
      return { ok: true, json: async () => cancion } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
}

describe("Favorites", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks the luminous stage as playing while audio plays", async () => {
    mockFavorites([
      {
        id: 7,
        id_usuario: 1,
        id_cancion: 2,
        fecha_marcado: "2024-04-01T10:00:00Z",
        usuario: null,
        cancion: null,
      },
    ]);

    const { container } = render(<Favorites />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Reproducir Stairway to Heaven" }),
    );

    await waitFor(() => {
      expect(container.querySelector(".luminous-stage")).toHaveAttribute(
        "data-playing",
        "true",
      );
    });
  });

  it("streams real audio levels into the luminous waveform", async () => {
    const contexto = stubWebAudio();
    mockFavorites([
      {
        id: 7,
        id_usuario: 1,
        id_cancion: 2,
        fecha_marcado: "2024-04-01T10:00:00Z",
        usuario: null,
        cancion: null,
      },
    ]);

    const { container } = render(<Favorites />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Reproducir Stairway to Heaven" }),
    );

    await waitFor(() => {
      expect(container.querySelector(".luminous-wave")).toHaveAttribute(
        "data-live",
        "true",
      );
    });
    expect(contexto.instanciado).toBe(true);
    expect(container.querySelector("audio")).toHaveAttribute(
      "crossorigin",
      "anonymous",
    );
  });

  it("shows and plays saved music in the luminous archive", async () => {
    mockFavorites([
      {
        id: 7,
        id_usuario: 1,
        id_cancion: 2,
        fecha_marcado: "2024-04-01T10:00:00Z",
        usuario: null,
        cancion: null,
      },
    ]);

    const { container } = render(<Favorites />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Tu archivo luminoso" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Stairway to Heaven" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reproducir Stairway to Heaven" }),
    ).toBeEnabled();
    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      "http://127.0.0.1:8000/audio/stairway.mp3",
    );
    expect(screen.getByText("Led Zeppelin · Led Zeppelin IV · 1971")).toBeInTheDocument();
  });

  it("shows a useful empty state when the user has no saved songs", async () => {
    mockFavorites([]);

    render(<Favorites />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Tu archivo todavía está en silencio" }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Explorar el catálogo" })).toHaveAttribute(
      "href",
      "/canciones",
    );
  });
});
