"""
Genera las portadas deterministas que sirve la API en `/portadas/<slug>.svg`.

Cada canción del catálogo recibe una portada SVG de 300x300 derivada del hash
de su título: paleta con los tokens de diseño del frontend
(var(--color-accent-indigo), var(--color-accent-glow), fondos oscuros) más las
iniciales y el artista. Sin material con copyright: solo geometría y texto.

Es determinista: mismos datos, mismo archivo. Uso:

    uv run python scripts/generate_portadas.py [--force]

Los archivos se commitean como assets de demo en `media/portadas/`.
"""

import argparse
import hashlib
import math
from pathlib import Path
from xml.sax.saxutils import escape

REPO_ROOT = Path(__file__).resolve().parent.parent
PORTADAS_DIR = REPO_ROOT / "media" / "portadas"

TAMANO = 300

# Tokens de diseño del frontend (frontend/src/index.css, bloque @theme).
# Se emiten dentro de cada SVG para que la portada se vea igual servida
# como <img>, sin depender del CSS de la página que la embebe.
ESTILOS = """
    :root {
      --color-bg-deep: #020617;
      --color-bg-card: rgba(15, 23, 42, 0.72);
      --color-bg-card-hover: rgba(30, 41, 59, 0.8);
      --color-accent-indigo: #4f46e5;
      --color-accent-glow: #6366f1;
      --color-accent-muted: rgba(79, 70, 229, 0.15);
      --color-text-main: #f1f5f9;
      --color-text-muted: #94a3b8;
      --color-border-glass: rgba(148, 163, 184, 0.12);
      --color-border-glass-hover: rgba(148, 163, 184, 0.22);
    }
    text { font-family: "Geist Variable", "Inter Variable", system-ui, sans-serif; }
    .iniciales { font-size: 88px; font-weight: 800; letter-spacing: -0.04em;
                 fill: var(--color-text-main); }
    .artista { font-size: 12px; font-weight: 700; letter-spacing: 0.16em;
               fill: var(--color-text-muted); }
"""

# slug, título, artista (mismos slugs que scripts/generate_demo_audio.py)
CANCIONES = [
    ("01-bohemian-rhapsody", "Bohemian Rhapsody", "Queen"),
    ("02-stairway-to-heaven", "Stairway to Heaven", "Led Zeppelin"),
    ("03-billie-jean", "Billie Jean", "Michael Jackson"),
    ("04-hotel-california", "Hotel California", "Eagles"),
    ("05-sweet-child-o-mine", "Sweet Child o' Mine", "Guns N' Roses"),
    ("06-smells-like-teen-spirit", "Smells Like Teen Spirit", "Nirvana"),
    ("07-shape-of-you", "Shape of You", "Ed Sheeran"),
    ("08-take-five", "Take Five", "Dave Brubeck"),
    ("09-one-more-time", "One More Time", "Daft Punk"),
    ("10-la-bamba", "La Bamba", "Ritchie Valens"),
]


def iniciales(titulo: str) -> str:
    """Iniciales del título (una o dos letras), deterministas."""
    palabras = [palabra for palabra in titulo.replace("'", " ").split() if palabra]
    if len(palabras) >= 2:
        return (palabras[0][0] + palabras[1][0]).upper()
    return (palabras[0][:2] if palabras else "??").upper()


def _circulos(digest: bytes, acento: str, brillo: str) -> str:
    """Variante de patrón: círculos concéntricos desplazados por el hash."""
    cx = 180 + digest[4] % 90
    cy = 40 + digest[5] % 70
    piezas = [f'<circle cx="{cx}" cy="{cy}" r="30" fill="{brillo}" fill-opacity="0.92"/>']
    for indice, radio in enumerate((48, 70, 96, 124)):
        color = acento if indice % 2 == 0 else brillo
        opacidad = 0.70 - indice * 0.15
        piezas.append(
            f'<circle cx="{cx}" cy="{cy}" r="{radio}" fill="none" stroke="{color}" '
            f'stroke-opacity="{opacidad:.2f}" stroke-width="2"/>'
        )
    return "\n  ".join(piezas)


def _ondas(digest: bytes, acento: str, brillo: str) -> str:
    """Variante de patrón: ondas sinusoidales escalonadas."""
    sol = (
        f'<circle cx="{70 + digest[4] % 120}" cy="{60 + digest[5] % 60}" r="16" '
        f'fill="{brillo}" fill-opacity="0.9"/>'
    )
    voces = (
        (150 + digest[6] % 60, 26 + digest[7] % 18, 120 + digest[8] % 60, acento, 3),
        (180 + digest[9] % 40, 18 + digest[10] % 14, 90 + digest[11] % 50, brillo, 2),
        (210 + digest[12] % 30, 12 + digest[13] % 10, 70 + digest[14] % 40, acento, 2),
    )
    lineas = []
    for voz, (base, amplitud, periodo, color, grosor) in enumerate(voces):
        fase = digest[15] % 7 + voz * 2
        puntos = []
        for x in range(0, TAMANO + 1, 10):
            y = base + amplitud * math.sin(2 * math.pi * x / periodo + fase)
            puntos.append(f"{x},{y:.1f}")
        opacidad = 0.85 - voz * 0.22
        lineas.append(
            f'<polyline points="{" ".join(puntos)}" fill="none" stroke="{color}" '
            f'stroke-opacity="{opacidad:.2f}" stroke-width="{grosor}" stroke-linecap="round"/>'
        )
    return "\n  ".join([sol, *lineas])


def _grilla(digest: bytes, acento: str, brillo: str) -> str:
    """Variante de patrón: grilla de celdas con puntos y cuadros de acento."""
    paso = 50
    celdas = []
    for indice in range(36):
        mezcla = (digest[indice % len(digest)] + indice * 7) % 5
        fila, columna = divmod(indice, 6)
        x, y = columna * paso, fila * paso
        if mezcla == 0:
            radio = 8 + indice % 3 * 2
            celdas.append(
                f'<circle cx="{x + paso // 2}" cy="{y + paso // 2}" r="{radio}" '
                f'fill="{brillo}" fill-opacity="0.85"/>'
            )
        elif mezcla == 1:
            opacidad = 0.30 + indice % 4 * 0.15
            celdas.append(
                f'<rect x="{x + 12}" y="{y + 12}" width="{paso - 24}" height="{paso - 24}" '
                f'fill="{acento}" fill-opacity="{opacidad:.2f}"/>'
            )
        # El resto de las celdas queda vacía: respira el fondo oscuro.
    return "\n  ".join(celdas)


_PATRONES = (_circulos, _ondas, _grilla)


def portada_svg(slug: str, titulo: str, artista: str) -> str:
    """Construye el SVG 300x300 determinista de una canción."""
    digest = hashlib.sha256(titulo.encode("utf-8")).digest()
    acento, brillo = "var(--color-accent-indigo)", "var(--color-accent-glow)"
    if digest[1] % 2:
        acento, brillo = brillo, acento
    fondo_hasta = "var(--color-bg-card-hover)" if digest[2] % 2 else "var(--color-bg-card)"
    giro = digest[3] % 4
    capa = _PATRONES[digest[0] % 3](digest, acento, brillo)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"
  viewBox="0 0 300 300"
  role="img" aria-label="Portada de {escape(titulo)} — {escape(artista)}">
  <title>{escape(titulo)} · {escape(artista)}</title>
  <style>{ESTILOS}
  </style>
  <defs>
    <linearGradient id="fondo-{slug}" x1="0" y1="0" x2="{1 - giro % 2}" y2="1"
      gradientTransform="rotate({giro * 45} .5 .5)">
      <stop offset="0" stop-color="var(--color-bg-deep)"/>
      <stop offset="1" stop-color="{fondo_hasta}"/>
    </linearGradient>
  </defs>
  <rect width="300" height="300" fill="url(#fondo-{slug})"/>
  {capa}
  <rect x="8" y="8" width="284" height="284" fill="none"
    stroke="var(--color-border-glass-hover)" stroke-opacity="0.5"/>
  <text class="iniciales" x="24" y="246">{escape(iniciales(titulo))}</text>
  <text class="artista" x="26" y="274">{escape(artista)}</text>
</svg>
"""


def generar(
    slug: str,
    titulo: str,
    artista: str,
    destino: Path | None = None,
    force: bool = False,
) -> Path:
    """Escribe (o reusa) la portada de una canción y devuelve su ruta."""
    destino = destino or PORTADAS_DIR / f"{slug}.svg"
    if destino.exists() and not force:
        return destino

    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(portada_svg(slug, titulo, artista), encoding="utf-8")
    return destino


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="regenera archivos existentes")
    args = parser.parse_args()

    PORTADAS_DIR.mkdir(parents=True, exist_ok=True)
    for slug, titulo, artista in CANCIONES:
        destino = generar(slug, titulo, artista, force=args.force)
        print(f"{destino.relative_to(REPO_ROOT)} ({destino.stat().st_size // 1024} KB)")

    print(f"{len(CANCIONES)} portadas listas en {PORTADAS_DIR.relative_to(REPO_ROOT)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
