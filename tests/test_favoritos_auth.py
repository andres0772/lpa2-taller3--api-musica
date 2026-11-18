"""
Tests de autorización en favoritos.

Un favorito solo lo puede marcar o quitar el usuario dueño de la sesión.
Antes de este cambio cualquier persona podía crear o borrar favoritos de
cualquier usuario sin token: los endpoints tomaban el `id_usuario` de la URL o
del cuerpo y no miraban la sesión para nada.

Respuestas esperadas:
- sin token                  -> 401 (no sé quién sos)
- token válido, otro usuario -> 403 (sé quién sos, pero no es tu favorito)
- token válido, tu usuario   -> funciona
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from main import app
from musica_api.database import get_session
from musica_api.models import Cancion


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="cancion")
def cancion_fixture(session: Session):
    cancion = Cancion(
        titulo="Prueba de autorizacion",
        artista="Alguien",
        duracion="3:30",
        año=2020,
        genero="Rock",
        duracion_segundos=210,
    )
    session.add(cancion)
    session.commit()
    session.refresh(cancion)
    return cancion


def alta(client: TestClient, correo: str) -> tuple[int, str]:
    """Registra un usuario y devuelve su id y su token de sesión."""
    alta_respuesta = client.post(
        "/api/auth/registro",
        json={"nombre": "Usuario", "correo": correo, "contraseña": "una-clave-larga-2024"},
    )
    assert alta_respuesta.status_code == 201, alta_respuesta.text
    usuario_id = alta_respuesta.json()["id"]

    login = client.post(
        "/api/auth/login",
        json={"correo": correo, "contraseña": "una-clave-larga-2024"},
    )
    assert login.status_code == 200, login.text
    return usuario_id, login.json()["token"]


def test_favorito_sin_token_devuelve_401(client: TestClient, cancion: Cancion):
    respuesta = client.post(
        "/api/favoritos",
        json={"id_usuario": cancion.id, "id_cancion": cancion.id},
    )
    assert respuesta.status_code == 401


def test_favorito_sin_token_en_la_ruta_anidada_devuelve_401(client: TestClient, cancion: Cancion):
    # El 401 tiene que caer antes de mirar si el usuario existe.
    respuesta = client.post("/api/usuarios/1/favoritos/1")
    assert respuesta.status_code == 401


def test_favorito_de_otro_usuario_devuelve_403(client: TestClient, cancion: Cancion):
    _, token_propio = alta(client, "duenio@example.com")
    id_ajeno, _ = alta(client, "ajeno@example.com")

    respuesta = client.post(
        "/api/favoritos",
        json={"id_usuario": id_ajeno, "id_cancion": cancion.id},
        headers={"X-Session-Token": token_propio},
    )
    assert respuesta.status_code == 403


def test_favorito_de_otro_usuario_en_la_ruta_anidada_devuelve_403(
    client: TestClient, cancion: Cancion
):
    _, token_propio = alta(client, "duenio@example.com")
    id_ajeno, _ = alta(client, "ajeno@example.com")

    respuesta = client.post(
        f"/api/usuarios/{id_ajeno}/favoritos/{cancion.id}",
        headers={"X-Session-Token": token_propio},
    )
    assert respuesta.status_code == 403


def test_favorito_propio_funciona_con_token(client: TestClient, cancion: Cancion):
    usuario_id, token = alta(client, "duenio@example.com")

    respuesta = client.post(
        "/api/favoritos",
        json={"id_usuario": usuario_id, "id_cancion": cancion.id},
        headers={"X-Session-Token": token},
    )
    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()["id_usuario"] == usuario_id


def test_favorito_propio_en_la_ruta_anidada_funciona_con_token(
    client: TestClient, cancion: Cancion
):
    usuario_id, token = alta(client, "duenio@example.com")

    respuesta = client.post(
        f"/api/usuarios/{usuario_id}/favoritos/{cancion.id}",
        headers={"X-Session-Token": token},
    )
    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()["id_usuario"] == usuario_id


def test_quitar_favorito_sin_token_devuelve_401(client: TestClient, cancion: Cancion):
    usuario_id, token = alta(client, "duenio@example.com")
    client.post(
        "/api/favoritos",
        json={"id_usuario": usuario_id, "id_cancion": cancion.id},
        headers={"X-Session-Token": token},
    )

    respuesta = client.delete(f"/api/favoritos/{cancion.id}")
    assert respuesta.status_code == 401


def test_quitar_favorito_ajeno_devuelve_403(client: TestClient, cancion: Cancion):
    """Pin del candado de borrado: sin esta prueba, quitar el control de dueño
    de DELETE /api/favoritos/{id} dejaría las 113 pruebas en verde."""
    usuario_id, token = alta(client, "duenio@example.com")
    _, token_ajeno = alta(client, "ajeno@example.com")

    creado = client.post(
        "/api/favoritos",
        json={"id_usuario": usuario_id, "id_cancion": cancion.id},
        headers={"X-Session-Token": token},
    )
    favorito_id = creado.json()["id"]

    respuesta = client.delete(
        f"/api/favoritos/{favorito_id}",
        headers={"X-Session-Token": token_ajeno},
    )
    assert respuesta.status_code == 403

    # El favorito tuvo que sobrevivir al intento ajeno.
    sigue = client.get(f"/api/favoritos/{favorito_id}")
    assert sigue.status_code == 200


def test_quitar_favorito_ajeno_en_la_ruta_anidada_devuelve_403(
    client: TestClient, cancion: Cancion
):
    """El mismo pin para la ruta anidada: responde 403 y no 404, porque la
    búsqueda filtra por dueño y sin el control respondería 404."""
    usuario_id, token = alta(client, "duenio@example.com")
    id_ajeno, token_ajeno = alta(client, "ajeno@example.com")

    client.post(
        f"/api/usuarios/{id_ajeno}/favoritos/{cancion.id}",
        headers={"X-Session-Token": token_ajeno},
    )

    respuesta = client.delete(
        f"/api/usuarios/{id_ajeno}/favoritos/{cancion.id}",
        headers={"X-Session-Token": token},
    )
    assert respuesta.status_code == 403

    # El favorito del otro usuario tuvo que sobrevivir al intento ajeno.
    sigue = client.get(f"/api/usuarios/{id_ajeno}/favoritos")
    assert sigue.status_code == 200
    assert [favorito["id_cancion"] for favorito in sigue.json()] == [cancion.id]
