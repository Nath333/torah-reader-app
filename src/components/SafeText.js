import React, { useMemo } from 'react';
import { renderWithHebrewSpans } from '../utils/sanitize';

/**
 * SafeText - Safely renders text with proper Hebrew/RTL handling
 * Converts <span dir="rtl">...</span> patterns to properly rendered React elements
 */
const SafeText = React.memo(({ text, className, lang }) => {
  const parts = useMemo(() => renderWithHebrewSpans(text), [text]);

  return (
    <span className={className} lang={lang}>
      {parts.map((part, index) =>
        typeof part === 'object' && part.type === 'hebrew-span'
          ? <span key={part.key} dir="rtl" className="inline-hebrew">{part.content}</span>
          : <span key={index}>{part}</span>
      )}
    </span>
  );
});

export default SafeText;
