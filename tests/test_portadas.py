"""
Tests para las portadas generadas que sirve la API (S3).

Verifican que:
- La API monta y sirve los archivos de `/portadas/<slug>.svg` (300x300, svg).
- El seed deja `portada` apuntando a archivos que existen de verdad.
- La migración aditiva agrega la columna `portada` a una base previa y es idempotente.
- El generador es determinista: mismos datos, mismo SVG, sin material externo.
"""

import importlib.util
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.dialects import sqlite as sqlite_dialect
from sqlalchemy.schema import CreateTable
from sqlmodel import SQLModel, create_engine

from main import app
from musica_api.database import ensure_schema

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = REPO_ROOT / "scripts" / "seed_data.sql"
GENERADOR_PATH = REPO_ROOT / "scripts" / "generate_portadas.py"


def cargar_generador():
    """Importa scripts/generate_portadas.py (no es un paquete importable)."""
    spec = importlib.util.spec_from_file_location("generate_portadas", GENERADOR_PATH)
    modulo = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(modulo)
    return modulo


@pytest.fixture(name="portadas_client")
def portadas_client_fixture():
    return TestClient(app)


def test_serves_seed_cover_files(portadas_client: TestClient):
    response = portadas_client.get("/portadas/01-bohemian-rhapsody.svg")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/svg+xml")


def test_seeded_songs_reference_existing_cover_files():
    conexion = sqlite3.connect(":memory:")
    try:
        for tabla in SQLModel.metadata.sorted_tables:
            conexion.execute(
                str(CreateTable(tabla).compile(dialect=sqlite_dialect.dialect())).strip()
            )
        conexion.executescript(SEED_PATH.read_text(encoding="utf-8"))
        rutas = [fila[0] for fila in conexion.execute("SELECT portada FROM cancion").fetchall()]
    finally:
        conexion.close()

    assert len(rutas) == 10
    for ruta in rutas:
        assert ruta, "el seed dejó portada vacía"
        assert ruta.startswith("/portadas/") and ruta.endswith(".svg")
        assert (REPO_ROOT / "media" / ruta.removeprefix("/")).is_file(), (
            f"el seed referencia {ruta} pero el archivo no existe; "
            "corré scripts/generate_portadas.py"
        )


def test_migracion_agrega_portada_a_una_base_previa():
    # Base "vieja": cancion sin la columna portada.
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "CREATE TABLE cancion ("
            "id INTEGER PRIMARY KEY, "
            "titulo VARCHAR(200) NOT NULL, "
            "artista VARCHAR(200) NOT NULL, "
            "album VARCHAR(200), "
            "duracion VARCHAR, "
            '"año" INTEGER, '
            "genero VARCHAR(20), "
            "fecha_creacion TIMESTAMP, "
            "archivo_audio TEXT, "
            "duracion_segundos INTEGER NOT NULL)"
        )
        conn.exec_driver_sql(
            "INSERT INTO cancion (titulo, artista, duracion_segundos) "
            "VALUES ('Canción vieja', 'Artista', 180)"
        )

    ensure_schema(engine)

    columnas = {col["name"] for col in inspect(engine).get_columns("cancion")}
    assert "portada" in columnas
    with engine.connect() as conn:
        filas = conn.exec_driver_sql("SELECT COUNT(*) FROM cancion WHERE portada IS NULL").scalar()
    assert filas == 1


def test_migracion_portada_es_idempotente():
    engine = create_engine("sqlite://")
    ensure_schema(engine)
    columnas_antes = {col["name"] for col in inspect(engine).get_columns("cancion")}

    ensure_schema(engine)

    columnas_despues = {col["name"] for col in inspect(engine).get_columns("cancion")}
    assert columnas_antes == columnas_despues


def test_generador_es_determinista():
    generador = cargar_generador()

    primero = generador.portada_svg("01-demo", "Bohemian Rhapsody", "Queen")
    segundo = generador.portada_svg("01-demo", "Bohemian Rhapsody", "Queen")

    assert primero == segundo
    assert 'width="300"' in primero and 'height="300"' in primero
    assert "var(--color-accent-indigo)" in primero
    assert "var(--color-accent-glow)" in primero
    # Iniciales y artista, sin material externo ni referencias de red
    # (el xmlns del elemento <svg> es namespace, no una carga remota).
    assert "BR" in primero
    assert "Queen" in primero
    assert "<image" not in primero and "@import" not in primero
    assert "url(http" not in primero


def test_generador_varia_por_titulo():
    generador = cargar_generador()

    uno = generador.portada_svg("01-demo", "Bohemian Rhapsody", "Queen")
    otro = generador.portada_svg("02-demo", "Stairway to Heaven", "Led Zeppelin")

    assert uno != otro


def test_generador_escribe_archivo_idempotente(tmp_path: Path):
    generador = cargar_generador()
    destino = tmp_path / "portadas" / "01-demo.svg"

    generado = generador.generar("01-demo", "Bohemian Rhapsody", "Queen", destino=destino)
    contenido = destino.read_text(encoding="utf-8")

    assert generado == destino
    assert contenido == generador.portada_svg("01-demo", "Bohemian Rhapsody", "Queen")

    # Segunda pasada sin --force: mismo contenido, no se reescribe distinto.
    generador.generar("01-demo", "Bohemian Rhapsody", "Queen", destino=destino)
    assert destino.read_text(encoding="utf-8") == contenido


def test_generador_cubre_los_slugs_del_seed(tmp_path: Path):
    generador = cargar_generador()
    conexion = sqlite3.connect(":memory:")
    try:
        for tabla in SQLModel.metadata.sorted_tables:
            conexion.execute(
                str(CreateTable(tabla).compile(dialect=sqlite_dialect.dialect())).strip()
            )
        conexion.executescript(SEED_PATH.read_text(encoding="utf-8"))
        titulos = {
            fila[0].removeprefix("/portadas/").removesuffix(".svg"): fila[1]
            for fila in conexion.execute("SELECT portada, titulo FROM cancion").fetchall()
        }
    finally:
        conexion.close()

    slugs_generados = {slug for slug, _, _ in generador.CANCIONES}

    assert slugs_generados == set(titulos), (
        "los slugs del generador deben coincidir con los del seed"
    )
    for slug, titulo, _artista in generador.CANCIONES:
        assert titulos[slug] == titulo
