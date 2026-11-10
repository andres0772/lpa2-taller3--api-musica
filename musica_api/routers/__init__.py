"""
Routers de la API de Música.

Exporta los routers de usuarios, canciones y favoritos
para ser registrados en main.py.
"""

from musica_api.routers.canciones import router as canciones_router
from musica_api.routers.favoritos import router as favoritos_router
from musica_api.routers.favoritos_anidados import router as favoritos_anidados_router
from musica_api.routers.usuarios import router as usuarios_router

__all__ = [
    "usuarios_router",
    "canciones_router",
    "favoritos_router",
    "favoritos_anidados_router",
]
