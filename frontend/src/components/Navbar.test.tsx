import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Navbar } from "@/components/Navbar";

describe("Navbar", () => {
  it("renders the primary navigation and account actions", () => {
    render(<Navbar />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "#");
    expect(screen.getByRole("link", { name: "Canciones" })).toHaveAttribute(
      "href",
      "#",
    );
    expect(screen.getByRole("link", { name: "Favoritos" })).toHaveAttribute(
      "href",
      "#",
    );
    expect(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regístrate" })).toBeInTheDocument();
  });
});
