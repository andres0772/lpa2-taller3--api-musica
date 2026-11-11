import { describe, expect, it, vi } from "vitest";
import { audioUrl, quitarFavorito } from "./music";

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
});
