"""
Configuración de base de datos para la API de Música.

Maneja la conexión, sesiones y creación de tablas usando SQLModel/SQLAlchemy.
"""

import logging
from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy import inspect
from sqlalchemy.orm import sessionmaker
from sqlmodel import Session, SQLModel, create_engine

from musica_api.config import get_settings

# Obtener configuración según entorno
settings = get_settings()

# Engine de SQLAlchemy
# echo=True muestra las queries SQL en consola (útil en desarrollo)
engine = create_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)

# Session factory
SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def create_db_and_tables() -> None:
    """
    Crea todas las tablas definidas en los modelos SQLModel.
    Se llama al iniciar la aplicación (lifespan en main.py).
    """
    SQLModel.metadata.create_all(engine)
    ensure_schema(engine)


# Columnas agregadas después de la primera versión, para migraciones aditivas.
# create_all crea tablas nuevas pero NO altera tablas existentes.
COLUMNAS_NUEVAS: dict[str, list[tuple[str, str]]] = {
    "usuario": [("password_hash", "TEXT")],
    "cancion": [("portada", "TEXT")],
}


def ensure_schema(motor=engine) -> None:
    """
    Migración aditiva idempotente: agrega columnas nuevas y tablas ausentes
    sin borrar datos. Segura para correr en cada arranque.
    """
    inspector = inspect(motor)

    for tabla, columnas in COLUMNAS_NUEVAS.items():
        if not inspector.has_table(tabla):
            continue
        existentes = {col["name"] for col in inspector.get_columns(tabla)}
        for nombre, tipo in columnas:
            if nombre not in existentes:
                with motor.begin() as conexion:
                    conexion.exec_driver_sql(f"ALTER TABLE {tabla} ADD COLUMN {nombre} {tipo}")
                logger_migracion = logging.getLogger("api_musica.database")
                logger_migracion.info(f"Migración: columna {tabla}.{nombre} agregada")

    SQLModel.metadata.create_all(motor)


def get_session() -> Generator[Session]:
    """
    Dependency de FastAPI para obtener una sesión de BD por request.

    Uso:
        @app.get("/items")
        def read_items(session: Session = Depends(get_session)):
            ...

    La sesión se cierra automáticamente al terminar el request.
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@contextmanager
def session_scope() -> Generator[Session]:
    """
    Context manager para usar sesiones fuera de requests (scripts, tests, CLI).

    Uso:
        with session_scope() as session:
            usuario = session.get(Usuario, 1)
            ...

    Hace commit automático si no hay excepción, rollback si hay error.
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """
    Inicialización completa de la base de datos.
    Útil para scripts de setup o tests.
    """
    create_db_and_tables()


def drop_db() -> None:
    """
    Elimina todas las tablas. ¡CUIDADO: borra todos los datos!
    Solo para tests o desarrollo.
    """
    SQLModel.metadata.drop_all(engine)
