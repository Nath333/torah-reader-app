/**
 * WordsTab (formerly LexiconTab) - Unified word learning and lookup
 *
 * Two sections:
 * 1. Lookup - Hebrew/Aramaic word lookup from scholarly lexicons (BDB, Jastrow, Strong's)
 * 2. My Words - Vocabulary management with spaced repetition review
 *
 * Features: search history, keyboard shortcuts, copy/share, SRS flashcards
 */
import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { safeGet, safeSet } from '../../utils/safeLocalStorage';
import { scholarlyLookup, getEtymology, SCHOLARLY_SOURCES } from '../../services/dictionaries/scholarlyLexiconService';
import { getWordFrequency, getRootOccurrences, getDerivedWords } from '../../services/wordFrequencyService';
import { getWordSemantics } from '../../services/scholarly/semanticFieldService';
import { findConstructsWithWord } from '../../services/constructChainService';
import { translateEnglishToFrench } from '../../services/dictionaries/englishToFrenchService';
import { lookupCAL } from '../../data/calAramaic';
import { lookupJastrowLocal } from '../../data/jastrowAramaic';
import { lookupAllLexicons } from '../../data/hebrewLexicons';
import { lookupBDBByWord } from '../../data/bdbComplete';
import { lookupStrongsByWord } from '../../services/dictionaries/dictionaryLoader';
import { useVocabulary } from '../../hooks';
import CantillationAnalysis from '../analysis/CantillationAnalysis';
// PRO SCHOLAR: Morphology breakdown with pattern analysis
import MorphologyBreakdown from '../dictionary/morphology/MorphologyBreakdown';
// PRO SCHOLAR V6: Advanced linguistic components
import { WeakVerbIndicator, ProScholarPanel, BinyanConjugationPanel, V6TelemetryDashboard, SourceComparisonView } from '../dictionary';
// Sub-components extracted to separate file
import {
  LexiconSkeleton,
  FrequencyBadge,
  SemanticFieldDisplay,
  ConstructChainDisplay,
  MyWordsSection,
  RootOccurrencesDisplay,
  RootFamilyDisplay,
  TextualAnalysisSection
} from './LexiconTab.components';
import './ScholarModeEnhancements.css';

// LocalStorage key for search history
const HISTORY_KEY = 'lexicon-search-history';
const MAX_HISTORY = 10;

// Load/save history helpers - using safeLocalStorage
const loadHistory = () => safeGet(HISTORY_KEY, []);
const saveHistory = (history) => safeSet(HISTORY_KEY, history);

// Skeleton Loading Component
const LexiconSkeleton = memo(() => (
  <div className="lexicon-skeleton">
    <div className="skeleton-header">
      <div className="skeleton-bar skeleton-word"></div>
      <div className="skeleton-bar skeleton-badge"></div>
    </div>
    <div className="skeleton-bar skeleton-def-primary"></div>
    <div className="lexicon-entry skeleton-entry">
      <div className="skeleton-bar skeleton-source"></div>
      <div className="skeleton-bar skeleton-def"></div>
      <div className="skeleton-bar skeleton-def-short"></div>
    </div>
    <div className="lexicon-entry skeleton-entry">
      <div className="skeleton-bar skeleton-source"></div>
      <div className="skeleton-bar skeleton-def"></div>
    </div>
  </div>
));
LexiconSkeleton.displayName = 'LexiconSkeleton';

// Frequency badge component
const FrequencyBadge = memo(({ frequency }) => {
  if (!frequency) return null;
  const band = frequency.band;
  return (
    <div className="frequency-badge" style={{ '--freq-color': band.color }}>
      <span className="freq-count">{frequency.count.toLocaleString()}×</span>
      <span className="freq-label">{band.label.split(' ')[0]}</span>
      <span className="freq-percentile">(top {frequency.percentile}%)</span>
    </div>
  );
});
FrequencyBadge.displayName = 'FrequencyBadge';

// Semantic field display component
const SemanticFieldDisplay = memo(({ semantics }) => {
  if (!semantics) return null;
  return (
    <div className="semantic-field-section">
      <div className="section-header">
        <span className="section-icon">🌐</span>
        <span className="section-title">Semantic Fields</span>
      </div>
      <div className="semantic-domains">
        {semantics.domains?.map(domain => (
          <span key={domain} className="domain-chip" title={SEMANTIC_DOMAINS[domain]?.description}>
            {SEMANTIC_DOMAINS[domain]?.label || domain}
          </span>
        ))}
      </div>
      {semantics.synonyms?.length > 0 && (
        <div className="semantic-row">
          <span className="semantic-label">Synonyms:</span>
          <div className="semantic-words">
            {semantics.synonyms.slice(0, 5).map((syn, i) => (
              <span key={i} className="synonym-chip">{syn}</span>
            ))}
          </div>
        </div>
      )}
      {semantics.antonyms?.length > 0 && (
        <div className="semantic-row">
          <span className="semantic-label">Antonyms:</span>
          <div className="semantic-words">
            {semantics.antonyms.slice(0, 3).map((ant, i) => (
              <span key={i} className="antonym-chip">{ant}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
SemanticFieldDisplay.displayName = 'SemanticFieldDisplay';

// Construct chain display component
const ConstructChainDisplay = memo(({ constructs }) => {
  if (!constructs || constructs.length === 0) return null;
  return (
    <div className="construct-chain-section">
      <div className="section-header">
        <span className="section-icon">🔗</span>
        <span className="section-title">Construct Chains (סמיכות)</span>
      </div>
      <div className="construct-list">
        {constructs.slice(0, 5).map((c, i) => (
          <div key={i} className="construct-item">
            <span className="construct-hebrew" dir="rtl">{c.phrase}</span>
            <span className="construct-parsed">{c.parsed}</span>
            <span className="construct-type">{c.type?.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
ConstructChainDisplay.displayName = 'ConstructChainDisplay';

// =============================================================================
// My Words Section (Vocabulary)
// =============================================================================

const MyWordsSection = memo(function MyWordsSection({ showFrench }) {
  const { vocabulary, markReviewed, getStats, removeWord } = useVocabulary();
  const [isReviewing, setIsReviewing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const stats = getStats();

  const handleComplete = useCallback(() => {
    setIsReviewing(false);
  }, []);

  if (isReviewing) {
    return (
      <div className="my-words-section reviewing">
        <button className="back-btn" onClick={() => setIsReviewing(false)}>
          ← Back to Word List
        </button>
        <VocabularyReview
          vocabulary={vocabulary}
          showFrench={showFrench}
          onComplete={handleComplete}
          onMarkReviewed={markReviewed}
          maxCards={20}
        />
      </div>
    );
  }

  return (
    <div className="my-words-section">
      {/* Stats Summary */}
      <div className="vocab-stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Words</span>
        </div>
        <div className="stat-card due">
          <span className="stat-value">{stats.dueNow}</span>
          <span className="stat-label">Due Now</span>
        </div>
        <div className="stat-card mastered">
          <span className="stat-value">{stats.mastered}</span>
          <span className="stat-label">Mastered</span>
        </div>
        <div className="stat-card accuracy">
          <span className="stat-value">{stats.accuracy}%</span>
          <span className="stat-label">Accuracy</span>
        </div>
      </div>

      {/* Review Button */}
      {vocabulary.length > 0 && (
        <button
          className="btn-start-review"
          onClick={() => setIsReviewing(true)}
          disabled={stats.dueNow === 0}
        >
          <span className="btn-icon">📚</span>
          {stats.dueNow > 0 ? (
            <>Start Review ({stats.dueNow} due)</>
          ) : (
            <>No Words Due - Check Back Later</>
          )}
        </button>
      )}

      {/* Word List */}
      {vocabulary.length > 0 ? (
        <div className="word-list">
          <div className="word-list-header">
            <h5>Saved Words ({vocabulary.length})</h5>
            <button
              className="toggle-all-btn"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : 'Show All'}
            </button>
          </div>
          <div className="word-grid">
            {(showAll ? vocabulary : vocabulary.slice(0, 8)).map(word => (
              <div key={word.id} className={`word-card ${word.mastered ? 'mastered' : ''}`}>
                <span className="word-hebrew" dir="rtl">{word.hebrew}</span>
                <span className="word-english">{word.english}</span>
                {word.mastered && <span className="mastered-badge">✓</span>}
                <button
                  className="word-remove"
                  onClick={() => removeWord(word.id)}
                  title="Remove word"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {!showAll && vocabulary.length > 8 && (
            <div className="show-more-hint">
              +{vocabulary.length - 8} more words
            </div>
          )}
        </div>
      ) : (
        <div className="vocab-empty-state">
          <span className="empty-icon">📖</span>
          <h5>No Vocabulary Yet</h5>
          <p>Click on Hebrew words while reading to save them to your vocabulary.</p>
          <p className="empty-hint">
            Saved words will appear here for spaced repetition review.
          </p>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Root Occurrences Display Component (Shoresh)
// =============================================================================

const RootOccurrencesDisplay = React.memo(function RootOccurrencesDisplay({ rootData, derivedWords, loading }) {
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);

  // Memoize sliced arrays to prevent recalculation on every render
  const displayedDerivedWords = useMemo(() =>
    derivedWords?.slice(0, 8) || [], [derivedWords]);

  const displayedOccurrences = useMemo(() =>
    showAllOccurrences ? rootData?.occurrences : rootData?.occurrences?.slice(0, 10),
    [showAllOccurrences, rootData?.occurrences]);

  const displayedBooks = useMemo(() =>
    rootData?.books?.slice(0, 8) || [], [rootData?.books]);

  if (loading) {
    return (
      <div className="root-occurrences-section loading">
        <div className="skeleton-bar" style={{ width: '60%', height: '20px' }}></div>
        <div className="skeleton-bar" style={{ width: '80%', height: '16px', marginTop: '8px' }}></div>
        <div className="skeleton-bar" style={{ width: '40%', height: '16px', marginTop: '8px' }}></div>
      </div>
    );
  }

  if (!rootData && !derivedWords?.length) return null;

  return (
    <div className="root-occurrences-section">
      {/* Root Header */}
      <div className="root-header">
        <span className="root-icon">🌳</span>
        <span className="root-title">שורש (Root)</span>
        {rootData?.root && (
          <span className="root-letters" dir="rtl">{rootData.root}</span>
        )}
        {rootData?.totalCount && (
          <span className="root-count">{rootData.totalCount}× in Tanakh</span>
        )}
      </div>

      {/* Theological Note */}
      {rootData?.patterns?.theologicalNote && (
        <div className="root-theological-note">
          <span className="note-icon">💡</span>
          <span className="note-text">{rootData.patterns.theologicalNote}</span>
        </div>
      )}

      {/* Derived Words */}
      {displayedDerivedWords.length > 0 && (
        <div className="derived-words-section">
          <div className="section-subheader">
            <span className="subheader-icon">📚</span>
            <span className="subheader-title">Words from this root</span>
          </div>
          <div className="derived-words-grid">
            {displayedDerivedWords.map((word, i) => (
              <div key={i} className="derived-word-card">
                <span className="dw-hebrew" dir="rtl">{word.word}</span>
                <span className="dw-gloss">{word.gloss}</span>
                <span className="dw-count" style={{ color: word.band?.color }}>
                  {word.count?.toLocaleString()}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Occurrences in Tanakh */}
      {rootData?.occurrences?.length > 0 && (
        <div className="occurrences-section">
          <div className="section-subheader">
            <span className="subheader-icon">📖</span>
            <span className="subheader-title">
              Occurrences in Tanakh
              {rootData.books?.length > 0 && (
                <span className="books-count">({rootData.books.length} books)</span>
              )}
            </span>
          </div>

          {/* First occurrence highlight */}
          {rootData.patterns?.firstOccurrence && (
            <div className="first-occurrence">
              <span className="first-label">First:</span>
              <a
                href={rootData.patterns.firstOccurrence.sefariaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="occurrence-link first"
              >
                {rootData.patterns.firstOccurrence.ref}
              </a>
            </div>
          )}

          {/* Occurrences list */}
          <div className="occurrences-list">
            {displayedOccurrences?.map((occ, i) => (
              <a
                key={i}
                href={occ.sefariaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="occurrence-link"
              >
                <span className="occ-ref">{occ.ref}</span>
                {occ.heRef && <span className="occ-he-ref" dir="rtl">{occ.heRef}</span>}
              </a>
            ))}
          </div>

          {rootData.occurrences.length > 10 && (
            <button
              type="button"
              className="show-more-occurrences"
              onClick={() => setShowAllOccurrences(!showAllOccurrences)}
            >
              {showAllOccurrences
                ? 'Show less'
                : `Show ${rootData.occurrences.length - 10} more...`}
            </button>
          )}

          {/* Books distribution */}
          {rootData.books?.length > 0 && (
            <div className="books-distribution">
              <span className="dist-label">Found in:</span>
              <div className="books-chips">
                {displayedBooks.map((book, i) => (
                  <span key={i} className="book-chip">{book}</span>
                ))}
                {rootData.books.length > 8 && (
                  <span className="more-books">+{rootData.books.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PRO SCHOLAR: Root Family Display Component
// Shows related words from the same shoresh with etymology and cognates
// =============================================================================

const RootFamilyDisplay = React.memo(function RootFamilyDisplay({ root, word }) {
  const rootInfo = useMemo(() => root ? getRootInfo(root) : null, [root]);
  // cognates reserved for future cross-language root display
  // const cognates = useMemo(() => root ? getCognates(root) : null, [root]);

  // Try to extract root from the word if not provided
  const extractedRoot = useMemo(() => {
    if (root) return null;
    const analysis = extractAramaicRoot(word);
    return analysis?.root || null;
  }, [root, word]);

  const displayRoot = root || extractedRoot;
  const displayInfo = rootInfo || (extractedRoot ? getRootInfo(extractedRoot) : null);

  if (!displayRoot && !displayInfo) return null;

  return (
    <div className="root-family-section">
      <div className="root-family-header">
        <span className="rf-icon">🌳</span>
        <span className="rf-title">Root Family</span>
        {displayRoot && (
          <span className="rf-root" dir="rtl">{displayRoot}</span>
        )}
      </div>

      {displayInfo && (
        <div className="root-family-content">
          {/* Base and Causative meanings */}
          <div className="rf-meanings">
            <div className="rf-meaning-pair">
              <span className="rf-label">Base:</span>
              <span className="rf-value">{displayInfo.base}</span>
            </div>
            {displayInfo.causative && displayInfo.causative !== displayInfo.base && (
              <div className="rf-meaning-pair">
                <span className="rf-label">Causative:</span>
                <span className="rf-value">{displayInfo.causative}</span>
              </div>
            )}
          </div>

          {/* Etymology */}
          {displayInfo.etymology && (
            <div className="rf-etymology">
              <span className="rf-etym-label">Etymology:</span>
              <span className="rf-etym-value">{displayInfo.etymology}</span>
            </div>
          )}

          {/* Cognates in sister languages */}
          {displayInfo.cognates && Object.keys(displayInfo.cognates).length > 0 && (
            <div className="rf-cognates">
              <span className="rf-cog-label">Cognates:</span>
              <div className="rf-cog-list">
                {Object.entries(displayInfo.cognates).map(([lang, word]) => (
                  <span key={lang} className="rf-cognate-chip">
                    <span className="cog-lang">{lang}</span>
                    <span className="cog-word">{word}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Frequency data */}
          {displayInfo.frequency && (
            <div className="rf-frequency">
              {displayInfo.frequency.tanakh > 0 && (
                <span className="rf-freq-chip tanakh">
                  תנ״ך: {displayInfo.frequency.tanakh.toLocaleString()}×
                </span>
              )}
              {displayInfo.frequency.talmud > 0 && (
                <span className="rf-freq-chip talmud">
                  תלמוד: {displayInfo.frequency.talmud.toLocaleString()}×
                </span>
              )}
            </div>
          )}

          {/* Semantic field */}
          {displayInfo.semanticField && (
            <div className="rf-semantic">
              <span className="rf-sem-chip">{displayInfo.semanticField}</span>
            </div>
          )}

          {/* Notes */}
          {displayInfo.notes && (
            <div className="rf-notes">
              <span className="rf-note-icon">💡</span>
              <span className="rf-note-text">{displayInfo.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Lexicon Lookup Section
// =============================================================================

const LexiconLookupSection = React.memo(function LexiconLookupSection({ onClose, showFrench = false, initialWord = null, onLookupComplete = null }) {
  const [word, setWord] = useState(initialWord || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [calResult, setCalResult] = useState(null); // Local CAL Aramaic data
  const [localLexicons, setLocalLexicons] = useState(null); // Local BDB/Klein/Jastrow/Strong's data
  const [etymology, setEtymology] = useState(null);
  const [frequency, setFrequency] = useState(null);
  const [semantics, setSemantics] = useState(null);
  const [constructs, setConstructs] = useState(null);
  const [rootOccurrences, setRootOccurrences] = useState(null);
  const [derivedWords, setDerivedWords] = useState(null);
  const [loadingRoot, setLoadingRoot] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('definitions');
  const [frenchTranslations, setFrenchTranslations] = useState({});
  const inputRef = useRef(null);
  const { hasWord, addWord } = useVocabulary();

  // Translate definitions to French when showFrench is enabled
  useEffect(() => {
    if (!showFrench || !result) {
      setFrenchTranslations({});
      return;
    }

    const translateDefinitions = async () => {
      const translations = {};

      // Translate primary definition
      if (result.primaryDefinition) {
        try {
          const fr = await translateEnglishToFrench(result.primaryDefinition);
          if (fr) translations.primary = fr;
        } catch (e) { /* ignore */ }
      }

      // Translate BDB definitions
      if (result.sources?.bdb?.definitions) {
        translations.bdb = [];
        for (const def of result.sources.bdb.definitions.slice(0, 3)) {
          try {
            const fr = await translateEnglishToFrench(def.text);
            translations.bdb.push(fr || null);
          } catch (e) {
            translations.bdb.push(null);
          }
        }
      }

      // Translate Jastrow definitions
      if (result.sources?.jastrow?.definitions) {
        translations.jastrow = [];
        for (const def of result.sources.jastrow.definitions.slice(0, 2)) {
          try {
            const fr = await translateEnglishToFrench(def.text);
            translations.jastrow.push(fr || null);
          } catch (e) {
            translations.jastrow.push(null);
          }
        }
      }

      // Translate Strong's definition
      if (result.sources?.strongs?.definition) {
        try {
          const fr = await translateEnglishToFrench(result.sources.strongs.definition);
          if (fr) translations.strongs = fr;
        } catch (e) { /* ignore */ }
      }

      setFrenchTranslations(translations);
    };

    translateDefinitions();
  }, [showFrench, result]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-lookup when initialWord is provided (from GlossedText or TzuratHaDaf click)
  useEffect(() => {
    if (initialWord && initialWord.trim()) {
      // Strip timestamp if present (format: "word|timestamp")
      const cleanWord = initialWord.split('|')[0].trim();
      if (!cleanWord) return;

      // Always trigger lookup for initialWord
      setWord(cleanWord);
      // Use requestAnimationFrame for reliable timing
      requestAnimationFrame(() => {
        handleLookup(cleanWord);
        onLookupComplete?.();
      });
    }
  }, [initialWord]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch root occurrences when result has a root
  useEffect(() => {
    const fetchRootData = async () => {
      const root = result?.root || frequency?.root;
      if (!root) {
        setRootOccurrences(null);
        setDerivedWords(null);
        return;
      }

      setLoadingRoot(true);
      try {
        // Fetch derived words (local data)
        const derived = getDerivedWords(root);
        setDerivedWords(derived);

        // Fetch occurrences from Sefaria (async)
        const occurrences = await getRootOccurrences(root);
        setRootOccurrences(occurrences);
      } catch (err) {
        console.warn('Failed to fetch root data:', err);
      } finally {
        setLoadingRoot(false);
      }
    };

    fetchRootData();
  }, [result?.root, frequency?.root]);

  // Add to history
  const addToHistory = useCallback((searchWord, resultData) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.word !== searchWord);
      const updated = [
        { word: searchWord, timestamp: Date.now(), hasResult: !!resultData },
        ...filtered
      ].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const handleLookup = useCallback(async (searchWord = word) => {
    const trimmed = searchWord?.trim();
    if (!trimmed) return;

    setWord(trimmed);
    setLoading(true);
    setError(null);
    setResult(null);
    setCalResult(null);
    setLocalLexicons(null);
    setEtymology(null);
    setFrequency(null);
    setSemantics(null);
    setConstructs(null);
    setRootOccurrences(null);
    setDerivedWords(null);
    setShowHistory(false);

    try {
      // Parallel fetch of all data sources (including comprehensive local lexicons)
      const [
        lookupResult,
        etymResult,
        freqData,
        semanticData,
        constructData,
        calData,
        jastrowLocalData,
        allLocalData,
        bdbUnabridged,
        strongsComplete
      ] = await Promise.all([
        scholarlyLookup(trimmed),
        getEtymology(trimmed),
        Promise.resolve(getWordFrequency(trimmed)),
        Promise.resolve(getWordSemantics(trimmed)),
        Promise.resolve(findConstructsWithWord(trimmed)),
        Promise.resolve(lookupCAL(trimmed)), // Local CAL Aramaic lookup
        Promise.resolve(lookupJastrowLocal(trimmed)), // Local Jastrow Aramaic lookup
        Promise.resolve(lookupAllLexicons(trimmed)), // Local BDB/Klein/Jastrow/Strong's (2388 entries)
        Promise.resolve(lookupBDBByWord(trimmed)), // Unabridged BDB (5131 words, 8047 Strong's)
        Promise.resolve(lookupStrongsByWord(trimmed)) // OpenScriptures Strong's (8674 entries)
      ]);

      // Merge local data into result if API didn't return certain sources
      if (lookupResult) {
        lookupResult.sources = lookupResult.sources || {};

        // Merge local Jastrow data
        if (jastrowLocalData && !lookupResult.sources.jastrow) {
          lookupResult.sources.jastrow = {
            definitions: [{ text: jastrowLocalData.definition }],
            headword: jastrowLocalData.lemma,
            source: 'Jastrow (local)'
          };
        }

        // Merge Unabridged BDB (comprehensive: 5131 words + Strong's numbers)
        if (bdbUnabridged && !lookupResult.sources.bdb) {
          lookupResult.sources.bdb = {
            definitions: [{ text: bdbUnabridged.definition }],
            headword: bdbUnabridged.lemma,
            pos: bdbUnabridged.pos,
            strongs: bdbUnabridged.strongs,
            fullDef: bdbUnabridged.fullDef,
            source: 'BDB Unabridged'
          };
        } else if (allLocalData?.bdb && !lookupResult.sources.bdb) {
          // Fallback to smaller local BDB
          lookupResult.sources.bdb = {
            definitions: [{ text: allLocalData.bdb.definition }],
            headword: allLocalData.bdb.lemma,
            pos: allLocalData.bdb.pos,
            source: 'BDB (local)'
          };
        }

        // Merge OpenScriptures Strong's (comprehensive: 8674 entries)
        if (strongsComplete && !lookupResult.sources.strongs) {
          lookupResult.sources.strongs = {
            definition: strongsComplete.definition,
            headword: strongsComplete.lemma,
            strongs: strongsComplete.strongs,
            xlit: strongsComplete.xlit,
            etymology: strongsComplete.etymology,
            translations: strongsComplete.translations,
            source: "Strong's Hebrew"
          };
        }

        // Merge local Klein data (etymological)
        if (allLocalData?.klein && !lookupResult.sources.klein) {
          lookupResult.sources.klein = {
            definitions: [{ text: allLocalData.klein.definition }],
            headword: allLocalData.klein.lemma,
            pos: allLocalData.klein.pos,
            source: 'Klein (local)'
          };
        }
      }

      // Set CAL result if found
      if (calData) {
        setCalResult(calData);
      }

      // Set local lexicon data
      if (allLocalData) {
        setLocalLexicons(allLocalData);
      }

      if (lookupResult) {
        setResult(lookupResult);
        setEtymology(etymResult);
        setFrequency(freqData);
        setSemantics(semanticData);
        setConstructs(constructData);
        addToHistory(trimmed, lookupResult);
      } else {
        // Even if API lookup fails, show local/frequency/semantic data if available
        const hasLocalData = calData || allLocalData || bdbUnabridged || strongsComplete;
        if (freqData || semanticData || hasLocalData) {
          setFrequency(freqData);
          setSemantics(semanticData);
          setConstructs(constructData);

          // Create a synthetic result from local data when API fails
          if (hasLocalData) {
            const syntheticResult = {
              cleaned: trimmed,
              sources: {}
            };

            if (bdbUnabridged) {
              syntheticResult.sources.bdb = {
                definitions: [{ text: bdbUnabridged.definition }],
                headword: bdbUnabridged.lemma,
                pos: bdbUnabridged.pos,
                strongs: bdbUnabridged.strongs,
                source: 'BDB Unabridged'
              };
              syntheticResult.primaryDefinition = bdbUnabridged.definition;
            }

            if (strongsComplete) {
              syntheticResult.sources.strongs = {
                definition: strongsComplete.definition,
                headword: strongsComplete.lemma,
                strongs: strongsComplete.strongs,
                xlit: strongsComplete.xlit,
                translations: strongsComplete.translations,
                source: "Strong's Hebrew"
              };
              if (!syntheticResult.primaryDefinition) {
                syntheticResult.primaryDefinition = strongsComplete.definition;
              }
            }

            if (jastrowLocalData) {
              syntheticResult.sources.jastrow = {
                definitions: [{ text: jastrowLocalData.definition }],
                headword: jastrowLocalData.lemma,
                source: 'Jastrow (local)'
              };
            }

            if (allLocalData?.klein) {
              syntheticResult.sources.klein = {
                definitions: [{ text: allLocalData.klein.definition }],
                headword: allLocalData.klein.lemma,
                source: 'Klein (local)'
              };
            }

            setResult(syntheticResult);
          }
        }
        if (!hasLocalData) {
          setError('Word not found in scholarly lexicons');
        }
        addToHistory(trimmed, calData || allLocalData || bdbUnabridged || strongsComplete || null);
      }
    } catch (err) {
      setError(err.message || 'Lookup failed');
    }

    setLoading(false);
  }, [word, addToHistory]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    } else if (e.key === 'Escape') {
      setShowHistory(false);
      if (!word) onClose?.();
    } else if (e.key === 'ArrowDown' && history.length > 0) {
      e.preventDefault();
      setShowHistory(true);
    }
  }, [handleLookup, word, history.length, onClose]);

  // Copy definition to clipboard
  const copyDefinition = useCallback(async () => {
    if (!result) return;
    const text = [
      result.cleaned,
      result.root ? `Root: ${result.root}` : '',
      result.primaryDefinition,
      result.sources?.bdb?.definitions?.[0]?.text
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  }, [result]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return (
    <div className="lexicon-tab">
      <div className="lookup-header">
        <span className="lookup-icon">📖</span>
        <h4>Hebrew Word Lookup</h4>
        <span className="lookup-sources">BDB • Jastrow • CAL • Strong's</span>
        {onClose && <button className="lookup-close" onClick={onClose}>×</button>}
      </div>

      <div className="lookup-input-group">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => history.length > 0 && setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            placeholder="Enter Hebrew word..."
            className="hebrew-input"
            dir="rtl"
            aria-label="Hebrew word to look up"
          />
          {history.length > 0 && (
            <button
              type="button"
              className="history-toggle-btn"
              onClick={() => setShowHistory(!showHistory)}
              aria-label="Toggle search history"
            >
              🕐
            </button>
          )}
          {/* History Dropdown */}
          {showHistory && history.length > 0 && (
            <div className="lookup-history-dropdown">
              <div className="history-dropdown-header">
                <span>Recent Searches</span>
                <button type="button" onClick={clearHistory} className="clear-history-btn">
                  Clear
                </button>
              </div>
              {history.map((h, i) => (
                <button
                  key={`${h.word}-${i}`}
                  type="button"
                  className={`history-item ${h.hasResult ? '' : 'no-result'}`}
                  onClick={() => handleLookup(h.word)}
                >
                  <span className="history-word" dir="rtl">{h.word}</span>
                  {h.hasResult ? (
                    <span className="history-found">✓</span>
                  ) : (
                    <span className="history-not-found">✗</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleLookup()}
          disabled={loading || !word.trim()}
          className="lookup-btn"
        >
          {loading ? (
            <span className="lookup-spinner"></span>
          ) : '🔍'}
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="lookup-hints">
        <kbd>Enter</kbd> Search
        {history.length > 0 && <><kbd>↓</kbd> History</>}
        <kbd>Esc</kbd> Close
      </div>

      {error && <div className="lookup-error">{error}</div>}

      {/* Loading Skeleton */}
      {loading && <LexiconSkeleton />}

      {!loading && result && (
        <div className="lookup-result">
          <div className="lookup-word-header">
            <span className="lookup-headword">{result.cleaned}</span>
            {result.root && (
              <span className="lookup-root">
                שורש: {result.root}
                {result.rootMeaning && ` (${result.rootMeaning})`}
              </span>
            )}
            <span className="lookup-lang">{result.language || (result.sources?.jastrow ? 'Aramaic' : 'Hebrew')}</span>
            <button
              type="button"
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={copyDefinition}
              title="Copy definition"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>

          {/* Word frequency badge */}
          <FrequencyBadge frequency={frequency} />

          {result.primaryDefinition && (
            <div className="lookup-primary-def">
              <span className="def-english">{result.primaryDefinition}</span>
              {showFrench && frenchTranslations.primary && (
                <span className="def-french primary-french">
                  <span className="fr-flag">🇫🇷</span> {frenchTranslations.primary}
                </span>
              )}
            </div>
          )}

          {/* Section tabs for different data types */}
          <div className="lexicon-section-tabs">
            <button
              className={`section-tab ${activeSection === 'definitions' ? 'active' : ''}`}
              onClick={() => setActiveSection('definitions')}
            >
              📖 Definitions
            </button>
            {semantics && (
              <button
                className={`section-tab ${activeSection === 'semantic' ? 'active' : ''}`}
                onClick={() => setActiveSection('semantic')}
              >
                🌐 Semantic
              </button>
            )}
            {constructs?.length > 0 && (
              <button
                className={`section-tab ${activeSection === 'constructs' ? 'active' : ''}`}
                onClick={() => setActiveSection('constructs')}
              >
                🔗 Constructs ({constructs.length})
              </button>
            )}
            {etymology?.analysis && (
              <button
                className={`section-tab ${activeSection === 'etymology' ? 'active' : ''}`}
                onClick={() => setActiveSection('etymology')}
              >
                🌍 Etymology
              </button>
            )}
            {(rootOccurrences || derivedWords?.length > 0 || loadingRoot) && (
              <button
                className={`section-tab ${activeSection === 'shoresh' ? 'active' : ''}`}
                onClick={() => setActiveSection('shoresh')}
              >
                🌳 שורש {loadingRoot && <span className="tab-loading">...</span>}
              </button>
            )}
            {/* PRO SCHOLAR: Morphology analysis tab */}
            <button
              className={`section-tab section-tab-pro ${activeSection === 'morphology' ? 'active' : ''}`}
              onClick={() => setActiveSection('morphology')}
            >
              🔬 Morphology
            </button>
            {/* PRO SCHOLAR V6: Advanced analysis tab */}
            <button
              className={`section-tab section-tab-v6 ${activeSection === 'v6analysis' ? 'active' : ''}`}
              onClick={() => setActiveSection('v6analysis')}
            >
              ⚡ V6 Analysis
            </button>
            {/* PRO SCHOLAR V6: Binyan conjugation tab - show for verbs */}
            {(result?.grammar?.partOfSpeech === 'verb' || result?.sources?.bdb?.pos?.includes('verb') || result?.root) && (
              <button
                className={`section-tab section-tab-conjugation ${activeSection === 'conjugation' ? 'active' : ''}`}
                onClick={() => setActiveSection('conjugation')}
              >
                📊 Conjugation
              </button>
            )}
            {/* PRO SCHOLAR V6: Source comparison view */}
            <button
              className={`section-tab section-tab-compare ${activeSection === 'compare' ? 'active' : ''}`}
              onClick={() => setActiveSection('compare')}
            >
              ⚖️ Compare
            </button>
          </div>

          {/* PRO SCHOLAR: Morphology Section - ALWAYS FIRST when active */}
          {activeSection === 'morphology' && (
            <div className="lexicon-morphology-section">
              <MorphologyBreakdown
                word={result.cleaned}
                lookupResult={result}
                showGrammar={true}
                showConfidence={true}
              />
              <RootFamilyDisplay
                root={result.root}
                word={result.cleaned}
              />
            </div>
          )}

          {/* Definitions Section */}
          {activeSection === 'definitions' && (
            <div className="lexicon-definitions-section">
              {/* BDB Entry */}
              {result.sources?.bdb && (
                <div className="lexicon-entry bdb-entry">
                  <div className="lexicon-header">
                    <span className="lexicon-name">{SCHOLARLY_SOURCES.BDB.abbreviation}</span>
                    <span className="lexicon-full">{SCHOLARLY_SOURCES.BDB.name}</span>
                    {result.sources.bdb.strongNumber && (
                      <span className="strong-num">H{result.sources.bdb.strongNumber}</span>
                    )}
                  </div>
                  {result.sources.bdb.definitions?.slice(0, 3).map((def, i) => (
                    <div key={i} className="lexicon-def">
                      <span className="def-num">{i + 1}.</span>
                      <span className="def-text">{def.text}</span>
                      {showFrench && frenchTranslations.bdb?.[i] && (
                        <span className="def-french">
                          <span className="fr-flag">🇫🇷</span> {frenchTranslations.bdb[i]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Jastrow Entry (Aramaic) */}
              {result.sources?.jastrow && (
                <div className="lexicon-entry jastrow-entry">
                  <div className="lexicon-header">
                    <span className="lexicon-name">{SCHOLARLY_SOURCES.JASTROW.abbreviation}</span>
                    <span className="lexicon-full">{SCHOLARLY_SOURCES.JASTROW.name}</span>
                    <span className="lexicon-lang">Aramaic</span>
                  </div>
                  {result.sources.jastrow.definitions?.slice(0, 2).map((def, i) => (
                    <div key={i} className="lexicon-def">
                      <span className="def-text">{def.text}</span>
                      {showFrench && frenchTranslations.jastrow?.[i] && (
                        <span className="def-french">
                          <span className="fr-flag">🇫🇷</span> {frenchTranslations.jastrow[i]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* CAL Aramaic Entry (Local Data) */}
              {calResult && (
                <div className="lexicon-entry cal-entry">
                  <div className="lexicon-header">
                    <span className="lexicon-name" style={{ backgroundColor: '#0ea5e9' }}>CAL</span>
                    <span className="lexicon-full">Comprehensive Aramaic Lexicon</span>
                    <span className="lexicon-lang">Aramaic</span>
                    {calResult.cal && <span className="cal-romanization">{calResult.cal}</span>}
                  </div>
                  <div className="lexicon-def">
                    <span className="def-pos">{calResult.pos}</span>
                    <span className="def-text">{calResult.definition}</span>
                  </div>
                  {calResult.dialects && (
                    <div className="cal-dialects">
                      {calResult.dialects.map((d, i) => (
                        <span key={i} className="dialect-chip" title={
                          d === 'BA' ? 'Biblical Aramaic' :
                          d === 'JBA' ? 'Jewish Babylonian Aramaic' :
                          d === 'JPA' ? 'Jewish Palestinian Aramaic' :
                          d === 'Tg' ? 'Targumic' :
                          d === 'Syr' ? 'Syriac' : d
                        }>{d}</span>
                      ))}
                    </div>
                  )}
                  {calResult.forms && calResult.forms.length > 1 && (
                    <div className="cal-forms">
                      <span className="forms-label">Forms:</span>
                      {calResult.forms.slice(0, 5).map((f, i) => (
                        <span key={i} className="form-chip" dir="rtl">{f}</span>
                      ))}
                    </div>
                  )}
                  {calResult.hebrew && (
                    <div className="cal-hebrew-equiv">
                      <span className="equiv-label">Hebrew:</span>
                      <span className="equiv-word" dir="rtl">{calResult.hebrew}</span>
                    </div>
                  )}
                  {calResult.related && (
                    <div className="cal-related">
                      <span className="related-label">Related:</span>
                      {calResult.related.map((r, i) => (
                        <span key={i} className="related-chip" dir="rtl">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Strong's Entry */}
              {result.sources?.strongs && (
                <div className="lexicon-entry strongs-entry">
                  <div className="lexicon-header">
                    <span className="lexicon-name">{SCHOLARLY_SOURCES.STRONG?.abbreviation || "Strong's"}</span>
                    <span className="lexicon-full">{SCHOLARLY_SOURCES.STRONG?.name || "Strong's Concordance"}</span>
                    {result.sources.strongs.number && (
                      <span className="strong-num">H{result.sources.strongs.number}</span>
                    )}
                  </div>
                  {result.sources.strongs.definition && (
                    <div className="lexicon-def">
                      <span className="def-text">{result.sources.strongs.definition}</span>
                      {showFrench && frenchTranslations.strongs && (
                        <span className="def-french">
                          <span className="fr-flag">🇫🇷</span> {frenchTranslations.strongs}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Grammar Info */}
              {result.grammar && (
                <div className="grammar-info">
                  {result.grammar.partOfSpeech && (
                    <span className="grammar-tag pos">{result.grammar.partOfSpeech}</span>
                  )}
                  {result.grammar.gender && (
                    <span className="grammar-tag gender">{result.grammar.gender}</span>
                  )}
                  {result.grammar.number && (
                    <span className="grammar-tag number">{result.grammar.number}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Semantic Field Section */}
          {activeSection === 'semantic' && semantics && (
            <SemanticFieldDisplay semantics={semantics} />
          )}

          {/* Construct Chains Section */}
          {activeSection === 'constructs' && constructs?.length > 0 && (
            <ConstructChainDisplay constructs={constructs} />
          )}

          {/* Etymology Section */}
          {activeSection === 'etymology' && etymology?.analysis && (
            <div className="etymology-section">
              <div className="etymology-header">
                <span className="etym-icon">🌍</span>
                <span className="etym-title">Cognate Languages</span>
              </div>
              {etymology.analysis.semanticCore && (
                <div className="semantic-core">
                  Core meaning: <strong>{etymology.analysis.semanticCore}</strong>
                </div>
              )}
              {etymology.analysis.relatedWords && (
                <div className="cognate-list">
                  {etymology.analysis.relatedWords.map((cog, i) => (
                    <span key={i} className="cognate-chip">{cog}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Shoresh (Root) Section */}
          {activeSection === 'shoresh' && (
            <RootOccurrencesDisplay
              rootData={rootOccurrences}
              derivedWords={derivedWords}
              loading={loadingRoot}
            />
          )}

          {/* PRO SCHOLAR V6: Advanced Analysis Section */}
          {activeSection === 'v6analysis' && (
            <div className="lexicon-v6-section">
              <ProScholarPanel
                word={result.cleaned}
                root={result.root}
                translationData={result}
                isAramaic={!!result.sources?.jastrow || !!calResult}
                contextType={result.contextType || (result.sources?.jastrow ? 'talmudic' : 'biblical')}
                onWordClick={(clickedWord) => {
                  if (clickedWord && clickedWord !== result.cleaned) {
                    setWord(clickedWord);
                    handleLookup(clickedWord);
                  }
                }}
                compact={false}
                showTelemetry={process.env.NODE_ENV === 'development'}
              />
              {/* WeakVerbIndicator for additional pattern info */}
              {result.root && (
                <WeakVerbIndicator
                  root={result.root}
                  word={result.cleaned}
                  showDetails={true}
                />
              )}
            </div>
          )}

          {/* PRO SCHOLAR V6: Binyan Conjugation Panel - Full verb paradigms */}
          {activeSection === 'conjugation' && (
            <div className="lexicon-conjugation-section">
              <BinyanConjugationPanel
                binyan={result?.grammar?.binyan?.toLowerCase() || 'qal'}
                root={result.root}
                isAramaic={!!result.sources?.jastrow || !!calResult}
                highlightForm={result.cleaned}
                onFormClick={(form, info) => {
                  // PRO SCHOLAR V6: Trigger actual lookup for conjugated form
                  if (form && form !== result.cleaned) {
                    setWord(form);
                    handleLookup(form);
                    setActiveSection('definitions'); // Switch to definitions view
                  }
                }}
                compact={false}
              />
            </div>
          )}

          {/* PRO SCHOLAR V6: Source Comparison View - Side-by-side lexicon comparison */}
          {activeSection === 'compare' && (
            <div className="lexicon-compare-section">
              <SourceComparisonView
                word={result.cleaned}
                sources={result.sources}
                calData={calResult}
                localLexicons={localLexicons}
                etymology={etymology}
                showDifferences={true}
              />
            </div>
          )}

          {/* Save to Vocabulary Button */}
          <div className="save-to-vocab-section">
            {hasWord(result.cleaned) ? (
              <span className="already-saved">✓ In your vocabulary</span>
            ) : (
              <button
                className="btn-save-vocab"
                onClick={() => addWord(result.cleaned, result.primaryDefinition || '', '')}
              >
                <span className="btn-icon">💾</span>
                Save to My Words
              </button>
            )}
          </div>
        </div>
      )}

      {/* Show CAL-only results when no other lexicon data but CAL found */}
      {!result && !loading && calResult && (
        <div className="lookup-result cal-only-result">
          <div className="lookup-word-header">
            <span className="lookup-headword">{calResult.lemma}</span>
            <span className="lookup-lang">Aramaic (CAL)</span>
          </div>
          <div className="lexicon-entry cal-entry">
            <div className="lexicon-header">
              <span className="lexicon-name" style={{ backgroundColor: '#0ea5e9' }}>CAL</span>
              <span className="lexicon-full">Comprehensive Aramaic Lexicon</span>
              {calResult.cal && <span className="cal-romanization">{calResult.cal}</span>}
            </div>
            <div className="lexicon-def">
              <span className="def-pos">{calResult.pos}</span>
              <span className="def-text">{calResult.definition}</span>
            </div>
            {calResult.dialects && (
              <div className="cal-dialects">
                {calResult.dialects.map((d, i) => (
                  <span key={i} className="dialect-chip" title={
                    d === 'BA' ? 'Biblical Aramaic' :
                    d === 'JBA' ? 'Jewish Babylonian Aramaic' :
                    d === 'JPA' ? 'Jewish Palestinian Aramaic' :
                    d === 'Tg' ? 'Targumic' :
                    d === 'Syr' ? 'Syriac' : d
                  }>{d}</span>
                ))}
              </div>
            )}
            {calResult.forms && calResult.forms.length > 1 && (
              <div className="cal-forms">
                <span className="forms-label">Forms:</span>
                {calResult.forms.slice(0, 5).map((f, i) => (
                  <span key={i} className="form-chip" dir="rtl">{f}</span>
                ))}
              </div>
            )}
            {calResult.hebrew && (
              <div className="cal-hebrew-equiv">
                <span className="equiv-label">Hebrew:</span>
                <span className="equiv-word" dir="rtl">{calResult.hebrew}</span>
              </div>
            )}
            {calResult.related && (
              <div className="cal-related">
                <span className="related-label">Related:</span>
                {calResult.related.map((r, i) => (
                  <span key={i} className="related-chip" dir="rtl">{r}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show local lexicon results when API fails but local data found */}
      {!result && !loading && localLexicons && !calResult && (
        <div className="lookup-result local-only-result">
          <div className="lookup-word-header">
            <span className="lookup-headword">{word}</span>
            <span className="lookup-lang">Local Lexicons</span>
          </div>

          {/* Local BDB */}
          {localLexicons.bdb && (
            <div className="lexicon-entry bdb-entry">
              <div className="lexicon-header">
                <span className="lexicon-name" style={{ backgroundColor: '#3b82f6' }}>BDB</span>
                <span className="lexicon-full">Brown-Driver-Briggs (local)</span>
              </div>
              <div className="lexicon-def">
                {localLexicons.bdb.pos && <span className="def-pos">{localLexicons.bdb.pos}</span>}
                <span className="def-text">{localLexicons.bdb.definition}</span>
              </div>
            </div>
          )}

          {/* Local Klein */}
          {localLexicons.klein && (
            <div className="lexicon-entry klein-entry">
              <div className="lexicon-header">
                <span className="lexicon-name" style={{ backgroundColor: '#8b5cf6' }}>Klein</span>
                <span className="lexicon-full">Klein Etymological (local)</span>
              </div>
              <div className="lexicon-def">
                {localLexicons.klein.pos && <span className="def-pos">{localLexicons.klein.pos}</span>}
                <span className="def-text">{localLexicons.klein.definition}</span>
              </div>
            </div>
          )}

          {/* Local Jastrow */}
          {localLexicons.jastrow && (
            <div className="lexicon-entry jastrow-entry">
              <div className="lexicon-header">
                <span className="lexicon-name" style={{ backgroundColor: '#22c55e' }}>Jastrow</span>
                <span className="lexicon-full">Jastrow Talmudic (local)</span>
              </div>
              <div className="lexicon-def">
                {localLexicons.jastrow.pos && <span className="def-pos">{localLexicons.jastrow.pos}</span>}
                <span className="def-text">{localLexicons.jastrow.definition}</span>
              </div>
            </div>
          )}

          {/* Local Strong's */}
          {localLexicons.strong && (
            <div className="lexicon-entry strongs-entry">
              <div className="lexicon-header">
                <span className="lexicon-name" style={{ backgroundColor: '#f59e0b' }}>Strong's</span>
                <span className="lexicon-full">Strong's Concordance (local)</span>
                {localLexicons.strong.strongNum && (
                  <span className="strong-num">H{localLexicons.strong.strongNum}</span>
                )}
              </div>
              <div className="lexicon-def">
                {localLexicons.strong.pos && <span className="def-pos">{localLexicons.strong.pos}</span>}
                <span className="def-text">{localLexicons.strong.definition}</span>
              </div>
            </div>
          )}

          {/* Local BDB Aramaic */}
          {localLexicons.bdbAramaic && (
            <div className="lexicon-entry bdb-aramaic-entry">
              <div className="lexicon-header">
                <span className="lexicon-name" style={{ backgroundColor: '#06b6d4' }}>BDB-Aram</span>
                <span className="lexicon-full">BDB Aramaic (local)</span>
              </div>
              <div className="lexicon-def">
                {localLexicons.bdbAramaic.pos && <span className="def-pos">{localLexicons.bdbAramaic.pos}</span>}
                <span className="def-text">{localLexicons.bdbAramaic.definition}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !loading && !error && !calResult && !localLexicons && (
        <div className="lookup-hint">
          <p>Enter a Hebrew word to look up definitions from:</p>
          <div className="source-badges">
            <span className="source-badge">📘 BDB (Biblical)</span>
            <span className="source-badge">📗 Jastrow (Talmudic)</span>
            <span className="source-badge">📙 CAL (Aramaic)</span>
            <span className="source-badge">📕 Strong's Concordance</span>
            <span className="source-badge">📓 Klein (Etymological)</span>
          </div>
          <p className="local-count">2,388+ local entries available offline</p>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Textual Analysis Section (Grammar, Masoretic, Manuscripts)
// =============================================================================

const TextualAnalysisSection = React.memo(function TextualAnalysisSection({ verseText, verseRef }) {
  const [activeView, setActiveView] = useState('grammar');
  const grammarAnalysis = useMemo(() => verseText ? analyzePhrase(verseText) : [], [verseText]);
  const masoreticData = useMemo(() => verseRef ? getMasoreticNotes(verseRef) : null, [verseRef]);

  // Parse verseRef to get book, chapter, verse for TextualCriticism
  const parsedRef = useMemo(() => {
    if (!verseRef) return null;
    // Parse "Genesis 1:1" or "Genesis.1.1" format
    const match = verseRef.match(/^(\w+)[\s.](\d+)[:.](\d+)/);
    if (match) return { book: match[1], chapter: parseInt(match[2]), verse: parseInt(match[3]) };
    return null;
  }, [verseRef]);

  if (!verseText && !verseRef) {
    return <div className="textual-empty"><span>📜</span><p>Select a verse for textual analysis</p></div>;
  }

  return (
    <div className="textual-analysis-section">
      <div className="textual-view-toggle">
        <button className={activeView === 'grammar' ? 'active' : ''} onClick={() => setActiveView('grammar')}>📝 Grammar</button>
        <button className={activeView === 'masoretic' ? 'active' : ''} onClick={() => setActiveView('masoretic')}>✡️ Masorah</button>
        <button className={activeView === 'manuscripts' ? 'active' : ''} onClick={() => setActiveView('manuscripts')}>📜 MSS</button>
      </div>

      {activeView === 'grammar' && (
        <div className="grammar-view">
          <h5>Morphological Analysis</h5>
          {grammarAnalysis.length > 0 ? (
            <div className="grammar-words">
              {grammarAnalysis.map((w, i) => (
                <div key={i} className="grammar-word-card">
                  <span className="word-hebrew" dir="rtl">{w.word}</span>
                  <div className="word-info">
                    {w.prefixes?.length > 0 && <span className="prefixes">{w.prefixes.map(p => `${p.letter}(${p.meaning?.split('/')[0] || p.letter})`).join('+')}</span>}
                    {w.root && w.rootInfo && (
                      <span className="root" title={w.rootInfo.category || ''}>
                        שורש: {w.root} ({w.rootInfo.meaning})
                        {w.rootInfo.isAramaic && <span className="aramaic-badge">ארמ׳</span>}
                      </span>
                    )}
                    {w.root && !w.rootInfo && !w.uncertain && (
                      <span className="root">שורש: {w.root}</span>
                    )}
                    {w.isTalmudicTerm && (
                      <span className="talmudic-term-badge" title="Talmudic term">📜</span>
                    )}
                    <span className="pos">{w.partOfSpeech?.abbr || (w.partOfSpeech?.name ? w.partOfSpeech.name[0] : '')}</span>
                    {w.binyan && <span className="binyan">{w.binyan.hebrew}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="no-data">No grammar data</p>}
          <details className="binyan-ref"><summary>Binyanim Reference</summary>
            <div className="binyan-grid">{Object.entries(GRAMMAR_CONSTANTS.BINYANIM).map(([k,b]) => <div key={k}><b>{b.hebrew}</b> {b.name} - {b.meaning}</div>)}</div>
          </details>
        </div>
      )}

      {activeView === 'masoretic' && (
        <div className="masoretic-view">
          <h5>Masoretic Notes</h5>
          {masoreticData?.hasVariants ? (
            <div className="masoretic-content">
              {masoreticData.ketivQere.map((kq, i) => (
                <div key={i} className="kq-item">
                  <div><b>כתיב:</b> <span dir="rtl">{kq.ketiv}</span> → <b>קרי:</b> <span dir="rtl">{kq.qere}</span></div>
                  <div className="kq-type">{KETIV_QERE_TYPE_LABELS[kq.type]}</div>
                  {kq.notes && <p className="notes">{kq.notes}</p>}
                </div>
              ))}
              {masoreticData.tiqqunSoferim && <div className="tiqqun"><b>Tiqqun Soferim:</b> {masoreticData.tiqqunSoferim.reason}</div>}
            </div>
          ) : <div className="no-variants">✓ No Masoretic variants for this verse</div>}
        </div>
      )}

      {activeView === 'manuscripts' && parsedRef && (
        <TextualCriticism
          book={parsedRef.book}
          chapter={parsedRef.chapter}
          verse={parsedRef.verse}
        />
      )}

      {activeView === 'manuscripts' && !parsedRef && (
        <div className="no-variants">Select a verse to see manuscript variants</div>
      )}
    </div>
  );
});

// =============================================================================
// Main WordsTab Component (with sub-tabs)
// =============================================================================

const WordsTab = React.memo(function WordsTab({ onClose, showFrench = false, verseText = '', verseRef = '', initialWord = null, onWordLookupComplete = null }) {
  const [activeSubTab, setActiveSubTab] = useState(initialWord ? 'lookup' : 'lookup');
  const { dueToday } = useVocabulary();

  // Switch to lookup tab when initialWord is provided
  useEffect(() => {
    if (initialWord) {
      setActiveSubTab('lookup');
    }
  }, [initialWord]);

  return (
    <div className="words-tab">
      <div className="words-subtab-nav">
        <button className={`words-subtab ${activeSubTab === 'lookup' ? 'active' : ''}`} onClick={() => setActiveSubTab('lookup')}>
          <span className="subtab-icon">🔍</span><span className="subtab-label">Lookup</span>
        </button>
        <button className={`words-subtab ${activeSubTab === 'mywords' ? 'active' : ''}`} onClick={() => setActiveSubTab('mywords')}>
          <span className="subtab-icon">📚</span><span className="subtab-label">Words</span>
          {dueToday > 0 && <span className="due-badge">{dueToday}</span>}
        </button>
        <button className={`words-subtab ${activeSubTab === 'trop' ? 'active' : ''}`} onClick={() => setActiveSubTab('trop')}>
          <span className="subtab-icon">🎵</span><span className="subtab-label">Trop</span>
        </button>
        <button className={`words-subtab ${activeSubTab === 'textual' ? 'active' : ''}`} onClick={() => setActiveSubTab('textual')}>
          <span className="subtab-icon">📜</span><span className="subtab-label">Text</span>
        </button>
        {/* PRO SCHOLAR V6: Debug/Telemetry tab (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <button className={`words-subtab words-subtab-debug ${activeSubTab === 'debug' ? 'active' : ''}`} onClick={() => setActiveSubTab('debug')}>
            <span className="subtab-icon">📊</span><span className="subtab-label">Debug</span>
          </button>
        )}
      </div>
      <div className="words-subtab-content">
        {activeSubTab === 'lookup' && (
          <LexiconLookupSection
            onClose={onClose}
            showFrench={showFrench}
            initialWord={initialWord}
            onLookupComplete={onWordLookupComplete}
          />
        )}
        {activeSubTab === 'mywords' && <MyWordsSection showFrench={showFrench} />}
        {activeSubTab === 'trop' && <CantillationAnalysis verseText={verseText} verseRef={verseRef} />}
        {activeSubTab === 'textual' && <TextualAnalysisSection verseText={verseText} verseRef={verseRef} />}
        {/* PRO SCHOLAR V6: Telemetry Dashboard (development only) */}
        {activeSubTab === 'debug' && process.env.NODE_ENV === 'development' && (
          <div className="debug-section">
            <V6TelemetryDashboard
              autoRefresh={true}
              refreshInterval={5000}
              compact={false}
            />
          </div>
        )}
      </div>
    </div>
  );
});

WordsTab.propTypes = {
  onClose: PropTypes.func,
  showFrench: PropTypes.bool,
  verseText: PropTypes.string,
  verseRef: PropTypes.string,
  initialWord: PropTypes.string,
  onWordLookupComplete: PropTypes.func
};

// Export both for backwards compatibility
export { WordsTab, LexiconLookupSection as LexiconTab };
export default WordsTab;
