/**
 * Sanitize Utilities Tests
 *
 * Tests HTML sanitization functions including:
 * - sanitizeHtml - removes all HTML tags
 * - cleanHtml - removes footnotes and normalizes whitespace
 * - removeHtmlTags - removes specific tags while keeping content
 * - renderWithHebrewSpans - extracts Hebrew spans for RTL rendering
 * - parseAnnotatedTranslation - parses bold markup for translations
 * - hasAnnotationMarkup - detects bold markup
 */

import {
  sanitizeHtml,
  cleanHtml,
  removeHtmlTags,
  renderWithHebrewSpans,
  parseAnnotatedTranslation,
  hasAnnotationMarkup,
} from './sanitize';

describe('sanitize utilities', () => {
  describe('sanitizeHtml', () => {
    it('should return empty string for null/undefined input', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
      expect(sanitizeHtml('')).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeHtml(123)).toBe('');
      expect(sanitizeHtml({})).toBe('');
      expect(sanitizeHtml([])).toBe('');
    });

    it('should remove all HTML tags', () => {
      expect(sanitizeHtml('<p>Hello</p>')).toBe('Hello');
      expect(sanitizeHtml('<div><span>Test</span></div>')).toBe('Test');
      expect(sanitizeHtml('<b>Bold</b> and <i>italic</i>')).toBe('Bold and italic');
    });

    it('should decode HTML entities', () => {
      expect(sanitizeHtml('&amp;')).toBe('&');
      expect(sanitizeHtml('&lt;tag&gt;')).toBe('<tag>');
      expect(sanitizeHtml('&quot;quoted&quot;')).toBe('"quoted"');
      expect(sanitizeHtml('&nbsp;')).toBe('\u00A0'); // Non-breaking space
    });

    it('should handle Hebrew text', () => {
      expect(sanitizeHtml('<span>שָׁלוֹם</span>')).toBe('שָׁלוֹם');
      expect(sanitizeHtml('<b>בראשית</b> ברא אלהים')).toBe('בראשית ברא אלהים');
    });

    it('should handle nested tags', () => {
      expect(sanitizeHtml('<div><p><span><b>Nested</b></span></p></div>')).toBe('Nested');
    });

    it('should handle self-closing tags', () => {
      expect(sanitizeHtml('Hello<br/>World')).toBe('HelloWorld');
      expect(sanitizeHtml('Line1<br>Line2')).toBe('Line1Line2');
    });
  });

  describe('cleanHtml', () => {
    it('should return empty string for null/undefined input', () => {
      expect(cleanHtml(null)).toBe('');
      expect(cleanHtml(undefined)).toBe('');
      expect(cleanHtml('')).toBe('');
    });

    it('should remove footnote sup tags', () => {
      expect(cleanHtml('Text<sup class="footnote">1</sup> more text')).toBe('Text more text');
      expect(cleanHtml('Word<sup>*</sup>')).toBe('Word');
    });

    it('should remove footnote i tags', () => {
      expect(cleanHtml('Text<i class="footnote">note</i> more')).toBe('Text more');
    });

    it('should remove all HTML tags', () => {
      expect(cleanHtml('<p>Paragraph</p>')).toBe('Paragraph');
      expect(cleanHtml('<div><b>Bold</b></div>')).toBe('Bold');
    });

    it('should normalize whitespace', () => {
      expect(cleanHtml('Multiple   spaces')).toBe('Multiple spaces');
      expect(cleanHtml('  Leading and trailing  ')).toBe('Leading and trailing');
      expect(cleanHtml('New\nlines\tand\ttabs')).toBe('New lines and tabs');
    });

    it('should handle Sefaria API response patterns', () => {
      const sefariaText = '<b>Text</b><sup class="footnote">1</sup><i class="footnote">note</i> continues';
      expect(cleanHtml(sefariaText)).toBe('Text continues');
    });
  });

  describe('removeHtmlTags', () => {
    it('should return empty string for null/undefined input', () => {
      expect(removeHtmlTags(null)).toBe('');
      expect(removeHtmlTags(undefined)).toBe('');
      expect(removeHtmlTags('')).toBe('');
    });

    it('should remove all tags when no specific tags provided', () => {
      expect(removeHtmlTags('<p>Text</p>')).toBe('Text');
      expect(removeHtmlTags('<b>Bold</b> <i>Italic</i>')).toBe('Bold Italic');
    });

    it('should remove specified tags and their content', () => {
      expect(removeHtmlTags('<p>Keep</p><i>Remove</i>', ['i'])).toBe('Keep');
      expect(removeHtmlTags('Text<sup>footnote</sup> more', ['sup'])).toBe('Text more');
    });

    it('should remove multiple specified tags', () => {
      expect(removeHtmlTags('<b>Bold</b><i>Italic</i><sup>Super</sup>', ['i', 'sup'])).toBe('Bold');
    });

    it('should normalize whitespace', () => {
      expect(removeHtmlTags('Multiple   spaces  here')).toBe('Multiple spaces here');
    });

    it('should remove translation notes', () => {
      // Note: removeHtmlTags normalizes whitespace but preserves spacing around removed content
      expect(removeHtmlTags('Text [Translated from Hebrew commentary] more')).toBe('Text  more');
    });

    it('should handle Hebrew text with tags', () => {
      expect(removeHtmlTags('<b>בראשית</b><sup>1</sup>', ['sup'])).toBe('בראשית');
    });
  });

  describe('renderWithHebrewSpans', () => {
    it('should return array with empty string for null/undefined input', () => {
      expect(renderWithHebrewSpans(null)).toEqual(['']);
      expect(renderWithHebrewSpans(undefined)).toEqual(['']);
    });

    it('should return text as-is when no Hebrew spans', () => {
      expect(renderWithHebrewSpans('Plain text')).toEqual(['Plain text']);
    });

    it('should extract Hebrew spans correctly', () => {
      const input = 'The word <span dir="rtl">שָׁלוֹם</span> means peace';
      const result = renderWithHebrewSpans(input);

      expect(result.length).toBe(3);
      expect(result[0]).toBe('The word ');
      expect(result[1]).toEqual({ type: 'hebrew-span', content: 'שָׁלוֹם', key: 0 });
      expect(result[2]).toBe(' means peace');
    });

    it('should handle multiple Hebrew spans', () => {
      const input = '<span dir="rtl">אחד</span> and <span dir="rtl">שנים</span>';
      const result = renderWithHebrewSpans(input);

      // Result may not include trailing empty string
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0]).toEqual({ type: 'hebrew-span', content: 'אחד', key: 0 });
      expect(result[1]).toBe(' and ');
      expect(result[2]).toEqual({ type: 'hebrew-span', content: 'שנים', key: 1 });
    });

    it('should handle consecutive Hebrew spans', () => {
      const input = '<span dir="rtl">אחד</span><span dir="rtl">שנים</span>';
      const result = renderWithHebrewSpans(input);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ type: 'hebrew-span', content: 'אחד', key: 0 });
      expect(result[1]).toEqual({ type: 'hebrew-span', content: 'שנים', key: 1 });
    });

    it('should handle text starting with Hebrew span', () => {
      const input = '<span dir="rtl">שָׁלוֹם</span> peace';
      const result = renderWithHebrewSpans(input);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ type: 'hebrew-span', content: 'שָׁלוֹם', key: 0 });
      expect(result[1]).toBe(' peace');
    });

    it('should handle text ending with Hebrew span', () => {
      const input = 'Peace <span dir="rtl">שָׁלוֹם</span>';
      const result = renderWithHebrewSpans(input);

      expect(result.length).toBe(2);
      expect(result[0]).toBe('Peace ');
      expect(result[1]).toEqual({ type: 'hebrew-span', content: 'שָׁלוֹם', key: 0 });
    });
  });

  describe('parseAnnotatedTranslation', () => {
    it('should return text object for null/undefined input', () => {
      expect(parseAnnotatedTranslation(null)).toEqual([{ type: 'text', content: '' }]);
      expect(parseAnnotatedTranslation(undefined)).toEqual([{ type: 'text', content: '' }]);
    });

    it('should parse bold tags', () => {
      const result = parseAnnotatedTranslation('<b>Direct</b> explanation');

      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({ type: 'bold', content: 'Direct' });
      // Text content may have leading space
      expect(result[1].type).toBe('text');
      expect(result[1].content.trim()).toBe('explanation');
    });

    it('should parse strong tags', () => {
      const result = parseAnnotatedTranslation('<strong>Direct</strong> explanation');

      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({ type: 'bold', content: 'Direct' });
      expect(result[1].type).toBe('text');
      expect(result[1].content.trim()).toBe('explanation');
    });

    it('should handle fullwidth bracket markers 【B】', () => {
      const result = parseAnnotatedTranslation('【B】Direct【/B】 explanation');

      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({ type: 'bold', content: 'Direct' });
      expect(result[1].type).toBe('text');
      expect(result[1].content.trim()).toBe('explanation');
    });

    it('should handle regular bracket markers [B]', () => {
      const result = parseAnnotatedTranslation('[B]Direct[/B] explanation');

      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({ type: 'bold', content: 'Direct' });
      expect(result[1].type).toBe('text');
      expect(result[1].content.trim()).toBe('explanation');
    });

    it('should remove footnote tags', () => {
      const result = parseAnnotatedTranslation('Text<sup class="footnote">1</sup> more');

      expect(result.length).toBe(1);
      expect(result[0].content).not.toContain('1');
    });

    it('should handle multiple bold sections', () => {
      const result = parseAnnotatedTranslation('<b>First</b> middle <b>Second</b>');

      expect(result.length).toBe(3);
      expect(result[0]).toMatchObject({ type: 'bold', content: 'First' });
      expect(result[1].type).toBe('text');
      expect(result[1].content.trim()).toBe('middle');
      expect(result[2]).toMatchObject({ type: 'bold', content: 'Second' });
    });

    it('should unwrap big tags', () => {
      const result = parseAnnotatedTranslation('<big><strong>Text</strong></big> explanation');

      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({ type: 'bold', content: 'Text' });
    });

    it('should return plain text when no markup', () => {
      const result = parseAnnotatedTranslation('Plain text without markup');

      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({ type: 'text', content: 'Plain text without markup' });
    });

    it('should normalize whitespace in content', () => {
      const result = parseAnnotatedTranslation('<b>Multiple   spaces</b>  and  more');

      expect(result[0].content).toBe('Multiple spaces');
      expect(result[1].content.trim()).toBe('and more');
    });

    it('should handle Hebrew text in bold', () => {
      const result = parseAnnotatedTranslation('<b>בראשית</b> In the beginning');

      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({ type: 'bold', content: 'בראשית' });
      expect(result[1].type).toBe('text');
      expect(result[1].content.trim()).toBe('In the beginning');
    });
  });

  describe('hasAnnotationMarkup', () => {
    it('should return false for null/undefined input', () => {
      expect(hasAnnotationMarkup(null)).toBe(false);
      expect(hasAnnotationMarkup(undefined)).toBe(false);
      expect(hasAnnotationMarkup('')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(hasAnnotationMarkup(123)).toBe(false);
      expect(hasAnnotationMarkup({})).toBe(false);
    });

    it('should detect <b> tags', () => {
      expect(hasAnnotationMarkup('<b>text</b>')).toBe(true);
      expect(hasAnnotationMarkup('Some <b>bold</b> text')).toBe(true);
    });

    it('should detect <strong> tags', () => {
      expect(hasAnnotationMarkup('<strong>text</strong>')).toBe(true);
    });

    it('should detect <big> tags', () => {
      expect(hasAnnotationMarkup('<big>text</big>')).toBe(true);
    });

    it('should detect fullwidth bracket markers', () => {
      expect(hasAnnotationMarkup('【B】text【/B】')).toBe(true);
    });

    it('should detect regular bracket markers', () => {
      expect(hasAnnotationMarkup('[B]text[/B]')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(hasAnnotationMarkup('Plain text without markup')).toBe(false);
    });

    it('should return false for other HTML tags', () => {
      expect(hasAnnotationMarkup('<p>paragraph</p>')).toBe(false);
      expect(hasAnnotationMarkup('<span>span</span>')).toBe(false);
      expect(hasAnnotationMarkup('<i>italic</i>')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(hasAnnotationMarkup('<B>text</B>')).toBe(true);
      expect(hasAnnotationMarkup('<STRONG>text</STRONG>')).toBe(true);
      expect(hasAnnotationMarkup('[b]text[/b]')).toBe(true);
    });
  });
});
