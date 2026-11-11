"""
Tests de autenticación (S5): registro, login, sesión y logout.

El token viaja en el header X-Session-Token; se guarda hasheado (PBKDF2
de stdlib, sin dependencias nuevas) en la tabla sesion.
"""

import hashlib

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from main import app
from musica_api.database import get_session
from musica_api.models import Sesion, Usuario
from musica_api.security import verificar_password


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


USUARIO = {
    "nombre": "Ana Demo",
    "correo": "ana@example.com",
    "contraseña": "secretito-2024",
}


def registrar(client: TestClient) -> dict:
    respuesta = client.post("/api/auth/registro", json=USUARIO)
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


def test_registro_login_me_logout(client: TestClient, session: Session):
    usuario = registrar(client)
    assert usuario["correo"] == USUARIO["correo"]

    login = client.post(
        "/api/auth/login",
        json={"correo": USUARIO["correo"], "contraseña": USUARIO["contraseña"]},
    )
    assert login.status_code == 200
    cuerpo = login.json()
    token = cuerpo["token"]
    assert token
    assert cuerpo["usuario"]["id"] == usuario["id"]

    me = client.get("/api/auth/me", headers={"X-Session-Token": token})
    assert me.status_code == 200
    assert me.json()["nombre"] == USUARIO["nombre"]

    logout = client.post(
        "/api/auth/logout",
        headers={"X-Session-Token": token},
    )
    assert logout.status_code == 204

    me_despues = client.get("/api/auth/me", headers={"X-Session-Token": token})
    assert me_despues.status_code == 401


def test_registro_con_correo_duplicado_devuelve_409(client: TestClient):
    registrar(client)
    otra = client.post("/api/auth/registro", json=USUARIO)
    assert otra.status_code == 409


def test_login_con_credenciales_invalidas_devuelve_401(client: TestClient):
    registrar(client)

    contraseña_mala = client.post(
        "/api/auth/login",
        json={"correo": USUARIO["correo"], "contraseña": "otra-cosa-2024"},
    )
    assert contraseña_mala.status_code == 401

    inexistente = client.post(
        "/api/auth/login",
        json={"correo": "nadie@example.com", "contraseña": USUARIO["contraseña"]},
    )
    assert inexistente.status_code == 401


def test_me_sin_token_o_token_invalido_devuelve_401(client: TestClient):
    assert client.get("/api/auth/me").status_code == 401

    registrar(client)
    assert client.get("/api/auth/me", headers={"X-Session-Token": "no-existe"}).status_code == 401


def test_contraseña_corta_se_rechaza(client: TestClient):
    respuesta = client.post(
        "/api/auth/registro",
        json={
            "nombre": "Corta",
            "correo": "corta@example.com",
            "contraseña": "123",
        },
    )
    assert respuesta.status_code == 422


def test_la_contraseña_nunca_se_guarda_en_texto_plano(client: TestClient, session: Session):
    usuario = registrar(client)

    fila = session.get(Usuario, usuario["id"])
    assert fila is not None
    assert fila.password_hash
    assert USUARIO["contraseña"] not in fila.password_hash
    assert verificar_password(USUARIO["contraseña"], fila.password_hash) is True


def test_el_token_se_guarda_solo_como_hash(client: TestClient, session: Session):
    registrar(client)
    login = client.post(
        "/api/auth/login",
        json={"correo": USUARIO["correo"], "contraseña": USUARIO["contraseña"]},
    )
    token = login.json()["token"]

    sesiones = session.exec(__import__("sqlmodel").select(Sesion)).all()
    assert len(sesiones) == 1
    assert token not in sesiones[0].token_hash
    assert sesiones[0].token_hash == hashlib.sha256(token.encode()).hexdigest()
