import { Navbar } from "@/components/Navbar";
import { ScrollVideo } from "@/components/ScrollVideo";
import { MarqueeCards } from "@/components/MarqueeCards";
import { GlassCard } from "@/components/GlassCard";

const canciones = [
  { id: 1, titulo: "Bohemian Rhapsody", artista: "Queen", genero: "Rock" },
  { id: 2, titulo: "Stairway to Heaven", artista: "Led Zeppelin", genero: "Rock" },
  { id: 3, titulo: "Billie Jean", artista: "Michael Jackson", genero: "Pop" },
  { id: 4, titulo: "Hotel California", artista: "Eagles", genero: "Rock" },
  { id: 5, titulo: "Sweet Child o' Mine", artista: "Guns N' Roses", genero: "Rock" },
  { id: 6, titulo: "Smells Like Teen Spirit", artista: "Nirvana", genero: "Rock" },
  { id: 7, titulo: "Shape of You", artista: "Ed Sheeran", genero: "Pop" },
  { id: 8, titulo: "Take Five", artista: "Dave Brubeck", genero: "Jazz" },
  { id: 9, titulo: "One More Time", artista: "Daft Punk", genero: "Electronic" },
  { id: 10, titulo: "La Bamba", artista: "Ritchie Valens", genero: "Rock" },
];

export default function Home() {
  return (
    <div className="min-h-screen relative selection:bg-indigo-500/30">
      <Navbar />

      <main className="relative pt-32 pb-24">
        {/* Video parallax */}
        <ScrollVideo src="/video/intro.mp4" />

        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-7xl font-black mb-10 text-white tracking-tight leading-tight">
            YOURMUSIC
          </h2>
          <p className="text-lg text-slate-400 mb-16 max-w-2xl">
            Tus canciones favoritas, en un solo lugar. Crea tu perfil, explora
            música y arma tus listas personales.
          </p>

          {/* Marquee izquierda → derecha */}
          <MarqueeCards
            items={canciones}
            direction="left"
            label="Descubriendo ahora"
          />

          {/* Marquee derecha → izquierda */}
          <MarqueeCards
            items={[...canciones].reverse()}
            direction="right"
            label="Más escuchadas"
          />
        </div>

        {/* Login glass */}
        <div className="max-w-md mx-auto px-6 py-20">
          <GlassCard className="p-8 max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-6 text-white tracking-tight">
              Bienvenido de vuelta
            </h3>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="tu@correo.com"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="button"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                Iniciar sesión
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-slate-400">
              ¿No tienes cuenta?{" "}
              <a href="#" className="text-indigo-400 hover:text-indigo-300">
                Regístrate gratis
              </a>
            </p>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
