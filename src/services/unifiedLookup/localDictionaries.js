// =============================================================================
// Lookups locaux par dictionnaire (createDictLookup × BDB/Jastrow/Strong's/CAL/
// JastrowAraméen/Gesenius/Klein)
// (extrait de unifiedLookupService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { generateLookupVariants } from './variants';

// =============================================================================
// DICTIONARY LOOKUP FACTORY - DRY pattern for all dictionary lookups
// =============================================================================
const createDictLookup = ({ name, source, getDef, getDict, entryFilter = () => true, enrich = () => ({}) }) => {
  const fn = (word, dicts) => {
    const dict = getDict(dicts);
    if (!dict) return null;
    const variants = generateLookupVariants(word);
    for (const { form, type } of variants) {
      const entry = dict[form];
      if (entry && entryFilter(entry, form)) {
        return {
          name, source, definition: getDef(entry),
          headword: entry.headword || entry.lemma || form,
          ...enrich(entry),
          _matchedForm: type !== 'exact' ? form : undefined,
          _matchType: type
        };
      }
    }
    return null;
  };
  Object.defineProperty(fn, 'name', { value: `lookup${name.replace(/[^a-zA-Z]/g, '')}` });
  return fn;
};

export const lookupBDB = createDictLookup({
  name: 'BDB', source: 'BDB (1906)',
  getDict: (d) => d.bdb?.byWord || d.bdb,
  getDef: (e) => e.definition || e.gloss || e.english,
  enrich: (e) => ({ fullDefinition: e.fullDefinition, strongNumber: e.strongNumber })
});

export const lookupJastrowLocal = createDictLookup({
  name: 'Jastrow', source: 'Jastrow (1903)',
  getDict: (d) => d.jastrow,
  getDef: (e) => e.definition || e.english,
  enrich: (e) => ({ fullDefinition: e.fullDefinition, isAramaic: e.isAramaic || e.language === 'Aramaic' })
});

export const lookupStrongs = createDictLookup({
  name: "Strong's", source: "Strong's Concordance",
  getDict: (d) => d.strongs?.byWord || d.strongs,
  getDef: (e) => e.definition || e.kjv_def || e.strongs_def,
  enrich: (e) => ({ strongNumber: e.strongNumber || e.H })
});

export const lookupCALLocal = createDictLookup({
  name: 'CAL', source: 'CAL (Comprehensive Aramaic Lexicon)',
  getDict: (d) => d.calAramaic,
  getDef: (e) => e.definition || e.english,
  enrich: () => ({ isAramaic: true, language: 'Aramaic' })
});

export const lookupJastrowAramaic = createDictLookup({
  name: 'Jastrow (Aramaic)', source: 'Jastrow (1903) - Aramaic',
  getDict: (d) => d.jastrowAramaic,
  getDef: (e) => e.definition || e.english,
  enrich: (e) => ({ fullDefinition: e.fullDefinition, isAramaic: true, language: 'Aramaic', dialect: e.dialect || 'Babylonian' })
});

export const lookupGesenius = createDictLookup({
  name: 'Gesenius', source: 'Gesenius (1910)',
  getDict: (d) => d.gesenius,
  getDef: (e) => e.definition || e.english,
  entryFilter: (_e, form) => form !== '_meta',
  enrich: (e) => ({ fullDefinition: e.fullDefinition, grammar: e.grammar_note || e.grammar, forms: e.forms, pattern: e.pattern, usage: e.usage, language: 'Hebrew', pos: e.pos })
});

export const lookupKlein = createDictLookup({
  name: 'Klein', source: 'Klein (1987)',
  getDict: (d) => d.klein,
  getDef: (e) => e.definition || e.gloss,
  entryFilter: (_e, form) => form !== '_meta',
  enrich: (e) => ({ fullDefinition: e.fullDefinition, etymology: e.etymology, cognates: e.cognates, protoSemitic: e.protoSemitic, semanticField: e.semanticField, language: 'Hebrew', pos: e.pos })
});

