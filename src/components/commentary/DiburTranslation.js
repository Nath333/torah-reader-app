import React, { useState, useEffect, useRef } from 'react';
import { translateEnglishToFrench } from '../../services/englishToFrenchService';
import SafeText from '../core/SafeText';
import { SourceBadge } from '../shared/SourceBadge';

/**
 * Helper function to extract English translation of dibbur from Rashi comment
 * Returns both the translation and its source
 */
export const extractDibburTranslation = (englishText, hebrewDibbur) => {
  if (!englishText) return { text: null, source: null };

  // Pattern 1: "Hebrew ENGLISH TRANSLATION - explanation"
  const capsMatch = englishText.match(/^[^\s]+ ([A-Z][A-Z\s]+)(?:\s*[-\u2013\u2014]|\s+[a-z])/);
  if (capsMatch) {
    return { text: capsMatch[1].trim(), source: 'Sefaria' };
  }

  // Pattern 2: Extract text before the first dash
  const beforeDash = englishText.split(/\s*[-\u2013\u2014]\s*/)[0];
  if (beforeDash && beforeDash.length < 50) {
    const englishOnly = beforeDash.replace(/[\u0590-\u05FF]/g, '').trim();
    if (englishOnly) return { text: englishOnly.toUpperCase(), source: 'Sefaria' };
  }

  // Pattern 3: Common dibbur translations (from local dictionary)
  const dibbburMap = {
    '\u05D1\u05E8\u05D0\u05E9\u05D9\u05EA': 'IN THE BEGINNING',
    '\u05D1\u05E8\u05D0': 'CREATED',
    '\u05D0\u05DC\u05D4\u05D9\u05DD': 'GOD',
    '\u05D0\u05EA': 'THE / WITH',
    '\u05D4\u05E9\u05DE\u05D9\u05DD': 'THE HEAVENS',
    '\u05D5\u05D4\u05D0\u05E8\u05E5': 'AND THE EARTH',
    '\u05D5\u05D9\u05D0\u05DE\u05E8': 'AND HE SAID',
    '\u05D9\u05D4\u05D9': 'LET THERE BE',
    '\u05D0\u05D5\u05E8': 'LIGHT',
    '\u05D8\u05D5\u05D1': 'GOOD',
    '\u05D5\u05D9\u05D4\u05D9': 'AND IT WAS',
    '\u05DB\u05D9': 'THAT / BECAUSE',
  };

  const cleanDibbur = hebrewDibbur?.replace(/[.,:]/g, '');
  if (cleanDibbur && dibbburMap[cleanDibbur]) {
    return { text: dibbburMap[cleanDibbur], source: 'Dictionary' };
  }

  return { text: null, source: null };
};

/**
 * DiburTranslation - Displays dibbur translation with French support and source attribution
 */
const DiburTranslation = React.memo(({ englishText, hebrewDibbur }) => {
  const [frenchTrans, setFrenchTrans] = useState('');
  const [frenchSource, setFrenchSource] = useState(null);
  const attemptedRef = useRef(null); // Track which englishTrans was attempted
  const { text: englishTrans, source: englishSource } = extractDibburTranslation(englishText, hebrewDibbur);

  useEffect(() => {
    // Skip if no English translation or already attempted for this text
    if (!englishTrans || attemptedRef.current === englishTrans) return;

    // Mark as attempted for this specific text
    attemptedRef.current = englishTrans;
    let isMounted = true;

    translateEnglishToFrench(englishTrans).then(fr => {
      if (isMounted && fr) {
        setFrenchTrans(fr.toUpperCase());
        setFrenchSource('Google Translate');
      }
    }).catch(() => {
      // Silently fail - French translation is optional
    });

    return () => { isMounted = false; };
  }, [englishTrans]);

  if (!englishTrans) return null;

  return (
    <div className="dibbur-translation">
      <div className="dibbur-trans-row">
        <span className="dibbur-trans-label">EN</span>
        <span className="dibbur-trans-text">
          <SafeText text={englishTrans} lang="en" />
        </span>
        {englishSource && (
          <SourceBadge source={englishSource} compact />
        )}
      </div>
      {frenchTrans && (
        <div className="dibbur-trans-row">
          <span className="dibbur-trans-label fr">FR</span>
          <span className="dibbur-trans-text">
            <SafeText text={frenchTrans} lang="fr" />
          </span>
          {frenchSource && (
            <SourceBadge source={frenchSource} compact />
          )}
        </div>
      )}
    </div>
  );
});

export default DiburTranslation;
