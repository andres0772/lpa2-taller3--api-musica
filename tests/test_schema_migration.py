"""
Tests de migración aditiva del esquema (S5).

Una base creada antes de agregar password_hash/sesion debe quedar
utilizable al reiniciar la API, sin pasos manuales ni borrar datos.
"""

from sqlalchemy import inspect
from sqlmodel import create_engine

from musica_api.database import ensure_schema


def test_agrega_columnas_nuevas_a_una_base_previa():
    # Base "vieja": usuario sin password_hash y sin tabla sesion.
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "CREATE TABLE usuario ("
            "id INTEGER PRIMARY KEY, "
            "nombre VARCHAR(100) NOT NULL, "
            "correo VARCHAR NOT NULL, "
            "fecha_registro TIMESTAMP NOT NULL)"
        )
        conn.exec_driver_sql(
            "INSERT INTO usuario (id, nombre, correo, fecha_registro) "
            "VALUES (1, 'Juan Pérez', 'juan.perez@email.com', '2024-01-15 10:30:00')"
        )

    ensure_schema(engine)

    columnas = {col["name"] for col in inspect(engine).get_columns("usuario")}
    assert "password_hash" in columnas
    assert inspect(engine).has_table("sesion")

    with engine.connect() as conn:
        filas = conn.exec_driver_sql(
            "SELECT COUNT(*) FROM usuario WHERE password_hash IS NULL"
        ).scalar()
    assert filas == 1


def test_es_idempotente_sobre_una_base_ya_migrada():
    engine = create_engine("sqlite://")
    ensure_schema(engine)
    columnas_antes = {col["name"] for col in inspect(engine).get_columns("usuario")}

    ensure_schema(engine)

    columnas_despues = {col["name"] for col in inspect(engine).get_columns("usuario")}
    assert columnas_antes == columnas_despues
