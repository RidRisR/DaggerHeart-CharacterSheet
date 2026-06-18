const { createHash } = require("node:crypto")
const { copyFile, mkdir, readdir, rm, writeFile } = require("node:fs/promises")
const { existsSync } = require("node:fs")
const path = require("node:path")
const { spawn } = require("node:child_process")

const ROOT = path.resolve(__dirname, "..")
const LEGACY_WORKTREE = path.join(ROOT, ".worktrees/card-import-legacy-baseline")
const FIXTURE_ROOT = path.join(ROOT, ".local-fixtures/card-packs")
const INPUTS = path.join(FIXTURE_ROOT, "inputs")
const EXPECTED = path.join(FIXTURE_ROOT, "expected")
const RUNNER_DIR = path.join(LEGACY_WORKTREE, ".legacy-baseline-runner")
const FIXED_NOW = "2026-06-18T00:00:00.000Z"
const VITE_PORT = Number(process.env.LEGACY_BASELINE_VITE_PORT ?? 5187)
const CHROME_PORT = Number(process.env.LEGACY_BASELINE_CHROME_PORT ?? 9227)
const CHROME_PATH =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

function shortHash(input, length) {
  return createHash("sha256").update(input).digest("hex").slice(0, length)
}

function normalizeFixturePath(fixtureName) {
  return fixtureName.split(path.sep).join("/")
}

function readableSnapshotBase(fixtureName) {
  const normalized = normalizeFixturePath(fixtureName)
  const fileName = normalized.split("/").pop() ?? normalized
  const withoutExtension = fileName.replace(/\.(json|dhcb)$/i, "")
  return (
    withoutExtension
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}._-]+/gu, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "fixture"
  )
}

function createFixtureNames(fixtureName) {
  const normalized = normalizeFixturePath(fixtureName)
  return {
    packId: `test-pack-${shortHash(normalized, 12)}`,
    snapshotFileName: `${readableSnapshotBase(normalized)}-${shortHash(normalized, 8)}.storage.json`,
  }
}

async function discoverFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) return discoverFiles(fullPath)
      if (entry.isFile() && [".json", ".dhcb"].includes(path.extname(entry.name).toLowerCase())) return [fullPath]
      return []
    }),
  )
  return nested.flat().sort()
}

async function waitForHttp(url, timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function spawnLogged(command, args, options) {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options })
  child.stdout.on("data", (chunk) => process.stdout.write(chunk))
  child.stderr.on("data", (chunk) => process.stderr.write(chunk))
  return child
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }))
  })
}

async function createBrowserRunner(fixtures) {
  await rm(RUNNER_DIR, { recursive: true, force: true })
  await mkdir(RUNNER_DIR, { recursive: true })
  await mkdir(path.join(RUNNER_DIR, "inputs"), { recursive: true })

  const browserFixtures = []
  for (const fixture of fixtures) {
    await copyFile(fixture.sourcePath, path.join(RUNNER_DIR, "inputs", fixture.runnerInputFileName))
    const { sourcePath, runnerInputFileName, ...browserFixture } = fixture
    browserFixtures.push({
      ...browserFixture,
      url: `./inputs/${runnerInputFileName}`,
    })
  }

  await writeFile(
    path.join(RUNNER_DIR, "manifest.js"),
    `export const fixtures = ${JSON.stringify(browserFixtures, null, 2)};\nexport const fixedNow = ${JSON.stringify(FIXED_NOW)};\n`,
    "utf8",
  )

  await writeFile(
    path.join(RUNNER_DIR, "index.html"),
    `<!doctype html><html><head><meta charset="utf-8"><title>Legacy Card Import Baseline</title></head><body><pre id="status">running</pre><script type="module" src="./browser-runner.js"></script></body></html>\n`,
    "utf8",
  )

  await writeFile(path.join(RUNNER_DIR, "browser-runner.js"), BROWSER_RUNNER, "utf8")

  await writeFile(
    path.join(RUNNER_DIR, "vite.config.mjs"),
    `import path from "node:path";

const legacyRoot = ${JSON.stringify(LEGACY_WORKTREE)};
const fixtureRoot = ${JSON.stringify(ROOT)};

export default {
  root: legacyRoot,
  server: {
    fs: {
      allow: [legacyRoot, fixtureRoot],
    },
  },
  resolve: {
    alias: {
      "@": legacyRoot,
      "@/card": path.join(legacyRoot, "card"),
      "@/components": path.join(legacyRoot, "components"),
      "@/lib": path.join(legacyRoot, "lib"),
    },
  },
};
`,
    "utf8",
  )
}

async function connectWebSocket(url) {
  const ws = new WebSocket(url)
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true })
    ws.addEventListener("error", reject, { once: true })
  })
  return ws
}

function createCdpClient(ws) {
  let nextId = 1
  const pending = new Map()

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data)
    if (!message.id) return
    const waiter = pending.get(message.id)
    if (!waiter) return
    pending.delete(message.id)
    if (message.error) waiter.reject(new Error(message.error.message))
    else waiter.resolve(message.result)
  })

  return {
    send(method, params = {}) {
      const id = nextId++
      ws.send(JSON.stringify({ id, method, params }))
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
    },
    close() {
      ws.close()
    },
  }
}

async function runFixtureInChrome(index) {
  const response = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new`, { method: "PUT" })
  if (!response.ok) throw new Error(`Failed to create Chrome target: ${response.status}`)
  const target = await response.json()
  const client = createCdpClient(await connectWebSocket(target.webSocketDebuggerUrl))

  try {
    await client.send("Runtime.enable")
    await client.send("Page.enable")
    await client.send("Page.navigate", {
      url: `http://127.0.0.1:${VITE_PORT}/.legacy-baseline-runner/index.html?i=${index}`,
    })

    const started = Date.now()
    while (Date.now() - started < 120_000) {
      const result = await client.send("Runtime.evaluate", {
        expression: "window.__legacyBaselineResult ?? null",
        returnByValue: true,
      })
      if (result.result.value) return result.result.value
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    throw new Error("Timed out waiting for legacy baseline result")
  } finally {
    client.close()
    await fetch(`http://127.0.0.1:${CHROME_PORT}/json/close/${target.id}`).catch(() => {})
  }
}

async function main() {
  if (!existsSync(LEGACY_WORKTREE)) {
    throw new Error(`Missing legacy worktree: ${LEGACY_WORKTREE}`)
  }
  if (!existsSync(CHROME_PATH)) {
    throw new Error(`Chrome not found at ${CHROME_PATH}. Set CHROME_PATH to override.`)
  }

  const files = await discoverFiles(INPUTS)
  if (files.length === 0) throw new Error(`No fixtures found under ${INPUTS}`)

  const fixtures = files.map((filePath, index) => {
    const fixtureName = path.relative(INPUTS, filePath)
    const names = createFixtureNames(fixtureName)
    return {
      sourcePath: filePath,
      fixtureName: normalizeFixturePath(fixtureName),
      fileName: path.basename(filePath),
      runnerInputFileName: `fixture-${String(index).padStart(3, "0")}${path.extname(filePath).toLowerCase()}`,
      packId: names.packId,
      snapshotFileName: names.snapshotFileName,
    }
  })

  await mkdir(EXPECTED, { recursive: true })
  await createBrowserRunner(fixtures)

  const viteBin = path.join(ROOT, "node_modules/.bin/vite")
  const vite = spawnLogged(viteBin, ["--config", path.join(RUNNER_DIR, "vite.config.mjs"), "--host", "127.0.0.1", "--port", String(VITE_PORT), "--strictPort"], {
    cwd: LEGACY_WORKTREE,
  })
  const chromeProfile = path.join(RUNNER_DIR, "chrome-profile")
  const chrome = spawnLogged(
    CHROME_PATH,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${chromeProfile}`,
      `--remote-debugging-port=${CHROME_PORT}`,
      "about:blank",
    ],
    { cwd: LEGACY_WORKTREE },
  )

  const failures = []

  try {
    await waitForHttp(`http://127.0.0.1:${VITE_PORT}/.legacy-baseline-runner/index.html`, 30_000)
    await waitForHttp(`http://127.0.0.1:${CHROME_PORT}/json/version`, 30_000)

    for (let index = 0; index < fixtures.length; index += 1) {
      const fixture = fixtures[index]
      process.stdout.write(`[legacy-baseline] ${fixture.fixtureName}\n`)
      const result = await runFixtureInChrome(index)
      if (!result.ok) {
        failures.push(`${fixture.fixtureName}: ${result.error}`)
        continue
      }
      await writeFile(path.join(EXPECTED, fixture.snapshotFileName), `${JSON.stringify(result.snapshot, null, 2)}\n`, "utf8")
    }
  } finally {
    vite.kill("SIGTERM")
    chrome.kill("SIGTERM")
    await Promise.all([waitForExit(vite), waitForExit(chrome)])
  }

  if (failures.length > 0) {
    throw new Error(`Legacy baseline generation failed:\n${failures.join("\n")}`)
  }

  process.stdout.write(`[legacy-baseline] wrote ${fixtures.length} expected snapshots\n`)
}

const BROWSER_RUNNER = String.raw`
import { fixedNow, fixtures } from "./manifest.js";

const STORAGE_INDEX = "daggerheart_custom_cards_index";
const STORAGE_BATCH_PREFIX = "daggerheart_custom_cards_batch_";
const BUILTIN_BATCH_ID = "SYSTEM_BUILTIN_CARDS";
const DB_NAME = "CardImageDB";

function fail(error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  window.__legacyBaselineResult = { ok: false, error: message };
  document.querySelector("#status").textContent = message;
}

function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function openDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getImageRecord(db, cardId) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains("images")) {
      resolve(null);
      return;
    }
    const transaction = db.transaction("images", "readonly");
    const request = transaction.objectStore("images").get(cardId);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function sha256(blob) {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function makeFile(fixture) {
  const response = await fetch(fixture.url);
  if (!response.ok) throw new Error("Failed to fetch fixture " + fixture.fixtureName + ": " + response.status);
  const blob = await response.blob();
  return new File([blob], fixture.fileName, { type: fixture.fileName.toLowerCase().endsWith(".json") ? "application/json" : "application/octet-stream" });
}

function parseLocalStorageJson(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) throw new Error("Missing localStorage key " + key);
  return JSON.parse(raw);
}

function findCustomBatchId(index) {
  const ids = Object.keys(index?.batches ?? {}).filter((id) => id !== BUILTIN_BATCH_ID);
  if (ids.length !== 1) throw new Error("Expected exactly one custom batch, found " + ids.join(", "));
  return ids[0];
}

function rewriteBatchId(value, oldBatchId, newBatchId) {
  if (Array.isArray(value)) return value.map((item) => rewriteBatchId(item, oldBatchId, newBatchId));
  if (!value || typeof value !== "object") return value;

  const next = {};
  for (const [key, nested] of Object.entries(value)) {
    if ((key === "id" || key === "batchId") && nested === oldBatchId) next[key] = newBatchId;
    else if (key === "importTime" && typeof nested === "string") next[key] = fixedNow;
    else next[key] = rewriteBatchId(nested, oldBatchId, newBatchId);
  }
  return next;
}

async function buildSnapshot(fixture) {
  const index = parseLocalStorageJson(STORAGE_INDEX);
  const oldBatchId = findCustomBatchId(index);
  const rawBatch = parseLocalStorageJson(STORAGE_BATCH_PREFIX + oldBatchId);
  const rawIndexEntry = index.batches[oldBatchId];

  const normalizedIndexEntry = rewriteBatchId(rawIndexEntry, oldBatchId, fixture.packId);
  normalizedIndexEntry.id = fixture.packId;
  normalizedIndexEntry.importTime = fixedNow;

  const normalizedBatch = rewriteBatchId(rawBatch, oldBatchId, fixture.packId);
  normalizedBatch.metadata = {
    ...normalizedBatch.metadata,
    id: fixture.packId,
    importTime: fixedNow,
  };

  const imageCardIds = Array.isArray(normalizedBatch.metadata.imageCardIds) ? normalizedBatch.metadata.imageCardIds : [];
  const db = await openDatabase(DB_NAME);
  const imageItems = [];
  for (const cardId of [...imageCardIds].sort((left, right) => left.localeCompare(right))) {
    const record = await getImageRecord(db, cardId);
    if (!record) throw new Error("Missing legacy image record for " + cardId);
    imageItems.push({
      cardId,
      mimeType: record.mimeType,
      byteLength: record.blob.size,
      sha256: await sha256(record.blob),
    });
  }
  db.close();

  const normalizedIndex = {
    batches: {
      [fixture.packId]: normalizedIndexEntry,
    },
    totalCards: Array.isArray(normalizedBatch.cards) ? normalizedBatch.cards.length : 0,
    totalBatches: 1,
    lastUpdate: fixedNow,
  };

  return {
    index: normalizedIndex,
    batches: {
      [fixture.packId]: {
        metadata: normalizedBatch.metadata,
        cards: normalizedBatch.cards,
        ...(normalizedBatch.customFieldDefinitions !== undefined ? { customFieldDefinitions: normalizedBatch.customFieldDefinitions } : {}),
        ...(normalizedBatch.variantTypes !== undefined ? { variantTypes: normalizedBatch.variantTypes } : {}),
      },
    },
    images: {
      [fixture.packId]: {
        cardIds: imageItems.map((item) => item.cardId),
        items: imageItems,
      },
    },
  };
}

async function run() {
  const index = Number(new URLSearchParams(location.search).get("i"));
  const fixture = fixtures[index];
  if (!fixture) throw new Error("Unknown fixture index " + index);

  localStorage.clear();
  await deleteDatabase(DB_NAME);

  const [{ importContentPackFiles }, { importCustomCards }, { importDhcbCardPackage }] = await Promise.all([
    import("/components/content-pack-manager/import-content-pack.ts"),
    import("/card/index-unified.ts"),
    import("/card/utils/dhcb-importer.ts"),
  ]);

  const file = await makeFile(fixture);
  const aggregate = await importContentPackFiles([file], {
    importEquipmentFile: async () => {
      throw new Error("Equipment import is not part of card baseline generation");
    },
    importCardJson: importCustomCards,
    importDhcb: importDhcbCardPackage,
  });

  if (aggregate.aggregateStatus !== "success" || aggregate.results.some((result) => !result.success || result.kind !== "card")) {
    throw new Error(JSON.stringify(aggregate.results));
  }

  const snapshot = await buildSnapshot(fixture);
  window.__legacyBaselineResult = { ok: true, snapshot };
  document.querySelector("#status").textContent = "done";
}

run().catch(fail);
`

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
