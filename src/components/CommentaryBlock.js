import React, { useState, useCallback, useMemo } from 'react';
import { translateCommentary } from '../services/translationService';
import { removeHtmlTags } from '../utils/sanitize';
import { getStoredApiKey } from '../services/groqService';
import { getCommentaryIcon } from '../config/commentaryConfig';
import ClickableText from './ClickableText';
import CommentarySummary from './CommentarySummary';
import './CommentaryBlock.css';

/**
 * CommentaryGroup - Displays a group of commentaries from a single source
 */
export const CommentaryGroup = React.memo(({
  commentaries,
  source,
  showClickableText = true,
  verse = ''
}) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const hebrewCommentaries = commentaries.filter(c => c.language === 'hebrew');
  const englishCommentaries = commentaries.filter(c => c.language === 'english');
  const icon = getCommentaryIcon(source);
  const hasApiKey = !!getStoredApiKey();

  // Get combined text for summarization
  const getCommentaryText = useCallback(() => {
    const hebrewText = hebrewCommentaries.map(c => removeHtmlTags(c.text)).join('\n\n');
    const englishText = englishCommentaries.map(c => removeHtmlTags(c.text)).join('\n\n');
    return englishText || hebrewText; // Prefer English for summarization
  }, [hebrewCommentaries, englishCommentaries]);

  return (
    <div className="commentary-source-group">
      <div className="commentary-header">
        <div className="commentary-source">
          <span className="source-icon">{icon}</span>
          <span className="source-name">{source}</span>
        </div>
        <div className="commentary-actions">
          {hasApiKey && hebrewCommentaries.length + englishCommentaries.length > 0 && (
            <button
              className={`ai-summary-toggle ${showSummary ? 'active' : ''}`}
              onClick={() => setShowSummary(!showSummary)}
              title={showSummary ? 'Hide AI summary' : 'Generate AI summary with diagram'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {showSummary ? 'Hide AI' : 'Summarize'}
            </button>
          )}
          {hebrewCommentaries.length > 0 && (
            <button
              className={`translate-toggle ${showTranslation ? 'active' : ''}`}
              onClick={() => setShowTranslation(!showTranslation)}
              title={showTranslation ? 'Hide translation' : 'Show translation'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {showTranslation ? 'Hide' : 'Translate'}
            </button>
          )}
        </div>
      </div>

      {/* AI Summary Section */}
      {showSummary && (
        <CommentarySummary
          commentaryText={getCommentaryText()}
          source={source}
          verse={verse}
          onClose={() => setShowSummary(false)}
        />
      )}

      <div className="commentary-body">
        {hebrewCommentaries.map((commentary, index) => (
          <div key={`he-${index}`} className="commentary-entry">
            {showClickableText ? (
              <ClickableText
                language="hebrew"
                text={removeHtmlTags(commentary.text, ['i', 'sup'])}
                className="commentary-text hebrew-commentary"
              />
            ) : (
              <div className="commentary-text hebrew-commentary" dir="rtl" lang="he">
                {removeHtmlTags(commentary.text, ['i', 'sup'])}
              </div>
            )}
            {showTranslation && translateCommentary(commentary.text) && (
              <div className="commentary-text english-translation slide-down">
                {translateCommentary(commentary.text)}
              </div>
            )}
          </div>
        ))}
        {englishCommentaries.map((commentary, index) => (
          <div key={`en-${index}`} className="commentary-entry">
            <div className="commentary-text english-text" lang="en">
              {removeHtmlTags(commentary.text)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * CommentaryContent - Container that groups commentaries by source
 */
export const CommentaryContent = React.memo(({ commentaries, verse = '' }) => {
  const groupedSources = useMemo(() => {
    const grouped = {};
    commentaries.forEach(c => {
      if (!grouped[c.source]) grouped[c.source] = [];
      grouped[c.source].push(c);
    });
    return Object.keys(grouped).sort().map(source => ({
      source,
      commentaries: grouped[source]
    }));
  }, [commentaries]);

  return (
    <div className="commentary-content">
      {groupedSources.map(({ source, commentaries }) => (
        <CommentaryGroup
          key={source}
          source={source}
          commentaries={commentaries}
          verse={verse}
        />
      ))}
    </div>
  );
});

export default CommentaryContent;
