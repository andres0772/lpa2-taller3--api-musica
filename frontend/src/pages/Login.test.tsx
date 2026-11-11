import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "@/pages/Login";

function stubLogin(opciones: { ok?: boolean } = {}) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/api/auth/login")) {
      if (opciones.ok === false) {
        return { ok: false, status: 401, json: async () => ({}) } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          token: "tok-abc",
          usuario: { id: 7, nombre: "Ana Demo", correo: "ana@example.com" },
        }),
      } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Login", () => {
  it("signs in with email and password", async () => {
    stubLogin();

    render(<Login />);
    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "secretito-2024" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(localStorage.getItem("yourmusic.token")).toBe("tok-abc");
    });
  });

  it("shows an error when the credentials are wrong", async () => {
    stubLogin({ ok: false });

    render(<Login />);
    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "no-es-esa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/credenciales inválidas/i);
    expect(localStorage.getItem("yourmusic.token")).toBeNull();
  });
});
