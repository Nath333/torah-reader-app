/**
 * LexiconTab sub-components - Memoized display components used by LexiconTab
 *
 * Extracted from LexiconTab.js to reduce file size.
 * Components: LexiconSkeleton, FrequencyBadge, SemanticFieldDisplay,
 *   ConstructChainDisplay, MyWordsSection, RootOccurrencesDisplay,
 *   RootFamilyDisplay, TextualAnalysisSection
 */
import React, { useState, useCallback, useMemo, memo } from 'react';
import { SEMANTIC_DOMAINS } from '../../services/scholarly/semanticFieldService';
import { useVocabulary } from '../../hooks';
import VocabularyReview from '../study/VocabularyReview';
import TextualCriticism from '../analysis/TextualCriticism';
import { getMasoreticNotes, KETIV_QERE_TYPE_LABELS } from '../../services/textual/masoreticService';
import { analyzePhrase, GRAMMAR_CONSTANTS } from '../../services/analysis/grammarAnalysisService';
import { getRootInfo } from '../../data/rootDatabase';
import { extractAramaicRoot } from '../../constants/morphology';

// Skeleton Loading Component
export const LexiconSkeleton = memo(() => (
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
export const FrequencyBadge = memo(({ frequency }) => {
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
export const SemanticFieldDisplay = memo(({ semantics }) => {
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
export const ConstructChainDisplay = memo(({ constructs }) => {
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

export const MyWordsSection = memo(function MyWordsSection({ showFrench }) {
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

export const RootOccurrencesDisplay = React.memo(function RootOccurrencesDisplay({ rootData, derivedWords, loading }) {
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

export const RootFamilyDisplay = React.memo(function RootFamilyDisplay({ root, word }) {
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
// Textual Analysis Section (Grammar, Masoretic, Manuscripts)
// =============================================================================

export const TextualAnalysisSection = React.memo(function TextualAnalysisSection({ verseText, verseRef }) {
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
