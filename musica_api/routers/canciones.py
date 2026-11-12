"""
Router de Canciones - API de Música.

Endpoints:
- GET    /api/canciones              - Lista paginada de canciones
- POST   /api/canciones              - Crear canción
- GET    /api/canciones/buscar       - Buscar canciones con filtros
- GET    /api/canciones/{id}         - Obtener canción por ID
- PUT    /api/canciones/{id}         - Actualizar canción (parcial)
- DELETE /api/canciones/{id}         - Eliminar canción
"""

import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from musica_api.database import get_session
from musica_api.models import (
    Cancion,
    CancionCreate,
    CancionRead,
    CancionUpdate,
    Genero,
    parse_duracion_mmss,
)

router = APIRouter(prefix="/api/canciones", tags=["Canciones"])
logger = logging.getLogger("api_musica.canciones")


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
    response_model=list[CancionRead],
    summary="Listar canciones",
    description="Retorna una lista paginada de todas las canciones.",
)
def listar_canciones(
    session: Annotated[Session, Depends(get_session)],
    pagination: Annotated[tuple[int, int], Depends(paginar)],
) -> list[CancionRead]:
    """
    Lista canciones con paginación.

    - **page**: página a consultar (default 1)
    - **page_size**: items por página (default 20, máx 100)
    """
    offset, limit = pagination
    canciones = session.exec(select(Cancion).offset(offset).limit(limit)).all()
    logger.info(f"Listadas {len(canciones)} canciones (page={offset // limit + 1}, size={limit})")
    return canciones


@router.post(
    "",
    response_model=CancionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear canción",
    description="Crea una nueva canción con sus metadatos.",
)
def crear_cancion(
    cancion_data: CancionCreate,
    session: Annotated[Session, Depends(get_session)],
) -> CancionRead:
    """
    Crea una canción nueva.

    - **titulo**: título (1-200 chars)
    - **artista**: artista/intérprete (1-200 chars)
    - **album**: álbum (opcional, máx 200 chars)
    - **duracion**: string 'mm:ss' (ej: '5:55')
    - **año**: año lanzamiento (1900 - año actual)
    - **genero**: enum Genero (Rock, Pop, Jazz, etc.)

    La duración se convierte a segundos internamente.
    """
    # Convertir duración mm:ss a segundos
    duracion_segundos = parse_duracion_mmss(cancion_data.duracion)

    # Crear modelo de tabla (guarda tanto string original como segundos)
    cancion = Cancion(
        titulo=cancion_data.titulo,
        artista=cancion_data.artista,
        album=cancion_data.album,
        duracion=cancion_data.duracion,  # string original 'mm:ss'
        duracion_segundos=duracion_segundos,  # int para consultas
        año=cancion_data.año,
        genero=cancion_data.genero,
    )

    session.add(cancion)
    session.commit()
    session.refresh(cancion)

    logger.info(
        f"Canción creada: id={cancion.id}, titulo={cancion.titulo}, artista={cancion.artista}"
    )
    return cancion


# IMPORTANTE: /buscar DEBE ir ANTES que /{cancion_id} para evitar conflictos de routing
@router.get(
    "/buscar",
    response_model=list[CancionRead],
    summary="Buscar canciones",
    description="Busca canciones combinando múltiples filtros opcionales.",
)
def buscar_canciones(
    session: Annotated[Session, Depends(get_session)],
    pagination: Annotated[tuple[int, int], Depends(paginar)],
    titulo: Annotated[
        str | None,
        Query(description="Filtrar por título (contiene, case-insensitive)"),
    ] = None,
    artista: Annotated[
        str | None,
        Query(description="Filtrar por artista (contiene, case-insensitive)"),
    ] = None,
    modo: Annotated[
        Literal["todas", "cualquiera"],
        Query(
            description=(
                "Cómo combinar título y artista: 'todas' (default) exige que "
                "coincidan los dos; 'cualquiera' acepta que coincida uno"
            )
        ),
    ] = "todas",
    genero: Annotated[
        Genero | None,
        Query(description="Filtrar por género exacto"),
    ] = None,
    año_desde: Annotated[
        int | None,
        Query(ge=1900, description="Año mínimo"),
    ] = None,
    año_hasta: Annotated[
        int | None,
        Query(ge=1900, description="Año máximo"),
    ] = None,
) -> list[CancionRead]:
    """
    Busca canciones con filtros combinados (todos opcionales).

    - **titulo**: contiene texto (ILIKE)
    - **artista**: contiene texto (ILIKE)
    - **modo**: 'todas' (default) exige título Y artista; 'cualquiera' acepta título O artista
    - **genero**: coincidencia exacta
    - **año_desde** / **año_hasta**: rango inclusivo
    - **page**, **page_size**: paginación

    Ejemplo: `/api/canciones/buscar?artista=queen&genero=Rock&año_desde=1970&año_hasta=1980`
    """
    offset, limit = pagination

    query = select(Cancion)

    # Filtros dinámicos
    if modo == "cualquiera" and (titulo or artista):
        # Basta que el texto coincida en uno de los dos campos.
        por_texto = None
        if titulo:
            por_texto = Cancion.titulo.ilike(f"%{titulo}%")
        if artista:
            por_artista = Cancion.artista.ilike(f"%{artista}%")
            por_texto = por_artista if por_texto is None else por_texto | por_artista
        query = query.where(por_texto)
    else:
        if titulo:
            query = query.where(Cancion.titulo.ilike(f"%{titulo}%"))
        if artista:
            query = query.where(Cancion.artista.ilike(f"%{artista}%"))
    if genero:
        query = query.where(Cancion.genero == genero)
    if año_desde is not None:
        query = query.where(Cancion.año >= año_desde)
    if año_hasta is not None:
        query = query.where(Cancion.año <= año_hasta)

    canciones = session.exec(query.offset(offset).limit(limit)).all()

    filtros_aplicados = []
    if titulo:
        filtros_aplicados.append(f"titulo~{titulo}")
    if artista:
        filtros_aplicados.append(f"artista~{artista}")
    if genero:
        filtros_aplicados.append(f"genero={genero.value}")
    if año_desde:
        filtros_aplicados.append(f"año>={año_desde}")
    if año_hasta:
        filtros_aplicados.append(f"año<={año_hasta}")

    logger.info(
        f"Búsqueda: {len(canciones)} resultados | "
        f"filtros: {', '.join(filtros_aplicados) or 'ninguno'}"
    )
    return canciones


@router.get(
    "/{cancion_id}",
    response_model=CancionRead,
    summary="Obtener canción por ID",
    description="Retorna una canción específica por su ID.",
)
def obtener_cancion(
    cancion_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> CancionRead:
    """
    Obtiene una canción por ID.

    Retorna 404 si no existe.
    """
    cancion = session.get(Cancion, cancion_id)
    if not cancion:
        logger.warning(f"Canción no encontrada: id={cancion_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Canción con id {cancion_id} no encontrada",
        )
    return cancion


@router.put(
    "/{cancion_id}",
    response_model=CancionRead,
    summary="Actualizar canción",
    description="Actualiza campos de una canción (parcial).",
)
def actualizar_cancion(
    cancion_id: int,
    cancion_data: CancionUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> CancionRead:
    """
    Actualiza una canción (campos opcionales).

    - **titulo**: nuevo título (opcional)
    - **artista**: nuevo artista (opcional)
    - **album**: nuevo álbum (opcional)
    - **duracion**: nueva duración 'mm:ss' (opcional)
    - **año**: nuevo año (opcional)
    - **genero**: nuevo género (opcional)

    Retorna 404 si no existe.
    """
    cancion = session.get(Cancion, cancion_id)
    if not cancion:
        logger.warning(f"Intento de actualizar canción inexistente: id={cancion_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Canción con id {cancion_id} no encontrada",
        )

    update_data = cancion_data.model_dump(exclude_unset=True)

    # Convertir duración si se proporciona (guardar ambos: string original + segundos)
    if "duracion" in update_data:
        duracion_str = update_data["duracion"]
        update_data["duracion_segundos"] = parse_duracion_mmss(duracion_str)
        # No hacer pop, mantener duracion string en update_data

    for field, value in update_data.items():
        setattr(cancion, field, value)

    session.add(cancion)
    session.commit()
    session.refresh(cancion)

    logger.info(f"Canción actualizada: id={cancion.id}, titulo={cancion.titulo}")
    return cancion


@router.delete(
    "/{cancion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar canción",
    description="Elimina una canción y sus favoritos en cascada.",
)
def eliminar_cancion(
    cancion_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> None:
    """
    Elimina una canción por ID.

    Sus favoritos se borran automáticamente (cascade).
    Retorna 404 si no existe.
    """
    cancion = session.get(Cancion, cancion_id)
    if not cancion:
        logger.warning(f"Intento de eliminar canción inexistente: id={cancion_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Canción con id {cancion_id} no encontrada",
        )

    session.delete(cancion)
    session.commit()

    logger.info(f"Canción eliminada: id={cancion_id}")
    return None
