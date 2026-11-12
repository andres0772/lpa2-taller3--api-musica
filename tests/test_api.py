"""
Tests para la API de Música.
Pruebas unitarias y de integración usando pytest.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from main import app
from musica_api.database import get_session
from musica_api.models import Cancion, Favorito, Genero, Usuario

# =============================================================================
# CONFIGURACIÓN DE FIXTURES
# =============================================================================


# Fixture para crear una base de datos en memoria para testing
@pytest.fixture(name="session")
def session_fixture():
    """
    Crea una sesión de base de datos en memoria para cada test.
    Se limpia automáticamente después de cada test.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


# Fixture para cliente de pruebas
@pytest.fixture(name="client")
def client_fixture(session: Session):
    """
    Crea un cliente de pruebas de FastAPI con la sesión de test.
    """

    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# Fixture para crear usuario de prueba
@pytest.fixture(name="usuario_test")
def usuario_test_fixture(session: Session):
    """
    Crea un usuario de prueba en la base de datos.
    """
    usuario = Usuario(
        nombre="Test User",
        correo="test@test.com",
    )
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario


# Fixture para crear segunda usuario de prueba
@pytest.fixture(name="usuario_test_2")
def usuario_test_2_fixture(session: Session):
    """
    Crea un segundo usuario de prueba.
    """
    usuario = Usuario(
        nombre="Test User 2",
        correo="test2@test.com",
    )
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario


# Fixture para crear canción de prueba
@pytest.fixture(name="cancion_test")
def cancion_test_fixture(session: Session):
    """
    Crea una canción de prueba en la base de datos.
    """
    cancion = Cancion(
        titulo="Test Song",
        artista="Test Artist",
        album="Test Album",
        duracion="3:45",
        duracion_segundos=225,
        año=2020,
        genero=Genero.ROCK,
    )
    session.add(cancion)
    session.commit()
    session.refresh(cancion)
    return cancion


# Fixture para crear segunda canción de prueba
@pytest.fixture(name="cancion_test_2")
def cancion_test_2_fixture(session: Session):
    """
    Crea una segunda canción de prueba.
    """
    cancion = Cancion(
        titulo="Another Song",
        artista="Another Artist",
        duracion="4:30",
        duracion_segundos=270,
        año=2021,
        genero=Genero.POP,
    )
    session.add(cancion)
    session.commit()
    session.refresh(cancion)
    return cancion


# Fixture para crear favorito de prueba
@pytest.fixture(name="favorito_test")
def favorito_test_fixture(session: Session, usuario_test: Usuario, cancion_test: Cancion):
    """
    Crea un favorito de prueba en la base de datos.
    """
    favorito = Favorito(
        id_usuario=usuario_test.id,
        id_cancion=cancion_test.id,
    )
    session.add(favorito)
    session.commit()
    session.refresh(favorito)
    return favorito


# =============================================================================
# TESTS DE USUARIOS
# =============================================================================


class TestUsuarios:
    """Tests para los endpoints de usuarios."""

    def test_listar_usuarios_vacio(self, client: TestClient):
        """Test para GET /api/usuarios con BD vacía."""
        response = client.get("/api/usuarios")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_listar_usuarios_con_datos(self, client: TestClient, usuario_test: Usuario):
        """Test para GET /api/usuarios con datos."""
        response = client.get("/api/usuarios")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["nombre"] == "Test User"
        assert data[0]["correo"] == "test@test.com"
        assert "id" in data[0]
        assert "fecha_registro" in data[0]

    def test_listar_usuarios_paginacion(self, client: TestClient, session: Session):
        """Test paginación en listar usuarios."""
        # Crear 5 usuarios
        for i in range(5):
            u = Usuario(nombre=f"User {i}", correo=f"user{i}@test.com")
            session.add(u)
        session.commit()

        # page_size=2
        response = client.get("/api/usuarios?page=1&page_size=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        response = client.get("/api/usuarios?page=2&page_size=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        response = client.get("/api/usuarios?page=3&page_size=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1  # 5 total, 2+2+1

    def test_crear_usuario(self, client: TestClient):
        """Test para POST /api/usuarios."""
        response = client.post(
            "/api/usuarios",
            json={"nombre": "Nuevo Usuario", "correo": "nuevo@test.com"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == "Nuevo Usuario"
        assert data["correo"] == "nuevo@test.com"
        assert "id" in data
        assert "fecha_registro" in data

    def test_crear_usuario_correo_duplicado(self, client: TestClient, usuario_test: Usuario):
        """Test para verificar que no se permiten correos duplicados."""
        response = client.post(
            "/api/usuarios",
            json={"nombre": "Otro Nombre", "correo": "test@test.com"},  # mismo correo
        )
        assert response.status_code == 409
        assert "ya está registrado" in response.json()["detail"]

    def test_crear_usuario_email_invalido(self, client: TestClient):
        """Test validación de email inválido."""
        response = client.post(
            "/api/usuarios",
            json={"nombre": "Test", "correo": "no-es-email"},
        )
        assert response.status_code == 422

    def test_crear_usuario_nombre_vacio(self, client: TestClient):
        """Test validación nombre vacío."""
        response = client.post(
            "/api/usuarios",
            json={"nombre": "", "correo": "valido@test.com"},
        )
        assert response.status_code == 422

    def test_obtener_usuario(self, client: TestClient, usuario_test: Usuario):
        """Test para GET /api/usuarios/{id}."""
        response = client.get(f"/api/usuarios/{usuario_test.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == usuario_test.id
        assert data["nombre"] == usuario_test.nombre
        assert data["correo"] == usuario_test.correo

    def test_obtener_usuario_no_existe(self, client: TestClient):
        """Test para verificar error 404 con usuario inexistente."""
        response = client.get("/api/usuarios/999")
        assert response.status_code == 404
        assert "no encontrado" in response.json()["detail"]

    def test_actualizar_usuario(self, client: TestClient, usuario_test: Usuario):
        """Test para PUT /api/usuarios/{id}."""
        response = client.put(
            f"/api/usuarios/{usuario_test.id}",
            json={"nombre": "Nombre Actualizado"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["nombre"] == "Nombre Actualizado"
        assert data["correo"] == usuario_test.correo  # sin cambios

    def test_actualizar_usuario_correo_nuevo(self, client: TestClient, usuario_test: Usuario):
        """Test actualizar correo a uno nuevo válido."""
        response = client.put(
            f"/api/usuarios/{usuario_test.id}",
            json={"correo": "nuevo_correo@test.com"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["correo"] == "nuevo_correo@test.com"

    def test_actualizar_usuario_correo_duplicado(
        self, client: TestClient, usuario_test: Usuario, usuario_test_2: Usuario
    ):
        """Test actualizar a correo que ya existe."""
        response = client.put(
            f"/api/usuarios/{usuario_test.id}",
            json={"correo": "test2@test.com"},  # correo de usuario_test_2
        )
        assert response.status_code == 409
        assert "ya está registrado" in response.json()["detail"]

    def test_actualizar_usuario_no_existe(self, client: TestClient):
        """Test actualizar usuario inexistente."""
        response = client.put("/api/usuarios/999", json={"nombre": "Test"})
        assert response.status_code == 404

    def test_eliminar_usuario(self, client: TestClient, usuario_test: Usuario):
        """Test para DELETE /api/usuarios/{id}."""
        response = client.delete(f"/api/usuarios/{usuario_test.id}")
        assert response.status_code == 204

        # Verificar que ya no existe
        response = client.get(f"/api/usuarios/{usuario_test.id}")
        assert response.status_code == 404

    def test_eliminar_usuario_no_existe(self, client: TestClient):
        """Test eliminar usuario inexistente."""
        response = client.delete("/api/usuarios/999")
        assert response.status_code == 404


# =============================================================================
# TESTS DE CANCIONES
# =============================================================================


class TestCanciones:
    """Tests para los endpoints de canciones."""

    def test_listar_canciones_vacio(self, client: TestClient):
        """Test para GET /api/canciones con BD vacía."""
        response = client.get("/api/canciones")
        assert response.status_code == 200
        assert response.json() == []

    def test_listar_canciones_con_datos(self, client: TestClient, cancion_test: Cancion):
        """Test para GET /api/canciones con datos."""
        response = client.get("/api/canciones")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        c = data[0]
        assert c["titulo"] == "Test Song"
        assert c["artista"] == "Test Artist"
        assert c["duracion"] == "3:45"
        assert c["duracion_segundos"] == 225
        assert c["duracion_formato"] == "3:45"
        assert c["genero"] == "Rock"

    def test_listar_canciones_paginacion(self, client: TestClient, session: Session):
        """Test paginación en listar canciones."""
        for i in range(5):
            c = Cancion(
                titulo=f"Song {i}",
                artista=f"Artist {i}",
                duracion="3:00",
                duracion_segundos=180,
                año=2020 + i,
                genero=Genero.ROCK,
            )
            session.add(c)
        session.commit()

        response = client.get("/api/canciones?page=1&page_size=2")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_crear_cancion(self, client: TestClient):
        """Test para POST /api/canciones."""
        response = client.post(
            "/api/canciones",
            json={
                "titulo": "Nueva Canción",
                "artista": "Nuevo Artista",
                "album": "Nuevo Album",
                "duracion": "4:30",
                "año": 2023,
                "genero": "Pop",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["titulo"] == "Nueva Canción"
        assert data["duracion"] == "4:30"
        assert data["duracion_segundos"] == 270
        assert data["duracion_formato"] == "4:30"
        assert data["genero"] == "Pop"

    def test_crear_cancion_duracion_invalida(self, client: TestClient):
        """Test validación duración formato inválido."""
        response = client.post(
            "/api/canciones",
            json={
                "titulo": "Test",
                "artista": "Test",
                "duracion": "120",  # debe ser mm:ss
                "año": 2020,
                "genero": "Rock",
            },
        )
        assert response.status_code == 422
        assert "mm:ss" in response.json()["detail"][0]["msg"]

    def test_crear_cancion_segundos_invalidos(self, client: TestClient):
        """Test validación segundos > 59."""
        response = client.post(
            "/api/canciones",
            json={
                "titulo": "Test",
                "artista": "Test",
                "duracion": "3:70",  # segundos inválidos
                "año": 2020,
                "genero": "Rock",
            },
        )
        assert response.status_code == 422

    def test_crear_cancion_minutos_negativos(self, client: TestClient):
        """Test validación minutos negativos."""
        response = client.post(
            "/api/canciones",
            json={
                "titulo": "Test",
                "artista": "Test",
                "duracion": "-1:30",
                "año": 2020,
                "genero": "Rock",
            },
        )
        assert response.status_code == 422

    def test_crear_cancion_año_futuro(self, client: TestClient):
        """Test validación año futuro."""
        from datetime import datetime

        futuro = datetime.now().year + 1
        response = client.post(
            "/api/canciones",
            json={
                "titulo": "Test",
                "artista": "Test",
                "duracion": "3:45",
                "año": futuro,
                "genero": "Rock",
            },
        )
        assert response.status_code == 422
        assert "mayor a" in response.json()["detail"][0]["msg"]

    def test_crear_cancion_año_muy_antiguo(self, client: TestClient):
        """Test validación año < 1900."""
        response = client.post(
            "/api/canciones",
            json={
                "titulo": "Test",
                "artista": "Test",
                "duracion": "3:45",
                "año": 1800,
                "genero": "Rock",
            },
        )
        assert response.status_code == 422

    def test_crear_cancion_genero_invalido(self, client: TestClient):
        """Test validación género no válido."""
        response = client.post(
            "/api/canciones",
            json={
                "titulo": "Test",
                "artista": "Test",
                "duracion": "3:45",
                "año": 2020,
                "genero": "NoExiste",
            },
        )
        assert response.status_code == 422

    def test_obtener_cancion(self, client: TestClient, cancion_test: Cancion):
        """Test para GET /api/canciones/{id}."""
        response = client.get(f"/api/canciones/{cancion_test.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == cancion_test.id
        assert data["titulo"] == cancion_test.titulo

    def test_obtener_cancion_no_existe(self, client: TestClient):
        """Test para verificar error 404 con canción inexistente."""
        response = client.get("/api/canciones/999")
        assert response.status_code == 404

    def test_lectura_expone_portada(self, client: TestClient, session: Session):
        """El schema de lectura incluye el campo aditivo portada (S3)."""
        cancion = Cancion(
            titulo="Canción con portada",
            artista="Artista",
            duracion="3:45",
            duracion_segundos=225,
            año=2020,
            genero=Genero.ROCK,
            portada="/portadas/01-demo.svg",
        )
        session.add(cancion)
        session.commit()
        session.refresh(cancion)

        response = client.get(f"/api/canciones/{cancion.id}")
        assert response.status_code == 200
        assert response.json()["portada"] == "/portadas/01-demo.svg"

    def test_lectura_portada_null_cuando_no_hay(self, client: TestClient, cancion_test: Cancion):
        """Sin portada asociada, el campo se sirve como null (nunca se omite)."""
        response = client.get(f"/api/canciones/{cancion_test.id}")
        assert response.status_code == 200
        assert response.json()["portada"] is None

    def test_actualizar_cancion(self, client: TestClient, cancion_test: Cancion):
        """Test para PUT /api/canciones/{id}."""
        response = client.put(
            f"/api/canciones/{cancion_test.id}",
            json={"titulo": "Título Actualizado", "duracion": "5:00"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["titulo"] == "Título Actualizado"
        assert data["duracion"] == "5:00"
        assert data["duracion_segundos"] == 300
        assert data["duracion_formato"] == "5:00"

    def test_actualizar_cancion_no_existe(self, client: TestClient):
        """Test actualizar canción inexistente."""
        response = client.put("/api/canciones/999", json={"titulo": "Test"})
        assert response.status_code == 404

    def test_eliminar_cancion(self, client: TestClient, cancion_test: Cancion):
        """Test para DELETE /api/canciones/{id}."""
        response = client.delete(f"/api/canciones/{cancion_test.id}")
        assert response.status_code == 204

        response = client.get(f"/api/canciones/{cancion_test.id}")
        assert response.status_code == 404

    def test_eliminar_cancion_no_existe(self, client: TestClient):
        """Test eliminar canción inexistente."""
        response = client.delete("/api/canciones/999")
        assert response.status_code == 404


# =============================================================================
# TESTS DE BÚSQUEDA DE CANCIONES
# =============================================================================


class TestBuscarCanciones:
    """Tests para GET /api/canciones/buscar con filtros."""

    @pytest.fixture(autouse=True)
    def setup_canciones(self, session: Session):
        """Crea canciones de prueba para búsqueda."""
        canciones = [
            Cancion(
                titulo="Bohemian Rhapsody",
                artista="Queen",
                duracion="5:55",
                duracion_segundos=355,
                año=1975,
                genero=Genero.ROCK,
            ),
            Cancion(
                titulo="Stairway to Heaven",
                artista="Led Zeppelin",
                duracion="8:02",
                duracion_segundos=482,
                año=1971,
                genero=Genero.ROCK,
            ),
            Cancion(
                titulo="Billie Jean",
                artista="Michael Jackson",
                duracion="4:54",
                duracion_segundos=294,
                año=1982,
                genero=Genero.POP,
            ),
            Cancion(
                titulo="Hotel California",
                artista="Eagles",
                duracion="6:30",
                duracion_segundos=390,
                año=1976,
                genero=Genero.ROCK,
            ),
            Cancion(
                titulo="Sweet Child o' Mine",
                artista="Guns N' Roses",
                duracion="5:56",
                duracion_segundos=356,
                año=1987,
                genero=Genero.ROCK,
            ),
            Cancion(
                titulo="Shape of You",
                artista="Ed Sheeran",
                duracion="3:53",
                duracion_segundos=233,
                año=2017,
                genero=Genero.POP,
            ),
        ]
        for c in canciones:
            session.add(c)
        session.commit()

    def test_buscar_por_titulo(self, client: TestClient):
        """Test buscar por título (contiene, case-insensitive)."""
        response = client.get("/api/canciones/buscar?titulo=bohemian")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["titulo"] == "Bohemian Rhapsody"

    def test_buscar_por_artista(self, client: TestClient):
        """Test buscar por artista (contiene, case-insensitive)."""
        response = client.get("/api/canciones/buscar?artista=queen")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["artista"] == "Queen"

    def test_buscar_modo_cualquiera_acepta_titulo_o_artista(self, client: TestClient):
        """modo=cualquiera: coincide si el texto está en el título O en el artista."""
        response = client.get("/api/canciones/buscar?modo=cualquiera&titulo=queen&artista=queen")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["artista"] == "Queen"

    def test_buscar_por_defecto_exige_titulo_y_artista(self, client: TestClient):
        """Sin modo (default 'todas'): título Y artista deben coincidir."""
        response = client.get("/api/canciones/buscar?titulo=queen&artista=queen")
        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_buscar_por_genero(self, client: TestClient):
        """Test buscar por género exacto."""
        response = client.get("/api/canciones/buscar?genero=Pop")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Billie Jean y Shape of You son Pop
        # Wait, setup tiene 2 Pop
        assert len(data) == 2

    def test_buscar_por_año_rango(self, client: TestClient):
        """Test buscar por rango de años."""
        response = client.get("/api/canciones/buscar?año_desde=1970&año_hasta=1980")
        assert response.status_code == 200
        data = response.json()
        # 1971, 1975, 1976 están en rango
        assert len(data) == 3

    def test_buscar_multiples_filtros(self, client: TestClient):
        """Test buscar combinando múltiples filtros."""
        response = client.get("/api/canciones/buscar?genero=Rock&año_desde=1970&año_hasta=1980")
        assert response.status_code == 200
        data = response.json()
        # Rock entre 1970-1980: Stairway(1971), Bohemian(1975), Hotel(1976)
        assert len(data) == 3
        for c in data:
            assert c["genero"] == "Rock"
            assert 1970 <= c["año"] <= 1980

    def test_buscar_sin_resultados(self, client: TestClient):
        """Test búsqueda sin resultados."""
        response = client.get("/api/canciones/buscar?titulo=Inexistente")
        assert response.status_code == 200
        assert response.json() == []

    def test_buscar_paginacion(self, client: TestClient):
        """Test paginación en búsqueda."""
        response = client.get("/api/canciones/buscar?genero=Rock&page=1&page_size=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_buscar_genero_invalido(self, client: TestClient):
        """Test búsqueda con género inválido."""
        response = client.get("/api/canciones/buscar?genero=NoExiste")
        assert response.status_code == 422


# =============================================================================
# TESTS DE FAVORITOS (PLANA)
# =============================================================================


class TestFavoritosPlanos:
    """Tests para endpoints planos de favoritos (/api/favoritos)."""

    def test_listar_favoritos_vacio(self, client: TestClient):
        """Test GET /api/favoritos vacío."""
        response = client.get("/api/favoritos")
        assert response.status_code == 200
        assert response.json() == []

    def test_crear_favorito(self, client: TestClient, usuario_test: Usuario, cancion_test: Cancion):
        """Test POST /api/favoritos."""
        response = client.post(
            "/api/favoritos",
            json={"id_usuario": usuario_test.id, "id_cancion": cancion_test.id},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["id_usuario"] == usuario_test.id
        assert data["id_cancion"] == cancion_test.id
        assert "id" in data
        assert "fecha_marcado" in data

    def test_crear_favorito_usuario_inexistente(self, client: TestClient, cancion_test: Cancion):
        """Test crear favorito con usuario inexistente."""
        response = client.post(
            "/api/favoritos",
            json={"id_usuario": 999, "id_cancion": cancion_test.id},
        )
        assert response.status_code == 404

    def test_crear_favorito_cancion_inexistente(self, client: TestClient, usuario_test: Usuario):
        """Test crear favorito con canción inexistente."""
        response = client.post(
            "/api/favoritos",
            json={"id_usuario": usuario_test.id, "id_cancion": 999},
        )
        assert response.status_code == 404

    def test_crear_favorito_duplicado(self, client: TestClient, favorito_test: Favorito):
        """Test crear favorito duplicado (mismo usuario + canción)."""
        response = client.post(
            "/api/favoritos",
            json={"id_usuario": favorito_test.id_usuario, "id_cancion": favorito_test.id_cancion},
        )
        assert response.status_code == 409
        assert "ya está en favoritos" in response.json()["detail"]

    def test_obtener_favorito(self, client: TestClient, favorito_test: Favorito):
        """Test GET /api/favoritos/{id}."""
        response = client.get(f"/api/favoritos/{favorito_test.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == favorito_test.id

    def test_obtener_favorito_no_existe(self, client: TestClient):
        """Test GET favorito inexistente."""
        response = client.get("/api/favoritos/999")
        assert response.status_code == 404

    def test_eliminar_favorito(self, client: TestClient, favorito_test: Favorito):
        """Test DELETE /api/favoritos/{id}."""
        response = client.delete(f"/api/favoritos/{favorito_test.id}")
        assert response.status_code == 204

        response = client.get(f"/api/favoritos/{favorito_test.id}")
        assert response.status_code == 404

    def test_eliminar_favorito_no_existe(self, client: TestClient):
        """Test eliminar favorito inexistente."""
        response = client.delete("/api/favoritos/999")
        assert response.status_code == 404

    def test_listar_favoritos_usuario_plano(self, client: TestClient, favorito_test: Favorito):
        """Test GET /api/favoritos/usuario/{usuario_id}."""
        response = client.get(f"/api/favoritos/usuario/{favorito_test.id_usuario}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id_usuario"] == favorito_test.id_usuario


# =============================================================================
# TESTS DE FAVORITOS ANIDADOS (VISTA USUARIO)
# =============================================================================


class TestFavoritosAnidados:
    """Tests para endpoints anidados /api/usuarios/{id}/favoritos."""

    def test_listar_favoritos_usuario_anidado(self, client: TestClient, favorito_test: Favorito):
        """Test GET /api/usuarios/{id}/favoritos."""
        response = client.get(f"/api/usuarios/{favorito_test.id_usuario}/favoritos")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        # Respuesta incluye usuario y canción expandidos
        assert data[0]["usuario"]["id"] == favorito_test.id_usuario
        assert data[0]["cancion"]["id"] == favorito_test.id_cancion

    def test_listar_favoritos_usuario_vacio(self, client: TestClient, usuario_test: Usuario):
        """Test listar favoritos de usuario sin favoritos."""
        response = client.get(f"/api/usuarios/{usuario_test.id}/favoritos")
        assert response.status_code == 200
        assert response.json() == []

    def test_listar_favoritos_usuario_inexistente(self, client: TestClient):
        """Test listar favoritos de usuario inexistente."""
        response = client.get("/api/usuarios/999/favoritos")
        assert response.status_code == 404

    def test_marcar_favorito_usuario(
        self, client: TestClient, usuario_test: Usuario, cancion_test: Cancion
    ):
        """Test POST /api/usuarios/{id_usuario}/favoritos/{id_cancion}."""
        response = client.post(f"/api/usuarios/{usuario_test.id}/favoritos/{cancion_test.id}")
        assert response.status_code == 201
        data = response.json()
        assert data["id_usuario"] == usuario_test.id
        assert data["id_cancion"] == cancion_test.id

    def test_marcar_favorito_usuario_inexistente(self, client: TestClient, cancion_test: Cancion):
        """Test marcar favorito con usuario inexistente."""
        response = client.post(f"/api/usuarios/999/favoritos/{cancion_test.id}")
        assert response.status_code == 404

    def test_marcar_favorito_cancion_inexistente(self, client: TestClient, usuario_test: Usuario):
        """Test marcar favorito con canción inexistente."""
        response = client.post(f"/api/usuarios/{usuario_test.id}/favoritos/999")
        assert response.status_code == 404

    def test_marcar_favorito_duplicado_anidado(self, client: TestClient, favorito_test: Favorito):
        """Test marcar favorito duplicado vía endpoint anidado."""
        response = client.post(
            f"/api/usuarios/{favorito_test.id_usuario}/favoritos/{favorito_test.id_cancion}"
        )
        assert response.status_code == 409

    def test_quitar_favorito_usuario(self, client: TestClient, favorito_test: Favorito):
        """Test DELETE /api/usuarios/{id_usuario}/favoritos/{id_cancion}."""
        response = client.delete(
            f"/api/usuarios/{favorito_test.id_usuario}/favoritos/{favorito_test.id_cancion}"
        )
        assert response.status_code == 204

        # Verificar que ya no existe
        response = client.get(f"/api/usuarios/{favorito_test.id_usuario}/favoritos")
        assert response.status_code == 200
        assert len(response.json()) == 0

    def test_quitar_favorito_no_existe(
        self, client: TestClient, usuario_test: Usuario, cancion_test: Cancion
    ):
        """Test quitar favorito que no existe."""
        response = client.delete(f"/api/usuarios/{usuario_test.id}/favoritos/{cancion_test.id}")
        assert response.status_code == 404


# =============================================================================
# TESTS DE INTEGRACIÓN (FLUJO COMPLETO)
# =============================================================================


class TestIntegracion:
    """Tests de integración que prueban flujos completos."""

    def test_flujo_completo_usuario_cancion_favorito(self, client: TestClient):
        """Test que verifica el flujo completo de la aplicación."""
        # 1. Crear usuario
        response = client.post(
            "/api/usuarios",
            json={"nombre": "Integration User", "correo": "integration@test.com"},
        )
        assert response.status_code == 201
        usuario = response.json()
        usuario_id = usuario["id"]

        # 2. Crear canción
        response = client.post(
            "/api/canciones",
            json={
                "titulo": "Integration Song",
                "artista": "Integration Artist",
                "duracion": "4:00",
                "año": 2024,
                "genero": "Rock",
            },
        )
        assert response.status_code == 201
        cancion = response.json()
        cancion_id = cancion["id"]

        # 3. Marcar como favorito (endpoint anidado)
        response = client.post(f"/api/usuarios/{usuario_id}/favoritos/{cancion_id}")
        assert response.status_code == 201
        favorito = response.json()
        assert favorito["id_usuario"] == usuario_id
        assert favorito["id_cancion"] == cancion_id

        # 4. Verificar que aparece en favoritos del usuario
        response = client.get(f"/api/usuarios/{usuario_id}/favoritos")
        assert response.status_code == 200
        favoritos = response.json()
        assert len(favoritos) == 1
        assert favoritos[0]["cancion"]["id"] == cancion_id
        assert favoritos[0]["cancion"]["titulo"] == "Integration Song"

        # 5. Verificar en endpoint plano también
        response = client.get("/api/favoritos")
        assert response.status_code == 200
        favoritos = response.json()
        assert len(favoritos) == 1
        assert favoritos[0]["id_usuario"] == usuario_id
        assert favoritos[0]["id_cancion"] == cancion_id

    def test_cascada_eliminar_usuario_borra_favoritos(self, client: TestClient):
        """Test que al borrar usuario se borran sus favoritos (cascade)."""
        # Crear usuario, canción, favorito
        u_resp = client.post(
            "/api/usuarios", json={"nombre": "Cascade User", "correo": "cascade@test.com"}
        )
        usuario_id = u_resp.json()["id"]

        c_resp = client.post(
            "/api/canciones",
            json={
                "titulo": "Cascade Song",
                "artista": "A",
                "duracion": "3:00",
                "año": 2020,
                "genero": "Rock",
            },
        )
        cancion_id = c_resp.json()["id"]

        client.post(f"/api/usuarios/{usuario_id}/favoritos/{cancion_id}")

        # Verificar favorito existe
        resp = client.get("/api/favoritos")
        assert len(resp.json()) == 1

        # Eliminar usuario
        client.delete(f"/api/usuarios/{usuario_id}")

        # Verificar favorito ya no existe
        resp = client.get("/api/favoritos")
        assert len(resp.json()) == 0

        # Canción sigue existiendo
        resp = client.get(f"/api/canciones/{cancion_id}")
        assert resp.status_code == 200

    def test_cascada_eliminar_cancion_borra_favoritos(self, client: TestClient):
        """Test que al borrar canción se borran sus favoritos (cascade)."""
        u_resp = client.post(
            "/api/usuarios", json={"nombre": "Cascade User 2", "correo": "cascade2@test.com"}
        )
        usuario_id = u_resp.json()["id"]

        c_resp = client.post(
            "/api/canciones",
            json={
                "titulo": "Cascade Song 2",
                "artista": "A",
                "duracion": "3:00",
                "año": 2020,
                "genero": "Rock",
            },
        )
        cancion_id = c_resp.json()["id"]

        client.post(f"/api/usuarios/{usuario_id}/favoritos/{cancion_id}")

        # Verificar favorito existe
        resp = client.get("/api/favoritos")
        assert len(resp.json()) == 1

        # Eliminar canción
        client.delete(f"/api/canciones/{cancion_id}")

        # Verificar favorito ya no existe
        resp = client.get("/api/favoritos")
        assert len(resp.json()) == 0

        # Usuario sigue existiendo
        resp = client.get(f"/api/usuarios/{usuario_id}")
        assert resp.status_code == 200


# =============================================================================
# TESTS DE VALIDACIÓN
# =============================================================================


class TestValidacion:
    """Tests para validaciones de datos."""

    def test_email_invalido_varios_formatos(self, client: TestClient):
        """Test varios formatos de email inválido."""
        emails_invalidos = [
            "sin-arroba.com",
            "@sin-usuario.com",
            "usuario@",
            "usuario@dominio",
            "con espacio@test.com",
            "",
        ]
        for email in emails_invalidos:
            response = client.post("/api/usuarios", json={"nombre": "Test", "correo": email})
            assert response.status_code == 422, f"Email '{email}' debería ser inválido"

    def test_año_cancion_limites(self, client: TestClient):
        """Test límites de año de canción."""
        # 1900 válido
        response = client.post(
            "/api/canciones",
            json={
                "titulo": "Test",
                "artista": "Test",
                "duracion": "3:00",
                "año": 1900,
                "genero": "Rock",
            },
        )
        assert response.status_code == 201

        # 1899 inválido
        response = client.post(
            "/api/canciones",
            json={
                "titulo": "Test",
                "artista": "Test",
                "duracion": "3:00",
                "año": 1899,
                "genero": "Rock",
            },
        )
        assert response.status_code == 422

    def test_duracion_formato_valido(self, client: TestClient):
        """Test formatos de duración válidos."""
        formatos_validos = [
            ("0:30", 30),
            ("3:05", 185),
            ("10:00", 600),
            ("59:59", 3599),
        ]
        for duracion_str, esperado_segundos in formatos_validos:
            response = client.post(
                "/api/canciones",
                json={
                    "titulo": "Test",
                    "artista": "Test",
                    "duracion": duracion_str,
                    "año": 2020,
                    "genero": "Rock",
                },
            )
            assert response.status_code == 201, f"Duración '{duracion_str}' debería ser válida"
            assert response.json()["duracion_segundos"] == esperado_segundos

    def test_duracion_formato_invalido(self, client: TestClient):
        """Test formatos de duración inválidos."""
        formatos_invalidos = [
            "120",  # sin dos puntos
            "3:5:30",  # tres partes
            "abc",  # no numérico
            "3;30",  # separador incorrecto
            "-1:30",  # minutos negativos
            "3:60",  # segundos = 60
            "3:99",  # segundos > 59
        ]
        for duracion_str in formatos_invalidos:
            response = client.post(
                "/api/canciones",
                json={
                    "titulo": "Test",
                    "artista": "Test",
                    "duracion": duracion_str,
                    "año": 2020,
                    "genero": "Rock",
                },
            )
            assert response.status_code == 422, f"Duración '{duracion_str}' debería ser inválida"

    def test_campos_requeridos_usuario(self, client: TestClient):
        """Test que campos requeridos son obligatorios para usuario."""
        response = client.post("/api/usuarios", json={})
        assert response.status_code == 422

        response = client.post("/api/usuarios", json={"nombre": "Solo Nombre"})
        assert response.status_code == 422

        response = client.post("/api/usuarios", json={"correo": "solo@correo.com"})
        assert response.status_code == 422

    def test_campos_requeridos_cancion(self, client: TestClient):
        """Test que campos requeridos son obligatorios para canción."""
        response = client.post("/api/canciones", json={})
        assert response.status_code == 422

        # Solo título
        response = client.post("/api/canciones", json={"titulo": "Solo Título"})
        assert response.status_code == 422


# =============================================================================
# TESTS DE HEALTH Y ROOT
# =============================================================================


class TestHealthYRoot:
    """Tests para endpoints de health check y root."""

    def test_root_endpoint(self, client: TestClient):
        """Test GET /."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["nombre"] == "API de Música"
        assert data["version"] == "1.0.0"
        assert "documentacion" in data
        assert "endpoints" in data

    def test_health_check(self, client: TestClient):
        """Test GET /health."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "ok"
        assert data["version"] == "1.0.0"
