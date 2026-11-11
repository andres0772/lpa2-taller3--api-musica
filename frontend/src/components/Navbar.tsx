interface NavbarProps {
  active?: "home" | "favorites";
}

export function Navbar({ active = "home" }: NavbarProps) {
  return (
    <header className="site-header">
      <div className="site-nav">
        <a className="brand-mark" href="/" aria-label="YourMusic, inicio">
          <span className="brand-symbol" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M9 18V6l10-2v12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="6" cy="18" r="3" fill="currentColor" />
              <circle cx="16" cy="16" r="3" fill="currentColor" />
            </svg>
          </span>
          <span>YOURMUSIC</span>
        </a>

        <nav className="nav-links" aria-label="Navegación principal">
          <a href="/" aria-current={active === "home" ? "page" : undefined}>
            Inicio
          </a>
          <a href="/canciones">Canciones</a>
          <a
            href="/favoritos"
            aria-current={active === "favorites" ? "page" : undefined}
          >
            Favoritos
          </a>
        </nav>

        <div className="nav-actions">
          <a className="nav-login" href="#cuenta">
            Iniciar sesión
          </a>
          <a className="nav-primary" href="/canciones">
            Explorar catálogo
          </a>
        </div>
      </div>
    </header>
  );
}
