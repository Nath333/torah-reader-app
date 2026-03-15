import React, { useState, useEffect } from 'react';
import { translateEnglishToFrench } from '../services/englishToFrenchService';
import SafeText from './SafeText';

/**
 * Helper function to extract English translation of dibbur from Rashi comment
 */
export const extractDibburTranslation = (englishText, hebrewDibbur) => {
  if (!englishText) return null;

  // Pattern 1: "Hebrew ENGLISH TRANSLATION - explanation"
  const capsMatch = englishText.match(/^[^\s]+ ([A-Z][A-Z\s]+)(?:\s*[-\u2013\u2014]|\s+[a-z])/);
  if (capsMatch) {
    return capsMatch[1].trim();
  }

  // Pattern 2: Extract text before the first dash
  const beforeDash = englishText.split(/\s*[-\u2013\u2014]\s*/)[0];
  if (beforeDash && beforeDash.length < 50) {
    const englishOnly = beforeDash.replace(/[\u0590-\u05FF]/g, '').trim();
    if (englishOnly) return englishOnly.toUpperCase();
  }

  // Pattern 3: Common dibbur translations
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
    return dibbburMap[cleanDibbur];
  }

  return null;
};

/**
 * DiburTranslation - Displays dibbur translation with French support
 */
const DiburTranslation = React.memo(({ englishText, hebrewDibbur }) => {
  const [frenchTrans, setFrenchTrans] = useState('');
  const englishTrans = extractDibburTranslation(englishText, hebrewDibbur);

  useEffect(() => {
    if (englishTrans) {
      translateEnglishToFrench(englishTrans).then(fr => {
        if (fr) setFrenchTrans(fr.toUpperCase());
      });
    }
  }, [englishTrans]);

  if (!englishTrans) return null;

  return (
    <div className="dibbur-translation">
      <span className="dibbur-trans-label">EN:</span>
      <span className="dibbur-trans-text">
        <SafeText text={englishTrans} lang="en" />
      </span>
      {frenchTrans && (
        <>
          <span className="dibbur-trans-label fr">FR:</span>
          <span className="dibbur-trans-text">
            <SafeText text={frenchTrans} lang="fr" />
          </span>
        </>
      )}
    </div>
  );
});

export default DiburTranslation;
