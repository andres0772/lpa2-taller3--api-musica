"""
Genera el audio demo que sirve la API en `/audio/<slug>.mp3`.

Cada canción del seed referencea un extracto corto sintetizado con ffmpeg
(tonos por género, sin material con copyright). Es determinista: mismos
parámetros, mismo archivo. Uso:

    uv run python scripts/generate_demo_audio.py [--force]

Los archivos se commitean como assets de demo en `media/audio/`.
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = REPO_ROOT / "media" / "audio"

DURACION_SEGUNDOS = 12
SAMPLE_RATE = 22050
BITRATE = "64k"

# slug, título, artista, frecuencia base (Hz), golpes por segundo
CANCIONES = [
    ("01-bohemian-rhapsody", "Bohemian Rhapsody", "Queen", 220.0, 2.4),
    ("02-stairway-to-heaven", "Stairway to Heaven", "Led Zeppelin", 196.0, 2.0),
    ("03-billie-jean", "Billie Jean", "Michael Jackson", 262.0, 2.6),
    ("04-hotel-california", "Hotel California", "Eagles", 233.0, 2.2),
    ("05-sweet-child-o-mine", "Sweet Child o' Mine", "Guns N' Roses", 247.0, 2.4),
    ("06-smells-like-teen-spirit", "Smells Like Teen Spirit", "Nirvana", 207.0, 2.8),
    ("07-shape-of-you", "Shape of You", "Ed Sheeran", 294.0, 2.5),
    ("08-take-five", "Take Five", "Dave Brubeck", 175.0, 2.5),
    ("09-one-more-time", "One More Time", "Daft Punk", 330.0, 2.8),
    ("10-la-bamba", "La Bamba", "Ritchie Valens", 262.0, 3.0),
]


def expresion(frecuencia: float, golpes: float) -> str:
    """Acorde de tres tonos con envolvente rítmica, faseada por voz."""
    return (
        f"0.30*sin(2*PI*{frecuencia}*t)*(0.5+0.5*sin(2*PI*{golpes}*t))"
        f"+0.18*sin(2*PI*{frecuencia * 1.5}*t)*(0.5+0.5*sin(2*PI*{golpes}*t+1.0))"
        f"+0.10*sin(2*PI*{frecuencia * 2.0}*t)*(0.5+0.5*sin(2*PI*{golpes}*t+2.0))"
    )


def generar(
    slug: str, titulo: str, artista: str, frecuencia: float, golpes: float, force: bool
) -> Path:
    destino = AUDIO_DIR / f"{slug}.mp3"
    if destino.exists() and not force:
        return destino

    destino.parent.mkdir(parents=True, exist_ok=True)
    fade_out = DURACION_SEGUNDOS - 1
    comando = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        f"aevalsrc='{expresion(frecuencia, golpes)}':d={DURACION_SEGUNDOS}:s={SAMPLE_RATE}:c=mono",
        "-af",
        f"afade=t=in:st=0:d=0.6,afade=t=out:st={fade_out}:d=1",
        "-c:a",
        "libmp3lame",
        "-b:a",
        BITRATE,
        "-metadata",
        f"title={titulo} (audio demo)",
        "-metadata",
        f"artist={artista}",
        "-metadata",
        "comment=Extracto sintetizado con ffmpeg para el taller YourMusic",
        str(destino),
    ]
    subprocess.run(comando, check=True)
    return destino


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="regenera archivos existentes")
    args = parser.parse_args()

    if shutil.which("ffmpeg") is None:
        print("ffmpeg no está disponible; instalalo para generar el audio demo", file=sys.stderr)
        return 1

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    for slug, titulo, artista, frecuencia, golpes in CANCIONES:
        destino = generar(slug, titulo, artista, frecuencia, golpes, args.force)
        print(f"{destino.relative_to(REPO_ROOT)} ({destino.stat().st_size // 1024} KB)")

    print(f"{len(CANCIONES)} extractos listos en {AUDIO_DIR.relative_to(REPO_ROOT)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
