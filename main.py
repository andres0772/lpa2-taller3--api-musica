import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from musica_api.config import get_settings
from musica_api.database import create_db_and_tables
from musica_api.routers import (
    auth_router,
    canciones_router,
    favoritos_anidados_router,
    favoritos_router,
    usuarios_router,
)

settings = get_settings()

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("api_musica")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestor de ciclo de vida de la aplicación.
    Se ejecuta al iniciar y al cerrar la aplicación.
    """
    # Startup: Crear tablas en la base de datos
    create_db_and_tables()
    yield

    # Shutdown: Limpiar recursos si es necesario
    print("Cerrando aplicación...")


# Crear la instancia de FastAPI con metadatos apropiados
# Incluir: title, description, version, contact, license_info
app = FastAPI(
    title="API de Música",
    description="API RESTful para gestionar usuarios, canciones y favoritos",
    version="1.0.0",
    lifespan=lifespan,
    # TODO: Agregar información de contacto y licencia
)


# Configurar CORS para permitir solicitudes desde diferentes orígenes
# Esto es importante para desarrollo con frontend separado
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Middleware de logging de requests (S9)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Loggea cada request entrante y response saliente con tiempo de respuesta."""
    start_time = time.time()
    client_host = request.client.host if request.client else "unknown"

    logger.info(f"→ {request.method} {request.url.path} - Client: {client_host}")

    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        logger.info(
            f"← {request.method} {request.url.path} - {response.status_code} - {duration_ms:.1f}ms"
        )
        return response
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"✗ {request.method} {request.url.path} - ERROR - {duration_ms:.1f}ms - {e}")
        raise


# Registrar routers
app.include_router(usuarios_router)
app.include_router(canciones_router)
app.include_router(favoritos_router)
app.include_router(favoritos_anidados_router)
app.include_router(auth_router)

# Servir el audio demo referenceado por el seed (scripts/seed_data.sql)
# Los archivos se generan con scripts/generate_demo_audio.py
AUDIO_DIR = Path(__file__).resolve().parent / "media" / "audio"
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


# Crear un endpoint raíz que retorne información básica de la API
@app.get("/", tags=["Root"])
async def root():
    """
    Endpoint raíz de la API.
    Retorna información básica y enlaces a la documentación.
    """
    return {
        "nombre": "API de Música",
        "version": "1.0.0",
        "descripcion": "API RESTful para gestionar usuarios, canciones y favoritos",
        "documentacion": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
        },
        "endpoints": {
            "usuarios": "/api/usuarios",
            "canciones": "/api/canciones",
            "favoritos": "/api/favoritos",
            "favoritos_usuario": "/api/usuarios/{id}/favoritos",
        },
    }


# Crear un endpoint de health check para monitoreo
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint para verificar el estado de la API.
    Útil para sistemas de monitoreo y orquestación.
    """
    from sqlmodel import text

    from musica_api.database import engine

    # Verificar conexión a BD
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return {
        "status": "healthy",
        "database": db_status,
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",  # string de import: requerido para que reload funcione
        host=settings.host,
        port=settings.port,
        reload=True,  # solo desarrollo: reinicia al guardar cambios
        log_level="info",
    )
