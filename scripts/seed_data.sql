-- =============================================================================
-- Seed Data para API de Música - Desarrollo / Tests
-- =============================================================================
-- Inserta 5 usuarios y 10 canciones en SQLite.
-- Uso: sqlite3 musica.db < scripts/seed_data.sql
-- Idempotente: usa INSERT OR IGNORE (requiere UNIQUE en correo).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- USUARIOS (5)
-- -----------------------------------------------------------------------------
-- Nota: correo tiene UNIQUE constraint en el modelo, por eso INSERT OR IGNORE
-- evita duplicados si se ejecuta dos veces.
-- Las fechas usan UTC ISO8601 (compatible con datetime de SQLite).
-- -----------------------------------------------------------------------------

INSERT OR IGNORE INTO usuario (id, nombre, correo, fecha_registro) VALUES
    (1, 'Juan Pérez',      'juan.perez@email.com',      '2024-01-15 10:30:00'),
    (2, 'María González',  'maria.gonzalez@email.com',  '2024-02-20 14:45:00'),
    (3, 'Carlos Rodríguez','carlos.rodriguez@email.com','2024-03-10 09:15:00'),
    (4, 'Ana Martínez',    'ana.martinez@email.com',    '2024-04-05 16:20:00'),
    (5, 'Luis Fernández',  'luis.fernandez@email.com',  '2024-05-12 11:00:00');

-- -----------------------------------------------------------------------------
-- CANCIONES (10)
-- -----------------------------------------------------------------------------
-- Duración guardada como:
--   - duracion (TEXT): string original 'mm:ss' para mostrar
--   - duracion_segundos (INTEGER): para ordenar/filtrar
-- Género usa los valores del enum Genero (Rock, Pop, Jazz, Electronic, Hip Hop, Clasica, Reggae, Country, Otro)
-- -----------------------------------------------------------------------------

INSERT OR IGNORE INTO cancion (id, titulo, artista, album, duracion, "año", genero, fecha_creacion, archivo_audio, duracion_segundos) VALUES
    (1, 'Bohemian Rhapsody',    'Queen',                    'A Night at the Opera',   '5:55', 1975, 'Rock',      '2024-01-20 12:00:00', '/audio/01-bohemian-rhapsody.mp3', 355),
    (2, 'Stairway to Heaven',   'Led Zeppelin',             'Led Zeppelin IV',        '8:02', 1971, 'Rock',      '2024-01-22 10:30:00', '/audio/02-stairway-to-heaven.mp3', 482),
    (3, 'Billie Jean',          'Michael Jackson',          'Thriller',               '4:54', 1982, 'Pop',       '2024-02-01 15:00:00', '/audio/03-billie-jean.mp3', 294),
    (4, 'Hotel California',     'Eagles',                   'Hotel California',       '6:30', 1976, 'Rock',      '2024-02-10 09:45:00', '/audio/04-hotel-california.mp3', 390),
    (5, 'Sweet Child o'' Mine',  'Guns N'' Roses',           'Appetite for Destruction','5:56', 1987, 'Rock',      '2024-02-18 14:20:00', '/audio/05-sweet-child-o-mine.mp3', 356),
    (6, 'Smells Like Teen Spirit','Nirvana',                'Nevermind',              '5:01', 1991, 'Rock',      '2024-03-01 11:10:00', '/audio/06-smells-like-teen-spirit.mp3', 301),
    (7, 'Shape of You',         'Ed Sheeran',               '÷ (Divide)',             '3:53', 2017, 'Pop',       '2024-03-15 13:30:00', '/audio/07-shape-of-you.mp3', 233),
    (8, 'Take Five',            'Dave Brubeck',             'Time Out',               '5:24', 1959, 'Jazz',      '2024-04-01 10:00:00', '/audio/08-take-five.mp3', 324),
    (9, 'One More Time',        'Daft Punk',                'Discovery',              '5:20', 2000, 'Electronic','2024-04-10 16:45:00', '/audio/09-one-more-time.mp3', 320),
    (10,'La Bamba',             'Ritchie Valens',           'Ritchie Valens',         '2:05', 1958, 'Rock',      '2024-05-01 12:00:00', '/audio/10-la-bamba.mp3', 125);

-- -----------------------------------------------------------------------------
-- AUDIO (S1)
-- -----------------------------------------------------------------------------
-- Los INSERT OR IGNORE no actualizan filas existentes, por eso el audio se
-- setea también con UPDATE idempotente: una BD vieja con NULL queda corregida.
-- Los archivos los genera scripts/generate_demo_audio.py y los sirve la API
-- en /audio/<slug>.mp3 (extractos sintetizados, no las canciones reales).
-- -----------------------------------------------------------------------------

UPDATE cancion SET archivo_audio = '/audio/01-bohemian-rhapsody.mp3'     WHERE id = 1;
UPDATE cancion SET archivo_audio = '/audio/02-stairway-to-heaven.mp3'    WHERE id = 2;
UPDATE cancion SET archivo_audio = '/audio/03-billie-jean.mp3'           WHERE id = 3;
UPDATE cancion SET archivo_audio = '/audio/04-hotel-california.mp3'      WHERE id = 4;
UPDATE cancion SET archivo_audio = '/audio/05-sweet-child-o-mine.mp3'    WHERE id = 5;
UPDATE cancion SET archivo_audio = '/audio/06-smells-like-teen-spirit.mp3' WHERE id = 6;
UPDATE cancion SET archivo_audio = '/audio/07-shape-of-you.mp3'          WHERE id = 7;
UPDATE cancion SET archivo_audio = '/audio/08-take-five.mp3'            WHERE id = 8;
UPDATE cancion SET archivo_audio = '/audio/09-one-more-time.mp3'        WHERE id = 9;
UPDATE cancion SET archivo_audio = '/audio/10-la-bamba.mp3'             WHERE id = 10;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN RÁPIDA (descomenta para probar)
-- -----------------------------------------------------------------------------
-- SELECT 'Usuarios:' as tabla, COUNT(*) as total FROM usuario
-- UNION ALL
-- SELECT 'Canciones:', COUNT(*) FROM cancion;
--
-- Esperado: 5 usuarios, 10 canciones

-- -----------------------------------------------------------------------------
-- NOTAS PARA EL USUARIO
-- -----------------------------------------------------------------------------
-- 1. Ejecutar SOLO en desarrollo/tests. En producción NO se usa este script.
-- 2. Si ya existe musica.db con datos, los INSERT OR IGNORE no duplican.
-- 3. Para resetear: borrar musica.db y volver a correr create_db_and_tables() + este script.
-- 4. En DBeaver: click derecho en la BD > "Execute SQL Script" > seleccionar este archivo.
-- 5. Las fechas están en UTC. SQLite las guarda como TEXT ISO8601.
-- =============================================================================
