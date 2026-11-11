"""
Utilidades de seguridad para la sesión de usuarios.

Hash de contraseñas con PBKDF2-HMAC-SHA256 de la stdlib (sin dependencias
nuevas) y tokens de sesión opacos que se guardan solo como SHA-256.
"""

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

ITERACIONES = 200_000
DIAS_SESION = 7


def hash_password(contraseña: str) -> str:
    """Genera un hash verificable en formato pbkdf2_sha256$iters$salt$hash."""
    sal = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", contraseña.encode(), sal, ITERACIONES)
    return f"pbkdf2_sha256${ITERACIONES}${sal.hex()}${digest.hex()}"


def verificar_password(contraseña: str, almacenado: str) -> bool:
    """Compara una contraseña contra el hash almacenado en tiempo constante."""
    try:
        algoritmo, iteraciones, sal_hex, digest_hex = almacenado.split("$")
        if algoritmo != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            contraseña.encode(),
            bytes.fromhex(sal_hex),
            int(iteraciones),
        )
    except ValueError, TypeError:
        return False
    return hmac.compare_digest(digest.hex(), digest_hex)


def nuevo_token() -> str:
    """Token opaco de sesión (se entrega al cliente una sola vez)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hash con el que se persiste el token: la BD nunca ve el valor real."""
    return hashlib.sha256(token.encode()).hexdigest()


def expiracion_sesion() -> datetime:
    """Vencimiento por defecto de una sesión nueva."""
    return datetime.now(UTC) + timedelta(days=DIAS_SESION)
