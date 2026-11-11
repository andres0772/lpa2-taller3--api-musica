import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/pages/Home";

describe("Home", () => {
  it("renders the landing page and login card", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 2, name: "YOURMUSIC" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Bienvenido de vuelta" }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("tu@correo.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Iniciar sesión" }),
    ).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Regístrate gratis" })).toHaveAttribute(
      "href",
      "#",
    );
    expect(screen.getByText(/Tus canciones favoritas/)).toBeInTheDocument();
  });

  it("renders the background video with autoplay attributes", () => {
    const { container } = render(<Home />);
    const video = container.querySelector("video");

    expect(video).toHaveAttribute("src", "/video/intro.mp4");
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveProperty("muted", true);
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
  });
});
