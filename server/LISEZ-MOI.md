# limud-proxy — serveur d'étude de Limud

Proxy CORS + cache pour les appels amont de l'app, en remplacement des
proxys tiers (corsproxy.io, allorigins). Zéro dépendance npm, un seul
fichier, ~100 lignes utiles.

## Ce que ça règle

| Route        | Amont                 | Cache | Pourquoi                                     |
|--------------|-----------------------|-------|----------------------------------------------|
| `/sefaria/…` | www.sefaria.org       | 5 min | Rate-limits Sefaria + latence de lecture      |
| `/cal/…`     | cal.huc.edu           | 1 h   | CAL n'envoie aucun en-tête CORS (échec prod)  |
| `/halakhah/…`| halakhah.com          | 24 h  | Remplace corsproxy.io (tiers non contractualisé) |
| `/lingva/…`  | lingva.ml             | —     | Passage direct possible déjà ; uniformisé     |
| `/health`    | —                     | —     | État : hits/misses/erreurs, taille du cache   |

## Lancer en local

```bash
node limud-proxy.js
# puis : curl -s localhost:8791/sefaria/api/texts/Genesis.1 | head -c 300
```

## Déployer sur le homelab (Docker + NPM)

```bash
cd server/
docker compose up -d --build
curl -s http://127.0.0.1:8791/health
```

Dans **Nginx Proxy Manager** : nouveau Proxy Host
- Domaine : `limud.homelab.local`
- Forward : `http` → `127.0.0.1:8791` (ou IP docker du conteneur)
- SSL : selon l'usage (le certificat homelab Root existe déjà)
- Réservation DHCP/DNS : entrée `limud` vers l'IP du homelab

## Brancher l'app (côté client)

L'app lit l'URL du proxy dans `localStorage` :

```js
localStorage.setItem('limud_proxy_url', 'https://limud.homelab.local');
```

(tables aussi réglable via le panneau AI Settings → « Serveur d'étude »).
Sans proxy configuré, l'app garde son comportement actuel (Sefaria direct,
CAL local, corsproxy pour halakhah) — le proxy est un enrichissement,
jamais une dépendance.

## Limites connues

- Cache en mémoire : redémarrage = froid (volontaire, simple).
- Si le homelab est injoignable hors domicile, l'app retombe sur les
  sources directes (le repli est systématique côté client).
- `ALLOW_ORIGIN=*` : le proxy n'expose que des ressources publiques en
  lecture ; resserrer vers l'origine GitHub Pages si on veut fermer.
