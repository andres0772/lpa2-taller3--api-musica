import { render, screen, waitFor, within } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/pages/Home";

const canciones = [
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
    archivo_audio: "/audio/01-bohemian-rhapsody.mp3",
    portada: null,
  },
  {
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
    archivo_audio: "/audio/03-billie-jean.mp3",
  },
  {
    id: 8,
    titulo: "Take Five",
    artista: "Dave Brubeck",
    album: "Time Out",
    duracion: "5:24",
    duracion_segundos: 324,
    duracion_formato: "5:24",
    año: 1959,
    genero: "Jazz",
    fecha_creacion: "2024-01-20T10:30:00Z",
    archivo_audio: "/audio/08-take-five.mp3",
    portada: null,
  },
  {
    id: 9,
    titulo: "One More Time",
    artista: "Daft Punk",
    album: "Discovery",
    duracion: "5:20",
    duracion_segundos: 320,
    duracion_formato: "5:20",
    año: 2000,
    genero: "Electronic",
    fecha_creacion: "2024-04-10T16:45:00Z",
    archivo_audio: "/audio/09-one-more-time.mp3",
    portada: null,
  },
];

describe("Home", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => canciones,
      }),
    );
  });

  it("marks the hero player as playing while audio plays", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
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
            archivo_audio: "/audio/bohemian.mp3",
          },
        ],
      }),
    );

    const { container } = render(<Home />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Reproducir Bohemian Rhapsody" }),
    );

    await waitFor(() => {
      expect(container.querySelector(".performance")).toHaveAttribute(
        "data-playing",
        "true",
      );
    });
  });

  it("streams real audio levels into the hero waveform", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
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
            archivo_audio: "/audio/01-bohemian-rhapsody.mp3",
          },
        ],
      }),
    );
    vi.stubGlobal("AudioContext", function FakeAudioContext() {
      return {
        state: "running",
        createMediaElementSource: () => ({
          connect: () => undefined,
          disconnect: () => undefined,
        }),
        createAnalyser: () => ({
          fftSize: 0,
          smoothingTimeConstant: 0,
          frequencyBinCount: 16,
          connect: () => undefined,
          disconnect: () => undefined,
          getByteFrequencyData: (data: Uint8Array) => data.fill(200),
        }),
        resume: async () => undefined,
        close: async () => undefined,
      };
    });

    const { container } = render(<Home />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Reproducir Bohemian Rhapsody" }),
    );

    await waitFor(() => {
      expect(container.querySelector(".waveform")).toHaveAttribute(
        "data-live",
        "true",
      );
    });
    expect(container.querySelector("audio")).toHaveAttribute(
      "crossorigin",
      "anonymous",
    );
  });

  it("stops playback when another track becomes the featured song", async () => {
    vi.stubGlobal(
      "AudioContext",
      function FakeAudioContext() {
        return {
          state: "running",
          createMediaElementSource: () => ({
            connect: () => undefined,
            disconnect: () => undefined,
          }),
          createAnalyser: () => ({
            fftSize: 0,
            smoothingTimeConstant: 0,
            frequencyBinCount: 16,
            connect: () => undefined,
            disconnect: () => undefined,
            getByteFrequencyData: (data: Uint8Array) => data.fill(200),
          }),
          resume: async () => undefined,
          close: async () => undefined,
        };
      },
    );

    const { container } = render(<Home />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Reproducir Bohemian Rhapsody" }),
    );
    await waitFor(() => {
      expect(container.querySelector(".performance")).toHaveAttribute(
        "data-playing",
        "true",
      );
    });

    fireEvent.click(await screen.findByRole("button", { name: /Billie Jean/ }));

    await waitFor(() => {
      expect(container.querySelector(".performance")).toHaveAttribute(
        "data-playing",
        "false",
      );
    });
    expect(container.querySelector(".waveform")).toHaveAttribute(
      "data-live",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Reproducir Billie Jean" }),
    ).toBeInTheDocument();
  });

  it("renders the cinematic landing experience", async () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Tu banda sonora en movimiento.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Un espacio para escuchar distinto")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explorar canciones/ })).toHaveAttribute(
      "href",
      "/canciones",
    );
    expect(screen.getByRole("link", { name: /Ver favoritos/ })).toHaveAttribute(
      "href",
      "/favoritos",
    );
    expect(
      within(
        screen.getByRole("region", { name: "Canción destacada" }),
      ).getByRole("heading", { name: "Bohemian Rhapsody" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/10 canciones demo/)).toBeInTheDocument();
    expect(containerVideoCount()).toBe(0);
  });

  it("renders the editorial collection as a lead card and secondary cards", async () => {
    render(<Home />);

    const discovery = screen.getByRole("region", { name: "Descubriendo ahora" });
    expect(
      within(discovery).getByRole("heading", { name: "Descubriendo ahora" }),
    ).toBeInTheDocument();
    expect(
      within(discovery).getByRole("heading", { name: "Bohemian Rhapsody" }),
    ).toBeInTheDocument();
    expect(
      await within(discovery).findByRole("button", { name: /Billie Jean/ }),
    ).toBeInTheDocument();
    expect(
      await within(discovery).findByRole("button", { name: /Take Five/ }),
    ).toBeInTheDocument();
    expect(
      await within(discovery).findByRole("button", { name: /One More Time/ }),
    ).toBeInTheDocument();
  });

  it("selects the featured track from the editorial cards", async () => {
    render(<Home />);

    const player = screen.getByRole("region", { name: "Canción destacada" });
    expect(
      within(player).getByRole("heading", { name: "Bohemian Rhapsody" }),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /Billie Jean/ }));

    await waitFor(() => {
      expect(
        within(player).getByRole("heading", { name: "Billie Jean" }),
      ).toBeInTheDocument();
    });
  });

  it("uses the generated covers on the editorial cards, with a placeholder fallback", async () => {
    const conPortada = canciones.map((song, index) => ({
      ...song,
      portada: `/portadas/0${index + 1}-demo.svg`,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => conPortada,
      }),
    );

    const { container, unmount } = render(<Home />);
    await screen.findByRole("button", { name: /Billie Jean/ });

    expect(container.querySelector(".lead-art img")).toHaveAttribute(
      "src",
      "http://127.0.0.1:8000/portadas/01-demo.svg",
    );
    expect(container.querySelector(".secondary-cover img")).toHaveAttribute(
      "src",
      "http://127.0.0.1:8000/portadas/02-demo.svg",
    );
    unmount();

    // Sin portada se mantiene el placeholder visual actual: nunca un <img> roto.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => canciones,
      }),
    );
    const sinPortada = render(<Home />);
    await screen.findByRole("button", { name: /Billie Jean/ });

    expect(sinPortada.container.querySelector(".lead-art img")).toBeNull();
    expect(sinPortada.container.querySelector(".lead-art svg")).toBeInTheDocument();
    expect(
      sinPortada.container.querySelector(".secondary-cover img"),
    ).toBeNull();
  });

  it("plays the next track from the queue when pressing next", async () => {
    const { container } = render(<Home />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Reproducir Bohemian Rhapsody" }),
    );
    await waitFor(() => {
      expect(container.querySelector(".performance")).toHaveAttribute(
        "data-playing",
        "true",
      );
    });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Canción siguiente a Bohemian Rhapsody",
      }),
    );

    await waitFor(() => {
      expect(
        within(
          screen.getByRole("region", { name: "Canción destacada" }),
        ).getByRole("heading", { name: "Billie Jean" }),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(container.querySelector(".performance")).toHaveAttribute(
        "data-playing",
        "true",
      );
    });
    expect(
      screen.getByRole("button", { name: "Pausar Billie Jean" }),
    ).toBeInTheDocument();
  });

  it("plays the previous track from the queue when pressing previous", async () => {
    const { container } = render(<Home />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Canción anterior a Bohemian Rhapsody",
      }),
    );

    await waitFor(() => {
      expect(
        within(
          screen.getByRole("region", { name: "Canción destacada" }),
        ).getByRole("heading", { name: "One More Time" }),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(container.querySelector(".performance")).toHaveAttribute(
        "data-playing",
        "true",
      );
    });
  });

  it("exposes a seek bar in the hero player", async () => {
    render(<Home />);

    const barra =
      await screen.findByLabelText("Buscar posición dentro de la canción");
    expect(barra).toBeDisabled();
  });

  it("keeps the editorial collection free of dead anchors", async () => {
    render(<Home />);

    await screen.findAllByRole("heading", { name: "Bohemian Rhapsody" });
    expect(document.querySelector('a[href="#featured"]')).toBeNull();
  });

  it("offers a favorites destination in the primary navigation", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "Favoritos" })).toHaveAttribute(
      "href",
      "/favoritos",
    );
  });
});

function containerVideoCount() {
  return document.querySelectorAll("video").length;
}
