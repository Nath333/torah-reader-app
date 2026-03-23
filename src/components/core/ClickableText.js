/**
 * ClickableText V3.0 - Unified Interactive Hebrew/Aramaic Text Component
 *
 * A professional component for displaying Hebrew and Aramaic text
 * with word-by-word translation support via the unifiedLookupService.
 *
 * Features:
 * - Multi-source scholarly lookups (Jastrow, BDB, Strong's, Sefaria)
 * - Hebrew and Aramaic support with language-specific styling
 * - Vocabulary saving integration
 * - French translation support (on-demand)
 * - Enlarged first letter for Torah study display
 * - Request deduplication and caching (via orchestrator)
 *
 * @example
 * <ClickableText text={hebrewText} language="hebrew" showFrench />
 * <ClickableText text={aramaicText} language="aramaic" />
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import './ClickableText.css';

// Services - PRO SCHOLAR V10: Use unifiedLookupService (consolidated)
import { splitIntoWords, hasTranslation as hasLocalTranslation } from '../../services/hebrewDictionary';
import {
  lookupWord,
  quickLookup,
  getFrenchTranslation,
  lookupParallel
} from '../../services/unifiedLookupService';
import { prefetchWord } from '../../services/wordPrefetchService';

// Constants
import { CLICK_DEBOUNCE_MS } from '../../constants/clickableTextConstants';

// Components - Use existing modular components
import { WordDefinitionCard } from '../dictionary';

// =============================================================================
// Main Component
// =============================================================================

const ClickableText = ({
  text,
  language = 'hebrew',
  className = '',
  direction = 'rtl',
  onSaveWord,
  hasWord,
  showFrench = false,
  enlargeFirstLetter = false,
  isRashiScript = false,
  reference = null // PRO SCHOLAR V3: Pass reference for context-aware lookups
}) => {
  const isAramaic = language === 'aramaic';
  const words = useMemo(() => splitIntoWords(text), [text]);

  // State
  const [selectedWord, setSelectedWord] = useState(null);
  const [translationData, setTranslationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  // Refs
  const abortControllerRef = useRef(null);
  const wordRefs = useRef([]);
  const cardRef = useRef(null);
  const lastClickTime = useRef(0);

  // Handle word click - Uses unified orchestrator
  const handleWordClick = useCallback(async (word) => {
    // Debounce rapid clicks
    const now = Date.now();
    if (now - lastClickTime.current < CLICK_DEBOUNCE_MS) return;
    lastClickTime.current = now;

    // Cancel pending lookup
    if (abortControllerRef.current) {
      abortControllerRef.current.aborted = true;
    }

    // Toggle off if same word
    if (selectedWord === word) {
      setSelectedWord(null);
      setTranslationData(null);
      return;
    }

    setSelectedWord(word);
    setIsLoading(true);
    setLookupError(null);

    // Immediate local result via quickLookup (synchronous)
    const localResult = quickLookup(word);
    if (localResult) {
      setTranslationData({
        ...localResult,
        language: isAramaic ? 'Aramaic' : 'Hebrew',
        translation: localResult.english // Aramaic compatibility
      });
    }

    // Track for cancellation
    const controller = { aborted: false };
    abortControllerRef.current = controller;

    // Async lookup via unified orchestrator
    try {
      const apiResult = await lookupWord(word, {
        contextType: isAramaic ? 'talmudic' : 'biblical',
        reference,
        includeV6: true,
        includeBinyan: true,
        includeGrammar: true,
        includeFrequency: true
      });

      if (!controller.aborted) {
        const hasResult = apiResult?.english || apiResult?.translation;
        if (hasResult) {
          setTranslationData({
            ...apiResult,
            translation: apiResult.english || apiResult.translation // Aramaic compatibility
          });
          setLookupError(null);
        } else if (!localResult) {
          setLookupError('No definition found.');
        }
      }
    } catch (error) {
      if (!controller.aborted) {
        console.warn('[ClickableText] API lookup failed:', error.message);
        // Set error for user feedback (only if no local result)
        if (!localResult?.english) {
          setLookupError('Unable to fetch definition. Using offline data.');
        }
      }
    } finally {
      if (!controller.aborted) {
        setIsLoading(false);
      }
    }
  }, [selectedWord, isAramaic, reference]);

  const handleClose = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.aborted = true;
    }
    setSelectedWord(null);
    setTranslationData(null);
  }, []);

  const handleSave = useCallback(() => {
    if (translationData && selectedWord) {
      const english = translationData.english || translationData.translation;
      const french = translationData.french || '';
      onSaveWord?.(selectedWord, english, french);
    }
  }, [selectedWord, translationData, onSaveWord]);

  // Load French translation on-demand when showFrench is enabled
  useEffect(() => {
    if (showFrench && translationData?.english && !translationData.french) {
      getFrenchTranslation(translationData.english)
        .then(french => {
          if (french) {
            setTranslationData(prev => ({
              ...prev,
              french
            }));
          }
        })
        .catch(() => {
          // French is optional
        });
    }
  }, [showFrench, translationData?.english, translationData?.french]);

  // PRO SCHOLAR V10: Prefetch on hover for instant lookups
  const handleWordHover = useCallback((word) => {
    // Only prefetch if not already selected (avoid redundant work)
    if (word && word !== selectedWord && word.length >= 2) {
      prefetchWord(word, lookupParallel);
    }
  }, [selectedWord]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e, word, index) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleWordClick(word);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (index > 0) wordRefs.current[index - 1]?.focus();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (index < words.length - 1) wordRefs.current[index + 1]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
      default:
        break;
    }
  }, [handleWordClick, handleClose, words.length]);

  // Global ESC handler + cleanup
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && selectedWord) handleClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
      if (abortControllerRef.current) abortControllerRef.current.aborted = true;
    };
  }, [selectedWord, handleClose]);

  // Focus close button when card opens
  useEffect(() => {
    if (selectedWord && cardRef.current) {
      const closeBtn = cardRef.current.querySelector('.wdc-close, .word-def-close');
      closeBtn?.focus();
    }
  }, [selectedWord]);

  // Render enlarged first letter (Torah style)
  const renderEnlargedFirstWord = useCallback((word) => {
    const firstLetter = word.charAt(0);
    const rest = word.slice(1);
    return (
      <>
        <span className="enlarged-letter" aria-hidden="true">{firstLetter}</span>
        <span className="sr-only">{word}</span>
        <span aria-hidden="true">{rest}</span>
      </>
    );
  }, []);

  if (!text) return null;

  const containerClass = [
    'clickable-text',
    isAramaic ? 'aramaic' : 'hebrew',
    isRashiScript && 'rashi-script',
    enlargeFirstLetter && !isAramaic && 'with-enlarged-first',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClass}
      dir={direction}
      lang={isAramaic ? 'arc' : 'he'}
      role="region"
      aria-label={`${isAramaic ? 'Aramaic' : 'Hebrew'} text with word definitions`}
    >
      <div className="text-words" role="list" aria-label="Clickable words">
        {words.map((word, index) => (
          <React.Fragment key={index}>
            <span
              ref={el => wordRefs.current[index] = el}
              className={[
                'clickable-word',
                isAramaic ? 'aramaic' : 'hebrew',
                !isAramaic && hasLocalTranslation(word) && 'has-translation',
                selectedWord === word && 'active',
                hasWord?.(word) && 'in-vocabulary'
              ].filter(Boolean).join(' ')}
              onClick={() => handleWordClick(word)}
              onMouseEnter={() => handleWordHover(word)}
              onFocus={() => handleWordHover(word)}
              onKeyDown={(e) => handleKeyDown(e, word, index)}
              role="button"
              tabIndex={0}
              aria-pressed={selectedWord === word}
              aria-label={`${word}${hasWord?.(word) ? ' (in vocabulary)' : ''}`}
            >
              {enlargeFirstLetter && index === 0 && !isAramaic
                ? renderEnlargedFirstWord(word)
                : word}
            </span>
            {index < words.length - 1 && ' '}
          </React.Fragment>
        ))}
      </div>

      {selectedWord && (
        <div ref={cardRef}>
          <WordDefinitionCard
            word={selectedWord}
            translationData={translationData}
            isLoading={isLoading}
            lookupError={lookupError}
            isAramaic={isAramaic}
            isRashiScript={isRashiScript}
            showFrench={showFrench}
            isInVocabulary={hasWord?.(selectedWord)}
            onSave={onSaveWord ? handleSave : null}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// PropTypes
// =============================================================================

ClickableText.propTypes = {
  text: PropTypes.string.isRequired,
  language: PropTypes.oneOf(['hebrew', 'aramaic']),
  className: PropTypes.string,
  direction: PropTypes.oneOf(['rtl', 'ltr']),
  onSaveWord: PropTypes.func,
  hasWord: PropTypes.func,
  showFrench: PropTypes.bool,
  enlargeFirstLetter: PropTypes.bool,
  isRashiScript: PropTypes.bool,
  reference: PropTypes.string
};

ClickableText.defaultProps = {
  language: 'hebrew',
  className: '',
  direction: 'rtl',
  showFrench: false,
  enlargeFirstLetter: false,
  isRashiScript: false,
  reference: null
};

// =============================================================================
// Backwards Compatible Exports
// =============================================================================

/** @deprecated Use <ClickableText language="hebrew" /> */
export const ClickableHebrewText = (props) => (
  <ClickableText {...props} language="hebrew" />
);

/** @deprecated Use <ClickableText language="aramaic" /> */
export const ClickableAramaicText = (props) => (
  <ClickableText {...props} language="aramaic" />
);

export default React.memo(ClickableText);
