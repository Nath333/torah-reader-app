FROM node:22-alpine

WORKDIR /app
COPY limud-proxy.js package.json ./

# Utilisateur non-root fourni par l'image
USER node

EXPOSE 8791
ENV PORT=8791

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8791/health >/dev/null 2>&1 || exit 1

CMD ["node", "limud-proxy.js"]
