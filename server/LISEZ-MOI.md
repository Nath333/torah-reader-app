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

## Déployer sur le homelab (Docker + TLS direct — FAIT le 04/10)

La stack embarque son propre frontal TLS (`limud-tls`, nginx:alpine) :
**pas besoin de NPM**. Le certificat est signé par le CA homelab
(`/home/nat/certs/homelab-ca.*`, racine installée sur le PC), SAN
`limud.homelab.local` + `IP:192.168.2.100` — donc joignable par IP même
sans entrée DNS.

```bash
# émettre le cert serveur (une fois, sur le homelab)
cd ~/certs && openssl req -new -newkey rsa:2048 -nodes   -keyout limud.key -out limud.csr -subj '/CN=limud.homelab.local/O=Homelab'
printf 'subjectAltName=DNS:limud.homelab.local,IP:192.168.2.100
extendedKeyUsage=serverAuth
' > limud.ext
openssl x509 -req -in limud.csr -CA homelab-ca.crt -CAkey homelab-ca.key   -CAcreateserial -out limud.crt -days 825 -sha256 -extfile limud.ext
cp limud.key limud.crt ~/stacks/limud-proxy/

# lancer la stack (proxy + TLS)
cd ~/stacks/limud-proxy && docker compose up -d --build
curl -s https://192.168.2.100:8443/health
```

⚠ `limud.key` ne part JAMAIS dans le dépôt (gitignoré).

## Brancher l'app (côté client)

```js
localStorage.setItem('limud_proxy_url', 'https://192.168.2.100:8443');
```

(ou Réglages → « Serveur d'étude »). Vérifié de bout en bout le 04/10 :
l'app GitHub Pages fetch le proxy en HTTPS, cache HIT visible côté serveur.
Sans proxy configuré, l'app garde son comportement direct — le proxy est
un enrichissement, jamais une dépendance.

### Ancienne voie NPM (remplacée, conservée pour mémoire)

Proxy Host NPM `limud.homelab.local` → `127.0.0.1:8791` : inutile depuis
le frontal TLS direct (et le mixed-content HTTPS→HTTP interdisait de
toute façon l'appel direct hors NPM).

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
