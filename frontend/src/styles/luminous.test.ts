import luminousCss from "./luminous.css?raw";
import { describe, expect, it } from "vitest";

function ruleBody(selector: string): string {
  const match = luminousCss.match(
    new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`),
  );
  expect(match, `missing CSS rule for ${selector}`).not.toBeNull();
  return match?.[1] ?? "";
}

describe("luminous layout", () => {
  it("centers the stage between symmetric side columns", () => {
    const layout = ruleBody(".luminous-layout");
    const columns = layout.match(
      /grid-template-columns:\s*(\d+)px minmax\(0, 1fr\) (\d+)px;/,
    );
    expect(columns, "missing grid-template-columns").not.toBeNull();
    expect(columns?.[1]).toBe(columns?.[2]);
    expect(layout).toContain("align-items: center");
  });

  it("keeps the disc and orbits inside the centered stage", () => {
    const stage = ruleBody(".luminous-stage");
    expect(stage).toContain("place-items: center");

    const orbit = ruleBody(".luminous-orbit");
    expect(orbit).toMatch(/width:\s*min\(520px, 100%\)/);

    const disc = ruleBody(".luminous-disc");
    expect(disc).toContain("position: relative");
  });
});
