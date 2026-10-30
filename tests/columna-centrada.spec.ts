import { expect, test, type Locator, type Page } from '@playwright/test';

// US-8.1: see the result below the input.

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function readBox(locator: Locator): Promise<Box> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box as Box;
}

function inputTabList(page: Page): Locator {
  return page.getByRole('tablist', { name: 'Método de carga' });
}

function messageTabPanel(page: Page): Locator {
  return page.getByRole('tabpanel', { name: 'Pegar mensaje' });
}

function resultColumn(page: Page): Locator {
  return page.getByRole('complementary', { name: 'Resultado del análisis' });
}

test('en una pantalla de 1920 px, el resultado se muestra debajo de la carga sin superponerse', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');

  const tabListBox = await readBox(inputTabList(page));
  const tabPanelBox = await readBox(messageTabPanel(page));
  const resultBox = await readBox(resultColumn(page));

  expect(tabPanelBox.y).toBeGreaterThanOrEqual(tabListBox.y + tabListBox.height);
  expect(resultBox.y).toBeGreaterThanOrEqual(tabPanelBox.y + tabPanelBox.height);
});

test('en una pantalla de 375 px, la carga y el resultado tienen el mismo ancho, uno debajo del otro', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  const tabListBox = await readBox(inputTabList(page));
  const tabPanelBox = await readBox(messageTabPanel(page));
  const resultBox = await readBox(resultColumn(page));

  // The tab list sits inside the input card's 1px side borders, so it is 2px
  // narrower than the card, while the result column box includes its own border.
  expect(Math.abs(tabListBox.width - resultBox.width)).toBeLessThanOrEqual(2);
  expect(resultBox.y).toBeGreaterThanOrEqual(tabPanelBox.y + tabPanelBox.height);
});
