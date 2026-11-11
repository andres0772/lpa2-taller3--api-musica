import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

describe("App", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
    vi.unstubAllGlobals();
  });

  it("opens the luminous favorites view at /favoritos", () => {
    window.history.pushState({}, "", "/favoritos");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/favoritos")) {
          return { ok: true, json: async () => [] } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );

    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Tu archivo luminoso" }),
    ).toBeInTheDocument();
  });
});
