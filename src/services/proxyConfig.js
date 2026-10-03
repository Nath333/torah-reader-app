/**
 * proxyConfig — URL facultative du serveur d'étude auto-hébergé (limud-proxy).
 *
 * Voir server/LISEZ-MOI.md. Sans proxy configuré, tous les services gardent
 * leur comportement actuel (Sefaria direct, CAL local, corsproxy) : le proxy
 * est un enrichissement, jamais une dépendance.
 */

const STORAGE_KEY = 'limud_proxy_url';

export const getProxyBase = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return '';
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
