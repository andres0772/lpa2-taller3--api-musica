import { Suspense, lazy } from "react";
import { AppToaster } from "@/components/AppToaster";

// Carga por ruta: cada pantalla viaja en su propio paquete, así que el login
// ya no arrastra el código de portada, exploración y favoritos.
const Home = lazy(() => import("@/pages/Home"));
const Explore = lazy(() => import("@/pages/Explore"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const Login = lazy(() => import("@/pages/Login"));

function App() {
  const path = window.location.pathname;

  let pagina;
  if (path.startsWith("/favoritos")) {
    pagina = <Favorites />;
  } else if (path.startsWith("/canciones")) {
    pagina = <Explore />;
  } else if (path.startsWith("/login")) {
    pagina = <Login />;
  } else {
    pagina = <Home />;
  }

  return (
    <>
      <Suspense
        fallback={
          <div className="archive-state" role="status">
            <span className="loading-pulse" aria-hidden="true" />
            <p>Cargando…</p>
          </div>
        }
      >
        {pagina}
      </Suspense>
      <AppToaster />
    </>
  );
}

export default App;
