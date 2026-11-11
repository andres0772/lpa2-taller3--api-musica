import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Navbar } from "@/components/Navbar";

describe("Navbar", () => {
  it("renders the primary navigation and account actions", () => {
    render(<Navbar />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Canciones" })).toHaveAttribute(
      "href",
      "/#discovery",
    );
    expect(screen.getByRole("link", { name: "Favoritos" })).toHaveAttribute(
      "href",
      "/favoritos",
    );
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar catálogo" })).toHaveAttribute(
      "href",
      "/#discovery",
    );
  });
});
