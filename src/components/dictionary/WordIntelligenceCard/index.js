/**
 * WordIntelligenceCard - Modular Component Architecture
 *
 * This folder contains the refactored WordIntelligenceCard component
 * split into smaller, reusable pieces.
 *
 * Structure:
 * ├── index.js              (this file - exports everything)
 * ├── Header.js             (word, root, language badge, confidence)
 * ├── DefinitionsSection.js (multi-source definitions)
 * ├── MorphologySection.js  (prefix + root + suffix visual)
 * ├── VerbGrammarSection.js (binyan, tense, person, number)
 * ├── EtymologySection.js   (cognates, proto-semitic)
 * ├── FrequencyBar.js       (usage statistics)
 * ├── SRSSection.js         (spaced repetition with quick review)
 * ├── hooks/
 * │   └── useWordData.js    (data fetching logic)
 * └── styles/
 *     └── (uses parent WordIntelligenceCard.css)
 *
 * For backward compatibility, the main WordIntelligenceCard component
 * is still in the parent directory.
 */

// Sub-components
export { default as Header, ConfidenceDisplay } from './Header';
export { default as DefinitionsSection, SourceBadge } from './DefinitionsSection';
export { default as MorphologySection } from './MorphologySection';
export { default as VerbGrammarSection } from './VerbGrammarSection';
export { default as EtymologySection } from './EtymologySection';
export { default as FrequencyBar } from './FrequencyBar';
export { default as SRSSection } from './SRSSection';

// Hooks
export { useWordData } from './hooks/useWordData';

// Re-export the main component from parent for convenience
// This allows: import { WordIntelligenceCard } from './WordIntelligenceCard'
export { default as WordIntelligenceCard } from '../WordIntelligenceCard';
export { default } from '../WordIntelligenceCard';
