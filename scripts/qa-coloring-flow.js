#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 8123);
const BASE_URL = process.env.QA_URL || `http://127.0.0.1:${PORT}`;
const OUT_DIR = process.env.QA_OUT || "/private/tmp/today-coloring-qa";
const ART_INDICES = (process.env.QA_ART_INDICES || "0,1,5,12,20,29")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value >= 0);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startServer() {
  if (process.env.QA_URL) return null;
  const server = spawn("python3", ["-m", "http.server", String(PORT)], {
    cwd: ROOT,
    stdio: "ignore"
  });
  return server;
}

async function clickByText(page, text) {
  await page.evaluate((needle) => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent.includes(needle));
    if (button) button.click();
  }, text);
}

async function enterHome(page) {
  await page.goto(`${BASE_URL}/?qa=${Date.now()}`, { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    localStorage.clear();
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
    }
  });
  await clickByText(page, "그림 고르기");
  await page.waitForSelector(".home .artcard", { timeout: 10000 });
}

async function ensureHome(page) {
  const alreadyHome = await page.evaluate(() => Boolean(document.querySelector(".home .artcard")));
  if (alreadyHome) return;
  const beforeState = await page.evaluate(() => ({
    appClass: document.querySelector(".app")?.className || "",
    buttons: [...document.querySelectorAll("button")].map((item) => item.textContent.replace(/\s+/g, " ").trim()).slice(0, 8)
  }));
  await page.evaluate(() => {
    const homeNav = [...document.querySelectorAll("button")].find((item) => item.textContent.includes("작품"));
    if (homeNav) homeNav.click();
  });
  const reachedHome = await page.evaluate(() => Boolean(document.querySelector(".home .artcard")));
  if (reachedHome) return;
  await clickByText(page, "그림 고르기");
  try {
    await page.waitForSelector(".home .artcard", { timeout: 10000 });
  } catch (error) {
    const afterState = await page.evaluate(() => ({
      appClass: document.querySelector(".app")?.className || "",
      buttons: [...document.querySelectorAll("button")].map((item) => item.textContent.replace(/\s+/g, " ").trim()).slice(0, 8)
    }));
    throw new Error(`Home navigation failed. before=${JSON.stringify(beforeState)} after=${JSON.stringify(afterState)} cause=${error.message}`);
  }
}

async function findPaintPoints(page, limit = 8) {
  return page.evaluate((maxPoints) => {
    const canvas = [...document.querySelectorAll(".color .canvas-art-shell.is-ready canvas")]
      .find((item) => item.offsetParent && item.width > 0 && item.height > 0);
    if (!canvas) return [];
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const rect = canvas.getBoundingClientRect();
    const found = [];
    const minDistance = Math.min(canvas.width, canvas.height) * 0.12;
    for (let y = Math.round(canvas.height * 0.12); y < canvas.height * 0.88; y += 18) {
      for (let x = Math.round(canvas.width * 0.12); x < canvas.width * 0.88; x += 18) {
        const idx = (y * canvas.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const isWhite = a > 200 && r > 238 && g > 238 && b > 238 && Math.max(r, g, b) - Math.min(r, g, b) < 22;
        if (!isWhite) continue;
        if (found.some((point) => Math.hypot(point.x - x, point.y - y) < minDistance)) continue;
        found.push({
          x,
          y,
          clientX: rect.left + x / canvas.width * rect.width,
          clientY: rect.top + y / canvas.height * rect.height
        });
        if (found.length >= maxPoints) return found;
      }
    }
    return found;
  }, limit);
}

async function inspectPaintSafety(page) {
  return page.evaluate(() => {
    const shell = document.querySelector(".color .canvas-art-shell.is-ready");
    const canvases = shell ? [...shell.querySelectorAll("canvas")] : [];
    const liveCanvas = canvases.find((item) => item.offsetParent && item.width > 0 && item.height > 0);
    const baseCanvas = canvases.find((item) => item !== liveCanvas && item.width === liveCanvas?.width && item.height === liveCanvas?.height);
    if (!liveCanvas || !baseCanvas) return { inkPixels: 0, inkChanged: 0 };
    const live = liveCanvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, liveCanvas.width, liveCanvas.height).data;
    const base = baseCanvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, baseCanvas.width, baseCanvas.height).data;
    let inkPixels = 0;
    let inkChanged = 0;
    for (let idx = 0; idx < base.length; idx += 4) {
      const isInk = base[idx + 3] > 50 && base[idx] < 75 && base[idx + 1] < 75 && base[idx + 2] < 75;
      if (!isInk) continue;
      inkPixels++;
      const changed = Math.abs(live[idx] - base[idx]) + Math.abs(live[idx + 1] - base[idx + 1]) + Math.abs(live[idx + 2] - base[idx + 2]);
      if (changed > 18) inkChanged++;
    }
    return { inkPixels, inkChanged };
  });
}

async function runPaintSample(page, artIndex) {
  await ensureHome(page);
  await page.evaluate((index) => document.querySelectorAll(".home .artcard")[index]?.click(), artIndex);
  await page.waitForSelector(".color .canvas-art-shell.is-ready canvas", { timeout: 15000 });
  await sleep(250);
  const title = await page.$eval(".appbar__center-title", (node) => node.textContent.trim());
  const points = await findPaintPoints(page, 8);
  for (const point of points.slice(0, 6)) {
    await page.mouse.click(point.clientX, point.clientY);
    await sleep(55);
  }
  await sleep(650);
  const metrics = await page.evaluate(() => window.__COLORING_PAINT_METRICS__ || []);
  const lastMetrics = metrics.slice(-points.length);
  const paintSafety = await inspectPaintSafety(page);
  await page.screenshot({ path: path.join(OUT_DIR, `paint-${String(artIndex + 1).padStart(2, "0")}.png`), fullPage: false });
  await page.evaluate(() => document.querySelector(".appbar__back")?.click());
  await page.waitForSelector(".home .artcard", { timeout: 10000 });
  return {
    artIndex,
    title,
    points: points.length,
    samples: lastMetrics.length,
    maxTotal: lastMetrics.length ? Math.max(...lastMetrics.map((item) => item.total || 0)) : 0,
    avgTotal: lastMetrics.length ? lastMetrics.reduce((sum, item) => sum + (item.total || 0), 0) / lastMetrics.length : 0,
    paintSafety
  };
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = startServer();
  if (server) await sleep(900);
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true }
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", async (dialog) => dialog.accept());
  await page.evaluateOnNewDocument(() => {
    window.__COLORING_DEBUG_PAINT = true;
  });

  try {
    await enterHome(page);
    await page.screenshot({ path: path.join(OUT_DIR, "home-mobile.png"), fullPage: false });
    const homeState = await page.evaluate(() => ({
      firstThumbs: [...document.querySelectorAll(".home .artcard__thumb img")].slice(0, 8).map((img) => ({
        complete: img.complete,
        src: img.getAttribute("src")
      })),
      firstCanvasCount: document.querySelectorAll(".home .artcard__thumb canvas").length,
      cardCount: document.querySelectorAll(".home .artcard").length
    }));

    const paintSamples = [];
    for (const artIndex of ART_INDICES) {
      paintSamples.push(await runPaintSample(page, artIndex));
    }

    await page.evaluate(() => document.querySelectorAll(".home .artcard")[0]?.click());
    await page.waitForSelector(".color .canvas-art-shell.is-ready canvas", { timeout: 15000 });
    const gallerySeedPoints = await findPaintPoints(page, 1);
    if (gallerySeedPoints[0]) {
      await page.mouse.click(gallerySeedPoints[0].clientX, gallerySeedPoints[0].clientY);
      await sleep(350);
    }
    await clickByText(page, "완성하기");
    await page.waitForSelector(".completion", { timeout: 10000 });
    await clickByText(page, "갤러리에 보관");
    await sleep(250);
    await clickByText(page, "새 작품");
    await page.waitForSelector(".home", { timeout: 10000 });
    await page.evaluate(() => document.querySelector(".home-summary__gallery")?.click());
    await page.waitForSelector(".gallery", { timeout: 10000 });
    await sleep(350);
    await page.screenshot({ path: path.join(OUT_DIR, "gallery-mobile.png"), fullPage: false });
    const listState = await page.evaluate(() => ({
      deleteButtons: document.querySelectorAll(".gallery-card__delete").length,
      cards: document.querySelectorAll(".gallery-card").length
    }));
    await page.waitForSelector(".gallery-card .artcard__thumb", { timeout: 10000 });
    await page.evaluate(() => document.querySelector(".gallery-card .artcard__thumb")?.click());
    await page.waitForFunction(() => document.querySelector(".app")?.className.includes("app--view"), { timeout: 10000 });
    const detailState = await page.evaluate(() => ({
      deleteButtonExists: [...document.querySelectorAll("button")].some((button) => button.textContent.includes("삭제")),
      title: document.querySelector(".completion__title")?.textContent.trim() || ""
    }));

    const result = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      viewport: { width: 390, height: 844 },
      homeState,
      paintSamples,
      galleryState: {
        ...listState,
        detailDeleteStillExists: detailState.deleteButtonExists,
        detailTitle: detailState.title
      },
      errors
    };
    fs.writeFileSync(path.join(OUT_DIR, "qa-result.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (errors.length) process.exitCode = 1;
    if (paintSamples.some((sample) => sample.samples === 0 || sample.maxTotal > 120)) process.exitCode = 1;
    if (paintSamples.some((sample) => sample.paintSafety.inkChanged > 0)) process.exitCode = 1;
    if (listState.deleteButtons !== 0 || !detailState.deleteButtonExists) process.exitCode = 1;
  } finally {
    await browser.close();
    if (server) server.kill("SIGINT");
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
