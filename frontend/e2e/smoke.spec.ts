import { expect, test, type Page } from "@playwright/test";

const cancion = {
  id: 2,
  titulo: "Stairway to Heaven",
  artista: "Led Zeppelin",
  album: "Led Zeppelin IV",
  duracion: "8:02",
  duracion_segundos: 482,
  duracion_formato: "8:02",
  año: 1971,
  genero: "Rock",
  fecha_creacion: "2024-01-22T10:30:00Z",
  archivo_audio: "/audio/02-stairway-to-heaven.mp3",
  portada: "/portadas/02-stairway-to-heaven.svg",
};

const cancionDos = {
  id: 8,
  titulo: "Take Five",
  artista: "Dave Brubeck",
  album: "Time Out",
  duracion: "5:24",
  duracion_segundos: 324,
  duracion_formato: "5:24",
  año: 1959,
  genero: "Jazz",
  fecha_creacion: "2024-04-01T10:00:00Z",
  archivo_audio: "/audio/08-take-five.mp3",
  portada: "/portadas/08-take-five.svg",
};

// Las portadas son assets reales servidos por la API: se sirven desde el repo
// igual que el audio, para que la UI nunca muestre una imagen rota.
async function mockPortadas(page: Page) {
  await page.route("**/portadas/**", async (route) => {
    const nombre = route.request().url().split("/portadas/")[1] ?? "";
    await route.fulfill({
      path: new URL(`../../media/portadas/${nombre}`, import.meta.url).pathname,
      contentType: "image/svg+xml",
    });
  });
}

const usuario = {
  id: 1,
  nombre: "Juan Pérez",
  correo: "juan.perez@email.com",
  fecha_registro: "2024-01-15T10:30:00Z",
};

const USUARIO_SESION = {
  id: 9,
  nombre: "Ana Demo",
  correo: "ana@example.com",
  fecha_registro: "2024-05-01T10:00:00Z",
};

test("loads the cinematic YourMusic landing page without browser errors", async ({
  page,
}) => {
  const browserErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`pageerror: ${error.message}`);
  });

  await page.route("**/api/canciones**", async (route) => {
    await route.fulfill({ json: [cancion] });
  });
  await page.route("**/audio/**", async (route) => {
    await route.fulfill({
      path: new URL(
        "../../media/audio/02-stairway-to-heaven.mp3",
        import.meta.url,
      ).pathname,
      contentType: "audio/mpeg",
    });
  });
  await mockPortadas(page);

  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  // La portada real de la canción se ve en la tarjeta editorial.
  await expect(page.locator(".lead-art img")).toBeVisible();
  await expect(page.locator(".lead-art img")).toHaveAttribute(
    "src",
    "http://127.0.0.1:8000/portadas/02-stairway-to-heaven.svg",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Tu banda sonora en movimiento.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Favoritos", exact: true }),
  ).toHaveAttribute("href", "/favoritos");
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(2, 6, 23)",
  );
  expect(browserErrors).toEqual([]);
});

test("opens saved music in the luminous favorites view", async ({ page }) => {
  await page.route("**/api/usuarios/1/favoritos", async (route) => {
    await route.fulfill({
      json: [
        {
          id: 7,
          id_usuario: 1,
          id_cancion: 2,
          fecha_marcado: "2024-04-01T10:00:00Z",
          usuario: null,
          cancion: null,
        },
      ],
    });
  });
  await page.route("**/api/usuarios/1", async (route) => {
    await route.fulfill({ json: usuario });
  });
  await page.route("**/api/canciones/2", async (route) => {
    await route.fulfill({ json: cancion });
  });
  await mockPortadas(page);

  const response = await page.goto("/favoritos");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "Tu archivo luminoso" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Stairway to Heaven" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reproducir Stairway to Heaven" }),
  ).toBeEnabled();
  await expect(page.locator("audio")).toHaveAttribute(
    "src",
    "http://127.0.0.1:8000/audio/02-stairway-to-heaven.mp3",
  );
  await expect(page.locator("img.now-cover")).toBeVisible();
  await expect(page.locator("img.now-cover")).toHaveAttribute(
    "src",
    "http://127.0.0.1:8000/portadas/02-stairway-to-heaven.svg",
  );
});

test("explores the catalog with debounced search and filter deep links", async ({
  page,
}) => {
  const busquedas: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/canciones/buscar")) {
      busquedas.push(request.url());
    }
  });
  await page.route("**/api/canciones/buscar**", async (route) => {
    await route.fulfill({ json: [cancionDos] });
  });
  await page.route("**/api/canciones**", async (route) => {
    await route.fulfill({ json: [cancion, cancionDos] });
  });
  await mockPortadas(page);

  await page.goto("/canciones?q=led+zeppelin&genero=Rock");

  await expect(page.getByLabel("Buscar por título o artista")).toHaveValue(
    "led zeppelin",
  );
  await expect(page.getByLabel("Género")).toHaveValue("Rock");
  await expect(page.getByRole("heading", { name: "Take Five" })).toBeVisible();

  // Escribir varios caracteres colapsa en un solo request (debounce 300ms).
  busquedas.length = 0;
  await page.getByLabel("Buscar por título o artista").fill("brubeck");
  await expect
    .poll(() => busquedas.length, { timeout: 3000 })
    .toBe(1);
  expect(busquedas[0]).toContain("titulo=brubeck");
  await expect.poll(() => new URL(page.url()).search).toContain("q=brubeck");
});

test("shows loading skeletons before the catalog arrives", async ({ page }) => {
  await page.route("**/api/canciones**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({ json: [] });
  });

  await page.goto("/canciones");

  await expect(page.locator(".song-skeleton")).toHaveCount(6);
  await expect(page.getByText(/no encontramos canciones/i)).toBeVisible({
    timeout: 3000,
  });
  await expect(page.locator(".song-skeleton")).toHaveCount(0);
});

test("plays, seeks and skips through the landing queue", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`pageerror: ${error.message}`);
  });

  await page.route("**/api/canciones**", async (route) => {
    await route.fulfill({ json: [cancion, cancionDos] });
  });
  await page.route("**/audio/**", async (route) => {
    const esTakeFive = route.request().url().includes("08-take-five");
    const archivo = esTakeFive
      ? new URL("../../media/audio/08-take-five.mp3", import.meta.url)
      : new URL("../../media/audio/02-stairway-to-heaven.mp3", import.meta.url);
    await route.fulfill({ path: archivo.pathname, contentType: "audio/mpeg" });
  });

  await page.goto("/");

  await page.getByRole("button", { name: "Reproducir Stairway to Heaven" }).click();
  await expect(page.locator(".performance")).toHaveAttribute(
    "data-playing",
    "true",
  );

  // El audio real avanza: el reloj del <audio> se mueve solo.
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.querySelector<HTMLAudioElement>(".glass-player audio")?.currentTime ?? 0,
        ),
      { timeout: 5000 },
    )
    .toBeGreaterThan(0.5);

  // Buscar posición mueve la canción al punto elegido.
  await page.getByLabel("Buscar posición dentro de la canción").fill("5");
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.querySelector<HTMLAudioElement>(".glass-player audio")?.currentTime ?? 0,
        ),
      { timeout: 5000 },
    )
    .toBeGreaterThan(4);

  // Siguiente: cambia la canción destacada y sigue sonando.
  await page.getByRole("button", { name: "Canción siguiente a Stairway to Heaven" }).click();
  await expect(
    page
      .getByRole("region", { name: "Canción destacada" })
      .getByRole("heading", { name: "Take Five" }),
  ).toBeVisible();
  await expect(page.locator(".performance")).toHaveAttribute(
    "data-playing",
    "true",
  );
  await expect(page.locator(".glass-player audio")).toHaveAttribute(
    "src",
    "http://127.0.0.1:8000/audio/08-take-five.mp3",
  );
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.querySelector<HTMLAudioElement>(".glass-player audio")?.currentTime ?? 0,
        ),
      { timeout: 5000 },
    )
    .toBeGreaterThan(0.5);

  expect(browserErrors).toEqual([]);
});

test("advances the exploration queue from the player dock", async ({ page }) => {
  await page.route("**/api/canciones**", async (route) => {
    await route.fulfill({ json: [cancion, cancionDos] });
  });
  await page.route("**/audio/**", async (route) => {
    const esTakeFive = route.request().url().includes("08-take-five");
    const archivo = esTakeFive
      ? new URL("../../media/audio/08-take-five.mp3", import.meta.url)
      : new URL("../../media/audio/02-stairway-to-heaven.mp3", import.meta.url);
    await route.fulfill({ path: archivo.pathname, contentType: "audio/mpeg" });
  });

  await page.goto("/canciones");

  await page.getByRole("button", { name: "Reproducir Stairway to Heaven" }).click();

  const barra = page.getByLabel("Buscar posición dentro de la canción");
  await expect(barra).toBeEnabled({ timeout: 5000 });

  await page.getByRole("button", { name: "Canción siguiente a Stairway to Heaven" }).click();
  await expect(page.locator(".explore-audio")).toHaveAttribute(
    "src",
    "http://127.0.0.1:8000/audio/08-take-five.mp3",
  );
  await expect(
    page.getByRole("button", { name: "Pausar Take Five" }),
  ).toBeVisible();
});

test("registers, scopes favorites to the session user and logs out", async ({
  page,
}) => {
  const favoritosUsuario: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/")) {
      favoritosUsuario.push(`${request.method()} ${url.replace("http://127.0.0.1:8000", "")}`);
    }
  });

  await page.route("**/api/auth/registro", async (route) => {
    await route.fulfill({ status: 201, json: USUARIO_SESION });
  });
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      json: { token: "tok-e2e", usuario: USUARIO_SESION },
    });
  });
  await page.route("**/api/auth/logout", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ json: USUARIO_SESION });
  });
  await page.route("**/api/usuarios/9", async (route) => {
    await route.fulfill({ json: USUARIO_SESION });
  });
  await page.route("**/api/usuarios/9/favoritos**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        json: { id: 55, id_usuario: 9, id_cancion: 8 },
      });
      return;
    }
    await route.fulfill({ json: [] });
  });
  await page.route("**/api/canciones**", async (route) => {
    await route.fulfill({ json: [cancion, cancionDos] });
  });
  await mockPortadas(page);

  await page.goto("/login");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre").fill("Ana Demo");
  await page.getByLabel("Correo").fill("ana@example.com");
  await page.getByLabel("Contraseña").fill("secretito-2024");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByText("Hola, Ana Demo")).toBeVisible();

  // Los favoritos se piden al usuario de la sesión, no al demo.
  await page.getByRole("link", { name: "Favoritos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Stairway to Heaven" }).or(
      page.getByText(/todavía está en silencio/i),
    ),
  ).toBeVisible();
  await expect
    .poll(() => favoritosUsuario.some((url) => url.includes("/api/usuarios/9/")), {
      timeout: 5000,
    })
    .toBe(true);
  expect(favoritosUsuario.some((url) => url.includes("/api/usuarios/1/"))).toBe(
    false,
  );

  await page.getByRole("link", { name: "Canciones" }).click();
  await page
    .getByRole("button", { name: 'Guardar "Take Five" en favoritos' })
    .click();
  await expect(page.getByText("Canción guardada en favoritos")).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
});
