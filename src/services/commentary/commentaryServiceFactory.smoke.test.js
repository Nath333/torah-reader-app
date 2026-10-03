/**
 * Smoke tests pour la façade commentaryServiceFactory (post-split 03/10/2026).
 *
 * Le split a déplacé le cœur et les familles dans factory/ : ces tests
 * vérifient à l'exécution que la façade expose toujours les noms historiques
 * et que les fonctions pures (disponibilité, métadonnées) restent justes —
 * sans aucun appel réseau.
 */

import commentaryServiceFactory, {
  COMMENTARY_CONFIGS,
  getRashiAvailability,
  isRambanAvailable,
  isTosafotAvailable,
  isMaharshaAvailable,
  isIbnEzraAvailable,
  isSfornoAvailable,
  getBooksWithRamban,
  getTractatesWithTosafot,
  getAvailableCommentators,
  getCommentatorsByTradition,
  checkCommentaryAvailability,
  rashiService,
  rambanService,
  tosafotService,
  maharshaService,
  ibnEzraService,
  sfornoService
} from './commentaryServiceFactory';

describe('commentaryServiceFactory (façade post-split)', () => {
  test('disponibilité par famille : Torah vs Talmud', () => {
    expect(getRashiAvailability('Genesis')).toBe('torah');
    expect(getRashiAvailability('Berakhot')).toBe('talmud');
    expect(getRashiAvailability('Psalms')).toBe('tanach');
    expect(getRashiAvailability('NotABook')).toBeNull();

    expect(isRambanAvailable('Genesis')).toBe(true);
    expect(isRambanAvailable('Berakhot')).toBe(false);
    expect(isTosafotAvailable('Berakhot')).toBe(true);
    expect(isTosafotAvailable('Genesis')).toBe(false);
    expect(isMaharshaAvailable('Shabbat')).toBe(true);
  });

  test('sépharades : Ibn Ezra couvre Torah+Neviim+Ketuvim, Sforno Torah seul', () => {
    expect(isIbnEzraAvailable('Genesis')).toBe(true);
    expect(isIbnEzraAvailable('Jeremiah')).toBe(true);
    expect(isSfornoAvailable('Genesis')).toBe(true);
    expect(isSfornoAvailable('Jeremiah')).toBe(false);
  });

  test('métadonnées : configs, commentateurs disponibles par livre, traditions', () => {
    expect(Object.keys(COMMENTARY_CONFIGS)).toContain('rashi');
    expect(Object.keys(COMMENTARY_CONFIGS)).toContain('ibnEzra');

    const torahCommentators = getAvailableCommentators('Genesis');
    const ids = torahCommentators.map((c) => c.id);
    expect(ids).toContain('rashi');
    expect(ids).toContain('ramban');
    expect(ids).not.toContain('tosafot');

    const sephardi = getCommentatorsByTradition('sephardi');
    expect(sephardi.length).toBeGreaterThanOrEqual(5);

    expect(checkCommentaryAvailability('rashi', 'Genesis')).toBe(true);
    expect(checkCommentaryAvailability('tosafot', 'Genesis')).toBe(false);
    expect(checkCommentaryAvailability('type_inconnu', 'Genesis')).toBe(false);
  });

  test('listes de livres/tractats cohérentes avec la disponibilité', () => {
    expect(getBooksWithRamban()).toContain('Genesis');
    expect(getTractatesWithTosafot()).toContain('Berakhot');
  });

  test('objets de service exposent leurs fonctions', () => {
    for (const svc of [rashiService, rambanService, tosafotService, maharshaService, ibnEzraService, sfornoService]) {
      expect(Object.keys(svc).length).toBeGreaterThan(2);
    }
    expect(commentaryServiceFactory.getCommentary).toBeTypeOf('function');
    expect(commentaryServiceFactory.rashiService).toBe(rashiService);
  });
});
