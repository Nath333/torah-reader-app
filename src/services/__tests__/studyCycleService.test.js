/**
 * parseStudyRef : transforme les refs d'étude du jour de Sefaria en cibles
 * de navigation. Le daf lui-même vient de l'API Sefaria (non mocké ici) :
 * le repli offline est [] par design — un daf calculé faux est pire que pas
 * de daf.
 */
import { describe, test, expect } from 'vitest';
import { parseStudyRef } from '../studyCycleService';

describe('parseStudyRef', () => {
  test('daf : « Bekhorot 15 »', () => {
    expect(parseStudyRef('Bekhorot 15')).toEqual({ book: 'Bekhorot', chapter: 15 });
  });

  test('mishnah avec versets : « Mishnah Oholot 7:5-6 »', () => {
    expect(parseStudyRef('Mishnah Oholot 7:5-6')).toEqual({ book: 'Mishnah Oholot', chapter: 7 });
  });

  test('ref parasha complète de Sefaria : « Genesis 1:1-6:8 » -> début de parasha', () => {
    expect(parseStudyRef('Genesis 1:1-6:8')).toEqual({ book: 'Genesis', chapter: 1 });
  });

  test('rambam multi-mots : « Damages to Property 3-5 »', () => {
    expect(parseStudyRef('Damages to Property 3-5')).toEqual({ book: 'Damages to Property', chapter: 3 });
  });

  test('sans numéro -> null', () => {
    expect(parseStudyRef('Shmini Atzeret')).toBeNull();
  });

  test('entrée vide/null -> null', () => {
    expect(parseStudyRef('')).toBeNull();
    expect(parseStudyRef(null)).toBeNull();
  });
});
