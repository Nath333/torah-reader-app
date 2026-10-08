/**
 * aiProxy — accès IA SANS clé via le serveur d'étude (limud-proxy).
 *
 * Quand le serveur porte OPENROUTER_API_KEY, le navigateur n'a plus jamais
 * besoin de clé : POST {proxy}/ai/chat est relayé avec l'Authorization
 * injectée server-side. Détection par GET /ai/status (booléen, jamais la
 * clé), mémoizée pour la session — re-détection via resetAiProxyCache().
 *
 * Sans proxy configuré (Réglages → API, clé limud_proxy_url) ou serveur
 * sans clé : available=false et tout le comportement historique (clé
 * locale) s'applique. Le proxy est un enrichissement, jamais une
 * dépendance — même doctrine que proxyConfig.js.
 */
import { getProxyBase } from './proxyConfig';

let cachedPromise = null;

/** GET {proxy}/ai/status — mémoizé. Résout { available, model }. */
export const checkAiProxy = () => {
  if (cachedPromise) return cachedPromise;
  const base = getProxyBase();
  if (!base) {
    cachedPromise = Promise.resolve({ available: false, model: null });
    return cachedPromise;
  }
  // Timeout obligatoire + oubli de la promesse en cas d'échec : un fetch
  // qui pend ne doit ni verrouiller les appelants (la file de traduction
  // s'est retrouvée gelée : 3 slots bloqués sur un /ai/status jamais
  // réglé) ni mémoizer l'échec pour toute la session. 8 s : la sonde peut
  // attendre derrière un /ai/chat en cours de streaming côté proxy.
  cachedPromise = fetch(`${base}/ai/status`, { signal: AbortSignal.timeout(8000) })
    .then((r) => (r.ok ? r.json() : { available: false, model: null }))
    .then((data) => ({
      available: !!data.aiAvailable,
      model: data.model || null
    }))
    .catch(() => {
      cachedPromise = null; // retentera à l'appel suivant
      return { available: false, model: null };
    });
  return cachedPromise;
};

/** Force une nouvelle détection (après changement de limud_proxy_url). */
export const resetAiProxyCache = () => {
  cachedPromise = null;
};

/**
 * POST {proxy}/ai/chat — payload OpenRouter verbatim. Résout la Response
 * (le caller gère ok/ko et le parsing, comme pour l'appel direct).
 * Sans signal passé, un timeout de secours (60 s) évite de retenir un slot
 * de la file de traduction indéfiniment sur un upstream qui ne répond pas.
 */
export const aiProxyChat = async (payload, signal) => {
  const base = getProxyBase();
  if (!base) throw new Error('Serveur d\'étude non configuré');
  return fetch(`${base}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: signal || AbortSignal.timeout(60000)
  });
};
