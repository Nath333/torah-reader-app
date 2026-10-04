/**
 * English → French Translation Service
 * Sequential queue, rate limiting, caching, validation
 *
 * Registered with CacheOrchestrator for unified telemetry
 */

import { createCache } from '../../utils/cache';
import { registerCache, CACHE_CONFIGS } from '../cacheOrchestrator';
import { createLogger, IS_DEV as isDev } from '../../utils/debug';
import { getProxyBase } from '../proxyConfig';
import { checkAiProxy, aiProxyChat } from '../groqApi';

const log = createLogger('FrenchTranslation');

const CONFIG = {
  CACHE_TTL: 7 * 24 * 60 * 60 * 1000,
  CACHE_SIZE: 5000,
  MIN_INTERVAL: 250,  // 250ms - fast
  COOLDOWN: 20000,
  MAX_FAILS: 8,
  TIMEOUT: 5000,
  PERSIST_KEY: 'torah_fr_cache_v10',
  MAX_LEN: 400,
  MAX_CONCURRENT: 3   // Allow 3 parallel requests
};

// Lingva mirrors to try
const LINGVA_MIRRORS = [
  'https://lingva.ml',
  'https://lingva.lunar.icu',
  'https://translate.plausibility.cloud'
];

// State
const cache = createCache({ ttl: CONFIG.CACHE_TTL, maxSize: CONFIG.CACHE_SIZE });

// Register with orchestrator for unified telemetry
registerCache('frenchTranslation', cache, CACHE_CONFIGS.frenchTranslation);

const apiState = { last: 0, blocked: 0, fails: 0, currentMirror: 0 };
const stats = { hits: 0, calls: 0, ok: 0, fail: 0 };
const pending = new Map();
let activeCount = 0;
const waitQueue = [];

// Persistence
const load = () => {
  try {
    const d = JSON.parse(localStorage.getItem(CONFIG.PERSIST_KEY) || '{}');
    Object.entries(d).forEach(([k, v]) => v?.translation && cache.set(k, v));
    log.debug(`Loaded ${Object.keys(d).length} cached translations`);
  } catch (e) {
    log.warn('Cache load failed:', e);
  }
};

const save = () => {
  try {
    const d = {};
    cache.forEach?.((v, k) => v?.translation && (d[k] = v));
    if (Object.keys(d).length) {
      localStorage.setItem(CONFIG.PERSIST_KEY, JSON.stringify(d));
    }
  } catch (e) {
    log.warn('Cache save failed:', e.message);
  }
};

if (typeof window !== 'undefined') {
  load();
  const _saveInterval = setInterval(save, 120000);
  window.addEventListener('beforeunload', save);
  // (Migration Vite) L'ancien cleanup webpack `module.hot.dispose` référençait
  // `module`, inexistant en ESM navigateur → ReferenceError au boot = page
  // blanche. Vite recharge la page entière hors acceptation HMR : rien à
  // nettoyer ici.
}

// Helpers
const canUse = () => {
  const now = Date.now();
  if (now < apiState.blocked) return false;
  if (apiState.fails >= CONFIG.MAX_FAILS && now - apiState.last < CONFIG.COOLDOWN) {
    return false;
  }
  if (apiState.fails >= CONFIG.MAX_FAILS) {
    apiState.fails = 0;
    apiState.currentMirror = (apiState.currentMirror + 1) % LINGVA_MIRRORS.length;
  }
  return true;
};

const wait = () => {
  const w = CONFIG.MIN_INTERVAL - (Date.now() - apiState.last);
  return w > 0 ? new Promise(r => setTimeout(r, w)) : Promise.resolve();
};

// Validate: reject if translation is same as input
const isValid = (input, output) => {
  if (!output || output.length < 2) return false;
  const i = input.toLowerCase().trim();
  const o = output.toLowerCase().trim();
  if (i === o) return false;
  // Check for French markers
  if (/\b(le|la|les|de|du|des|et|est|un|une|que|qui|dans|pour|sur|avec|ce|cette|son|sa|ses|au|aux|ou|où|à|a)\b/i.test(output)) return true;
  // Accept if significantly different
  return Math.abs(i.length - o.length) > i.length * 0.1;
};

// Post-process religious terms
const fix = (t) => {
  if (!t) return t;
  return t.replace(/\bsamedi\b/gi, 'Chabbat')
    .replace(/\bsabbat\b/gi, 'Chabbat')
    .replace(/\bmishn?a\b/gi, 'Michna')
    .replace(/\bguemara\b/gi, 'Guemara')
    .replace(/\brabbi\b/gi, 'Rabbi')
    .replace(/\btorah\b/gi, 'Torah')
    .replace(/\btalmud\b/gi, 'Talmud')
    .replace(/\bkosher\b/gi, 'Casher')
    .replace(/\bpessah?\b/gi, 'Pessah');
};

// Main translation function with mirror rotation
const translate = async (text) => {
  const proxyBase = getProxyBase();

  // ── Relais Lingva par le serveur d'étude — rapide, sans CORS, tenté à
  // chaque appel (échoue vite si le miroir renvoie l'anglais à l'identique).
  if (proxyBase) {
    try {
      const r = await fetch(`${proxyBase}/lingva/api/v1/en/fr/${encodeURIComponent(text)}`, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT)
      });
      if (r.ok) {
        const d = await r.json();
        if (d.translation && isValid(text, d.translation)) {
          apiState.fails = 0;
          log.verbose('Translated via serveur (lingva):', text.slice(0, 30));
          return { translation: fix(d.translation.trim()), source: 'Lingva', accuracy: 'high' };
        }
      }
    } catch (e) {
      log.verbose('Relais serveur lingva failed:', e.message);
    }
  }

  // ── Miroirs Lingva en DIRECT — bridés par le rate-limit ET sautés dès que
  // les échecs s'accumulent (miroirs morts : chaque essai coûte jusqu'à
  // 30 s de timeouts → aller directement à l'IA). En dev, le proxy Vite
  // joue le rôle du serveur.
  if (isDev) {
    try {
      const r = await fetch(`/lingva-api/en/fr/${encodeURIComponent(text)}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(CONFIG.TIMEOUT)
      });
      if (r.status === 429) {
        apiState.blocked = Date.now() + CONFIG.COOLDOWN;
        apiState.fails++;
      } else if (r.ok) {
        const d = await r.json();
        if (d.translation && isValid(text, d.translation)) {
          apiState.fails = 0;
          return { translation: fix(d.translation.trim()), source: 'Lingva', accuracy: 'high' };
        }
      }
    } catch (e) {
      log.verbose('Proxy dev failed:', e.message);
    }
  } else if (canUse() && apiState.fails < 6) {
    await wait();
    apiState.last = Date.now();

    const fetchTranslation = async (url) => {
      const r = await fetch(url, { signal: AbortSignal.timeout(CONFIG.TIMEOUT) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    };

    for (let i = 0; i < LINGVA_MIRRORS.length; i++) {
      const idx = (apiState.currentMirror + i) % LINGVA_MIRRORS.length;
      const mirror = LINGVA_MIRRORS[idx];
      const apiUrl = `${mirror}/api/v1/en/fr/${encodeURIComponent(text)}`;

      for (const url of [apiUrl, `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`]) {
        try {
          const d = await fetchTranslation(url);
          if (d.translation && isValid(text, d.translation)) {
            apiState.fails = 0;
            apiState.currentMirror = idx;
            log.verbose(`Translated via ${mirror}${url === apiUrl ? '' : ' (proxy)'}:`, text.slice(0, 30));
            return { translation: fix(d.translation.trim()), source: 'Lingva', accuracy: 'high' };
          }
        } catch (e) {
          log.verbose(`Mirror ${mirror}${url === apiUrl ? '' : ' (proxy)'} failed:`, e.message);
        }
      }
    }
    apiState.fails++;
  }

  // ── IA du serveur d'étude (GLM via OpenRouter, clé server-side) — TOUJOURS
  // tentée : ce n'est pas un miroir public, le rate-limit Lingva ne
  // s'applique pas. Marquée accuracy 'medium'.
  if (proxyBase) {
    try {
      const available = await checkAiProxy();
      if (available.available) {
        const response = await aiProxyChat({
          messages: [
            { role: 'system', content: 'Tu es un traducteur. Traduis le texte anglais en français naturel. Réponds UNIQUEMENT par la traduction, sans guillemets, sans commentaire.' },
            { role: 'user', content: text }
          ],
          temperature: 0.2,
          max_tokens: Math.min(800, Math.ceil(text.length * 1.5) + 100)
        });
        if (response.ok) {
          const data = await response.json();
          const t = data.choices?.[0]?.message?.content?.trim();
          if (t && isValid(text, fix(t))) {
            apiState.fails = 0;
            log.verbose('Translated via IA:', text.slice(0, 30));
            return { translation: fix(t), source: 'IA', accuracy: 'medium' };
          }
        }
      }
    } catch (e) {
      log.verbose('Fallback IA failed:', e.message);
    }
  }

  apiState.fails++;
  return null;
};

// Process next item in wait queue
const processNext = () => {
  if (activeCount >= CONFIG.MAX_CONCURRENT || waitQueue.length === 0) return;

  const { text, key, resolve } = waitQueue.shift();
  activeCount++;

  (async () => {
    // Double-check cache
    const c = cache.get(key);
    if (c?.translation) {
      stats.hits++;
      activeCount--;
      processNext();
      return resolve(c);
    }

    stats.calls++;
    const result = await translate(text);

    if (result?.translation) {
      stats.ok++;
      cache.set(key, result);
      resolve(result);
    } else {
      stats.fail++;
      resolve(null);
    }

    activeCount--;
    processNext();
  })();
};

// Parallel queue with concurrency limit
const enqueue = (text) => {
  const key = text.toLowerCase().trim();

  // Cache hit
  const c = cache.get(key);
  if (c?.translation) {
    stats.hits++;
    return Promise.resolve(c);
  }

  // Already pending
  if (pending.has(key)) return pending.get(key);

  // Add to queue
  const p = new Promise(resolve => {
    waitQueue.push({ text, key, resolve });
    processNext();
  });

  pending.set(key, p);
  p.finally(() => pending.delete(key));
  return p;
};

// Public API
export const translateEnglishToFrench = async (text) => {
  if (!text?.trim()) return null;
  const t = text.trim();
  if (t.length > CONFIG.MAX_LEN) {
    const short = t.split(/[,;.]/)[0].trim();
    return short.length <= 200 ? translateEnglishToFrench(short) : null;
  }
  const r = await enqueue(t);
  return r?.translation || null;
};

export const quickTranslate = (text) => {
  if (!text) return null;
  return cache.get(text.toLowerCase().trim())?.translation || null;
};

export const translateWithSource = async (text) => {
  const base = { translation: null, source: 'none', accuracy: 'none', method: 'EN → FR' };
  if (!text?.trim()) return base;
  const r = await enqueue(text.trim());
  return r ? { ...r, method: 'EN → FR' } : base;
};

export const translateWithBoldPreservation = async (html) => {
  const base = { translation: '', rawHtml: '', source: 'none', accuracy: 'none', method: 'EN → FR' };
  if (!html) return base;
  const clean = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length < 3) return base;
  const r = await translateWithSource(clean);
  return r.translation ? { ...r, rawHtml: r.translation } : base;
};

export const clearCache = () => {
  cache.clear();
  try {
    localStorage.removeItem(CONFIG.PERSIST_KEY);
  } catch (e) {
    log.warn('Cache clear failed:', e.message);
  }
};

export const getStats = () => ({ ...stats });

export const getApiStatus = () => ({
  ...apiState,
  available: canUse(),
  currentMirror: LINGVA_MIRRORS[apiState.currentMirror]
});

export const resetApiState = () => {
  apiState.last = 0;
  apiState.blocked = 0;
  apiState.fails = 0;
  apiState.currentMirror = 0;
};

const englishToFrenchService = {
  translateEnglishToFrench,
  translateWithSource,
  translateWithBoldPreservation,
  quickTranslate,
  clearCache,
  getStats,
  getApiStatus,
  resetApiState
};

export default englishToFrenchService;
