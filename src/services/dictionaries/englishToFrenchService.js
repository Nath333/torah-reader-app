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
  TIMEOUT: 5000,
  PERSIST_KEY: 'torah_fr_cache_v10',
  MAX_LEN: 400,
  MAX_CONCURRENT: 3   // Allow 3 parallel requests
};

// Lingva mirrors to try — santé suivie PAR MIROIR : lunar.icu et
// plausibility.cloud sont morts (erreur sur chaque appel, constaté 08/10),
// lingva.ml vit mais rate-limite les rafales. Sans disjoncteur, chaque
// verset payait 2 miroirs morts × (direct + proxy) ≈ 30 s avant d'échouer,
// et le compteur d'échecs partagé finissait par désactiver le miroir sain.
const LINGVA_MIRRORS = [
  'https://lingva.ml',
  'https://lingva.lunar.icu',
  'https://translate.plausibility.cloud'
];

const MIRROR_POLICY = { HARD_FAILS: 2, DEAD_MS: 2 * 60 * 1000, RATE_MS: 30 * 1000 };
const PROXY_POLICY = { HARD_FAILS: 2, DEAD_MS: 5 * 60 * 1000 }; // api.allorigins.win

// State
const cache = createCache({ ttl: CONFIG.CACHE_TTL, maxSize: CONFIG.CACHE_SIZE });

// Register with orchestrator for unified telemetry
registerCache('frenchTranslation', cache, CACHE_CONFIGS.frenchTranslation);

const apiState = { last: 0, blocked: 0, currentMirror: 0 };
const mirrorHealth = LINGVA_MIRRORS.map(() => ({ fails: 0, deadUntil: 0, lastOk: 0 }));
const proxyHealth = { fails: 0, deadUntil: 0 };
// Disponibilité IA mémoizée localement : sonder /ai/status à CHAQUE verset
// provoque une tempête de sondes (la sonde passe en timeout quand le proxy
// streame déjà un /ai/chat) et fait sauter l'étape IA. TTL 5 min, vidée par
// resetApiState (bouton Réessayer).
let aiAvailableMemo = null;
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
const canUse = () => Date.now() >= apiState.blocked;

// Disjoncteur d'un miroir : 429 = rate-limit bref ; échec dur répété =
// miroir présumé mort, évincé 2 min (il repartera à l'expiration pour
// détecter un éventuel retour).
const markMirrorOk = (idx) => {
  const h = mirrorHealth[idx];
  h.fails = 0;
  h.lastOk = Date.now();
  apiState.currentMirror = idx;
};

const markMirrorFail = (idx, rateLimited) => {
  const h = mirrorHealth[idx];
  const now = Date.now();
  if (rateLimited) {
    h.deadUntil = now + MIRROR_POLICY.RATE_MS;
    apiState.blocked = Math.max(apiState.blocked, now + CONFIG.COOLDOWN);
    return;
  }
  h.fails++;
  if (h.fails >= MIRROR_POLICY.HARD_FAILS) {
    h.deadUntil = now + MIRROR_POLICY.DEAD_MS;
    h.fails = 0;
  }
};

const markProxyOk = () => { proxyHealth.fails = 0; };
const markProxyFail = () => {
  proxyHealth.fails++;
  if (proxyHealth.fails >= PROXY_POLICY.HARD_FAILS) {
    proxyHealth.deadUntil = Date.now() + PROXY_POLICY.DEAD_MS;
    proxyHealth.fails = 0;
  }
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
          log.verbose('Translated via serveur (lingva):', text.slice(0, 30));
          return { translation: fix(d.translation.trim()), source: 'Lingva', accuracy: 'high' };
        }
      }
    } catch (e) {
      log.verbose('Relais serveur lingva failed:', e.message);
    }
  }

  // ── Miroirs Lingva en DIRECT — ordre : dernier miroir connu vivant
  // d'abord, miroirs évincés (disjoncteur) sautés. Pas de compteur global :
  // des échecs sur un miroir mort ne doivent pas empêcher d'essayer le
  // miroir sain. En dev, le proxy Vite joue le rôle du serveur.
  if (isDev) {
    try {
      const r = await fetch(`/lingva-api/en/fr/${encodeURIComponent(text)}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(CONFIG.TIMEOUT)
      });
      if (r.status === 429) {
        apiState.blocked = Date.now() + CONFIG.COOLDOWN;
      } else if (r.ok) {
        const d = await r.json();
        if (d.translation && isValid(text, d.translation)) {
          return { translation: fix(d.translation.trim()), source: 'Lingva', accuracy: 'high' };
        }
      }
    } catch (e) {
      log.verbose('Proxy dev failed:', e.message);
    }
  } else if (canUse()) {
    await wait();
    apiState.last = Date.now();

    const fetchTranslation = async (url) => {
      const r = await fetch(url, { signal: AbortSignal.timeout(CONFIG.TIMEOUT) });
      if (!r.ok) {
        const err = new Error(`HTTP ${r.status}`);
        err.status = r.status;
        throw err;
      }
      return r.json();
    };

    const now = Date.now();
    const order = [];
    for (let i = 0; i < LINGVA_MIRRORS.length; i++) {
      const idx = (apiState.currentMirror + i) % LINGVA_MIRRORS.length;
      if (mirrorHealth[idx].deadUntil > now) continue;
      order.push(idx);
    }
    // Tous évincés ? On tente quand même le miroir préféré : un miroir
    // guéri doit pouvoir revenir (son disjoncteur se ré-armera sinon).
    if (order.length === 0) order.push(apiState.currentMirror);

    for (const idx of order) {
      const mirror = LINGVA_MIRRORS[idx];
      const apiUrl = `${mirror}/api/v1/en/fr/${encodeURIComponent(text)}`;
      const attempts = [apiUrl];
      if (proxyHealth.deadUntil <= now) {
        attempts.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`);
      }

      let rateLimited = false;
      let directOk = null;   // null = non tenté, false = tenté et raté
      let proxyTried = false;
      for (const url of attempts) {
        const viaProxy = url !== apiUrl;
        try {
          const d = await fetchTranslation(url);
          if (viaProxy) proxyTried = true;
          else directOk = true;
          if (d.translation && isValid(text, d.translation)) {
            markMirrorOk(idx);
            if (viaProxy) markProxyOk();
            log.verbose(`Translated via ${mirror}${viaProxy ? ' (proxy)' : ''}:`, text.slice(0, 30));
            return { translation: fix(d.translation.trim()), source: 'Lingva', accuracy: 'high' };
          }
          // 200 mais anglais renvoyé à l'identique (écho) : pas une
          // traduction — on enchaîne sur l'URL suivante.
        } catch (e) {
          if (e.status === 429) rateLimited = true;
          if (viaProxy) { proxyTried = true; markProxyFail(); }
          else directOk = false;
          log.verbose(`Mirror ${mirror}${viaProxy ? ' (proxy)' : ''} failed:`, e.message);
        }
        if (rateLimited) break; // inutile de marteler les autres URLs
      }
      // Échec du miroir compté seulement si le direct lui-même a été tenté
      // et n'a pas abouti ; un échec du seul proxy n'incrimine pas le miroir.
      if (directOk === false || (directOk === null && !proxyTried)) markMirrorFail(idx, rateLimited);
      if (rateLimited) break; // backoff global : stopper la tournée
    }
  }

  // ── IA du serveur d'étude (GLM via OpenRouter, clé server-side) — TOUJOURS
  // tentée : ce n'est pas un miroir public, le rate-limit Lingva ne
  // s'applique pas. Marquée accuracy 'medium'.
  if (proxyBase) {
    try {
      const now = Date.now();
      if (!aiAvailableMemo || now - aiAvailableMemo.at > 5 * 60 * 1000) {
        const available = await checkAiProxy();
        aiAvailableMemo = { at: now, available: available.available };
      }
      if (aiAvailableMemo.available) {
        const response = await aiProxyChat({
          messages: [
            { role: 'system', content: 'Tu es un traducteur. Traduis le texte anglais en français naturel. Réponds UNIQUEMENT par la traduction, sans guillemets, sans commentaire. /no_think' },
            { role: 'user', content: text }
          ],
          temperature: 0.2,
          // Plancher 4096 : GLM-5.3-flash est un modèle à RAISONNEMENT —
          // sur certains textes il part dans des raisonnements de plusieurs
          // milliers de tokens et content revient null (piège documenté
          // depuis la bascule OpenRouter). /no_think ci-dessus est la
          // première défense (interrupteur doux GLM, no-op ailleurs).
          max_tokens: Math.max(4096, Math.ceil(text.length * 1.5) + 100)
        });
        if (response.ok) {
          const data = await response.json();
          const t = data.choices?.[0]?.message?.content?.trim();
          if (t && isValid(text, fix(t))) {
            log.verbose('Translated via IA:', text.slice(0, 30));
            return { translation: fix(t), source: 'IA', accuracy: 'medium' };
          }
        }
      }
    } catch (e) {
      log.verbose('Fallback IA failed:', e.message);
    }
  }

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

export const getApiStatus = () => {
  const now = Date.now();
  return {
    ...apiState,
    available: canUse() && mirrorHealth.some(h => h.deadUntil <= now),
    currentMirror: LINGVA_MIRRORS[apiState.currentMirror],
    mirrors: LINGVA_MIRRORS.map((m, i) => ({
      base: m,
      alive: mirrorHealth[i].deadUntil <= now,
      lastOk: mirrorHealth[i].lastOk
    })),
    proxyAlive: proxyHealth.deadUntil <= now
  };
};

export const resetApiState = () => {
  apiState.last = 0;
  apiState.blocked = 0;
  apiState.currentMirror = 0;
  mirrorHealth.forEach(h => { h.fails = 0; h.deadUntil = 0; });
  proxyHealth.fails = 0;
  proxyHealth.deadUntil = 0;
  aiAvailableMemo = null; // le Réessayer re-sonde le serveur d'étude
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
