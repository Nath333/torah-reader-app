/**
 * English → French Translation Service
 * Sequential queue, rate limiting, caching, validation
 */

import { createCache } from '../utils/cache';
import { createLogger } from '../utils/debug';

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
const apiState = { last: 0, blocked: 0, fails: 0, currentMirror: 0 };
const stats = { hits: 0, calls: 0, ok: 0, fail: 0 };
const pending = new Map();
let activeCount = 0;
const waitQueue = [];
const isDev = process.env.NODE_ENV === 'development';

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
  } catch {}
};

if (typeof window !== 'undefined') {
  load();
  setInterval(save, 120000);
  window.addEventListener('beforeunload', save);
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
  if (!canUse()) {
    log.verbose('API blocked, waiting...');
    return null;
  }

  await wait();
  apiState.last = Date.now();

  // In dev mode, use proxy
  if (isDev) {
    const url = `/lingva-api/en/fr/${encodeURIComponent(text)}`;
    try {
      const r = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(CONFIG.TIMEOUT)
      });

      if (r.status === 429) {
        apiState.blocked = Date.now() + CONFIG.COOLDOWN;
        apiState.fails++;
        return null;
      }

      if (r.ok) {
        const d = await r.json();
        if (d.translation && isValid(text, d.translation)) {
          apiState.fails = 0;
          log.verbose('Translated via proxy:', text.slice(0, 30));
          return { translation: fix(d.translation.trim()), source: 'Lingva', accuracy: 'high' };
        }
      }
    } catch (e) {
      log.verbose('Proxy failed:', e.message);
      apiState.fails++;
    }
    return null;
  }

  // Production: try mirrors with CORS proxy
  for (let i = 0; i < LINGVA_MIRRORS.length; i++) {
    const idx = (apiState.currentMirror + i) % LINGVA_MIRRORS.length;
    const mirror = LINGVA_MIRRORS[idx];

    // Use allorigins as CORS proxy
    const apiUrl = `${mirror}/api/v1/en/fr/${encodeURIComponent(text)}`;
    const corsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;

    try {
      const r = await fetch(corsUrl, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT)
      });

      if (r.ok) {
        const d = await r.json();
        if (d.translation && isValid(text, d.translation)) {
          apiState.fails = 0;
          apiState.currentMirror = idx;
          log.verbose(`Translated via ${mirror}:`, text.slice(0, 30));
          return { translation: fix(d.translation.trim()), source: 'Lingva', accuracy: 'high' };
        }
      }
    } catch (e) {
      log.verbose(`Mirror ${mirror} failed:`, e.message);
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
  try { localStorage.removeItem(CONFIG.PERSIST_KEY); } catch {}
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
