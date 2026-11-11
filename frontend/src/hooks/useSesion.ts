import { useCallback, useEffect, useState } from "react";
import {
  borrarSesion,
  cerrarSesion,
  guardarSesion,
  iniciarSesion,
  leerToken,
  registrarUsuario,
  usuarioDeToken,
  usuarioGuardado,
  type UsuarioSesion,
} from "@/api/music";

/** Usuario demo del taller cuando no hay sesión iniciada. */
export const DEMO_USER_ID = 1;

export interface Sesion {
  usuario: UsuarioSesion | null;
  usuarioId: number;
  login: (correo: string, contraseña: string) => Promise<UsuarioSesion>;
  registro: (
    nombre: string,
    correo: string,
    contraseña: string,
  ) => Promise<UsuarioSesion>;
  logout: () => Promise<void>;
}

export function useSesion(): Sesion {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => usuarioGuardado());

  const aplicarSesion = useCallback((token: string, datos: UsuarioSesion) => {
    guardarSesion(token, datos);
    setUsuario(datos);
  }, []);

  const cerrar = useCallback(async () => {
    const token = leerToken();
    if (token) {
      try {
        await cerrarSesion(token);
      } catch {
        // El token ya no sirve: se limpia local igual.
      }
    }
    borrarSesion();
    setUsuario(null);
  }, []);

  useEffect(() => {
    let activo = true;
    const token = leerToken();
    if (!token) {
      return;
    }
    usuarioDeToken(token)
      .then((datos) => {
        if (!activo) return;
        guardarSesion(token, datos);
        setUsuario(datos);
      })
      .catch(() => {
        if (activo) cerrar();
      });
    return () => {
      activo = false;
    };
  }, [cerrar]);

  const login = useCallback(
    async (correo: string, contraseña: string) => {
      const respuesta = await iniciarSesion({ correo, contraseña });
      aplicarSesion(respuesta.token, respuesta.usuario);
      return respuesta.usuario;
    },
    [aplicarSesion],
  );

  const registro = useCallback(
    async (nombre: string, correo: string, contraseña: string) => {
      const creado = await registrarUsuario({ nombre, correo, contraseña });
      const respuesta = await iniciarSesion({ correo, contraseña });
      aplicarSesion(respuesta.token, respuesta.usuario);
      return creado;
    },
    [aplicarSesion],
  );

  return {
    usuario,
    usuarioId: usuario?.id ?? DEMO_USER_ID,
    login,
    registro,
    logout: cerrar,
  };
}
