import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import Favorites from "@/pages/Favorites";

function App() {
  const path = window.location.pathname;

  if (path.startsWith("/favoritos")) {
    return <Favorites />;
  }

  if (path.startsWith("/canciones")) {
    return <Explore />;
  }

  return <Home />;
}

export default App;
