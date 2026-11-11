import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarqueeCards } from "@/components/MarqueeCards";

describe("MarqueeCards", () => {
  it("renders the label and song metadata in the repeated track", () => {
    render(
      <MarqueeCards
        direction="left"
        label="Descubriendo ahora"
        items={[
          {
            id: 1,
            titulo: "Bohemian Rhapsody",
            artista: "Queen",
            genero: "Rock",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Descubriendo ahora" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Bohemian Rhapsody")).toHaveLength(2);
    expect(screen.getAllByText("Queen")).toHaveLength(2);
    expect(screen.getAllByText("Rock")).toHaveLength(2);
  });
});
