"""
Modelos de datos para la API de Música.

Define las entidades Usuario, Cancion y Favorito usando SQLModel
con validaciones Pydantic y relaciones SQLAlchemy.
"""

import enum
from datetime import UTC, datetime

from pydantic import EmailStr, computed_field, field_validator
from sqlalchemy import CheckConstraint, Column, String
from sqlmodel import Field, Relationship, SQLModel


class Genero(enum.StrEnum):
    """Géneros musicales permitidos."""

    ROCK = "Rock"
    POP = "Pop"
    JAZZ = "Jazz"
    ELECTRONIC = "Electronic"
    HIP_HOP = "Hip Hop"
    CLASICA = "Clasica"
    REGGAE = "Reggae"
    COUNTRY = "Country"
    OTRO = "Otro"


def utc_now() -> datetime:
    """Retorna la fecha/hora actual en UTC con timezone aware."""
    return datetime.now(UTC)


def parse_duracion_mmss(value: str) -> int:
    """
    Convierte string 'mm:ss', 'm:ss', 'mm:s' a segundos totales.

    Args:
        value: String en formato minutos:segundos

    Returns:
        Segundos totales como entero

    Raises:
        ValueError: Si el formato no es válido
    """
    if not isinstance(value, str):
        raise ValueError("La duración debe ser string en formato 'mm:ss'")

    parts = value.split(":")
    if len(parts) != 2:
        raise ValueError("Formato de duración inválido. Use 'mm:ss' (ej: '5:55')")

    try:
        minutos = int(parts[0])
        segundos = int(parts[1])
    except ValueError:
        raise ValueError("Minutos y segundos deben ser números enteros") from None

    if minutos < 0:
        raise ValueError("Los minutos no pueden ser negativos")
    if not 0 <= segundos <= 59:
        raise ValueError("Los segundos deben estar entre 0 y 59")

    return minutos * 60 + segundos


def formatear_duracion(segundos: int) -> str:
    """
    Convierte segundos a formato 'mm:ss' con cero a la izquierda.

    Args:
        segundos: Duración en segundos

    Returns:
        String formateado como 'mm:ss'
    """
    if segundos < 0:
        segundos = 0
    minutos = segundos // 60
    segs = segundos % 60
    return f"{minutos}:{segs:02d}"


class UsuarioBase(SQLModel):
    """Campos base de Usuario (sin ID ni relaciones)."""

    nombre: str = Field(min_length=1, max_length=100, description="Nombre del usuario")
    correo: EmailStr = Field(description="Correo electrónico único")


class Usuario(UsuarioBase, table=True):
    """Modelo de tabla para Usuario."""

    __tablename__ = "usuario"

    id: int | None = Field(default=None, primary_key=True)
    fecha_registro: datetime = Field(
        default_factory=utc_now, nullable=False, description="Fecha de registro en UTC"
    )
    # Hash de la contraseña (PBKDF2). NULL para usuarios seed sin acceso.
    password_hash: str | None = Field(
        default=None,
        nullable=True,
        max_length=300,
        description="Hash verificable de la contraseña; NULL si no puede iniciar sesión",
    )

    # Relación: un usuario tiene muchos favoritos
    favoritos: list[Favorito] = Relationship(back_populates="usuario", cascade_delete=True)
    sesiones: list[Sesion] = Relationship(
        back_populates="usuario",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Sesion(SQLModel, table=True):
    """Sesión de login: token opaco guardado solo como SHA-256."""

    __tablename__ = "sesion"

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id", description="Usuario dueño de la sesión")
    token_hash: str = Field(
        unique=True, index=True, max_length=64, description="SHA-256 del token entregado"
    )
    creada: datetime = Field(default_factory=utc_now, nullable=False, description="Creación en UTC")
    expira: datetime = Field(nullable=False, description="Vencimiento en UTC")

    usuario: Usuario = Relationship(back_populates="sesiones")


class UsuarioCreate(UsuarioBase):
    """Schema para crear usuario (validación de entrada)."""

    pass


class UsuarioUpdate(SQLModel):
    """Schema para actualizar usuario (campos opcionales)."""

    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    correo: EmailStr | None = None


class UsuarioRead(UsuarioBase):
    """Schema para respuesta de usuario (incluye ID y fecha)."""

    id: int
    fecha_registro: datetime

    class Config:
        from_attributes = True


class CancionBase(SQLModel):
    """Campos base de Canción (sin ID ni relaciones)."""

    titulo: str = Field(min_length=1, max_length=200, description="Título de la canción")
    artista: str = Field(min_length=1, max_length=200, description="Artista o intérprete")
    album: str | None = Field(default=None, max_length=200, description="Álbum al que pertenece")
    duracion: str = Field(description="Duración en formato 'mm:ss' (ej: '5:55')")
    año: int = Field(ge=1900, description="Año de lanzamiento")
    genero: Genero = Field(
        description="Género musical",
        sa_column=Column(
            String(20),
            CheckConstraint(
                "genero IN ('Rock','Pop','Jazz','Electronic','Hip Hop',"
                "'Clasica','Reggae','Country','Otro')",
                name="ck_genero_valido",
            ),
        ),
    )

    @field_validator("duracion", mode="before")
    @classmethod
    def validar_duracion(cls, v: str) -> str:
        """Valida y normaliza el formato de duración."""
        if not isinstance(v, str):
            raise ValueError("La duración debe ser string en formato 'mm:ss' (ej: '5:55')")
        # Validar que se puede parsear (lanza ValueError si no)
        parse_duracion_mmss(v)
        return v

    @field_validator("año", mode="before")
    @classmethod
    def validar_año(cls, v: int) -> int:
        """Valida que el año no sea futuro."""
        año_actual = datetime.now().year
        if v > año_actual:
            raise ValueError(f"El año no puede ser mayor a {año_actual}")
        if v < 1900:
            raise ValueError("El año debe ser mayor o igual a 1900")
        return v


class Cancion(CancionBase, table=True):
    """Modelo de tabla para Canción."""

    __tablename__ = "cancion"

    id: int | None = Field(default=None, primary_key=True)
    fecha_creacion: datetime = Field(
        default_factory=utc_now, nullable=False, description="Fecha de creación del registro en UTC"
    )
    # Campo opcional para futura subida de archivos (Sugerencia #8)
    archivo_audio: str | None = Field(
        default=None,
        nullable=True,
        max_length=500,
        description="Ruta/URL del archivo de audio (futuro)",
    )
    # Duración string excluida de la tabla (solo para input schema)
    # nullable=True para que SQLModel no la requiera en INSERT
    duracion: str | None = Field(default=None, nullable=True, exclude=True)
    # Duración almacenada como segundos (int) para consultas eficientes
    duracion_segundos: int = Field(gt=0, description="Duración en segundos (calculado)")

    # Relación: una canción tiene muchos favoritos
    favoritos: list[Favorito] = Relationship(back_populates="cancion", cascade_delete=True)

    @computed_field
    @property
    def duracion_formato(self) -> str:
        """Duración formateada como 'mm:ss'."""
        return formatear_duracion(self.duracion_segundos)


class CancionCreate(CancionBase):
    """Schema para crear canción (acepta duración 'mm:ss')."""

    pass


class CancionUpdate(SQLModel):
    """Schema para actualizar canción (campos opcionales)."""

    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    artista: str | None = Field(default=None, min_length=1, max_length=200)
    album: str | None = Field(default=None, max_length=200)
    duracion: str | None = None
    año: int | None = Field(default=None, ge=1900)
    genero: Genero | None = Field(
        default=None,
        sa_column=Column(
            String(20),
            CheckConstraint(
                "genero IN ('Rock','Pop','Jazz','Electronic','Hip Hop',"
                "'Clasica','Reggae','Country','Otro')",
                name="ck_genero_valido",
            ),
        ),
    )

    @field_validator("duracion", mode="before")
    @classmethod
    def validar_duracion_opcional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if not isinstance(v, str):
            raise ValueError("La duración debe ser string en formato 'mm:ss' (ej: '5:55')")
        parse_duracion_mmss(v)
        return v

    @field_validator("año", mode="before")
    @classmethod
    def validar_año_opcional(cls, v: int | None) -> int | None:
        if v is None:
            return None
        año_actual = datetime.now().year
        if v > año_actual:
            raise ValueError(f"El año no puede ser mayor a {año_actual}")
        if v < 1900:
            raise ValueError("El año debe ser mayor o igual a 1900")
        return v


class CancionRead(CancionBase):
    """Schema para respuesta de canción (incluye ID, fecha y duración formateada)."""

    id: int
    fecha_creacion: datetime
    duracion_segundos: int
    duracion_formato: str
    archivo_audio: str | None = None

    class Config:
        from_attributes = True


class FavoritoBase(SQLModel):
    """Campos base de Favorito."""

    id_usuario: int = Field(foreign_key="usuario.id", description="ID del usuario")
    id_cancion: int = Field(foreign_key="cancion.id", description="ID de la canción")


class Favorito(FavoritoBase, table=True):
    """Modelo de tabla para Favorito."""

    __tablename__ = "favorito"

    id: int | None = Field(default=None, primary_key=True)
    fecha_marcado: datetime = Field(
        default_factory=utc_now,
        nullable=False,
        description="Fecha en que se marcó como favorito en UTC",
    )

    # Relaciones bidireccionales
    usuario: Usuario = Relationship(back_populates="favoritos")
    cancion: Cancion = Relationship(back_populates="favoritos")

    # Constraint único compuesto: un usuario no puede tener la misma canción dos veces
    __table_args__ = (
        # UniqueConstraint se define a nivel de tabla en SQLModel v0.0.22+
    )


class FavoritoCreate(FavoritoBase):
    """Schema para crear favorito."""

    pass


class FavoritoRead(FavoritoBase):
    """Schema para respuesta de favorito."""

    id: int
    fecha_marcado: datetime
    usuario: UsuarioRead | None = None
    cancion: CancionRead | None = None

    class Config:
        from_attributes = True
