/**
 * Tests splitIntoWords — découpage des versets en mots cliquables.
 * Cas réels : les textes Sefaria contiennent des entités HTML (&thinsp;,
 * &nbsp;) qui fuyaient littéralement dans les mots affichés.
 */
import { describe, it, expect } from 'vitest';
import { splitIntoWords } from './hebrewDictionary';

describe('splitIntoWords', () => {
  it('découpe un verset simple', () => {
    expect(splitIntoWords('בְּרֵאשִׁית בָּרָא אֱלֹהִים')).toEqual([
      'בְּרֵאשִׁית',
      'בָּרָא',
      'אֱלֹהִים'
    ]);
  });

  it('décode &thinsp; collé aux mots (bug vu sur Genèse 1)', () => {
    expect(splitIntoWords('אֱלֹהִים&thinsp;')).toEqual(['אֱלֹהִים']);
    expect(splitIntoWords('&thinsp;לָאוֹר֙')).toEqual(['לָאוֹר֙']);
  });

  it('décode &nbsp; comme séparateur', () => {
    expect(splitIntoWords('שֵׁנִי׃&nbsp;וַיֹּאמֶר')).toEqual(['שֵׁנִי׃', 'וַיֹּאמֶר']);
  });

  it('retire les balises HTML et décode &amp; en dernier', () => {
    expect(splitIntoWords('<i>טוֹב</i>')).toEqual(['טוֹב']);
    expect(splitIntoWords('x &amp;lt; y')).toEqual(['x', '&lt;', 'y']);
  });

  it('gère les entrées vides', () => {
    expect(splitIntoWords('')).toEqual([]);
    expect(splitIntoWords(null)).toEqual([]);
  });
});
