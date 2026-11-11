import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import Favorites from "@/pages/Favorites";
import Login from "@/pages/Login";
import { AppToaster } from "@/components/AppToaster";

function App() {
  const path = window.location.pathname;

  return (
    <>
      {path.startsWith("/favoritos") ? (
        <Favorites />
      ) : path.startsWith("/canciones") ? (
        <Explore />
      ) : path.startsWith("/login") ? (
        <Login />
      ) : (
        <Home />
      )}
      <AppToaster />
    </>
  );
}

export default App;
