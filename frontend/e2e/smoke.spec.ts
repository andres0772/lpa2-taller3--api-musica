import { expect, test } from "@playwright/test";

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
  archivo_audio: "/audio/stairway.mp3",
};

const usuario = {
  id: 1,
  nombre: "Juan Pérez",
  correo: "juan.perez@email.com",
  fecha_registro: "2024-01-15T10:30:00Z",
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

  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Tu banda sonora en movimiento.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Favoritos" })).toHaveAttribute(
    "href",
    "/favoritos",
  );
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
    "/audio/stairway.mp3",
  );
});
