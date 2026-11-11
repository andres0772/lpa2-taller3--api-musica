import { expect, test } from "@playwright/test";

test("loads the YourMusic landing page without browser errors", async ({
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

  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 2, name: "YOURMUSIC" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bienvenido de vuelta" }),
  ).toBeVisible();
  await expect(page.locator('video[src="/video/intro.mp4"]')).toHaveCount(1);
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(2, 6, 23)",
  );

  const videoResponse = await page.request.get("/video/intro.mp4");
  expect(videoResponse.status()).toBe(200);
  expect(browserErrors).toEqual([]);
});
