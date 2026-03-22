const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Helper to create proxy with CORS headers
  const createProxy = (target, pathRewrite) => createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    onProxyRes: function(proxyRes) {
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type';
    },
    logLevel: 'warn'
  });

  // Proxy Sefaria API - handle both with and without PUBLIC_URL prefix
  const sefariaProxy = createProxy('https://www.sefaria.org', {
    '^/torah-reader-app/sefaria-api': '/api',
    '^/sefaria-api': '/api'
  });
  app.use('/torah-reader-app/sefaria-api', sefariaProxy);
  app.use('/sefaria-api', sefariaProxy);

  // Proxy Google Translate - handle both with and without PUBLIC_URL prefix
  const gtranslateProxy = createProxy('https://translate.googleapis.com', {
    '^/torah-reader-app/gtranslate-api': '/translate_a',
    '^/gtranslate-api': '/translate_a'
  });
  app.use('/torah-reader-app/gtranslate-api', gtranslateProxy);
  app.use('/gtranslate-api', gtranslateProxy);

  // Proxy Lingva translation API - handle both with and without PUBLIC_URL prefix
  const lingvaProxy = createProxy('https://lingva.ml', {
    '^/torah-reader-app/lingva-api': '/api/v1',
    '^/lingva-api': '/api/v1'
  });
  app.use('/torah-reader-app/lingva-api', lingvaProxy);
  app.use('/lingva-api', lingvaProxy);

  // Proxy MyMemory translation API - handle both with and without PUBLIC_URL prefix
  const mymemoryProxy = createProxy('https://api.mymemory.translated.net', {
    '^/torah-reader-app/mymemory-api': '',
    '^/mymemory-api': ''
  });
  app.use('/torah-reader-app/mymemory-api', mymemoryProxy);
  app.use('/mymemory-api', mymemoryProxy);

  // Proxy CAL (Comprehensive Aramaic Lexicon) API
  const calProxy = createProxy('https://cal.huc.edu', {
    '^/torah-reader-app/cal-api': '',
    '^/cal-api': ''
  });
  app.use('/torah-reader-app/cal-api', calProxy);
  app.use('/cal-api', calProxy);

  // Proxy Ollama local API (when running)
  app.use(
    '/ollama-api',
    createProxyMiddleware({
      target: 'http://localhost:11434',
      changeOrigin: true,
      pathRewrite: { '^/ollama-api': '/api' },
      onError: function(err, req, res) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ollama not available' }));
      }
    })
  );

  // Proxy Halakhah.com for Soncino Talmud
  const halakhahProxy = createProxy('https://halakhah.com', {
    '^/torah-reader-app/halakhah-api': '',
    '^/halakhah-api': ''
  });
  app.use('/torah-reader-app/halakhah-api', halakhahProxy);
  app.use('/halakhah-api', halakhahProxy);
};
