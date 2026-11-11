import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Explore from "@/pages/Explore";
import { AppToaster } from "@/components/AppToaster";

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
    archivo_audio: null,
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
    fecha_creacion: "2024-01-17T10:30:00Z",
    archivo_audio: null,
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
    archivo_audio: null,
  },
];

function mockApi(options: {
  canciones?: unknown[];
  buscar?: unknown[];
  fail?: boolean;
} = {}) {
  const songs = options.canciones ?? canciones;
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    if (options.fail) {
      throw new Error("API caída");
    }
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST" && url.includes("/api/usuarios/1/favoritos/1")) {
      return { ok: true, json: async () => ({ id: 99, id_usuario: 1, id_cancion: 1 }) } as Response;
    }
    if (method === "DELETE" && url.includes("/api/usuarios/1/favoritos/1")) {
      return { ok: true, status: 204, json: async () => undefined } as Response;
    }
    if (url.includes("/api/canciones/buscar")) {
      return { ok: true, json: async () => options.buscar ?? songs } as Response;
    }
    if (url.includes("/api/canciones")) {
      return { ok: true, json: async () => songs } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Explore", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("confirms favorites changes with toasts", async () => {
    const fetchMock = mockApi();

    render(
      <>
        <Explore />
        <AppToaster />
      </>,
    );
    await screen.findByRole("heading", { name: "Bohemian Rhapsody" });

    fireEvent.click(screen.getByRole("button", { name: 'Guardar "Bohemian Rhapsody" en favoritos' }));
    expect(await screen.findByText("Canción guardada en favoritos")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: 'Quitar "Bohemian Rhapsody" de favoritos' }));
    expect(await screen.findByText("Canción quitada de favoritos")).toBeInTheDocument();

    expect(fetchMock.mock.calls.some((call) => (call[1] as RequestInit | undefined)?.method === "DELETE")).toBe(true);
  });

  it("lists the catalog from the API", async () => {
    const fetchMock = mockApi();

    render(<Explore />);

    expect(await screen.findByRole("heading", { name: "Bohemian Rhapsody" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Billie Jean" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Take Five" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Audio no disponible para Bohemian Rhapsody" }),
    ).toBeDisabled();
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/canciones?page=1&page_size=12");
  });

  it("searches the catalog through the API filters", async () => {
    const fetchMock = mockApi();

    render(<Explore />);
    await screen.findByRole("heading", { name: "Bohemian Rhapsody" });

    fireEvent.change(screen.getByLabelText("Buscar por título o artista"), {
      target: { value: "queen" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      const buscarCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes("/api/canciones/buscar"),
      );
      expect(buscarCall?.[0]).toContain("titulo=queen");
    });
  });

  it("filters the catalog by genre", async () => {
    const fetchMock = mockApi();

    render(<Explore />);
    await screen.findByRole("heading", { name: "Bohemian Rhapsody" });

    fireEvent.change(screen.getByLabelText("Género"), { target: { value: "Pop" } });

    await waitFor(() => {
      const buscarCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes("/api/canciones/buscar"),
      );
      expect(buscarCall?.[0]).toContain("genero=Pop");
    });
  });

  it("paginates the catalog", async () => {
    const fetchMock = mockApi();

    render(<Explore />);
    await screen.findByRole("heading", { name: "Bohemian Rhapsody" });

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.at(-1)?.[0]).toContain("page=2");
    });
  });

  it("shows an empty state when the search has no results", async () => {
    mockApi({ buscar: [] });

    render(<Explore />);

    fireEvent.change(screen.getByLabelText("Buscar por título o artista"), {
      target: { value: "zzz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText(/no encontramos canciones/i)).toBeInTheDocument();
  });

  it("offers a retry when the API is unavailable", async () => {
    const fetchMock = mockApi({ fail: true });

    render(<Explore />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it("saves a song to favorites from the catalog", async () => {
    const fetchMock = mockApi();

    render(<Explore />
    );
    await screen.findByRole("heading", { name: "Bohemian Rhapsody" });

    fireEvent.click(screen.getByRole("button", { name: 'Guardar "Bohemian Rhapsody" en favoritos' }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        (call) => (call[1] as RequestInit | undefined)?.method === "POST",
      );
      expect(String(postCall?.[0])).toContain("/api/usuarios/1/favoritos/1");
    });
    expect(
      await screen.findByRole("button", { name: 'Quitar "Bohemian Rhapsody" de favoritos' }),
    ).toBeInTheDocument();
  });

  it("exposes the catalog as the main navigation destination", () => {
    mockApi();

    const { container } = render(<Explore />);
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });

    expect(within(nav).getByRole("link", { name: "Canciones" })).toHaveAttribute(
      "href",
      "/canciones",
    );
    expect(container.querySelector(".explore-page")).toBeInTheDocument();
  });
});
