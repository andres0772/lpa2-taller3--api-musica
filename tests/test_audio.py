"""
Tests para el audio demo servido por la API (S1).

Verifican que:
- La API monta y sirve los archivos de `/audio/<slug>.mp3`.
- El seed deja `archivo_audio` apuntando a archivos que existen de verdad,
  de modo que la base y el montaje estático no se desincronicen.
"""

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.dialects import sqlite as sqlite_dialect
from sqlalchemy.schema import CreateTable
from sqlmodel import SQLModel

from main import app

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = REPO_ROOT / "scripts" / "seed_data.sql"


@pytest.fixture(name="audio_client")
def audio_client_fixture():
    return TestClient(app)


def test_serves_seed_audio_files(audio_client: TestClient):
    response = audio_client.get("/audio/01-bohemian-rhapsody.mp3")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/")


def test_seeded_songs_reference_existing_audio_files():
    conexion = sqlite3.connect(":memory:")
    try:
        for tabla in SQLModel.metadata.sorted_tables:
            conexion.execute(
                str(CreateTable(tabla).compile(dialect=sqlite_dialect.dialect())).strip()
            )
        conexion.executescript(SEED_PATH.read_text(encoding="utf-8"))
        rutas = [
            fila[0] for fila in conexion.execute("SELECT archivo_audio FROM cancion").fetchall()
        ]
    finally:
        conexion.close()

    assert len(rutas) == 10
    for ruta in rutas:
        assert ruta, "el seed dejó archivo_audio vacío"
        assert ruta.startswith("/audio/") and ruta.endswith(".mp3")
        assert (REPO_ROOT / "media" / ruta.removeprefix("/")).is_file(), (
            f"el seed referencia {ruta} pero el archivo no existe; "
            "corré scripts/generate_demo_audio.py"
        )
