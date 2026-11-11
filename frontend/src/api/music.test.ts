import { describe, expect, it } from "vitest";
import { audioUrl } from "./music";

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
});
