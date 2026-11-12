# Cómo ejecutar el Seed Data en DBeaver

Cuando tengas DBeaver instalado, seguí estos pasos:

## 1. Conectar a la base de datos SQLite

1. Abrir DBeaver
2. **Nueva conexión** (icono enchufe +) → **SQLite**
3. En "Database/Schema" → **Browse** → seleccionar `musica.db` (en la raíz del proyecto)
4. **Test Connection** → **Finish**

## 2. Ejecutar el script SQL

### Opción A: Desde el editor SQL
1. **File** → **Open File** → seleccionar `scripts/seed_data.sql`
2. Click en **Execute SQL Script** (icono play ▶️ o `Ctrl+Enter`)
3. Verificar en consola: "Script executed successfully"

### Opción B: Click derecho en la BD
1. En **Database Navigator** (panel izquierdo), click derecho en `musica` (o `SQLite - musica.db`)
2. **Tools** → **Execute SQL Script...**
3. Seleccionar `scripts/seed_data.sql` → **OK**

## 3. Verificar que se insertó

En el editor SQL, ejecutar:
```sql
SELECT 'Usuarios:' as tabla, COUNT(*) as total FROM usuario
UNION ALL
SELECT 'Canciones:', COUNT(*) FROM cancion;
```
Debe mostrar:
```
tabla      | total
-----------|------
Usuarios:  | 5
Canciones: | 10
```

## 4. Explorar los datos

- Expandir la conexión → **Tables** → doble click en `usuario` o `cancion`
- Pestaña **Data** para ver filas
- Pestaña **ER Diagram** para ver relaciones

---

## Comandos equivalentes en terminal (sin DBeaver)

```bash
# Crear tablas + seed completo
cd /ruta/del/proyecto
rm -f musica.db
uv run python -c "from musica_api.models import Usuario, Cancion, Favorito; from musica_api.database import create_db_and_tables; create_db_and_tables()"
sqlite3 musica.db < scripts/seed_data.sql

# Verificar
sqlite3 musica.db "SELECT 'Usuarios:', COUNT(*) FROM usuario UNION ALL SELECT 'Canciones:', COUNT(*) FROM cancion;"
```

---

## Notas importantes

- **Idempotente**: Podés ejecutar el script varias veces; `INSERT OR IGNORE` evita duplicados (usa UNIQUE en `correo` y PK `id`).
- **Solo desarrollo**: En producción NO se usa este script. Los datos entran via registro de usuarios y carga de admins.
- **Reset completo**: Borrar `musica.db` y volver a correr los 3 pasos arriba.
- **Fechas**: Están en UTC (ISO8601). SQLite las guarda como TEXT.

---

## Datos incluidos

### 5 Usuarios
| ID | Nombre | Correo |
|----|--------|--------|
| 1 | Juan Pérez | juan.perez@email.com |
| 2 | María González | maria.gonzalez@email.com |
| 3 | Carlos Rodríguez | carlos.rodriguez@email.com |
| 4 | Ana Martínez | ana.martinez@email.com |
| 5 | Luis Fernández | luis.fernandez@email.com |

### 10 Canciones
| ID | Título | Artista | Género | Duración |
|----|--------|---------|--------|----------|
| 1 | Bohemian Rhapsody | Queen | Rock | 5:55 |
| 2 | Stairway to Heaven | Led Zeppelin | Rock | 8:02 |
| 3 | Billie Jean | Michael Jackson | Pop | 4:54 |
| 4 | Hotel California | Eagles | Rock | 6:30 |
| 5 | Sweet Child o' Mine | Guns N' Roses | Rock | 5:56 |
| 6 | Smells Like Teen Spirit | Nirvana | Rock | 5:01 |
| 7 | Shape of You | Ed Sheeran | Pop | 3:53 |
| 8 | Take Five | Dave Brubeck | Jazz | 5:24 |
| 9 | One More Time | Daft Punk | Electronic | 5:20 |
| 10 | La Bamba | Ritchie Valens | Rock | 2:05 |

## Portadas (S3)

Las 10 canciones reciben una portada determinista en `media/portadas/<slug>.svg` (mismo slug que el audio). Se generan con:

```bash
uv run python scripts/generate_portadas.py
```

- Determinista: hash SHA-256 del título → paleta con los tokens de diseño del proyecto (`--color-accent-indigo`, `--color-accent-glow`, fondos oscuros) + variantes de patrón (círculos, ondas, grilla). Sin material con copyright.
- La columna `portada` se completa con UPDATEs idempotentes (mismo enfoque que la sección de audio) y la API las sirve en `/portadas/<slug>.svg`.
