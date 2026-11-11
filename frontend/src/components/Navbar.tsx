export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto glass rounded-2xl px-4 py-2 flex justify-between items-center">
        <div className="text-2xl font-black tracking-tighter text-white">
          YOUR<span className="text-indigo-400">MUSIC</span>
        </div>
        <div className="hidden md:flex gap-6 text-sm text-slate-400 font-medium">
          <a href="#" className="hover:text-white transition-colors">
            Home
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Canciones
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Favoritos
          </a>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-sm border border-white/10 transition-all">
            Iniciar sesión
          </button>
          <button className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-sm transition-all shadow-lg shadow-indigo-500/20">
            Regístrate
          </button>
        </div>
      </div>
    </nav>
  );
}
