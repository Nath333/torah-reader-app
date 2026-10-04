// =============================================================================
// limud-proxy — serveur d'étude de Limud (zéro dépendance, Node >= 20)
// =============================================================================
// Rôle :
//   1. Supprimer la dépendance aux proxys CORS tiers (corsproxy.io,
//      allorigins) pour CAL et halakhah.com (pas d'en-têtes CORS chez eux).
//   2. Mettre en cache les réponses Sefaria pour souffrir moins des
//      rate-limits et accélérer la lecture.
//   3. Fournir une base unique, auto-hébergée, pour les appels amont.
//   4. Porter la clé IA (OpenRouter) côté serveur : le navigateur appelle
//      POST /ai/chat sans clé, le proxy ajoute l'Authorization. L'utilisateur
//      n'a plus jamais de clé à saisir ni à stocker dans son navigateur.
//
// Routes (le reste du chemin est transmis verbatim, query incluse) :
//   /sefaria/…   -> https://www.sefaria.org/…      (cache 5 min)
//   /cal/…       -> https://cal.huc.edu/…          (cache 1 h)
//   /halakhah/…  -> https://halakhah.com/…         (cache 24 h)
//   /lingva/…    -> https://lingva.ml/…            (sans cache)
//   POST /ai/chat -> https://openrouter.ai/api/v1/chat/completions (sans cache,
//                    Authorization injectée depuis OPENROUTER_API_KEY)
//   GET  /ai/status -> { aiAvailable } — le front masque l'écran de clé
//   /health      -> état du service
//
// Config par env : PORT, ALLOW_ORIGIN ('*' par défaut), UPSTREAM_TIMEOUT_MS,
// CACHE_MAX_ENTRIES, OPENROUTER_API_KEY, AI_MODEL.
// =============================================================================

import http from 'node:http';

const PORT = Number(process.env.PORT || 8791);
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 12000);
const CACHE_MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES || 800);
const MAX_CACHEABLE_BODY = 2 * 1024 * 1024; // 2 Mo : au-delà (PDF), on streame sans cacher
// Clé IA côté serveur : JAMAIS renvoyée au client, seule /ai/status l'annonce
// (booléen). 30 000 tokens de sortie max — garde-fou de coût.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'z-ai/glm-5.3-flash';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 90000);
const AI_MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 4096);

const ROUTES = [
  { prefix: '/sefaria/', upstream: 'https://www.sefaria.org', ttlMs: 5 * 60_000 },
  { prefix: '/cal/', upstream: 'https://cal.huc.edu', ttlMs: 60 * 60_000 },
  { prefix: '/halakhah/', upstream: 'https://halakhah.com', ttlMs: 24 * 60 * 60_000 },
  { prefix: '/lingva/', upstream: 'https://lingva.ml', ttlMs: 0 }
];

// Cache LRU simple : Map insertion-ordered, on rafraîchit à chaque HIT.
const cache = new Map(); // clé: méthode+URL complète -> { status, contentType, body(Buffer), expiresAt }

const cacheGet = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry); // rafraîchit la position LRU
  return entry;
};

const cacheSet = (key, entry) => {
  cache.set(key, entry);
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Accept-Language',
  'Access-Control-Max-Age': '86400'
};

const sendJson = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...corsHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
};

// =============================================================================
// IA — POST /ai/chat : corps = payload OpenRouter (model optionnel, messages
// requis). Le serveur injecte model par défaut + Authorization. La clé ne
// sort JAMAIS du serveur. Réponse OpenRouter relayée telle quelle (le front
// a déjà son parsing).
// =============================================================================
const readRequestBody = (req, maxBytes = 512 * 1024) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('corps trop volumineux'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

let aiCalls = 0;
let aiErrors = 0;

const handleAiChat = async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return sendJson(res, 503, {
      error: 'IA non configurée — OPENROUTER_API_KEY absente du serveur'
    });
  }

  let body;
  try {
    body = JSON.parse((await readRequestBody(req)).toString('utf8') || '{}');
  } catch {
    return sendJson(res, 400, { error: 'JSON invalide' });
  }

  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return sendJson(res, 400, { error: 'messages requis' });
  }

  // requestUpstream fait req.end() immédiat (GET only) : pour POST avec
  // corps, requête dédiée node:https.
  const payload = JSON.stringify({
    model: typeof body.model === 'string' && body.model ? body.model : AI_MODEL,
    messages,
    max_tokens: Number(body.max_tokens) > 0 ? Number(body.max_tokens) : AI_MAX_TOKENS,
    ...(typeof body.temperature === 'number' ? { temperature: body.temperature } : {}),
    ...(body.response_format ? { response_format: body.response_format } : {}),
    ...(body.stream ? { stream: true } : {})
  });

  aiCalls += 1;
  await new Promise((resolve) => {
    const target = new NodeURL('https://openrouter.ai/api/v1/chat/completions');
    const reqAi = https.request(
      {
        hostname: target.hostname,
        port: 443,
        path: target.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'HTTP-Referer': ALLOW_ORIGIN === '*' ? 'http://localhost' : ALLOW_ORIGIN,
          'X-Title': 'Limud Torah Reader'
        },
        timeout: AI_TIMEOUT_MS
      },
      (upstream) => {
        if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
          aiErrors += 1;
          readBody(upstream, 64 * 1024)
            .catch(() => '{}')
            .then((text) => {
              res.writeHead(upstream.statusCode, {
                ...corsHeaders,
                'Content-Type': 'application/json; charset=utf-8'
              });
              resolve(res.end(text));
            });
          return;
        }
        res.writeHead(200, {
          ...corsHeaders,
          'Content-Type': upstream.headers['content-type'] || 'application/json; charset=utf-8'
        });
        upstream.pipe(res);
        upstream.on('end', resolve);
      }
    );
    reqAi.on('timeout', () => reqAi.destroy(new Error('timeout amont IA')));
    reqAi.on('error', (err) => {
      aiErrors += 1;
      const status = /timeout/i.test(String(err?.message)) ? 504 : 502;
      resolve(sendJson(res, status, {
        error: 'Amont IA indisponible',
        detail: String(err?.message || err)
      }));
    });
    reqAi.end(payload);
  });
};

const startedAt = Date.now();
let hits = 0;
let misses = 0;
let errors = 0;

// =============================================================================
// Amont via node:https natif.
// ⚠ fetch()/undici est REJETÉ par le WAF de cal.huc.edu (404 quel que soit
// l'User-Agent) alors que node:https passe — empreinte réseau différente.
// Le User-Agent « curl/8.9.1 » est la seule signature acceptée par CAL à ce
// jour (testé : Chrome, node, undici -> 404) ; documenté dans LISEZ-MOI.md.
// =============================================================================
import https from 'node:https';
import { URL as NodeURL } from 'node:url';

const requestUpstream = (urlStr, { method = 'GET', headers = {}, timeoutMs = UPSTREAM_TIMEOUT_MS, redirects = 3 }) =>
  new Promise((resolve, reject) => {
    const target = new NodeURL(urlStr);
    const req = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        method,
        headers,
        timeout: timeoutMs
      },
      (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
          res.resume(); // vide le flux
          const next = new NodeURL(res.headers.location, urlStr).toString();
          return resolve(requestUpstream(next, { method, headers, timeoutMs, redirects: redirects - 1 }));
        }
        resolve(res);
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout amont')));
    req.on('error', reject);
    req.end();
  });

const readBody = (res, maxBytes) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    res.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('corps trop volumineux'));
        res.destroy();
        return;
      }
      chunks.push(chunk);
    });
    res.on('end', () => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  });

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    return sendJson(res, 200, {
      ok: true,
      uptimeMs: Date.now() - startedAt,
      cacheEntries: cache.size,
      hits,
      misses,
      errors,
      aiCalls,
      aiErrors,
      aiAvailable: Boolean(OPENROUTER_API_KEY)
    });
  }

  // IA — l'état (booléen, jamais la clé) puis le chat relayé.
  if (url.pathname === '/ai/status') {
    return sendJson(res, 200, { aiAvailable: Boolean(OPENROUTER_API_KEY), model: AI_MODEL });
  }
  if (url.pathname === '/ai/chat' && req.method === 'POST') {
    return await handleAiChat(req, res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'GET/HEAD uniquement' });
  }

  const route = ROUTES.find((r) => url.pathname.startsWith(r.prefix));
  if (!route) {
    return sendJson(res, 404, {
      error: 'Route inconnue',
      routes: ROUTES.map((r) => r.prefix).concat('/health')
    });
  }

  // Le préfixe de route est strippé : /sefaria/api/texts/… -> /api/texts/…
  // ⚠ On manipule req.url BRUT (déjà percent-encodé par le client) : passer
  // par new.URL().search ré-encoderait la query et casserait les lemmes
  // hébreux chez CAL (« File not found »).
  const rawUrl = req.url;
  const qIndex = rawUrl.indexOf('?');
  const rawPath = qIndex === -1 ? rawUrl : rawUrl.slice(0, qIndex);
  const rawQuery = qIndex === -1 ? '' : rawUrl.slice(qIndex);
  const suffix = rawPath.slice(route.prefix.length - 1) + rawQuery;
  const upstreamUrl = route.upstream + suffix;
  const cacheKey = `${req.method} ${upstreamUrl}`;

  // 1. Cache
  const hit = route.ttlMs > 0 ? cacheGet(cacheKey) : null;
  if (hit) {
    hits += 1;
    res.writeHead(hit.status, {
      ...corsHeaders,
      'Content-Type': hit.contentType,
      'Content-Length': hit.body.length,
      'X-Cache': 'HIT',
      'Cache-Control': 'public, max-age=60'
    });
    return res.end(req.method === 'HEAD' ? undefined : hit.body);
  }

  // 2. Amont
  try {
    const userAgent = route.prefix === '/cal/'
      ? 'curl/8.9.1' // seule signature acceptée par le WAF de CAL (voir en-tête de fichier)
      : (req.headers['user-agent'] || 'limud-proxy/1.0');

    const upstream = await requestUpstream(upstreamUrl, {
      method: req.method,
      headers: {
        Accept: req.headers.accept || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'en',
        'User-Agent': userAgent
      }
    });

    const contentType = upstream.headers['content-type'] || 'application/octet-stream';
    const contentLength = upstream.headers['content-length'];
    const cacheable =
      upstream.statusCode >= 200 && upstream.statusCode < 300 && route.ttlMs > 0
        ? contentLength !== undefined
          ? Number(contentLength) <= MAX_CACHEABLE_BODY
          : /json|text|html/i.test(contentType)
        : false;

    const commonHeaders = {
      ...corsHeaders,
      'Content-Type': contentType,
      'X-Cache': 'MISS',
      'X-Upstream-Status': String(upstream.statusCode)
    };

    if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
      errors += 1;
      misses += 1;
      const text = await readBody(upstream, 64 * 1024).catch(() => '');
      res.writeHead(upstream.statusCode, commonHeaders);
      return res.end(text);
    }

    if (cacheable) {
      misses += 1;
      const body = await readBody(upstream, MAX_CACHEABLE_BODY);
      cacheSet(cacheKey, {
        status: upstream.statusCode,
        contentType,
        body,
        expiresAt: Date.now() + route.ttlMs
      });
      res.writeHead(upstream.statusCode, { ...commonHeaders, 'Content-Length': body.length });
      return res.end(req.method === 'HEAD' ? undefined : body);
    }

    // Gros corps (PDF halakhah) : stream sans cache
    misses += 1;
    res.writeHead(upstream.statusCode, commonHeaders);
    if (req.method === 'HEAD') {
      upstream.resume();
      return res.end();
    }
    return upstream.pipe(res);
  } catch (err) {
    errors += 1;
    const status = /timeout/i.test(String(err?.message)) ? 504 : 502;
    return sendJson(res, status, { error: 'Amont indisponible', detail: String(err?.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`[limud-proxy] écoute sur :${PORT} — routes : ${ROUTES.map((r) => r.prefix).join(' ')}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log('[limud-proxy] arrêt propre');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
