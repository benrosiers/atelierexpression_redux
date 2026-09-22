import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const releasePath = resolve(root, 'src/data/tresh-release.json');
const runtimeDir = join(tmpdir(), 'atelierexpression-tresh-local-preview');
const recoveryPath = join(runtimeDir, 'original-release.json');
const temporaryReleasePath = `${releasePath}.local-preview.tmp`;
const bridgeHost = '127.0.0.1';
const bridgePort = 4322;
const siteOrigin = 'http://127.0.0.1:4321';
const maximumBodyBytes = 20 * 1024 * 1024;

let originalRelease = null;
let astroProcess = null;
let bridge = null;
let closing = false;

function isAllowedOrigin(origin) {
  if (!origin) return true;

  return (
    /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(origin) ||
    origin === 'https://benrosiers.github.io'
  );
}

function setCors(response, origin) {
  if (origin && isAllowedOrigin(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Cache-Control', 'no-store');
}

function sendJson(response, statusCode, body, origin) {
  setCors(response, origin);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function sendText(response, statusCode, body, origin) {
  setCors(response, origin);
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(`${body}\n`);
}

async function readJsonBody(request) {
  const chunks = [];
  let total = 0;

  for await (const chunk of request) {
    total += chunk.length;

    if (total > maximumBodyBytes) {
      throw new Error('Le brouillon dépasse la limite locale de 20 Mo.');
    }

    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw);
}

function validateDocument(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('Le document Tresh est invalide.');
  }

  if (!Array.isArray(document.pages) || document.pages.length === 0) {
    throw new Error('Le document Tresh ne contient aucune page.');
  }

  for (const page of document.pages) {
    if (
      !page ||
      typeof page !== 'object' ||
      typeof page.id !== 'string' ||
      typeof page.slug !== 'string' ||
      !Array.isArray(page.sections)
    ) {
      throw new Error('Une page Tresh est invalide.');
    }
  }
}

function buildLocalRelease(document) {
  const createdAt = new Date().toISOString();
  const title =
    typeof document.branding?.title === 'string'
      ? document.branding.title
      : 'Atelier Expression';
  const homePage =
    document.pages.find((page) => page.slug === 'home') ?? document.pages[0];

  return {
    releaseId: randomUUID(),
    status: 'local-preview',
    createdAt,
    site: {
      id: '00000000-0000-4000-8000-000000000000',
      slug: 'atelier-expression-local-preview',
      name: title,
      publicUrl: siteOrigin,
    },
    pages: [
      {
        id: homePage?.id ?? randomUUID(),
        slug: 'home',
        title,
        revisionId: randomUUID(),
        revisionNumber: 0,
        schemaVersion:
          typeof document.schemaVersion === 'number'
            ? document.schemaVersion
            : 1,
        document,
        createdAt,
      },
    ],
  };
}

async function writeRelease(payload) {
  await writeFile(
    temporaryReleasePath,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  );
  await rename(temporaryReleasePath, releasePath);
}

async function restoreOriginalRelease() {
  if (!originalRelease) return;

  await writeFile(releasePath, originalRelease);
  await rm(recoveryPath, { force: true });
  originalRelease = null;
}

async function recoverInterruptedSession() {
  try {
    const recovery = await readFile(recoveryPath);
    await writeFile(releasePath, recovery);
    await rm(recoveryPath, { force: true });
    console.log('Recovered tresh-release.json from an interrupted local preview.');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

async function closeAll(exitCode = 0) {
  if (closing) return;
  closing = true;

  console.log('\nStopping the local Tresh copy...');

  if (bridge) {
    await new Promise((resolveClose) => {
      bridge.close(() => resolveClose());
    }).catch(() => undefined);
  }

  if (astroProcess && astroProcess.exitCode === null) {
    astroProcess.kill('SIGTERM');
  }

  try {
    await restoreOriginalRelease();
    console.log('Original src/data/tresh-release.json restored.');
  } catch (error) {
    console.error('Could not restore tresh-release.json:', error);
    exitCode = 1;
  }

  await rm(temporaryReleasePath, { force: true }).catch(() => undefined);
  process.exit(exitCode);
}

await mkdir(runtimeDir, { recursive: true });
await recoverInterruptedSession();
originalRelease = await readFile(releasePath);
await writeFile(recoveryPath, originalRelease);

bridge = createServer(async (request, response) => {
  const origin = request.headers.origin;

  if (!isAllowedOrigin(origin)) {
    sendText(response, 403, 'Origine refusée.', origin);
    return;
  }

  if (request.method === 'OPTIONS') {
    setCors(response, origin);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true, siteOrigin }, origin);
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/preview') {
    sendText(response, 404, 'Route inconnue.', origin);
    return;
  }

  try {
    const body = await readJsonBody(request);
    const document = body?.document;
    const pageSlug =
      typeof body?.pageSlug === 'string' ? body.pageSlug : 'home';

    validateDocument(document);

    const pageExists = document.pages.some(
      (page) => page.slug === pageSlug,
    );

    const resolvedSlug = pageExists ? pageSlug : 'home';
    const route = resolvedSlug === 'home' ? '/' : `/${resolvedSlug}`;
    const release = buildLocalRelease(document);

    await writeRelease(release);

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 220));

    sendJson(
      response,
      200,
      {
        ok: true,
        url: `${siteOrigin}${route}?tresh-local=${Date.now()}`,
      },
      origin,
    );

    console.log(
      `Draft refreshed: ${document.pages.length} pages -> ${route}`,
    );
  } catch (error) {
    sendText(
      response,
      400,
      error instanceof Error ? error.message : 'Brouillon invalide.',
      origin,
    );
  }
});

bridge.on('error', async (error) => {
  console.error('Local preview bridge failed:', error);
  await closeAll(1);
});

bridge.listen(bridgePort, bridgeHost, () => {
  console.log('');
  console.log('======================================================');
  console.log('ATELIER EXPRESSION - COPIE LOCALE TRESH');
  console.log('======================================================');
  console.log(`Astro site:   ${siteOrigin}`);
  console.log(`Tresh bridge: http://${bridgeHost}:${bridgePort}`);
  console.log('Production:   NOT TOUCHED');
  console.log('');
  console.log('Keep this terminal open, then click Site complet in Tresh.');
  console.log('Press Ctrl+C to stop and restore the original release file.');
  console.log('');
});

const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npm';
const args = isWindows
  ? ['/d', '/s', '/c', 'npm run dev']
  : ['run', 'dev'];

astroProcess = spawn(command, args, {
  cwd: root,
  env: {
    ...process.env,
    TRESH_LOCAL_PREVIEW: '1',
  },
  stdio: 'inherit',
});

astroProcess.on('error', async (error) => {
  console.error('Could not start Astro:', error);
  await closeAll(1);
});

astroProcess.on('exit', async (code, signal) => {
  if (closing) return;

  console.log(
    `Astro stopped (${signal ?? `exit ${code ?? 0}`}).`,
  );
  await closeAll(code ?? 0);
});

process.on('SIGINT', () => {
  void closeAll(0);
});

process.on('SIGTERM', () => {
  void closeAll(0);
});

process.on('uncaughtException', (error) => {
  console.error(error);
  void closeAll(1);
});

process.on('unhandledRejection', (error) => {
  console.error(error);
  void closeAll(1);
});
