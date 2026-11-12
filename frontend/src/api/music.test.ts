import { describe, expect, it, vi } from "vitest";
import { ApiError, audioUrl, buscarCanciones, crearFavorito, portadaUrl, quitarFavorito } from "./music";

describe("audioUrl", () => {
  it("resolves the API's relative audio paths against the API origin", () => {
    expect(audioUrl("/audio/01-bohemian-rhapsody.mp3")).toBe(
      "http://127.0.0.1:8000/audio/01-bohemian-rhapsody.mp3",
    );
  });

  it("keeps absolute URLs untouched", () => {
    expect(audioUrl("https://cdn.example.com/x.mp3")).toBe(
      "https://cdn.example.com/x.mp3",
    );
  });

  it("returns null when the song has no audio", () => {
    expect(audioUrl(null)).toBeNull();
  });

  it("resolves remove-favorite on 204 No Content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 204,
        headers: new Headers(),
        text: async () => "",
        json: async () => {
          throw new SyntaxError("Unexpected end of JSON input");
        },
      })),
    );

    await expect(quitarFavorito(1, 2)).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("searches title and artist together in either-or mode", async () => {
    const fetchMock = vi.fn<
      (input: string | URL | Request) => Promise<{ ok: boolean; json: () => Promise<never[]> }>
    >(async () => ({
      ok: true,
      json: async () => [],
    }));
    vi.stubGlobal("fetch", fetchMock);

    await buscarCanciones({ titulo: "brubeck", artista: "brubeck", modo: "cualquiera" });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("titulo=brubeck");
    expect(url).toContain("artista=brubeck");
    expect(url).toContain("modo=cualquiera");
    vi.unstubAllGlobals();
  });

  it("carries the API's honest message when a favorite is a duplicate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({
          detail: "Esta canción ya está en favoritos de este usuario",
        }),
      })),
    );

    const error = await crearFavorito(1, 2).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).estado).toBe(409);
    expect((error as ApiError).detalle).toBe(
      "Esta canción ya está en favoritos de este usuario",
    );
    vi.unstubAllGlobals();
  });
});

describe("portadaUrl", () => {
  it("resolves the API's relative cover paths against the API origin", () => {
    expect(portadaUrl("/portadas/01-bohemian-rhapsody.svg")).toBe(
      "http://127.0.0.1:8000/portadas/01-bohemian-rhapsody.svg",
    );
  });

  it("keeps absolute URLs untouched", () => {
    expect(portadaUrl("https://cdn.example.com/cover.svg")).toBe(
      "https://cdn.example.com/cover.svg",
    );
  });

  it("returns null when the song has no cover", () => {
    expect(portadaUrl(null)).toBeNull();
  });
});
