"""
Router de Autenticación - API de Música.

Endpoints:
- POST /api/auth/registro   - Crea un usuario con contraseña
- POST /api/auth/login      - Inicia sesión y devuelve un token opaco
- POST /api/auth/logout     - Revoca el token enviado en X-Session-Token
- GET  /api/auth/me         - Devuelve el usuario del token vigente
"""

import logging
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, select

from musica_api.database import get_session
from musica_api.models import Sesion, Usuario
from musica_api.security import (
    expiracion_sesion,
    hash_password,
    hash_token,
    nuevo_token,
    verificar_password,
)

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])
logger = logging.getLogger("api_musica.auth")

MINIMO_CONTRASEÑA = 8


class RegistroIn(BaseModel):
    """Entrada de registro."""

    nombre: str = Field(min_length=1, max_length=100)
    correo: EmailStr
    contraseña: str = Field(min_length=MINIMO_CONTRASEÑA)


class LoginIn(BaseModel):
    """Entrada de login."""

    correo: EmailStr
    contraseña: str = Field(min_length=1)


class UsuarioSesion(BaseModel):
    """Usuario visible para el cliente autenticado."""

    id: int
    nombre: str
    correo: EmailStr

    class Config:
        from_attributes = True


class LoginOut(BaseModel):
    """Respuesta de login."""

    token: str
    usuario: UsuarioSesion


def usuario_por_correo(session: Session, correo: str) -> Usuario | None:
    return session.exec(select(Usuario).where(Usuario.correo == correo)).first()


def _vencida(sesion: Sesion) -> bool:
    """SQLite devuelve datetimes naive; se compara siempre en UTC naive."""
    expira = sesion.expira
    if expira.tzinfo is not None:
        expira = expira.astimezone(UTC).replace(tzinfo=None)
    return expira <= datetime.now(UTC).replace(tzinfo=None)


def usuario_del_token(
    session: Annotated[Session, Depends(get_session)],
    x_session_token: Annotated[str | None, Header(alias="X-Session-Token")] = None,
) -> Usuario:
    """Dependencia: resuelve el usuario del token o falla con 401."""
    if not x_session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el token de sesión",
        )

    token_hash = hash_token(x_session_token)
    sesion = session.exec(select(Sesion).where(Sesion.token_hash == token_hash)).first()
    if sesion is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de sesión inválido",
        )

    if _vencida(sesion):
        session.delete(sesion)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión expiró; iniciá sesión de nuevo",
        )

    usuario = session.get(Usuario, sesion.usuario_id)
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión no tiene usuario",
        )
    return usuario


@router.post("/registro", response_model=UsuarioSesion, status_code=status.HTTP_201_CREATED)
def registro(datos: RegistroIn, session: Annotated[Session, Depends(get_session)]) -> Usuario:
    """Crea un usuario con contraseña hasheada."""
    if usuario_por_correo(session, datos.correo) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya está registrado",
        )

    usuario = Usuario(
        nombre=datos.nombre,
        correo=datos.correo,
        password_hash=hash_password(datos.contraseña),
    )
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    logger.info(f"Usuario registrado: id={usuario.id}")
    return usuario


@router.post("/login", response_model=LoginOut)
def login(datos: LoginIn, session: Annotated[Session, Depends(get_session)]) -> dict:
    """Verifica credenciales y abre una sesión nueva."""
    usuario = usuario_por_correo(session, datos.correo)
    if usuario is None or not usuario.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    if not verificar_password(datos.contraseña, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    token = nuevo_token()
    sesion = Sesion(
        usuario_id=usuario.id,
        token_hash=hash_token(token),
        expira=expiracion_sesion(),
    )
    session.add(sesion)
    session.commit()
    logger.info(f"Sesión abierta para usuario id={usuario.id}")
    return {"token": token, "usuario": usuario}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    usuario: Annotated[Usuario, Depends(usuario_del_token)],
    session: Annotated[Session, Depends(get_session)],
    x_session_token: Annotated[str | None, Header(alias="X-Session-Token")] = None,
) -> None:
    """Revoca el token de la sesión actual."""
    sesion = session.exec(
        select(Sesion).where(Sesion.token_hash == hash_token(x_session_token or "")),
    ).first()
    if sesion is not None:
        session.delete(sesion)
        session.commit()


@router.get("/me", response_model=UsuarioSesion)
def me(usuario: Annotated[Usuario, Depends(usuario_del_token)]) -> Usuario:
    """Devuelve el usuario dueño del token vigente."""
    return usuario
