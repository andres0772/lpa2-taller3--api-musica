import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Favorites from "@/pages/Favorites";
import { AppToaster } from "@/components/AppToaster";

const usuario = {
  id: 1,
  nombre: "Juan Pérez",
  correo: "juan.perez@email.com",
  fecha_registro: "2024-01-15T10:30:00Z",
};

const cancionDos = {
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
  portada: "/portadas/02-stairway-to-heaven.svg",
};

const cancionTres = {
  id: 3,
  titulo: "Billie Jean",
  artista: "Michael Jackson",
  album: "Thriller",
  duracion: "4:54",
  duracion_segundos: 294,
  duracion_formato: "4:54",
  año: 1982,
  genero: "Pop",
  fecha_creacion: "2024-02-01T15:00:00Z",
  archivo_audio: "/audio/billie.mp3",
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
      return { ok: true, json: async () => cancionDos } as Response;
    }
    if (url.includes("/api/canciones/3")) {
      return { ok: true, json: async () => cancionTres } as Response;
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

  it("stops playback when the selected track changes or is removed", async () => {
    stubWebAudio();
    mockFavorites([
      {
        id: 7,
        id_usuario: 1,
        id_cancion: 2,
        fecha_marcado: "2024-04-01T10:00:00Z",
        usuario: null,
        cancion: null,
      },
      {
        id: 8,
        id_usuario: 1,
        id_cancion: 3,
        fecha_marcado: "2024-04-02T10:00:00Z",
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

    fireEvent.click(screen.getByRole("button", { name: /Billie Jean/ }));

    await waitFor(() => {
      expect(container.querySelector(".luminous-stage")).toHaveAttribute(
        "data-playing",
        "false",
      );
    });
    expect(container.querySelector(".luminous-wave")).toHaveAttribute(
      "data-live",
      "false",
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Reproducir Billie Jean" }),
    );
    await waitFor(() => {
      expect(container.querySelector(".luminous-stage")).toHaveAttribute(
        "data-playing",
        "true",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Quitar de favoritos" }));

    await waitFor(() => {
      expect(container.querySelector(".luminous-stage")).toHaveAttribute(
        "data-playing",
        "false",
      );
    });
    expect(container.querySelector(".luminous-wave")).toHaveAttribute(
      "data-live",
      "false",
    );
  });

  it("confirms removing the selected favorite with a toast", async () => {
    stubWebAudio();
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

    render(
      <>
        <Favorites />
        <AppToaster />
      </>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Quitar de favoritos" }),
    );

    expect(await screen.findByText("Canción quitada de favoritos")).toBeInTheDocument();
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

  it("plays the next favorite from the archive queue", async () => {
    mockFavorites([
      {
        id: 7,
        id_usuario: 1,
        id_cancion: 2,
        fecha_marcado: "2024-04-01T10:00:00Z",
        usuario: null,
        cancion: null,
      },
      {
        id: 8,
        id_usuario: 1,
        id_cancion: 3,
        fecha_marcado: "2024-04-02T10:00:00Z",
        usuario: null,
        cancion: null,
      },
    ]);

    const { container } = render(<Favorites />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Canción siguiente a Stairway to Heaven",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Billie Jean" }),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(container.querySelector(".luminous-stage")).toHaveAttribute(
        "data-playing",
        "true",
      );
    });
    expect(
      screen.getByRole("button", { name: "Pausar Billie Jean" }),
    ).toBeInTheDocument();
  });

  it("plays the previous favorite wrapping around the queue", async () => {
    mockFavorites([
      {
        id: 7,
        id_usuario: 1,
        id_cancion: 2,
        fecha_marcado: "2024-04-01T10:00:00Z",
        usuario: null,
        cancion: null,
      },
      {
        id: 8,
        id_usuario: 1,
        id_cancion: 3,
        fecha_marcado: "2024-04-02T10:00:00Z",
        usuario: null,
        cancion: null,
      },
    ]);

    const { container } = render(<Favorites />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Canción anterior a Stairway to Heaven",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Billie Jean" }),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(container.querySelector(".luminous-stage")).toHaveAttribute(
        "data-playing",
        "true",
      );
    });
  });

  it("exposes a seek bar in the now card", async () => {
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

    render(<Favorites />);

    const barra = await screen.findByLabelText(
      "Buscar posición dentro de la canción",
    );
    expect(barra).toBeDisabled();
  });

  it("shows the generated cover in the now card, keeping the card clean without one", async () => {
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
    await screen.findByRole("heading", { name: "Stairway to Heaven" });

    expect(container.querySelector(".now-card img")).toHaveAttribute(
      "src",
      "http://127.0.0.1:8000/portadas/02-stairway-to-heaven.svg",
    );
  });

  it("keeps the now card image-free when the song has no cover", async () => {
    mockFavorites([
      {
        id: 8,
        id_usuario: 1,
        id_cancion: 3,
        fecha_marcado: "2024-04-02T10:00:00Z",
        usuario: null,
        cancion: null,
      },
    ]);

    const { container } = render(<Favorites />);
    await screen.findByRole("heading", { name: "Billie Jean" });

    expect(container.querySelector(".now-card img")).toBeNull();
  });
});
