import Home from "@/pages/Home";
import Favorites from "@/pages/Favorites";

function App() {
  const path = window.location.pathname;

  return path.startsWith("/favoritos") ? <Favorites /> : <Home />;
}

export default App;
