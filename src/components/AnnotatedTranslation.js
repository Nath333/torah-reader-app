import React, { useMemo } from 'react';
import { parseAnnotatedTranslation } from '../utils/sanitize';
import './AnnotatedTranslation.css';

/**
 * AnnotatedTranslationInline - Renders translations with bold for direct translations
 *
 * Sefaria marks direct translations of Hebrew/Aramaic words with <b>/<strong> tags.
 * This component preserves that markup:
 * - BOLD: Direct translation of source text (e.g., MISHNA, carrying out, Shabbat)
 * - Normal: Added context/explanation by translators
 *
 * Example:
 * Hebrew: מַתְנִי׳ יְצִיאוֹת הַשַּׁבָּת
 * Display: **MISHNA:** The acts of **carrying out**...
 */
export const AnnotatedTranslationInline = React.memo(({ text, language = 'en' }) => {
  const parts = useMemo(() => parseAnnotatedTranslation(text), [text]);

  if (!text) return null;

  return (
    <span className="annotated-translation" lang={language}>
      {parts.map((part) => (
        part.type === 'bold' ? (
          <strong key={part.key} className="direct-translation">
            {part.content}
          </strong>
        ) : (
          <span key={part.key} className="context-text">
            {part.content}
          </span>
        )
      ))}
    </span>
  );
});

// Default export for backwards compatibility
const AnnotatedTranslation = AnnotatedTranslationInline;
export default AnnotatedTranslation;
