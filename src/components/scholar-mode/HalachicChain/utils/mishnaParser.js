/**
 * Enhanced Mishna Parser
 *
 * Extracts opinions from Mishnah text with:
 * - Ruling classification (מותר/אסור/חייב/פטור/טמא/טהור/כשר/פסול)
 * - Sevara extraction (reasoning behind each opinion)
 * - Machloket structure (who disagrees with whom)
 * - Proper handling of Tanna Kama vs named Tannaim
 */

import { AUTHORITY_TYPES, AUTHORITY_DISPLAY_NAMES } from '../types';

// ═══════════════════════════════════════════════════════════
// Ruling categories — the fundamental halachic binary pairs
// ═══════════════════════════════════════════════════════════

const RULING_CATEGORIES = {
  permitted_forbidden: {
    positive: { patterns: [/מותר/, /מתיר/, /מתירין/, /מותרת/, /מותרין/], label: 'permitted', hebrew: 'מותר' },
    negative: { patterns: [/אסור/, /אוסר/, /אוסרין/, /אסורה/, /אסורין/], label: 'forbidden', hebrew: 'אסור' }
  },
  liable_exempt: {
    positive: { patterns: [/חייב/, /מחייב/, /חייבין/, /חייבת/], label: 'liable', hebrew: 'חייב' },
    negative: { patterns: [/פטור/, /פוטר/, /פטורין/, /פטורה/], label: 'exempt', hebrew: 'פטור' }
  },
  pure_impure: {
    positive: { patterns: [/טהור/, /מטהר/, /טהורין/, /טהורה/], label: 'pure', hebrew: 'טהור' },
    negative: { patterns: [/טמא/, /מטמא/, /טמאין/, /טמאה/], label: 'impure', hebrew: 'טמא' }
  },
  valid_invalid: {
    positive: { patterns: [/כשר/, /מכשיר/, /כשירה/, /כשרין/], label: 'valid', hebrew: 'כשר' },
    negative: { patterns: [/פסול/, /פוסל/, /פסולה/, /פסולין/], label: 'invalid', hebrew: 'פסול' }
  }
};

// ═══════════════════════════════════════════════════════════
// Opinion patterns — detect who says what
// ═══════════════════════════════════════════════════════════

const OPINION_PATTERNS = [
  // "רבי מאיר אומר: ..." (Rabbi Meir says)
  { regex: /([א-ת\s"']{2,25})\s*(?:אומר|אומרת|אמר|אומרים)\s*[,:]\s*([^.;\n]{5,200})/g, type: 'says' },
  // "דברי רבי מאיר" (the words of Rabbi Meir)
  { regex: /דברי\s+([א-ת\s"']{2,25})/g, type: 'words_of' },
  // "רבי מאיר פוטר/מחייב/..." (Rabbi Meir exempts/obligates)
  { regex: /([א-ת\s"']{2,25})\s*(פוטר|מחייב|מטמא|מטהר|אוסר|מתיר|פוסל|מכשיר)/g, type: 'rules' },
  // "תנא קמא: ..." (first Tanna)
  { regex: /תנא\s+קמא[\s,:]+([^.;\n]{5,200})/g, type: 'tanna_kama' },
  // "חכמים אומרים" (the Sages say)
  { regex: /חכמים\s*(?:אומרים|אומרת|אומר)[\s,:]+([^.;\n]{5,200})/g, type: 'sages' },
  // "וחכמים פוטרין / וחכמים מתירין" (and the Sages exempt)
  { regex: /ו?חכמים\s*(פוטרין|מחייבין|מטמאין|מטהרין|אוסרין|מתירין|פוסלין|מכשירין)/g, type: 'sages_rule' }
];

// Known Tannaim with English names for mapping
const KNOWN_TANNAIM = [
  { hebrew: 'רבי מאיר', english: 'Rabbi Meir' },
  { hebrew: 'רבי יהודה', english: 'Rabbi Yehuda' },
  { hebrew: 'רבי יוסי', english: 'Rabbi Yose' },
  { hebrew: 'רבי שמעון', english: 'Rabbi Shimon' },
  { hebrew: 'רבי עקיבא', english: 'Rabbi Akiva' },
  { hebrew: 'רבי טרפון', english: 'Rabbi Tarfon' },
  { hebrew: 'רבי אליעזר', english: 'Rabbi Eliezer' },
  { hebrew: 'רבי יהושע', english: 'Rabbi Yehoshua' },
  { hebrew: 'רבי אלעזר', english: 'Rabbi Elazar' },
  { hebrew: 'אבא שאול', english: 'Abba Shaul' },
  { hebrew: 'בן עזאי', english: 'Ben Azzai' },
  { hebrew: 'בן זומא', english: 'Ben Zoma' },
  { hebrew: 'שמאי', english: 'Shammai' },
  { hebrew: 'הלל', english: 'Hillel' },
  { hebrew: 'בית שמאי', english: 'Beit Shammai' },
  { hebrew: 'בית הלל', english: 'Beit Hillel' },
  { hebrew: 'רבי נתן', english: 'Rabbi Natan' },
  { hebrew: 'סומכוס', english: 'Sumchus' },
  { hebrew: 'רבי יוחנן בן נורי', english: 'Rabbi Yochanan ben Nuri' },
  { hebrew: 'רבי נחמיה', english: 'Rabbi Nechemya' },
  { hebrew: 'רבן גמליאל', english: 'Rabban Gamliel' },
  { hebrew: 'רבי צדוק', english: 'Rabbi Tzadok' },
  { hebrew: 'תנא קמא', english: 'Tanna Kama' },
  { hebrew: 'חכמים', english: 'Chachamim' }
];

// Sevara (reasoning) indicator patterns
const SEVARA_PATTERNS = [
  /מפני\s+(?:ש|מה)/,       // "because"
  /שנאמר/,                  // "as it says" (scriptural basis)
  /שכן/,                    // "since"
  /מה\s+טעם/,              // "what is the reason"
  /לפי\s+ש/,               // "since"
  /משום\s+(?:ד|ש)/,        // "because of"
  /הואיל\s+ו/,             // "since"
  /שהרי/,                   // "for indeed"
  /דכתיב/                   // "as it is written"
];

// ═══════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════

/**
 * Extract opinions from Mishnah text
 */
export const extractMishnaOpinions = async (text, signal) => {
  const opinions = [];
  const seenAuthorities = new Set();

  if (signal?.aborted) throw new Error('AbortError');

  // Pass 1: Pattern-based extraction
  OPINION_PATTERNS.forEach(({ regex, type }) => {
    let match;
    // Reset regex lastIndex
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      if (signal?.aborted) break;

      let authority, rulingText;

      if (type === 'tanna_kama') {
        authority = 'תנא קמא';
        rulingText = match[1];
      } else if (type === 'sages' || type === 'sages_rule') {
        authority = 'חכמים';
        rulingText = match[1];
      } else if (type === 'words_of') {
        authority = cleanAuthorityName(match[1]);
        rulingText = extractContextAfter(text, match.index + match[0].length, 150);
      } else if (type === 'rules') {
        authority = cleanAuthorityName(match[1]);
        rulingText = match[2]; // The ruling verb itself
      } else {
        authority = cleanAuthorityName(match[1]);
        rulingText = match[2] || match[0];
      }

      if (authority && !seenAuthorities.has(authority)) {
        seenAuthorities.add(authority);

        // Classify the ruling
        const classification = classifyRuling(rulingText);

        // Extract sevara (reasoning)
        const sevara = extractSevara(text, match.index, match[0].length);

        // Map to English name
        const englishName = mapToEnglish(authority);

        opinions.push({
          authority: englishName || authority,
          authorityHebrew: authority,
          authorityType: AUTHORITY_TYPES.TANNA,
          ruling: classification.label,
          rulingHebrew: classification.hebrew,
          rulingCategory: classification.category,
          rulingText: cleanRuling(rulingText),
          text: text,
          reasoning: sevara,
          isAccepted: false,
          rejectedBy: [],
          supportedBy: []
        });
      }
    }
  });

  // Pass 2: Known Tannaim lookup (catch any missed)
  KNOWN_TANNAIM.forEach(({ hebrew, english }) => {
    if (signal?.aborted) return;
    if (text.includes(hebrew) && !seenAuthorities.has(hebrew) && !seenAuthorities.has(english)) {
      seenAuthorities.add(hebrew);
      const index = text.indexOf(hebrew);
      const context = extractContextAfter(text, index + hebrew.length, 200);
      const classification = classifyRuling(context);
      const sevara = extractSevara(text, index, hebrew.length);

      opinions.push({
        authority: english,
        authorityHebrew: hebrew,
        authorityType: AUTHORITY_TYPES.TANNA,
        ruling: classification.label,
        rulingHebrew: classification.hebrew,
        rulingCategory: classification.category,
        rulingText: cleanRuling(context),
        text: text,
        reasoning: sevara,
        isAccepted: false,
        rejectedBy: [],
        supportedBy: []
      });
    }
  });

  // Sort by appearance order
  opinions.sort((a, b) => {
    const idxA = text.indexOf(a.authorityHebrew);
    const idxB = text.indexOf(b.authorityHebrew);
    return idxA - idxB;
  });

  // Mark Tanna Kama as the default (often the accepted opinion)
  if (opinions.length > 0 && opinions[0].authority === 'Tanna Kama') {
    opinions[0].isAccepted = true; // Default assumption, will be overridden by chain analysis
  }

  return opinions;
};

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Classify a ruling into a halachic category
 */
const classifyRuling = (text) => {
  if (!text) return { label: 'discusses', hebrew: '', category: null };

  for (const [category, { positive, negative }] of Object.entries(RULING_CATEGORIES)) {
    for (const pattern of positive.patterns) {
      if (pattern.test(text)) {
        return { label: positive.label, hebrew: positive.hebrew, category };
      }
    }
    for (const pattern of negative.patterns) {
      if (pattern.test(text)) {
        return { label: negative.label, hebrew: negative.hebrew, category };
      }
    }
  }

  return { label: 'discusses', hebrew: '', category: null };
};

/**
 * Extract sevara (reasoning) near an opinion
 */
const extractSevara = (text, opinionIndex, opinionLength) => {
  // Look for reasoning patterns within 300 chars after the opinion
  const searchStart = opinionIndex + opinionLength;
  const searchEnd = Math.min(text.length, searchStart + 300);
  const searchText = text.substring(searchStart, searchEnd);

  for (const pattern of SEVARA_PATTERNS) {
    const match = searchText.match(pattern);
    if (match) {
      // Extract the reasoning text after the pattern
      const reasonStart = match.index;
      const reasonEnd = Math.min(searchText.length, reasonStart + 200);
      const reason = searchText.substring(reasonStart, reasonEnd).trim();
      // Cut at sentence boundary
      const sentenceEnd = reason.search(/[.:\n]/);
      return sentenceEnd > 10 ? reason.substring(0, sentenceEnd) : reason;
    }
  }

  return null;
};

const cleanAuthorityName = (name) => {
  if (!name) return null;
  return name.trim()
    .replace(/["':\s]+$/g, '')
    .replace(/^["':\s]+/g, '')
    .replace(/\s+/g, ' ');
};

const mapToEnglish = (hebrewName) => {
  const found = KNOWN_TANNAIM.find(t => t.hebrew === hebrewName);
  if (found) return found.english;
  // Check AUTHORITY_DISPLAY_NAMES
  for (const [eng, info] of Object.entries(AUTHORITY_DISPLAY_NAMES)) {
    if (info.hebrew === hebrewName) return eng;
  }
  return null;
};

const cleanRuling = (ruling) => {
  if (!ruling) return '';
  return ruling.trim().substring(0, 250).replace(/\s+/g, ' ');
};

const extractContextAfter = (text, position, length) => {
  const end = Math.min(text.length, position + length);
  return text.substring(position, end).trim();
};

/**
 * Check if text is Mishnah (vs Gemara)
 */
export const isMishnaText = (text) => {
  const mishnaIndicators = [
    /^משנה/, /^מתניתין/, /מתני\s*'/, /תנן/, /תנא\s/,
    /^(?:(?:רבי|בן)\s+[א-ת]{2,10}\s+אומר)/
  ];
  return mishnaIndicators.some(pattern => pattern.test(text.trim()));
};

export default { extractMishnaOpinions, isMishnaText };
