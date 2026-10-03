/**
 * Tests de utils/persistedStore — le helper qui remplace le couple
 * initializeX/persistX copié-collé dans les services d'apprentissage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createPersistedStore } from './persistedStore';

describe('createPersistedStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('charge les données par défaut quand rien n\'est stocké', () => {
    const defaut = { score: 0 };
    const store = createPersistedStore('test:store', defaut);
    expect(store.load()).toEqual(defaut);
  });

  it('sauvegarde puis recharge les données (round-trip)', () => {
    const store = createPersistedStore('test:store', { score: 0 });
    store.save({ score: 42 });
    // nouvelle instance = nouveau « démarrage de session »
    const store2 = createPersistedStore('test:store', { score: 0 });
    expect(store2.load()).toEqual({ score: 42 });
  });

  it('save() sans argument re-persiste l\'état courant', () => {
    const store = createPersistedStore('test:store', { n: 1 });
    store.save({ n: 2 });
    store.save(); // re-sauvegarde de l'état courant
    const store2 = createPersistedStore('test:store', { n: 1 });
    expect(store2.load()).toEqual({ n: 2 });
  });

  it('supporte serialize/deserialize custom (Map/Set comme wordRelationshipService)', () => {
    const store = createPersistedStore('test:map', { items: new Map() }, {
      serialize: (d) => ({ items: Array.from(d.items.entries()) }),
      deserialize: (raw) => ({ items: new Map(JSON.parse(raw).items) }),
    });
    store.save({ items: new Map([['a', 1]]) });
    const store2 = createPersistedStore('test:map', { items: new Map() }, {
      serialize: (d) => ({ items: Array.from(d.items.entries()) }),
      deserialize: (raw) => ({ items: new Map(JSON.parse(raw).items) }),
    });
    const loaded = store2.load();
    expect(loaded.items instanceof Map).toBe(true);
    expect(loaded.items.get('a')).toBe(1);
  });

  it('ne lève pas si localStorage est indisponible (navigation privée)', () => {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError'); }
    });
    try {
      const store = createPersistedStore('test:prive', { ok: true });
      expect(store.load()).toEqual({ ok: true });
      expect(() => store.save({ ok: false })).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true, value: original
      });
    }
  });
});
