import { useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useSesion } from "@/hooks/useSesion";

export default function Login() {
  const { login, registro } = useSesion();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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
          : "Credenciales inválidas.",
      );
      setEnviando(false);
    }
  }

  return (
    <div className="cinematic-page explore-page">
      <Navbar />

      <main className="explore-main">
        <header className="explore-heading">
          <span className="eyebrow">Tu cuenta</span>
          <h1>{modo === "registro" ? "Crear cuenta" : "Entrar a YourMusic"}</h1>
          <p>
            {modo === "registro"
              ? "Un correo y una contraseña, y tus favoritos quedan atados a tu usuario."
              : "Entrá para ver y gestionar tus favoritos con tu propio usuario."}
          </p>
        </header>

        <form className="explore-toolbar login-form" onSubmit={enviar} noValidate>
          {modo === "registro" && (
            <div className="explore-field">
              <label htmlFor="login-nombre">Nombre</label>
              <input
                id="login-nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
              />
            </div>
          )}

          <div className="explore-field">
            <label htmlFor="login-correo">Correo</label>
            <input
              id="login-correo"
              type="email"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
            />
          </div>

          <div className="explore-field">
            <label htmlFor="login-contraseña">Contraseña</label>
            <input
              id="login-contraseña"
              type="password"
              value={contraseña}
              onChange={(event) => setContraseña(event.target.value)}
            />
          </div>

          <button
            type="submit"
            className="action-button action-primary"
            disabled={enviando}
          >
            {modo === "registro" ? "Crear cuenta" : "Entrar"}
          </button>
        </form>

        {error && (
          <div className="archive-state login-error" role="alert">
            <p>{error}</p>
          </div>
        )}

        <p className="login-switch">
          {modo === "registro" ? "¿Ya tenés cuenta?" : "¿Todavía no tenés cuenta?"}{" "}
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
      </main>
    </div>
  );
}
