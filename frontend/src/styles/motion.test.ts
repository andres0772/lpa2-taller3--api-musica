import cinematicCss from "./cinematic.css?raw";
import luminousCss from "./luminous.css?raw";
import { describe, expect, it } from "vitest";

const styles: Array<[string, string]> = [
  ["cinematic", cinematicCss],
  ["luminous", luminousCss],
];

describe("playback motion", () => {
  it("spins the vinyl records only while playing", () => {
    expect(cinematicCss).toMatch(
      /\.performance\[data-playing="true"\] \.vinyl-record\s*\{[^}]*animation:\s*cinematic-vinyl-spin/,
    );
    expect(luminousCss).toMatch(
      /\.luminous-stage\[data-playing="true"\] \.luminous-disc\s*\{[^}]*animation:\s*luminous-disc-spin/,
    );
    expect(cinematicCss).toContain("@keyframes cinematic-vinyl-spin");
    expect(luminousCss).toContain("@keyframes luminous-disc-spin");
  });

  it("animates the waveforms only while playing", () => {
    expect(cinematicCss).toMatch(
      /\.performance\[data-playing="true"\] \.waveform:not\(\[data-live="true"\]\) i\s*\{([^}]*animation:)/s,
    );
    expect(luminousCss).toMatch(
      /\.luminous-wave\[data-playing="true"\]:not\(\[data-live="true"\]\) i\s*\{([^}]*animation:)/s,
    );
    expect(cinematicCss).toContain("@keyframes cinematic-bar-bounce");
    expect(luminousCss).toContain("@keyframes luminous-bar-bounce");
  });

  it("floats the luminous orbits and glyphs with composited transforms", () => {
    expect(luminousCss).toMatch(
      /\.luminous-orbit\s*\{[^}]*animation:\s*luminous-orbit-pulse/,
    );
    expect(luminousCss).toMatch(
      /\.glyph-one\s*\{[^}]*animation:\s*luminous-glyph-float/,
    );
    expect(luminousCss).toContain("@keyframes luminous-glyph-float");
    expect(luminousCss).toContain("@keyframes luminous-orbit-pulse");
  });

  it("keeps every animation on transform or opacity only", () => {
    for (const [name, css] of styles) {
      const keyframes = css.match(/@keyframes[^}]*\{[^@]*?\}\s*\}/g) ?? [];
      for (const block of keyframes) {
        const animated = block.match(/^\s*(transform|opacity):/gm) ?? [];
        const others = block
          .replace(/@keyframes[^{]*\{/, "")
          .match(/^\s*[a-z-]+:/gm)
          ?.filter((property) => !property.trim().startsWith("transform") && !property.trim().startsWith("opacity")) ?? [];
        expect(animated.length, `${name} animates something`).toBeGreaterThan(0);
        expect(others, `${name} keyframes stay on transform/opacity`).toHaveLength(0);
      }
    }
  });

  it("respects prefers-reduced-motion on both stylesheets", () => {
    for (const [name, css] of styles) {
      expect(css, name).toMatch(
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration: 0\.01ms !important/,
      );
    }
  });
});
