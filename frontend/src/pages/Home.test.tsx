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
    año: 1975,
    genero: "Rock",
    archivo_audio: null,
  },
  {
    id: 3,
    titulo: "Billie Jean",
    artista: "Michael Jackson",
    album: "Thriller",
    duracion: "4:54",
    año: 1982,
    genero: "Pop",
    archivo_audio: null,
  },
  {
    id: 8,
    titulo: "Take Five",
    artista: "Dave Brubeck",
    album: "Time Out",
    duracion: "5:24",
    año: 1959,
    genero: "Jazz",
    archivo_audio: null,
  },
  {
    id: 9,
    titulo: "One More Time",
    artista: "Daft Punk",
    album: "Discovery",
    duracion: "5:20",
    año: 2000,
    genero: "Electronic",
    archivo_audio: null,
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
