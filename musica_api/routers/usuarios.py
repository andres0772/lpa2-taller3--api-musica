"""
Router de Usuarios - API de Música.

Endpoints:
- GET    /api/usuarios              - Lista paginada de usuarios
- POST   /api/usuarios              - Crear usuario
- GET    /api/usuarios/{id}         - Obtener usuario por ID
- PUT    /api/usuarios/{id}         - Actualizar usuario (parcial)
- DELETE /api/usuarios/{id}         - Eliminar usuario
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from musica_api.database import get_session
from musica_api.models import (
    Usuario,
    UsuarioCreate,
    UsuarioRead,
    UsuarioUpdate,
)

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])
logger = logging.getLogger("api_musica.usuarios")


# Helper: Paginación
def paginar(
    page: int = Query(1, ge=1, description="Número de página (empieza en 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Items por página (máx 100)"),
) -> tuple[int, int]:
    """Calcula offset y limit para paginación."""
    offset = (page - 1) * page_size
    return offset, page_size


@router.get(
    "",
    response_model=list[UsuarioRead],
    summary="Listar usuarios",
    description="Retorna una lista paginada de todos los usuarios.",
)
def listar_usuarios(
    session: Annotated[Session, Depends(get_session)],
    pagination: Annotated[tuple[int, int], Depends(paginar)],
) -> list[UsuarioRead]:
    """
    Lista usuarios con paginación.

    - **page**: página a consultar (default 1)
    - **page_size**: items por página (default 20, máx 100)
    """
    offset, limit = pagination
    usuarios = session.exec(select(Usuario).offset(offset).limit(limit)).all()
    logger.info(f"Listados {len(usuarios)} usuarios (page={offset // limit + 1}, size={limit})")
    return usuarios


@router.post(
    "",
    response_model=UsuarioRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear usuario",
    description="Crea un nuevo usuario con nombre y correo único.",
)
def crear_usuario(
    usuario_data: UsuarioCreate,
    session: Annotated[Session, Depends(get_session)],
) -> UsuarioRead:
    """
    Crea un usuario nuevo.

    - **nombre**: nombre del usuario (1-100 chars)
    - **correo**: email único (validación RFC)

    Retorna 409 si el correo ya existe.
    """
    # Verificar correo único
    existente = session.exec(select(Usuario).where(Usuario.correo == usuario_data.correo)).first()
    if existente:
        logger.warning(f"Intento de crear usuario con correo duplicado: {usuario_data.correo}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El correo '{usuario_data.correo}' ya está registrado",
        )

    usuario = Usuario.model_validate(usuario_data)
    session.add(usuario)
    session.commit()
    session.refresh(usuario)

    logger.info(
        f"Usuario creado: id={usuario.id}, nombre={usuario.nombre}, correo={usuario.correo}"
    )
    return usuario


@router.get(
    "/{usuario_id}",
    response_model=UsuarioRead,
    summary="Obtener usuario por ID",
    description="Retorna un usuario específico por su ID.",
)
def obtener_usuario(
    usuario_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> UsuarioRead:
    """
    Obtiene un usuario por ID.

    Retorna 404 si no existe.
    """
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        logger.warning(f"Usuario no encontrado: id={usuario_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {usuario_id} no encontrado",
        )
    return usuario


@router.put(
    "/{usuario_id}",
    response_model=UsuarioRead,
    summary="Actualizar usuario",
    description="Actualiza campos de un usuario (parcial).",
)
def actualizar_usuario(
    usuario_id: int,
    usuario_data: UsuarioUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> UsuarioRead:
    """
    Actualiza un usuario (campos opcionales).

    - **nombre**: nuevo nombre (opcional)
    - **correo**: nuevo email único (opcional)

    Retorna 404 si no existe, 409 si el nuevo correo ya existe.
    """
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        logger.warning(f"Intento de actualizar usuario inexistente: id={usuario_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {usuario_id} no encontrado",
        )

    # Validar correo único si se está cambiando
    if usuario_data.correo is not None and usuario_data.correo != usuario.correo:
        existente = session.exec(
            select(Usuario).where(Usuario.correo == usuario_data.correo)
        ).first()
        if existente:
            logger.warning(f"Intento de actualizar a correo duplicado: {usuario_data.correo}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El correo '{usuario_data.correo}' ya está registrado",
            )

    # Actualizar solo campos provistos
    update_data = usuario_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(usuario, field, value)

    session.add(usuario)
    session.commit()
    session.refresh(usuario)

    logger.info(
        f"Usuario actualizado: id={usuario.id}, nombre={usuario.nombre}, correo={usuario.correo}"
    )
    return usuario


@router.delete(
    "/{usuario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar usuario",
    description="Elimina un usuario y sus favoritos en cascada.",
)
def eliminar_usuario(
    usuario_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> None:
    """
    Elimina un usuario por ID.

    Sus favoritos se borran automáticamente (cascade).
    Retorna 404 si no existe.
    """
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        logger.warning(f"Intento de eliminar usuario inexistente: id={usuario_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {usuario_id} no encontrado",
        )

    session.delete(usuario)
    session.commit()

    logger.info(f"Usuario eliminado: id={usuario_id}")
    return None
