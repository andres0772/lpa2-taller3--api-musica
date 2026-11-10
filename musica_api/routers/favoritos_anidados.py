"""
Router de Favoritos Anidados - API de Música.

Endpoints bajo /api/usuarios/{id_usuario}/favoritos (usuario final):
- GET    /api/usuarios/{id_usuario}/favoritos                    - Favoritos de un usuario
- POST   /api/usuarios/{id_usuario}/favoritos/{id_cancion}       - Marcar favorito
- DELETE /api/usuarios/{id_usuario}/favoritos/{id_cancion}       - Quitar favorito
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from musica_api.database import get_session
from musica_api.models import (
    Cancion,
    Favorito,
    FavoritoRead,
    Usuario,
)

router = APIRouter(prefix="/api/usuarios", tags=["Favoritos Usuario"])
logger = logging.getLogger("api_musica.favoritos_anidados")


# Helper: Paginación
def paginar(
    page: int = Query(1, ge=1, description="Número de página (empieza en 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Items por página (máx 100)"),
) -> tuple[int, int]:
    """Calcula offset y limit para paginación."""
    offset = (page - 1) * page_size
    return offset, page_size


@router.get(
    "/{usuario_id}/favoritos",
    response_model=list[FavoritoRead],
    summary="Listar favoritos de un usuario",
    description="Retorna los favoritos de un usuario específico (vista usuario final).",
)
def listar_favoritos_usuario(
    usuario_id: int,
    session: Annotated[Session, Depends(get_session)],
    pagination: Annotated[tuple[int, int], Depends(paginar)],
) -> list[FavoritoRead]:
    """
    Lista favoritos de un usuario con paginación.

    - **page**: página a consultar (default 1)
    - **page_size**: items por página (default 20, máx 100)
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

    logger.info(f"Listados {len(favoritos)} favoritos de usuario {usuario_id} (vista anidada)")
    return favoritos


@router.post(
    "/{usuario_id}/favoritos/{cancion_id}",
    response_model=FavoritoRead,
    status_code=status.HTTP_201_CREATED,
    summary="Marcar canción como favorito",
    description="Agrega una canción a favoritos del usuario (sin body, IDs en URL).",
)
def marcar_favorito_usuario(
    usuario_id: int,
    cancion_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> FavoritoRead:
    """
    Marca una canción como favorito de un usuario.

    IDs vienen en la URL, no en body.

    Retorna 404 si usuario o canción no existen.
    Retorna 409 si ya está en favoritos.
    """
    # Verificar que usuario existe
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        logger.warning(f"Marcar favorito: usuario inexistente id={usuario_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {usuario_id} no encontrado",
        )

    # Verificar que canción existe
    cancion = session.get(Cancion, cancion_id)
    if not cancion:
        logger.warning(f"Marcar favorito: canción inexistente id={cancion_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Canción con id {cancion_id} no encontrada",
        )

    # Verificar duplicado
    existente = session.exec(
        select(Favorito).where(
            Favorito.id_usuario == usuario_id,
            Favorito.id_cancion == cancion_id,
        )
    ).first()
    if existente:
        logger.warning(f"Favorito duplicado (anidado): usuario={usuario_id}, cancion={cancion_id}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta canción ya está en favoritos de este usuario",
        )

    favorito = Favorito(id_usuario=usuario_id, id_cancion=cancion_id)
    session.add(favorito)
    session.commit()
    session.refresh(favorito)

    logger.info(f"Favorito marcado (anidado): usuario={usuario_id}, cancion={cancion_id}")
    return favorito


@router.delete(
    "/{usuario_id}/favoritos/{cancion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Quitar canción de favoritos",
    description="Elimina una canción de favoritos del usuario (sin body, IDs en URL).",
)
def quitar_favorito_usuario(
    usuario_id: int,
    cancion_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> None:
    """
    Quita una canción de favoritos del usuario.

    IDs vienen en la URL.

    Retorna 404 si el favorito no existe.
    """
    favorito = session.exec(
        select(Favorito).where(
            Favorito.id_usuario == usuario_id,
            Favorito.id_cancion == cancion_id,
        )
    ).first()

    if not favorito:
        logger.warning(f"Quitar favorito inexistente: usuario={usuario_id}, cancion={cancion_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este favorito no existe",
        )

    session.delete(favorito)
    session.commit()

    logger.info(f"Favorito quitado (anidado): usuario={usuario_id}, cancion={cancion_id}")
    return None
