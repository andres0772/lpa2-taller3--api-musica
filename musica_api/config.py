"""
Configuración de la aplicación.
Maneja diferentes entornos: desarrollo, pruebas y producción.
"""

import logging
from typing import Literal

from pydantic_settings import BaseSettings

# Entornos válidos: un typo en .env falla al arrancar, no en la primera consulta.
ENTORNO = Literal["development", "testing", "production"]


class Settings(BaseSettings):
    """
    Configuración de la aplicación usando Pydantic Settings.
    Lee las variables de entorno desde el archivo .env
    """

    # Configuración básica de la aplicación
    app_name: str = "API de Música"
    app_version: str = "1.0.0"

    # Configuración del entorno
    environment: ENTORNO = "development"

    # Configuración de la base de datos
    # Para SQLite: sqlite:///./musica.db
    # Para PostgreSQL: postgresql://user:password@localhost/dbname
    database_url: str = "sqlite:///./musica.db"

    # Configuración del servidor
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # Nivel de logging de la aplicación: DEBUG, INFO, WARNING, ERROR o CRITICAL
    log_level: str = "INFO"

    # Configuración de CORS
    # En desarrollo puedes usar ["*"], en producción especifica los orígenes permitidos
    cors_origins: list[str] = ["*"]

    class Config:
        """
        Configuración de Pydantic Settings.
        """

        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Crear una instancia global de Settings
settings = Settings()


# Crear diferentes configuraciones para cada entorno
class DevelopmentSettings(Settings):
    """Configuración para el entorno de desarrollo."""

    debug: bool = True


class TestingSettings(Settings):
    """Configuración para el entorno de pruebas."""

    # Usar una base de datos diferente para pruebas
    database_url: str = "sqlite:///./test_musica.db"


class ProductionSettings(Settings):
    """Configuración para el entorno de producción."""

    debug: bool = False


# Función para obtener la configuración según el entorno
def get_settings() -> Settings:
    """
    Retorna la configuración apropiada según el entorno.
    """
    env = settings.environment.lower()

    if env == "testing":
        return TestingSettings()
    elif env == "production":
        return ProductionSettings()
    else:
        return DevelopmentSettings()


def resolver_nivel_log(valor: str) -> int:
    """
    Traduce el nivel configurado (texto) al nivel numérico de logging.

    Un valor desconocido degrada a INFO en lugar de romper el arranque: un typo
    en LOG_LEVEL no debe tumbar la API.
    """
    return getattr(logging, str(valor).strip().upper(), logging.INFO)


# Configuración que la aplicación no puede arrancar sin ella
AJUSTES_REQUERIDOS = ("database_url", "app_name")


def validate_settings() -> None:
    """
    Verifica que la configuración requerida esté presente.

    Se llama al arrancar (lifespan): falla rápido y con mensaje claro en vez de
    descubrir el problema en la primera consulta a la base de datos.
    """
    for nombre in AJUSTES_REQUERIDOS:
        if not str(getattr(settings, nombre, "") or "").strip():
            raise ValueError(f"Configuración requerida no encontrada: {nombre}")
