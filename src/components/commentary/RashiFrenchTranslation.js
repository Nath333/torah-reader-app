import React, { useState, useEffect, useRef } from 'react';
import { translateEnglishToFrench } from '../../services/dictionaries/englishToFrenchService';
import SafeText from '../core/SafeText';

/**
 * RashiFrenchTranslation - Displays French translation of Rashi commentary
 * Translates the English Rashi text to French when showFrench is enabled
 */
const RashiFrenchTranslation = React.memo(({ englishText }) => {
  const [frenchTrans, setFrenchTrans] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const attemptedRef = useRef(null); // Track which englishText was attempted

  useEffect(() => {
    // Skip if no text or already attempted for this text
    if (!englishText || attemptedRef.current === englishText) {
      return;
    }

    // Mark as attempted for this specific text
    attemptedRef.current = englishText;
    let isMounted = true;

    setIsLoading(true);
    translateEnglishToFrench(englishText).then(fr => {
      if (isMounted) {
        if (fr) setFrenchTrans(fr);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, [englishText]);

  if (!englishText) return null;

  return (
    <div className="rashi-french" lang="fr">
      <span className="translation-label">FR:</span>
      {isLoading ? (
        <span className="loading-text">Chargement...</span>
      ) : frenchTrans ? (
        <SafeText text={frenchTrans} lang="fr" />
      ) : (
        <span className="translation-unavailable">Traduction non disponible</span>
      )}
    </div>
  );
});

export default RashiFrenchTranslation;
