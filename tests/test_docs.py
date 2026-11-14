"""
Document metadata is intentionally not published: no contact, no license.

The root endpoint is pinned here because it is served by the FastAPI
constructor this file exists to guard.
"""

from fastapi.testclient import TestClient

from main import app


def test_openapijson_no_publica_contacto_ni_licencia():
    cliente = TestClient(app)
    respuesta = cliente.get("/openapi.json")
    assert respuesta.status_code == 200

    info = respuesta.json()["info"]
    assert "contact" not in info
    assert "license" not in info


def test_el_endpoint_raiz_sigue_igual():
    cliente = TestClient(app)
    respuesta = cliente.get("/")
    assert respuesta.status_code == 200

    cuerpo = respuesta.json()
    assert cuerpo["nombre"] == "API de Música"
    assert cuerpo["documentacion"]["swagger_ui"] == "/docs"
    assert cuerpo["endpoints"]["canciones"] == "/api/canciones"
