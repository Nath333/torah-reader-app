/**
 * Les onglets du Scholar Mode sont chargés à la demande (React.lazy dans
 * ScholarModePanel). Ce test garantit que chaque module d'onglet résout
 * vers un composant React valide (default export fonction, forwardRef ou
 * memo) — la classe de régression classique du lazy-loading.
 * NB : la résolution au build est en plus garantie par `vite build` en CI.
 */
const lazyModules = import.meta.glob([
  '../AIAnalysisTab/index.js',
  '../WordsTab/index.js',
  '../CommentaryTab.js',
  '../NotebookTab.js',
  '../TalmudToolsTab.js',
  '../TzuratHaDafTab/index.js',
  '../ChavrutaTab.js',
]);

describe('onglets Scholar Mode chargés à la demande', () => {
  test('les 7 onglets sont couverts par le glob', () => {
    expect(Object.keys(lazyModules)).toHaveLength(7);
  });

  test.each(Object.entries(lazyModules))('%s résout vers un composant par défaut', async (path, load) => {
    const mod = await load();
    expect(mod.default).toBeTruthy();
    const c = mod.default;
    expect(['function', 'object']).toContain(typeof c);
    if (typeof c === 'object') {
      // memo / forwardRef : l'objet expose render ou type
      expect(c.render || c.type).toBeTruthy();
    }
  });

  test("le barrel n'expose plus les onglets (ils doivent rester lazy)", async () => {
    const barrel = await import('../index');
    const exported = Object.keys(barrel);
    expect(exported).toEqual(expect.arrayContaining(['LoadingState', 'TabButton']));
    for (const name of ['AIAnalysisTab', 'WordsTab', 'CommentaryTab', 'NotebookTab', 'TalmudToolsTab', 'TzuratHaDafTab', 'ChavrutaTab']) {
      expect(exported).not.toContain(name);
    }
  });
});
