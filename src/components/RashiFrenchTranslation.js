import React, { useState, useEffect } from 'react';
import { translateEnglishToFrench } from '../services/englishToFrenchService';
import SafeText from './SafeText';

/**
 * RashiFrenchTranslation - Displays French translation of Rashi commentary
 * Translates the English Rashi text to French when showFrench is enabled
 */
const RashiFrenchTranslation = React.memo(({ englishText }) => {
  const [frenchTrans, setFrenchTrans] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (englishText) {
      setIsLoading(true);
      translateEnglishToFrench(englishText).then(fr => {
        if (fr) {
          setFrenchTrans(fr);
        }
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
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
