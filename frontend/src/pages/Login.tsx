import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useGotas } from "@/hooks/useGotas";
import { useSesion } from "@/hooks/useSesion";
import { listCanciones } from "@/api/music";
import { DEMO_SONGS } from "@/data/demoSongs";

/** De dónde salió el número del catálogo que se muestra en la escena. */
type FuenteCatalogo = "api" | "demo";

interface Catalogo {
  total: number;
  fuente: FuenteCatalogo;
}

/**
 * Copy honesto del contador: el número siempre sale del catálogo cargado, y
 * la etiqueta dice si viene de la API o del catálogo de demostración local.
 */
function copyCatalogo(catalogo: Catalogo | null): {
  titular: string;
  detalle: string;
} {
  if (!catalogo) {
    return {
      titular: "Cargando el catálogo…",
      detalle: "Contamos las canciones que hay para escuchar.",
    };
  }
  if (catalogo.total === 0) {
    return {
      titular: "Catálogo vacío",
      detalle: "La API respondió sin canciones: no hay nada para escuchar todavía.",
    };
  }
  const palabra = catalogo.total === 1 ? "canción" : "canciones";
  const origen =
    catalogo.fuente === "api"
      ? "Catálogo conectado a la API"
      : "Vista de demostración · API no disponible";
  return {
    titular: `${catalogo.total} ${palabra} demo`,
    detalle: `Rock, pop, jazz y electrónica · ${origen}`,
  };
}

export default function Login() {
  const { login, registro } = useSesion();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  // Gotas al pasar el mouse, solo sobre la escena de marca (ver useGotas).
  const escenaRef = useGotas<HTMLElement>();

  useEffect(() => {
    let activo = true;

    listCanciones()
      .then((canciones) => {
        if (!activo) return;
        setCatalogo({ total: canciones.length, fuente: "api" });
      })
      .catch(() => {
        if (!activo) return;
        setCatalogo({ total: DEMO_SONGS.length, fuente: "demo" });
      });

    return () => {
      activo = false;
    };
  }, []);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      if (modo === "registro") {
        await registro(nombre.trim(), correo.trim(), contraseña);
        toast.success("Cuenta creada. Ya entraste.");
      } else {
        await login(correo.trim(), contraseña);
      }
      window.location.assign("/");
    } catch {
      setError(
        modo === "registro"
          ? "No pudimos crear la cuenta. Revisá los datos o usá otro correo."
          : "Ese correo y contraseña no coinciden. Revisá los datos o creá una cuenta nueva.",
      );
      setEnviando(false);
    }
  }

  const { titular, detalle } = copyCatalogo(catalogo);

  return (
    <div className="cinematic-page">
      <Navbar />

      <main className="login-layout">
        <section
          className="login-stage"
          aria-label="Presentación de YourMusic"
          ref={escenaRef}
        >
          <span className="login-beam login-beam-a" aria-hidden="true" />
          <span className="login-beam login-beam-b" aria-hidden="true" />

          <span className="eyebrow">Tu cuenta</span>
          <h1>Tu banda sonora, contigo.</h1>
          <p className="login-lede">
            Entrá para que tus favoritos queden atados a tu usuario y te esperen
            en cualquier dispositivo. Sin cuenta, escuchás el catálogo de
            demostración.
          </p>

          <div className="login-disc" aria-hidden="true">
            <span className="login-disc-label">YourMusic</span>
          </div>

          <div className="login-catalogo">
            <span className="demo-stack" aria-hidden="true">
              <span>YM</span>
              <span>Q</span>
              <span>{catalogo ? catalogo.total : "—"}</span>
            </span>
            <span className="login-catalogo-copy">
              <strong>{titular}</strong>
              <span>{detalle}</span>
            </span>
          </div>
        </section>

        <aside className="login-aside">
          <form
            className="login-panel"
            onSubmit={enviar}
            noValidate
            aria-labelledby="login-titulo"
            aria-describedby="login-desc"
            aria-busy={enviando}
          >
            <header className="login-panel-head">
              <h2 id="login-titulo">
                {modo === "registro" ? "Crear cuenta" : "Entrar a YourMusic"}
              </h2>
              <p className="login-sub" id="login-desc">
                {modo === "registro"
                  ? "Un nombre, un correo y una contraseña, y tus favoritos quedan atados a tu usuario."
                  : "Con tu correo y contraseña."}
              </p>
            </header>

            {modo === "registro" && (
              <div className="explore-field">
                <label htmlFor="login-nombre">Nombre</label>
                <input
                  id="login-nombre"
                  name="nombre"
                  autoComplete="name"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                />
              </div>
            )}

            <div className="explore-field">
              <label htmlFor="login-correo">Correo</label>
              <input
                id="login-correo"
                name="correo"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
              />
            </div>

            <div className="explore-field">
              <label htmlFor="login-contraseña">Contraseña</label>
              <input
                id="login-contraseña"
                name="contraseña"
                type="password"
                autoComplete={
                  modo === "registro" ? "new-password" : "current-password"
                }
                value={contraseña}
                onChange={(event) => setContraseña(event.target.value)}
              />
            </div>

            <button
              type="submit"
              className="action-button action-primary login-submit"
              disabled={enviando}
              aria-busy={enviando}
            >
              {enviando ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  {modo === "registro" ? "Creando cuenta…" : "Entrando…"}
                </>
              ) : modo === "registro" ? (
                "Crear cuenta"
              ) : (
                "Entrar"
              )}
            </button>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <p className="login-switch">
              {modo === "registro"
                ? "¿Ya tenés cuenta?"
                : "¿Todavía no tenés cuenta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setModo(modo === "registro" ? "login" : "registro");
                  setError(null);
                }}
              >
                {modo === "registro" ? "Entrar" : "Crear cuenta"}
              </button>
            </p>
          </form>
        </aside>
      </main>
    </div>
  );
}
