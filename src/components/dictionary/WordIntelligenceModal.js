/**
 * WordIntelligenceModal - Modal wrapper for WordIntelligenceCard
 *
 * Uses ModalContext to show word details from anywhere in the app.
 * No prop drilling needed - just call openWordDetail(word) from any component.
 *
 * @example
 * // In any component:
 * const { openWordDetail } = useWordDetail();
 * onClick={() => openWordDetail('שָׁלוֹם')}
 *
 * // Or using the modal context directly:
 * const { handlers } = useModals();
 * handlers.wordDetail.open({ word: 'שָׁלוֹם' });
 */

import React, { useCallback } from 'react';
import { useModals, useModal } from '../../context/ModalContext';
import ErrorBoundary from '../shared/ErrorBoundary';
import WordIntelligenceCard from './WordIntelligenceCard';
import { FEATURES } from '../../services/featureFlags';
import './WordIntelligenceModal.css';

/**
 * WordIntelligenceModal - Renders the modal overlay
 * Place this once at the app root level
 */
const WordIntelligenceModal = () => {
  const { modals, modalData, handlers } = useModals();

  const isOpen = modals.wordDetail;
  const data = modalData.wordDetail || {};
  const { word, onWordClick: customWordClick, ...options } = data;

  // Handle clicking a related word - open new modal with that word
  const handleWordClick = useCallback((newWord) => {
    if (customWordClick) {
      customWordClick(newWord);
    } else {
      // Default: open new word in same modal
      handlers.wordDetail.open({ word: newWord, ...options });
    }
  }, [customWordClick, handlers.wordDetail, options]);

  if (!isOpen || !word) return null;
  if (!FEATURES.WORD_INTELLIGENCE) return null;

  return (
    <div
      className="word-intelligence-modal-overlay"
      onClick={handlers.wordDetail.close}
      style={{ zIndex: handlers.wordDetail.zIndex }}
    >
      <div
        className="word-intelligence-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <ErrorBoundary name="WordIntelligenceCard" compact>
          <WordIntelligenceCard
            word={word}
            onClose={handlers.wordDetail.close}
            onWordClick={handleWordClick}
            showSRS={options.showSRS !== false}
            showEtymology={options.showEtymology !== false}
            showRelated={options.showRelated !== false}
            compact={options.compact || false}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

/**
 * useWordDetail - Convenience hook for opening word details
 *
 * @example
 * const { openWordDetail, closeWordDetail, isOpen, currentWord } = useWordDetail();
 *
 * // Open word detail modal
 * openWordDetail('שָׁלוֹם');
 *
 * // With options
 * openWordDetail('שָׁלוֹם', { showSRS: false, compact: true });
 */
export function useWordDetail() {
  const wordDetailModal = useModal('wordDetail');

  const openWordDetail = useCallback((word, options = {}) => {
    if (!word) return;
    wordDetailModal.open({ word, ...options });
  }, [wordDetailModal]);

  return {
    openWordDetail,
    closeWordDetail: wordDetailModal.close,
    isOpen: wordDetailModal.isOpen(),
    currentWord: wordDetailModal.data?.word || null,
    data: wordDetailModal.data,
  };
}

export default WordIntelligenceModal;
