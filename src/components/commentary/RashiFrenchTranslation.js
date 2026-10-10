import React, { useState, useEffect, useRef } from 'react';
import { translateEnglishToFrench } from '../../services/dictionaries/englishToFrenchService';
import SafeText from '../core/SafeText';

// Le texte anglais de Rashi chez Sefaria commence par le dibbour HÉBREU
// (« בראשית IN THE BEGINNING — Rabbi Isaac said: … ») — envoyé tel quel au
// traducteur EN→FR, il produisait « Traduction non disponible ». On retire
// le préambule hébreu avant de traduire.
const stripDibbur = (text) => {
  const cleaned = text.replace(/^[֐-׿־ׇ"”'’\s—–-]+/, '').trim();
  return cleaned || text;
};

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
    translateEnglishToFrench(stripDibbur(englishText)).then(fr => {
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
