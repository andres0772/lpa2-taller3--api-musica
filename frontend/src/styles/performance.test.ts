import cinematicCss from "./cinematic.css?raw";
import luminousCss from "./luminous.css?raw";
import { describe, expect, it } from "vitest";

function ruleBody(css: string, selector: string): string {
  const match = css.match(
    new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`),
  );
  expect(match, `missing CSS rule for ${selector}`).not.toBeNull();
  return match?.[1] ?? "";
}

function durationSeconds(rule: string, animationName: string): number {
  const match = rule.match(
    new RegExp(`animation:\\s*${animationName}\\s+([\\d.]+)s`),
  );
  expect(match, `missing animation ${animationName}`).not.toBeNull();
  return Number(match?.[1]);
}

describe("scroll and interaction performance", () => {
  it("keeps backdrop blur off repeated and animated surfaces", () => {
    for (const [name, css] of [
      ["cinematic", cinematicCss],
      ["luminous", luminousCss],
    ] as const) {
      const blurred = css.match(/backdrop-filter:[^;]+;/g) ?? [];
      expect(blurred.length, `${name} blur budget`).toBeLessThanOrEqual(5);

      for (const selector of [".song-card", ".floating-glyph"]) {
        const body = css.match(
          new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`),
        )?.[1];
        if (body) {
          expect(body, `${name} ${selector} must not blur`).not.toContain(
            "backdrop-filter",
          );
        }
      }
    }
  });

  it("promotes the large decorative layers to their own compositor layers", () => {
    const promotions: Array<[string, string]> = [
      [luminousCss, ".luminous-disc"],
      [luminousCss, ".luminous-orbit"],
      [cinematicCss, ".vinyl-record"],
    ];
    for (const [css, selector] of promotions) {
      expect(ruleBody(css, selector), `${selector} is promoted`).toContain(
        "will-change: transform",
      );
    }
  });

  it("keeps ambient motion slow so the compositor idles", () => {
    expect(durationSeconds(ruleBody(luminousCss, ".luminous-orbit"), "luminous-orbit-pulse")).toBeGreaterThanOrEqual(12);

    for (const selector of [".glyph-one", ".glyph-two"]) {
      expect(
        durationSeconds(ruleBody(luminousCss, selector), "luminous-glyph-float"),
      ).toBeGreaterThanOrEqual(8);
    }
  });
});

describe("favorites visual balance", () => {
  it("centers both flanks around the disc axis", () => {
    expect(ruleBody(luminousCss, ".archive-index")).toContain("align-self: center");
    expect(ruleBody(luminousCss, ".now-playing")).toContain("justify-content: center");
  });

  it("gives the archive index the same panel weight as the now-playing card", () => {
    const index = ruleBody(luminousCss, ".archive-index");
    const nowCard =
      luminousCss.match(/\.now-card,[^}]*\{([^}]*)\}/)?.[1] ?? "";
    expect(index).toContain("border:");
    expect(index).toContain("background:");
    expect(index.split("\n").length).toBeGreaterThan(3);
    expect(nowCard).toContain("border:");
  });

  it("sizes the disc as the clear center of the stage", () => {
    const disc = ruleBody(luminousCss, ".luminous-disc");
    const width = disc.match(/width:\s*(\d+)px/);
    expect(width).not.toBeNull();
    expect(Number(width?.[1])).toBeGreaterThanOrEqual(380);
  });
});
