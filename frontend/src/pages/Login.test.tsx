import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "@/pages/Login";

function cancionDemo(id: number, genero = "Rock") {
  return {
    id,
    titulo: `Canción ${id}`,
    artista: "Artista Demo",
    album: "Catálogo demo",
    duracion: "3:30",
    duracion_segundos: 210,
    duracion_formato: "3:30",
    año: 2024,
    genero,
    fecha_creacion: "2024-01-15T10:30:00Z",
    archivo_audio: null,
    portada: null,
  };
}

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

function stubCatalogo(canciones: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/canciones")) {
        return { ok: true, json: async () => canciones } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }),
  );
}

/** El login queda pendiente para observar el estado de envío sin que termine. */
function stubLoginPendiente(canciones: unknown[] = []) {
  let liberar: (() => void) | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/auth/login")) {
        return new Promise((resolve) => {
          liberar = () =>
            resolve({
              ok: true,
              json: async () => ({
                token: "tok-abc",
                usuario: { id: 7, nombre: "Ana Demo", correo: "ana@example.com" },
              }),
            } as Response);
        });
      }
      if (url.includes("/api/canciones")) {
        return Promise.resolve({ ok: true, json: async () => canciones } as Response);
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response);
    }),
  );
  return { liberar: () => liberar?.() };
}

function completarCredenciales(correo: string, contraseña: string) {
  fireEvent.change(screen.getByLabelText("Correo"), {
    target: { value: correo },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: contraseña },
  });
}

describe("Login", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the split stage with the glass form panel aside", () => {
    stubLogin();

    const { container } = render(<Login />);

    const escena = screen.getByRole("region", {
      name: "Presentación de YourMusic",
    });
    expect(escena).toHaveClass("login-stage");
    expect(escena.querySelector(".login-disc")).toBeInTheDocument();
    expect(escena.querySelector(".login-beam")).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Entrar a YourMusic" }),
    ).toHaveClass("login-panel");
    expect(container.querySelector(".login-layout")).toBeInTheDocument();
  });

  it("counts the songs the API returns", async () => {
    stubCatalogo([
      cancionDemo(1, "Rock"),
      cancionDemo(2, "Pop"),
      cancionDemo(3, "Jazz"),
      cancionDemo(4, "Electronic"),
    ]);

    render(<Login />);

    expect(await screen.findByText("4 canciones demo")).toBeInTheDocument();
    expect(screen.getByText(/Catálogo conectado a la API/)).toBeInTheDocument();
  });

  it("pluralizes a single song and falls back to the honest demo catalog", async () => {
    stubCatalogo([cancionDemo(1)]);

    const { unmount } = render(<Login />);

    expect(await screen.findByText("1 canción demo")).toBeInTheDocument();
    unmount();

    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("API caída");
      }),
    );
    render(<Login />);

    expect(await screen.findByText("10 canciones demo")).toBeInTheDocument();
    expect(screen.getByText(/Vista de demostración/)).toBeInTheDocument();
  });

  it("says the catalog is empty when the API answers without songs", async () => {
    stubCatalogo([]);

    render(<Login />);

    expect(await screen.findByText(/catálogo vacío/i)).toBeInTheDocument();
    expect(screen.queryByText(/canciones demo/)).not.toBeInTheDocument();
  });

  it("keeps creating an account with its own way out and its own fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/api/auth/registro")) {
          return {
            ok: false,
            status: 409,
            json: async () => ({ detail: "Ese correo ya tiene cuenta." }),
          } as Response;
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }),
    );

    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    const nombre = await screen.findByLabelText("Nombre");
    expect(nombre).toHaveAttribute("autocomplete", "name");
    fireEvent.change(nombre, { target: { value: "Ana" } });
    completarCredenciales("ana@example.com", "secretito-2024");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );

    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos crear la cuenta. Revisá los datos o usá otro correo.",
    );
  });

  it("keeps the typed data and shows the submitting state on the button", async () => {
    const { liberar } = stubLoginPendiente();

    render(<Login />);
    completarCredenciales("ana@example.com", "secretito-2024");

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    const enviando = await screen.findByRole("button", { name: /Entrando…/ });
    expect(enviando).toBeDisabled();
    expect(enviando).toHaveAttribute("aria-busy", "true");
    expect(enviando.querySelector(".login-spinner")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Contraseña")).toHaveValue("secretito-2024");

    liberar();
  });

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

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese correo y contraseña no coinciden. Revisá los datos o creá una cuenta nueva.",
    );
    expect(localStorage.getItem("yourmusic.token")).toBeNull();
  });
});
