"""
Tests de configuración (paso 4 del taller, "usa Pydantic para la validación"):
entorno tipado, nivel de logging configurable y validación al arrancar.
"""

import logging

import pytest
from pydantic import ValidationError

from musica_api import config


def test_valores_por_defecto():
    ajustes = config.Settings()
    assert ajustes.app_name == "API de Música"
    assert ajustes.environment == "development"
    assert ajustes.database_url == "sqlite:///./musica.db"
    assert ajustes.log_level == "INFO"


def test_configuracion_se_lee_de_variables_de_entorno(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    ajustes = config.Settings()
    assert ajustes.environment == "production"
    assert ajustes.log_level == "DEBUG"


def test_entorno_invalido_se_rechaza(monkeypatch):
    """Un typo en el entorno falla al arrancar, no en la primera consulta."""
    monkeypatch.setenv("ENVIRONMENT", "prod")
    with pytest.raises(ValidationError):
        config.Settings()


def test_get_settings_sigue_devuelviendo_desarrollo_por_defecto():
    assert isinstance(config.get_settings(), config.DevelopmentSettings)


def test_get_settings_devuelve_la_clase_del_entorno(monkeypatch):
    monkeypatch.setattr(config, "settings", config.Settings(environment="testing"))
    assert isinstance(config.get_settings(), config.TestingSettings)

    monkeypatch.setattr(config, "settings", config.Settings(environment="production"))
    assert isinstance(config.get_settings(), config.ProductionSettings)


@pytest.mark.parametrize(
    ("valor", "esperado"),
    [
        ("INFO", logging.INFO),
        ("debug", logging.DEBUG),
        ("  Warning  ", logging.WARNING),
        ("ERROR", logging.ERROR),
    ],
)
def test_resolver_nivel_log_mapea_los_niveles_conocidos(valor: str, esperado: int):
    assert config.resolver_nivel_log(valor) == esperado


def test_resolver_nivel_log_degenera_a_info_con_un_valor_desconocido():
    """Un nivel mal escrito en .env no debe tumbar la API."""
    assert config.resolver_nivel_log("verbose") == logging.INFO
    assert config.resolver_nivel_log("") == logging.INFO


def test_validate_settings_pasa_con_la_configuracion_por_defecto():
    config.validate_settings()


def test_validate_settings_falla_si_falta_una_configuracion_requerida(monkeypatch):
    monkeypatch.setattr(config, "settings", config.Settings(database_url="   "))
    with pytest.raises(ValueError, match="database_url"):
        config.validate_settings()
