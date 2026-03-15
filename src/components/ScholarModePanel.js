/**
 * ScholarModePanel - Unified Study Center
 *
 * Comprehensive study interface for both Torah and Talmud texts.
 * Features:
 * - AI-powered analysis (25+ modes: PaRDeS, Mussar, Gematria, etc.)
 * - Scholarly lexicon (BDB, Jastrow, Strong's)
 * - Discourse flow visualization (Talmud)
 * - Commentary layers from Sefaria
 * - Topic connections and cross-references
 * - Named entity detection
 * - Talmudic abbreviations
 * - Traditional page layout (Tzurat HaDaf)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MiniFlowBar } from './SugyaFlowVisualization';
import { getFlowDiagram, analyzeDiscourseStructure } from '../services/discoursePatternService';
import { getCompleteScholarlyAnalysis, addVocalization } from '../services/scholarlyApiService';
import { detectEntities, getEntityStatistics } from '../services/namedEntityService';
import { isTalmudBook } from '../services/sefariaApi';
import './ScholarModePanel.css';

// Import extracted components
import {
  TabButton,
  LoadingState,
  DiscourseTab,
  CommentaryTab,
  TopicsTab,
  CrossRefsTab,
  EntitiesTab,
  AbbreviationsTab,
  TzuratHaDafTab,
  LexiconTab,
  AIAnalysisTab
} from './ScholarMode';

/**
 * ScholarModePanel - Unified Study Center Component
 */
const ScholarModePanel = ({
  text,
  reference,
  isOpen,
  onClose,
  onTextChange,
  // New props for unified study
  textType = null,        // 'torah' | 'talmud' | 'mishnah' | null (auto-detect)
  selectedBook,           // Book name for Genesis detection
  selectedVerse,          // Single verse object
  selectedVerses,         // Multi-verse array
  isMultiVerse = false,   // Passage mode flag
  // Commentary data for AI analysis
  rashiText,
  onkelosText,
  rambanText,
  // Multi-verse commentary data maps (for fetching all verse commentaries)
  rashiDataMap = null,    // Map: "book:chapter:verse" -> rashi comments array
  onkelosDataMap = null,  // Map: verseNumber -> onkelos object
  rambanDataMap = null    // Map: "book:chapter:verse" -> ramban comments array
}) => {
  // Auto-detect text type if not provided
  const detectedTextType = useMemo(() => {
    if (textType) return textType;
    if (selectedBook && isTalmudBook(selectedBook)) return 'talmud';
    return 'torah';
  }, [textType, selectedBook]);

  const isTalmud = detectedTextType === 'talmud';

  // Format multi-verse text with verse references for better AI context
  const formattedMultiVerseText = useMemo(() => {
    if (!isMultiVerse || !selectedVerses || selectedVerses.length === 0) {
      return text;
    }

    // Sort verses by chapter and verse number
    const sortedVerses = [...selectedVerses].sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    // Format each verse with its reference for AI context
    return sortedVerses.map(v =>
      `[${v.chapter}:${v.verse}] ${v.hebrewText}`
    ).join('\n');
  }, [isMultiVerse, selectedVerses, text]);

  // Generate proper multi-verse reference string (e.g., "Genesis.1:1-5" or "Genesis.1:1,3,5")
  const multiVerseReference = useMemo(() => {
    if (!isMultiVerse || !selectedVerses || selectedVerses.length === 0) {
      return reference;
    }

    // Group by book and chapter
    const groups = {};
    selectedVerses.forEach(v => {
      const key = `${v.book}.${v.chapter}`;
      if (!groups[key]) {
        groups[key] = { book: v.book, chapter: v.chapter, verses: [] };
      }
      groups[key].verses.push(v.verse);
    });

    // Format each group with verse ranges
    const parts = Object.values(groups).map(g => {
      const sortedVerses = g.verses.sort((a, b) => a - b);

      // Build ranges for consecutive verses
      const ranges = [];
      let start = sortedVerses[0];
      let end = start;

      for (let i = 1; i <= sortedVerses.length; i++) {
        if (i < sortedVerses.length && sortedVerses[i] === end + 1) {
          end = sortedVerses[i];
        } else {
          ranges.push(start === end ? `${start}` : `${start}-${end}`);
          if (i < sortedVerses.length) {
            start = sortedVerses[i];
            end = start;
          }
        }
      }

      return `${g.book}.${g.chapter}:${ranges.join(',')}`;
    });

    return parts.join('; ');
  }, [isMultiVerse, selectedVerses, reference]);

  // Aggregate Rashi commentary for multi-verse mode
  const aggregatedRashiText = useMemo(() => {
    if (!isMultiVerse) return rashiText;
    if (!rashiDataMap || !selectedVerses || selectedVerses.length === 0) return rashiText;

    const parts = [];
    const sortedVerses = [...selectedVerses].sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    sortedVerses.forEach(v => {
      const key = `${v.book}:${v.chapter}:${v.verse}`;
      const rashiComments = rashiDataMap[key];
      if (rashiComments) {
        if (Array.isArray(rashiComments)) {
          rashiComments.forEach(comment => {
            if (comment?.hebrew) {
              parts.push(`[${v.chapter}:${v.verse}] ${comment.hebrew}`);
            }
          });
        } else if (rashiComments.hebrew) {
          parts.push(`[${v.chapter}:${v.verse}] ${rashiComments.hebrew}`);
        }
      }
    });

    return parts.length > 0 ? parts.join('\n\n') : rashiText;
  }, [isMultiVerse, selectedVerses, rashiDataMap, rashiText]);

  // Aggregate Onkelos for multi-verse mode
  const aggregatedOnkelosText = useMemo(() => {
    if (!isMultiVerse) return onkelosText;
    if (!onkelosDataMap || !selectedVerses || selectedVerses.length === 0) return onkelosText;

    const parts = [];
    const sortedVerses = [...selectedVerses].sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    sortedVerses.forEach(v => {
      const onkelos = onkelosDataMap[v.verse];
      if (onkelos?.targetText) {
        parts.push(`[${v.chapter}:${v.verse}] ${onkelos.targetText}`);
      }
    });

    return parts.length > 0 ? parts.join('\n') : onkelosText;
  }, [isMultiVerse, selectedVerses, onkelosDataMap, onkelosText]);

  // Aggregate Ramban for multi-verse mode
  const aggregatedRambanText = useMemo(() => {
    if (!isMultiVerse) return rambanText;
    if (!rambanDataMap || !selectedVerses || selectedVerses.length === 0) return rambanText;

    const parts = [];
    const sortedVerses = [...selectedVerses].sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    sortedVerses.forEach(v => {
      const key = `${v.book}:${v.chapter}:${v.verse}`;
      const rambanComments = rambanDataMap[key];
      if (rambanComments) {
        if (Array.isArray(rambanComments)) {
          rambanComments.forEach(comment => {
            if (comment?.hebrew) {
              parts.push(`[${v.chapter}:${v.verse}] ${comment.hebrew}`);
            }
          });
        } else if (rambanComments.hebrew) {
          parts.push(`[${v.chapter}:${v.verse}] ${rambanComments.hebrew}`);
        }
      }
    });

    return parts.length > 0 ? parts.join('\n\n') : rambanText;
  }, [isMultiVerse, selectedVerses, rambanDataMap, rambanText]);

  // Default tab based on text type
  const defaultTab = isTalmud ? 'discourse' : 'ai';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [scholarlyData, setScholarlyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isVocalized, setIsVocalized] = useState(false);
  const [originalText, setOriginalText] = useState(text);

  // Reset tab when text type changes
  useEffect(() => {
    if (!isTalmud && activeTab === 'discourse') {
      setActiveTab('ai');
    }
  }, [isTalmud, activeTab]);

  // Local analysis (no API needed) - only for Talmud
  const discourseAnalysis = useMemo(() => {
    return isTalmud && text ? analyzeDiscourseStructure(text) : null;
  }, [text, isTalmud]);

  const flowData = useMemo(() => {
    return isTalmud && text ? getFlowDiagram(text) : null;
  }, [text, isTalmud]);

  const entities = useMemo(() => {
    return isTalmud && text ? detectEntities(text) : null;
  }, [text, isTalmud]);

  const entityStats = useMemo(() => {
    return isTalmud && text ? getEntityStatistics(text) : null;
  }, [text, isTalmud]);

  // Fetch scholarly data when reference changes
  useEffect(() => {
    if (!reference || !isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getCompleteScholarlyAnalysis(reference, text);
        setScholarlyData(data);
      } catch (error) {
        console.error('Failed to fetch scholarly data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reference, isOpen, text]);

  // Handle vocalization toggle
  const handleVocalizationToggle = useCallback(async () => {
    if (!text) return;

    if (isVocalized) {
      onTextChange?.(originalText);
      setIsVocalized(false);
    } else {
      try {
        setOriginalText(text);
        const vocalized = await addVocalization(text, 'rabbinic');
        onTextChange?.(vocalized);
        setIsVocalized(true);
      } catch (error) {
        console.error('Vocalization failed:', error);
      }
    }
  }, [text, isVocalized, originalText, onTextChange]);

  // Dynamic tab configuration based on text type
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'ai', label: isTalmud ? 'AI Study' : 'Study', icon: '🧠', badge: 0, alwaysShow: true },
      { id: 'lexicon', label: 'Lexicon', icon: '📖', badge: 0, alwaysShow: true },
      { id: 'commentary', label: 'Commentary', icon: '📚', badge: scholarlyData?.summary?.commentaryCount || 0, alwaysShow: true },
      { id: 'topics', label: 'Topics', icon: '🏷️', badge: scholarlyData?.topics?.length || 0, alwaysShow: true },
      { id: 'crossrefs', label: 'References', icon: '🔗', badge: scholarlyData?.summary?.crossRefCount || 0, alwaysShow: true }
    ];

    const talmudTabs = [
      { id: 'discourse', label: 'Flow', icon: '📊', badge: discourseAnalysis?.statistics?.totalPatterns || 0, textTypes: ['talmud'] },
      { id: 'tzurathadaf', label: 'צורת הדף', icon: '📜', badge: 0, textTypes: ['talmud'] },
      { id: 'entities', label: 'Entities', icon: '👤', badge: entityStats?.totalEntities || 0, textTypes: ['talmud'] },
      { id: 'abbreviations', label: 'א״ב', icon: '📝', badge: 0, textTypes: ['talmud'] }
    ];

    // For Talmud: show Talmud tabs first, then base tabs
    if (isTalmud) {
      return [
        talmudTabs[0], // Flow first for Talmud
        ...baseTabs,
        ...talmudTabs.slice(1)
      ];
    }

    // For Torah: show base tabs only
    return baseTabs;
  }, [isTalmud, scholarlyData, discourseAnalysis, entityStats]);

  // Get panel title based on context
  const panelTitle = useMemo(() => {
    if (isMultiVerse && selectedVerses?.length > 0) {
      return `Study Center (${selectedVerses.length} verses)`;
    }
    return isTalmud ? 'Scholar Mode' : 'Study Center';
  }, [isTalmud, isMultiVerse, selectedVerses]);

  // Early return after all hooks
  if (!isOpen) return null;

  return (
    <div className={`scholar-mode-panel ${isTalmud ? 'talmud-mode' : 'torah-mode'}`}>
      {/* Header */}
      <div className="panel-header">
        <div className="header-left">
          <h2 className="panel-title">{panelTitle}</h2>
          {(multiVerseReference || reference) && (
            <span className="panel-reference">{multiVerseReference || reference}</span>
          )}
        </div>
        <div className="header-right">
          {/* Vocalization Toggle (Talmud only) */}
          {isTalmud && (
            <button
              className={`vocalization-toggle ${isVocalized ? 'active' : ''}`}
              onClick={handleVocalizationToggle}
              title="Toggle nikud (vocalization)"
            >
              <span className="toggle-icon">ניקוד</span>
            </button>
          )}

          {/* Close Button */}
          <button className="close-button" onClick={onClose} title="Close (ESC)">
            ×
          </button>
        </div>
      </div>

      {/* Mini Flow Bar (Talmud only) */}
      {isTalmud && flowData && flowData.nodes?.length > 0 && (
        <div className="mini-flow-container">
          <MiniFlowBar flowData={flowData} />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map(tab => (
          <TabButton
            key={tab.id}
            {...tab}
            isActive={activeTab === tab.id}
            onClick={setActiveTab}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {loading && activeTab !== 'discourse' && activeTab !== 'entities' && activeTab !== 'ai' && activeTab !== 'lexicon' ? (
          <LoadingState
            message="Loading scholarly data..."
            subMessage="Fetching commentaries and references from Sefaria"
          />
        ) : (
          <>
            {/* AI Study Tab - Available for all texts */}
            {activeTab === 'ai' && (
              <AIAnalysisTab
                text={isMultiVerse ? formattedMultiVerseText : text}
                reference={multiVerseReference || reference}
                textType={detectedTextType}
                selectedBook={selectedBook}
                selectedVerse={selectedVerse}
                selectedVerses={selectedVerses}
                isMultiVerse={isMultiVerse}
                rashiText={aggregatedRashiText}
                onkelosText={aggregatedOnkelosText}
                rambanText={aggregatedRambanText}
              />
            )}

            {/* Lexicon Tab - Available for all texts */}
            {activeTab === 'lexicon' && (
              <LexiconTab />
            )}

            {/* Commentary Tab - Available for all texts */}
            {activeTab === 'commentary' && (
              <CommentaryTab commentaries={scholarlyData?.commentaries} />
            )}

            {/* Topics Tab - Available for all texts */}
            {activeTab === 'topics' && (
              <TopicsTab topics={scholarlyData?.topics} />
            )}

            {/* Cross-refs Tab - Available for all texts */}
            {activeTab === 'crossrefs' && (
              <CrossRefsTab
                crossReferences={scholarlyData?.crossReferences}
                halacha={scholarlyData?.halacha}
                midrash={scholarlyData?.midrash}
              />
            )}

            {/* Talmud-specific tabs */}
            {isTalmud && (
              <>
                {activeTab === 'discourse' && (
                  <DiscourseTab
                    text={text}
                    flowData={flowData}
                    discourseAnalysis={discourseAnalysis}
                  />
                )}

                {activeTab === 'tzurathadaf' && (
                  <TzuratHaDafTab text={text} reference={reference} />
                )}

                {activeTab === 'entities' && (
                  <EntitiesTab entities={entities} statistics={entityStats} />
                )}

                {activeTab === 'abbreviations' && (
                  <AbbreviationsTab text={text} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ScholarModePanel;
