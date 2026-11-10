"""
Configuración de base de datos para la API de Música.

Maneja la conexión, sesiones y creación de tablas usando SQLModel/SQLAlchemy.
"""

from collections.abc import Generator
from contextlib import contextmanager

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
