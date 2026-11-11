import { render, screen, within } from "@testing-library/react";
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
      "#discovery",
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
      await within(discovery).findByRole("link", { name: /Billie Jean/ }),
    ).toBeInTheDocument();
    expect(
      await within(discovery).findByRole("link", { name: /Take Five/ }),
    ).toBeInTheDocument();
    expect(
      await within(discovery).findByRole("link", { name: /One More Time/ }),
    ).toBeInTheDocument();
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
