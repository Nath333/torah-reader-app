/**
 * proxyConfig — URL facultative du serveur d'étude auto-hébergé (limud-proxy).
 *
 * Voir server/LISEZ-MOI.md. Sans proxy configuré, tous les services gardent
 * leur comportement actuel (Sefaria direct, CAL local, corsproxy) : le proxy
 * est un enrichissement, jamais une dépendance.
 */

const STORAGE_KEY = 'limud_proxy_url';

// L'app servie par le nginx du homelab (192.168.2.100:8095) pré-branche le
// limud-proxy du même hôte (:8443, SAN du CA homelab — voir server/LISEZ-MOI.md)
// : relais Lingva sans CORS/AdGuard + IA à clé serveur, zéro réglage pour le
// visiteur du LAN. GitHub Pages et le dev local restent sans proxy par défaut
// (IP privée injoignable de l'extérieur) ; Réglages → Serveur d'étude
// surcharge toujours.
const HOMELAB_HOST = '192.168.2.100';
const HOMELAB_PROXY = 'https://192.168.2.100:8443';

const defaultProxyBase = () => {
  try {
    if (typeof location !== 'undefined' && location.hostname === HOMELAB_HOST) {
      return HOMELAB_PROXY;
    }
  } catch { /* hors navigateur */ }
  return '';
};

export const getProxyBase = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'off') return ''; // opt-out explicite (console : setProxyBase('off'))
    if (!raw) return defaultProxyBase();
    return raw.replace(/\/+$/, ''); // pas de slash final
  } catch {
    return '';
  }
};

export const setProxyBase = (url) => {
  try {
    const clean = (url || '').trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem(STORAGE_KEY, clean);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    return clean;
  } catch {
    return '';
  }
};

/** Construit `base + route` si un proxy est configuré, sinon `fallback`. */
export const viaProxy = (route, fallback) => {
  const base = getProxyBase();
  return base ? `${base}${route}` : fallback;
};
