"""
Router de Favoritos - API de Música.

Endpoints planos (admin/sistema):
- GET    /api/favoritos                      - Lista paginada de todos los favoritos
- POST   /api/favoritos                      - Crear favorito (body: id_usuario, id_cancion)
- GET    /api/favoritos/{id}                 - Obtener favorito por ID
- DELETE /api/favoritos/{id}                 - Eliminar favorito por ID

Endpoints anidados (usuario final):
- GET    /api/usuarios/{id_usuario}/favoritos           - Favoritos de un usuario
- POST   /api/usuarios/{id_usuario}/favoritos/{id_cancion} - Marcar favorito
- DELETE /api/usuarios/{id_usuario}/favoritos/{id_cancion} - Quitar favorito
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from musica_api.database import get_session
from musica_api.models import (
    Cancion,
    Favorito,
    FavoritoCreate,
    FavoritoRead,
    Usuario,
)

router = APIRouter(prefix="/api/favoritos", tags=["Favoritos"])
logger = logging.getLogger("api_musica.favoritos")


# Helper: Paginación
def paginar(
    page: int = Query(1, ge=1, description="Número de página (empieza en 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Items por página (máx 100)"),
) -> tuple[int, int]:
    """Calcula offset y limit para paginación."""
    offset = (page - 1) * page_size
    return offset, page_size


# =============================================================================
# ENDPOINTS PLANOS (admin/sistema)
# =============================================================================


@router.get(
    "",
    response_model=list[FavoritoRead],
    summary="Listar todos los favoritos",
    description="Retorna una lista paginada de todos los favoritos del sistema (vista admin).",
)
def listar_favoritos(
    session: Annotated[Session, Depends(get_session)],
    pagination: Annotated[tuple[int, int], Depends(paginar)],
) -> list[FavoritoRead]:
    """
    Lista todos los favoritos con paginación.

    - **page**: página a consultar (default 1)
    - **page_size**: items por página (default 20, máx 100)
    """
    offset, limit = pagination
    favoritos = session.exec(select(Favorito).offset(offset).limit(limit)).all()
    logger.info(f"Listados {len(favoritos)} favoritos (page={offset // limit + 1}, size={limit})")
    return favoritos


@router.post(
    "",
    response_model=FavoritoRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear favorito",
    description="Crea un favorito asociando usuario y canción (body JSON).",
)
def crear_favorito(
    favorito_data: FavoritoCreate,
    session: Annotated[Session, Depends(get_session)],
) -> FavoritoRead:
    """
    Crea un favorito nuevo.

    - **id_usuario**: ID del usuario existente
    - **id_cancion**: ID de la canción existente

    Retorna 404 si usuario o canción no existen.
    Retorna 409 si ya existe ese favorito (unique constraint).
    """
    # Verificar que usuario existe
    usuario = session.get(Usuario, favorito_data.id_usuario)
    if not usuario:
        logger.warning(
            f"Intento de crear favorito con usuario inexistente: id={favorito_data.id_usuario}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {favorito_data.id_usuario} no encontrado",
        )

    # Verificar que canción existe
    cancion = session.get(Cancion, favorito_data.id_cancion)
    if not cancion:
        logger.warning(
            f"Intento de crear favorito con canción inexistente: id={favorito_data.id_cancion}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Canción con id {favorito_data.id_cancion} no encontrada",
        )

    # Verificar duplicado (unique constraint a nivel BD también lo atrapa)
    existente = session.exec(
        select(Favorito).where(
            Favorito.id_usuario == favorito_data.id_usuario,
            Favorito.id_cancion == favorito_data.id_cancion,
        )
    ).first()
    if existente:
        logger.warning(
            f"Favorito duplicado: usuario={favorito_data.id_usuario}, "
            f"cancion={favorito_data.id_cancion}"
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta canción ya está en favoritos de este usuario",
        )

    favorito = Favorito.model_validate(favorito_data)
    session.add(favorito)
    session.commit()
    session.refresh(favorito)

    logger.info(
        f"Favorito creado: id={favorito.id}, usuario={favorito.id_usuario}, "
        f"cancion={favorito.id_cancion}"
    )
    return favorito


@router.get(
    "/{favorito_id}",
    response_model=FavoritoRead,
    summary="Obtener favorito por ID",
    description="Retorna un favorito específico por su ID.",
)
def obtener_favorito(
    favorito_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> FavoritoRead:
    """
    Obtiene un favorito por ID.

    Retorna 404 si no existe.
    """
    favorito = session.get(Favorito, favorito_id)
    if not favorito:
        logger.warning(f"Favorito no encontrado: id={favorito_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Favorito con id {favorito_id} no encontrado",
        )
    return favorito


@router.delete(
    "/{favorito_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar favorito por ID",
    description="Elimina un favorito específico por su ID.",
)
def eliminar_favorito(
    favorito_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> None:
    """
    Elimina un favorito por ID.

    Retorna 404 si no existe.
    """
    favorito = session.get(Favorito, favorito_id)
    if not favorito:
        logger.warning(f"Intento de eliminar favorito inexistente: id={favorito_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Favorito con id {favorito_id} no encontrado",
        )

    session.delete(favorito)
    session.commit()

    logger.info(f"Favorito eliminado: id={favorito_id}")
    return None


# =============================================================================
# ENDPOINTS ANIDADOS (usuario final) - registrado en main.py con prefix="/api/usuarios"
# =============================================================================

# Nota: Estos endpoints se registran aparte en main.py con:
# app.include_router(favoritos_router_anidado, prefix="/api/usuarios", tags=["Favoritos Usuario"])

# Para evitar duplicación de código, los definimos aquí pero se exportan
# como un router separado en __init__.py


@router.get(
    "/usuario/{usuario_id}",
    response_model=list[FavoritoRead],
    summary="Listar favoritos de un usuario (plano)",
    description=(
        "Retorna los favoritos de un usuario específico (alternativa plana a ruta anidada)."
    ),
)
def listar_favoritos_usuario_plano(
    usuario_id: int,
    session: Annotated[Session, Depends(get_session)],
    pagination: Annotated[tuple[int, int], Depends(paginar)],
) -> list[FavoritoRead]:
    """
    Lista favoritos de un usuario (endpoint plano).

    Equivalente a GET /api/usuarios/{usuario_id}/favoritos pero bajo /api/favoritos.
    """
    # Verificar que usuario existe
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        logger.warning(f"Favoritos de usuario inexistente: id={usuario_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {usuario_id} no encontrado",
        )

    offset, limit = pagination
    favoritos = session.exec(
        select(Favorito).where(Favorito.id_usuario == usuario_id).offset(offset).limit(limit)
    ).all()

    logger.info(f"Listados {len(favoritos)} favoritos de usuario {usuario_id}")
    return favoritos
