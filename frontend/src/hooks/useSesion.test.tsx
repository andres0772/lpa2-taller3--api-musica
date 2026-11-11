import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSesion } from "./useSesion";

const USUARIO_API = {
  id: 7,
  nombre: "Ana Demo",
  correo: "ana@example.com",
  fecha_registro: "2024-05-01T10:00:00Z",
};

function stubApi(opciones: { login?: unknown; me?: unknown; falla?: boolean } = {}) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    void init;
    if (opciones.falla) {
      throw new Error("API caída");
    }
    if (url.includes("/api/auth/login")) {
      return {
        ok: true,
        json: async () =>
          opciones.login ?? { token: "tok-123", usuario: USUARIO_API },
      } as Response;
    }
    if (url.includes("/api/auth/registro")) {
      return { ok: true, status: 201, json: async () => USUARIO_API } as Response;
    }
    if (url.includes("/api/auth/me")) {
      if (opciones.me === null) {
        return { ok: false, status: 401, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => opciones.me ?? USUARIO_API } as Response;
    }
    if (url.includes("/api/auth/logout")) {
      return { ok: true, status: 204, json: async () => undefined } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useSesion", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("falls back to the demo user when there is no session", async () => {
    stubApi();

    const { result } = renderHook(() => useSesion());

    expect(result.current.usuarioId).toBe(1);
    expect(result.current.usuario).toBeNull();
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.usuario).toBeNull();
  });

  it("logs in, remembers the token and scopes favorites to that user", async () => {
    stubApi();

    const { result } = renderHook(() => useSesion());

    await act(async () => {
      await result.current.login("ana@example.com", "secretito-2024");
    });

    expect(result.current.usuarioId).toBe(7);
    expect(result.current.usuario?.nombre).toBe("Ana Demo");
    expect(localStorage.getItem("yourmusic.token")).toBe("tok-123");
  });

  it("restores the session from the stored token on mount", async () => {
    localStorage.setItem("yourmusic.token", "tok-123");
    localStorage.setItem(
      "yourmusic.usuario",
      JSON.stringify(USUARIO_API),
    );
    stubApi();

    const { result } = renderHook(() => useSesion());

    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.usuarioId).toBe(7);
  });

  it("clears the session when the stored token is no longer valid", async () => {
    localStorage.setItem("yourmusic.token", "tok-viejo");
    stubApi({ me: null });

    const { result } = renderHook(() => useSesion());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(result.current.usuario).toBeNull();
    expect(result.current.usuarioId).toBe(1);
    expect(localStorage.getItem("yourmusic.token")).toBeNull();
  });

  it("logs out by revoking the token and clearing storage", async () => {
    stubApi();

    const { result } = renderHook(() => useSesion());
    await act(async () => {
      await result.current.login("ana@example.com", "secretito-2024");
    });
    expect(localStorage.getItem("yourmusic.token")).toBe("tok-123");

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.usuario).toBeNull();
    expect(localStorage.getItem("yourmusic.token")).toBeNull();
  });
});
