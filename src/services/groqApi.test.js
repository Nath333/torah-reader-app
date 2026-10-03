/**
 * Tests for groqApi — gestion de la clé API et utilitaires
 *
 * Points de sécurité couverts :
 * - la clé ne provient QUE du stockage utilisateur (aucune variable d'env)
 * - migration automatique d'une clé en clair laissée par l'ancienne version
 * - withRetry ne retente pas sur une erreur de clé absente
 */

import {
  getStoredApiKey,
  setGroqApiKey,
  removeGroqApiKey,
  hasApiKey,
  parseStreamChunk,
  withRetry,
  AIError,
  ERROR_TYPES
} from './groqApi';

describe('groqApi — gestion de la clé', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test('aucune clé au départ', () => {
    expect(getStoredApiKey()).toBeNull();
    expect(hasApiKey()).toBe(false);
  });

  test('setGroqApiKey puis getStoredApiKey font le tour', () => {
    setGroqApiKey('gsk_test_123');
    expect(getStoredApiKey()).toBe('gsk_test_123');
    expect(hasApiKey()).toBe(true);
  });

  test('removeGroqApiKey efface la clé', () => {
    setGroqApiKey('gsk_test_123');
    removeGroqApiKey();
    expect(getStoredApiKey()).toBeNull();
  });

  test('migre une clé en clair posée par l ancienne version', () => {
    // Ancien stockage : la chaîne brute directement dans localStorage
    localStorage.setItem('groq_api_key', 'gsk_legacy_456');
    expect(getStoredApiKey()).toBe('gsk_legacy_456');
    // Après migration, safeStorage la porte (JSON) et le brut est purgé
    const migrated = localStorage.getItem('groq_api_key');
    expect(migrated).toBe(JSON.stringify('gsk_legacy_456'));
  });
});

describe('groqApi — withRetry', () => {
  test('ne retente pas sur NO_API_KEY', async () => {
    const fn = vi.fn(() => {
      throw new AIError('No key', ERROR_TYPES.NO_API_KEY);
    });
    await expect(withRetry(fn, 3, 1)).rejects.toThrow('No key');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retente sur une erreur générique puis réussit', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce('ok');
    const result = await withRetry(fn, 3, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('groqApi — parseStreamChunk', () => {
  test('extrait le contenu des deltas', () => {
    const chunk = [
      'data: {"choices":[{"delta":{"content":"shal"}}]}',
      'data: {"choices":[{"delta":{"content":"om"}}]}',
      'data: [DONE]'
    ].join('\n');
    expect(parseStreamChunk(chunk)).toBe('shalom');
  });

  test('tolère les fragments JSON incomplets', () => {
    expect(parseStreamChunk('data: {"choices":[{"del')).toBe('');
  });
});
