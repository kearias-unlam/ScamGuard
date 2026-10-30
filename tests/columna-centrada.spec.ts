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

// US-8.2: read the input and the result in a narrow, centered column.

// The site header spans the whole page, so its width is the page width
// without the vertical scrollbar (the viewport width includes it).
async function pageWidth(page: Page): Promise<number> {
  const headerBox = await readBox(page.getByRole('banner'));
  return headerBox.width;
}

test('en una pantalla de 1920 px, la carga y el resultado tienen el mismo ancho, de como máximo un tercio de la pantalla', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');

  const tabListBox = await readBox(inputTabList(page));
  const resultBox = await readBox(resultColumn(page));

  // The tab list sits inside the input card's 1px side borders.
  expect(Math.abs(tabListBox.width - resultBox.width)).toBeLessThanOrEqual(2);
  expect(resultBox.width).toBeLessThanOrEqual(640);
});

test('en una pantalla de 1920 px, la carga y el resultado están centrados', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');

  const width = await pageWidth(page);
  const tabListBox = await readBox(inputTabList(page));
  const resultBox = await readBox(resultColumn(page));

  for (const box of [tabListBox, resultBox]) {
    const leftSpace = box.x;
    const rightSpace = width - box.x - box.width;
    expect(Math.abs(leftSpace - rightSpace)).toBeLessThanOrEqual(1);
  }
});

test('en una pantalla de 375 px, la carga y el resultado ocupan todo el ancho disponible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  // `main` has 1.25rem (20px) side padding below 40rem, so the available
  // width is the page width without the scrollbar minus that padding.
  const available = (await pageWidth(page)) - 40;
  const tabListBox = await readBox(inputTabList(page));
  const resultBox = await readBox(resultColumn(page));

  expect(Math.abs(resultBox.width - available)).toBeLessThanOrEqual(1);
  // The tab list sits inside the input card's 1px side borders.
  expect(Math.abs(tabListBox.width - available)).toBeLessThanOrEqual(2);
});
