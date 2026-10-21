// =============================================================================
// Résumé TF-IDF de textes talmudiques (algorithmique, sans IA)
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { stripAllDiacritics } from '../../../utils/hebrewUtils';
import { extractKeyTerms } from './extractors';

// =============================================================================
// PRO SCHOLAR TF-IDF TEXT SUMMARIZER - Algorithmic Talmudic Analysis
// =============================================================================

/**
 * TF-IDF (Term Frequency-Inverse Document Frequency) Summarizer
 * PRO SCHOLAR Edition - Optimized for Talmudic/Rabbinic Hebrew-Aramaic texts
 *
 * Pure algorithmic approach (no AI) that:
 * 1. Uses TF-IDF to find statistically significant terms
 * 2. Applies Talmudic structural awareness (Mishna, Gemara, etc.)
 * 3. Extracts key segments by importance scoring
 *
 * @class TalmudicTextSummarizer
 */
class TalmudicTextSummarizer {
  constructor() {
    // Hebrew/Aramaic stop words - comprehensive for Talmudic texts (V2 expanded)
    this.stopWords = new Set([
      // Hebrew pronouns & particles
      'את', 'של', 'על', 'אל', 'מן', 'עם', 'כי', 'לא', 'גם', 'או', 'אם', 'כל',
      'זה', 'זו', 'זאת', 'אלה', 'אלו', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה',
      'אנחנו', 'אתם', 'אותו', 'אותה', 'אותם', 'עצמו', 'עצמה',
      'יש', 'אין', 'היה', 'היתה', 'היו', 'יהיה', 'תהיה', 'להיות',
      'כן', 'כך', 'לו', 'לה', 'להם', 'בו', 'בה', 'בהם', 'מה', 'מי', 'איך', 'למה',
      // Aramaic function words (expanded)
      'דהא', 'דהוא', 'דהיא', 'הכי', 'הכא', 'התם', 'הא', 'הך', 'הני', 'הנהו',
      'האי', 'ההוא', 'ההיא', 'מאן', 'היכא', 'לאו', 'אלא', 'נמי', 'דלא',
      'ליה', 'להו', 'ביה', 'מיניה', 'מינה', 'עליה',
      // Speech verbs (structural)
      'אמר', 'אומר', 'אמרו', 'אמרה', 'דאמר', 'ואמר', 'כדאמר', 'אמרי', 'קאמר',
      'דתנן', 'דתניא', 'דתני', 'לימא',
      // Titles
      'רבי', 'רב', 'רבן', 'בן', 'בר', 'מר', 'רבה', 'רבא', 'אביי',
      // Numerals
      'אחד', 'אחת', 'שני', 'שנים', 'שתי', 'שתים', 'שלש', 'שלשה',
      'ארבע', 'ארבעה', 'חמש', 'חמשה', 'שש', 'ששה', 'שבע', 'שבעה',
      'שמונה', 'תשע', 'תשעה', 'עשר', 'עשרה', 'מאה',
      // Generic verbs
      'עשה', 'עושה', 'נתן', 'נותן', 'לקח', 'בא', 'הלך', 'ראה', 'שמע',
      // V3: Very short/common words that slip through
      'לי', 'לך', 'ני', 'בם', 'כם', 'נו', 'אף', 'יד', 'פה', 'לן', 'בי'
    ]);

    // V3: Particles that should never end a compound term
    this.particleSuffixes = ['את', 'של', 'על', 'אל', 'מן', 'עם', 'כי', 'לא'];

    // Important bigrams (compound Talmudic terms) - V4 PRO SCHOLAR expanded
    this.importantBigrams = [
      // Conclusions & inferences
      'שמע מינה', 'נפקא מינה', 'למאי נפקא', 'מכלל דאמרת', 'תא שמע',
      'מכאן למדנו', 'הא קמשמע', 'מילתא דפשיטא',
      // Source citations
      'תנו רבנן', 'מנא הני', 'הני מילי', 'תנא דבי', 'תני חדא',
      'אמר קרא', 'מדכתיב', 'דאמר מר',
      // Logical arguments
      'מאי טעמא', 'לא קשיא', 'הכא במאי', 'במאי עסקינן', 'אי הכי',
      'אלא מעתה', 'מהו דתימא', 'קא משמע', 'לאפוקי מאי',
      'מידי איריא', 'מי דמי', 'שאני התם', 'לאו אמרת',
      // Schools & disputes
      'בית שמאי', 'בית הלל', 'תנא קמא', 'חכמים אומרים', 'תנאי היא',
      'פליגי בה', 'בהא פליגי',
      // Halachic terminology
      'מן התורה', 'מדרבנן', 'מדאורייתא', 'לכתחילה', 'בדיעבד',
      'יצא ידי', 'ידי חובה', 'אין יוצאין', 'לא יצא',
      'דאורייתא היא', 'גזירת הכתוב',
      // Hermeneutics (13 middot)
      'גזירה שוה', 'קל וחומר', 'בנין אב', 'כלל ופרט', 'פרט וכלל',
      'דבר הלמד', 'שני כתובים', 'כיוצא בו', 'היקש', 'סמוכים',
      // Objections & challenges
      'מאי שנא', 'מה נפשך', 'והא קיימא', 'והא אמרת', 'ותו הא',
      'והתנן', 'ורמינהי', 'והרי זה', 'איתמר נמי',
      // Resolutions
      'לא צריכא', 'הא מני', 'אמר לך', 'הכי קאמר',
      'לעולם כדאמרינן', 'התם שאני', 'הכא נמי',
      // Shabbat/Melacha specific
      'רשות היחיד', 'רשות הרבים', 'מקום פטור', 'עקירה והנחה',
      'אבות מלאכות', 'תולדות מלאכות', 'מלאכת מחשבת'
    ];

    // Important trigrams (3-word phrases) - V2 PRO SCHOLAR expanded
    this.importantTrigrams = [
      'הלכה למשה מסיני', 'כלל ופרט וכלל', 'פרט וכלל ופרט',
      'שנים שהן ארבע', 'ארבע שהן שמונה', 'מכות ארבעים חסר',
      'יצא ידי חובתו', 'אין יוצאין ידי', 'לא יצא ידי',
      // Additional trigrams
      'מן התורה הוא', 'דברי הכל היא', 'לכולי עלמא',
      'אליבא דרבי', 'אפילו לרבנן', 'בזמן הזה'
    ];

    // Structural weights for TF-IDF boosting (V2 expanded)
    this.structureWeights = {
      // Core structure (highest)
      'מתני': 3.0, 'משנה': 3.0, 'גמרא': 2.5, 'ברייתא': 2.5,
      // Halachic conclusions (very high)
      'הלכה': 3.0, 'הלכתא': 3.0, 'והלכתא': 3.0, 'פסק': 2.8, 'למעשה': 2.5,
      // Rulings (high)
      'חייב': 2.5, 'פטור': 2.5, 'מותר': 2.3, 'אסור': 2.3,
      'טהור': 2.2, 'טמא': 2.2, 'כשר': 2.2, 'פסול': 2.2,
      'יצא': 2.0, 'קנה': 2.0, 'זכה': 2.0,
      // Sources
      'שנאמר': 2.0, 'דכתיב': 2.0, 'תנן': 1.8, 'תניא': 1.8,
      // Conclusions
      'שמע': 2.2, 'מכלל': 2.0, 'אלמא': 1.8, 'משמע': 1.8,
      // Questions
      'מנלן': 1.8, 'מאי': 1.5, 'היכי': 1.5, 'כיצד': 1.5,
      // Disputes
      'פליגי': 2.0, 'מחלוקת': 2.0, 'איתמר': 1.8,
      // Uncertainty
      'תיקו': 2.5, 'ספק': 2.0, 'ספיקא': 2.0, 'איבעיא': 1.8, 'בעיא': 1.7,
      // Objections
      'מיתיבי': 1.8, 'ורמינהו': 1.8, 'קשיא': 1.7, 'תיובתא': 2.0
    };

    // Semantic categories for term grouping (V2 expanded to 7 categories)
    this.categories = {
      halachic: ['חייב', 'פטור', 'מותר', 'אסור', 'טהור', 'טמא', 'כשר', 'פסול', 'יצא', 'קנה', 'זכה'],
      sources: ['תורה', 'נביאים', 'כתובים', 'משנה', 'ברייתא', 'תוספתא', 'מדרש', 'גמרא'],
      states: ['מקודשת', 'מגורשת', 'נשואה', 'ארוסה', 'אלמנה', 'גרושה', 'יבמה'],
      actions: ['נטל', 'הניח', 'הוציא', 'הכניס', 'קבל', 'מסר', 'שחט', 'זרק', 'אכל', 'שתה'],
      times: ['שבת', 'יום טוב', 'חול', 'לילה', 'יום', 'ערב', 'בוקר'],
      places: ['בית', 'שדה', 'רשות', 'חצר', 'מקדש', 'עזרה', 'היכל'],
      measures: ['כזית', 'כביצה', 'טפח', 'אמה', 'מיל', 'רביעית', 'לוג', 'קב']
    };

    // Prefix/suffix patterns for stemming
    this.prefixes = 'והבכלמשד';
    this.suffixes = ['ים', 'ות', 'ין', 'יא', 'תא', 'ה', 'ך', 'כם', 'נו', 'הם', 'הן', 'יו'];
  }

  removeNikud(text) {
    return text ? stripAllDiacritics(text) : '';
  }

  // Enhanced stemming - removes up to 2 prefixes and longest matching suffix
  stemWord(word) {
    if (!word || word.length <= 2) return word;
    let stemmed = word;

    // Remove up to 2 prefixes
    for (let i = 0; i < 2 && stemmed.length > 3; i++) {
      if (this.prefixes.includes(stemmed[0])) {
        stemmed = stemmed.slice(1);
      } else break;
    }

    // Remove longest matching suffix
    for (const suffix of this.suffixes) {
      if (stemmed.endsWith(suffix) && stemmed.length - suffix.length >= 2) {
        stemmed = stemmed.slice(0, -suffix.length);
        break;
      }
    }

    return stemmed.length >= 2 ? stemmed : word;
  }

  // Extract 3-letter Hebrew root (shoresh) when possible
  extractRoot(word) {
    const stemmed = this.stemWord(word);
    if (stemmed.length === 3) return stemmed;
    if (stemmed.length < 3) return null;

    // Piel/Pual: doubled middle letter
    if (stemmed.length === 4 && stemmed[1] === stemmed[2]) {
      return stemmed[0] + stemmed[1] + stemmed[3];
    }
    // Hifil: starts with ה or מ
    if (stemmed.length === 4 && 'המ'.includes(stemmed[0])) {
      return stemmed.slice(1);
    }
    return stemmed.length >= 3 ? stemmed.slice(0, 3) : null;
  }

  // Extract important n-grams (bigrams + trigrams) from text
  extractNgrams(text) {
    const found = [];

    // Extract trigrams first (longer matches take priority)
    for (const trigram of this.importantTrigrams) {
      const regex = new RegExp(trigram.replace(/\s+/g, '\\s+'), 'g');
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(() => found.push({ ngram: trigram.replace(/\s+/g, '_'), type: 'trigram' }));
      }
    }

    // Extract bigrams
    for (const bigram of this.importantBigrams) {
      const regex = new RegExp(bigram.replace(/\s+/g, '\\s+'), 'g');
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(() => found.push({ ngram: bigram.replace(/\s+/g, '_'), type: 'bigram' }));
      }
    }

    return found;
  }

  // Legacy method for backward compatibility
  extractBigrams(text) {
    return this.extractNgrams(text).map(n => n.ngram);
  }

  // V3: Check if term ends with a particle (bad compound)
  endsWithParticle(term) {
    const words = term.split(/\s+/);
    const lastWord = words[words.length - 1];
    return this.particleSuffixes.includes(lastWord);
  }

  // Tokenize with bigram support
  tokenize(text) {
    if (!text) return [];
    const cleaned = this.removeNikud(text);

    // Extract bigrams first (filter out bad compounds)
    const bigrams = this.extractBigrams(cleaned)
      .filter(b => !this.endsWithParticle(b.replace(/_/g, ' ')));

    // Extract and stem single words - V3: minimum 3 chars to avoid fragments
    const words = cleaned.match(/[\u0590-\u05FF]{3,}/g) || [];
    const stemmedWords = words
      .map(w => this.stemWord(w))
      .filter(w => w.length >= 3 && !this.stopWords.has(w));

    return [...bigrams, ...stemmedWords];
  }

  // Calculate TF-IDF with position weighting, n-gram boost, and rarity scoring
  calculateTfIdf(text) {
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return new Map();

    // Track term frequency, positions, and n-gram types
    const tf = new Map();
    const positions = new Map();
    const ngramTypes = new Map();

    // Get n-gram info for boost calculation
    const ngrams = this.extractNgrams(text);
    ngrams.forEach(({ ngram, type }) => ngramTypes.set(ngram, type));

    tokens.forEach((t, idx) => {
      tf.set(t, (tf.get(t) || 0) + 1);
      if (!positions.has(t)) positions.set(t, []);
      positions.get(t).push(idx);
    });

    const maxTf = Math.max(...tf.values(), 1);
    const totalTokens = tokens.length;
    const tfidf = new Map();

    tf.forEach((count, term) => {
      // Augmented TF (prevents bias toward frequent terms)
      const normalizedTf = 0.5 + (0.5 * count / maxTf);

      // IDF (single document approximation)
      const idf = Math.log(tf.size / count) + 1;

      // Position boost: first 15% and last 10% of text are more important
      const termPositions = positions.get(term);
      let positionBoost = 1.0;
      for (const pos of termPositions) {
        const relPos = pos / totalTokens;
        if (relPos < 0.15) positionBoost = Math.max(positionBoost, 1.3);
        else if (relPos > 0.90) positionBoost = Math.max(positionBoost, 1.2);
      }

      // Structural boost for Talmudic terms
      let structuralBoost = 1.0;
      const termClean = term.replace(/_/g, ' ');
      for (const [marker, weight] of Object.entries(this.structureWeights)) {
        if (termClean.includes(marker) || marker.includes(termClean)) {
          structuralBoost = Math.max(structuralBoost, weight);
        }
      }

      // N-gram boost: trigrams > bigrams > unigrams
      let ngramBoost = 1.0;
      if (ngramTypes.get(term) === 'trigram') {
        ngramBoost = 2.0;  // Trigrams are highly specific
      } else if (ngramTypes.get(term) === 'bigram' || term.includes('_')) {
        ngramBoost = 1.5;  // Bigrams are moderately specific
      }

      // Rarity boost: terms appearing 1-2 times are often key concepts
      let rarityBoost = 1.0;
      if (count === 1 && term.length >= 4) {
        rarityBoost = 1.15;  // Hapax legomenon (appears once)
      } else if (count === 2 && term.length >= 4) {
        rarityBoost = 1.08;  // Dis legomenon (appears twice)
      }

      const finalScore = normalizedTf * idf * positionBoost * structuralBoost * ngramBoost * rarityBoost;
      tfidf.set(term, finalScore);
    });

    return tfidf;
  }

  extractKeyTerms(text, topN = 12) {
    const tfidf = this.calculateTfIdf(text);
    const tokens = this.tokenize(text);
    const counts = new Map();
    tokens.forEach(t => counts.set(t, (counts.get(t) || 0) + 1));

    const categorize = (term) => {
      const normalized = term.replace(/_/g, ' ');
      for (const [cat, words] of Object.entries(this.categories)) {
        if (words.some(w => normalized.includes(w) || w.includes(normalized))) return cat;
      }
      return null;
    };

    // V2: Filter out short fragments (< 3 chars) and ensure meaningful terms
    return Array.from(tfidf.entries())
      .filter(([term]) => {
        const cleanTerm = term.replace(/_/g, '');
        return cleanTerm.length >= 3;  // Minimum 3 Hebrew characters
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([term, score]) => ({
        term: term.replace(/_/g, ' '),  // Convert bigrams back to spaces
        score: Math.round(score * 100) / 100,
        count: counts.get(term) || 0,
        category: categorize(term),
        root: this.extractRoot(term.replace(/_/g, ''))  // Extract Hebrew root
      }));
  }

  segmentText(text) {
    if (!text) return [];
    const parts = text.split(/(?=מתני[׳']|גמ[׳']|תנן|תניא|תנו רבנן|שמע מינה|הלכה|איתמר|מיתיבי)/);
    return parts.map(part => {
      const trimmed = part.trim();
      if (trimmed.length < 10) return null;
      let type = 'general';
      if (/^מתני[׳']|^משנה/.test(trimmed)) type = 'mishna';
      else if (/^גמ[׳']|^גמרא/.test(trimmed)) type = 'gemara';
      else if (/^תנן|^תניא|^תנו רבנן/.test(trimmed)) type = 'source';
      else if (/^שמע מינה/.test(trimmed)) type = 'conclusion';
      else if (/^הלכה|^הלכתא/.test(trimmed)) type = 'halacha';
      else if (/^איתמר/.test(trimmed)) type = 'dispute';
      else if (/^מיתיבי|^ורמינהו/.test(trimmed)) type = 'challenge';
      else if (/מאי|מנלן|היכי/.test(trimmed)) type = 'question';
      return { text: trimmed, type };
    }).filter(Boolean);
  }

  extractKeySegments(text, topN = 6) {
    const segments = this.segmentText(text);
    const tfidf = this.calculateTfIdf(text);
    const typeWeights = { mishna: 2.0, halacha: 1.9, conclusion: 1.8, dispute: 1.5, challenge: 1.3, source: 1.4, question: 1.2, gemara: 1.1, general: 1.0 };

    return segments.map(seg => {
      const tokens = this.tokenize(seg.text);
      let score = tokens.reduce((sum, t) => sum + (tfidf.get(t) || 0), 0);
      score = (score / Math.max(Math.sqrt(tokens.length), 1)) * (typeWeights[seg.type] || 1.0);
      return { ...seg, score };
    }).sort((a, b) => b.score - a.score).slice(0, topN);
  }

  summarize(text) {
    const tokens = this.tokenize(text);
    const keyTerms = this.extractKeyTerms(text, 15);
    const keySegments = this.extractKeySegments(text, 6);
    const ngrams = this.extractNgrams(text);

    const structure = {
      hasMishna: /מתני[׳']|משנה/.test(text),
      hasGemara: /גמ[׳']|גמרא/.test(text),
      hasBaraita: /תניא|תנו רבנן/.test(text),
      hasConclusion: /שמע מינה/.test(text),
      hasHalacha: /הלכה|הלכתא|והלכתא/.test(text),
      hasDispute: /פליגי|מחלוקת|איתמר/.test(text),
      hasUnresolved: /תיקו|צריך עיון|בעיא/.test(text),
      hasProof: /שנאמר|דכתיב/.test(text)
    };

    const statistics = {
      totalWords: tokens.length,
      uniqueTerms: new Set(tokens).size,
      bigramCount: ngrams.filter(n => n.type === 'bigram').length,
      trigramCount: ngrams.filter(n => n.type === 'trigram').length,
      questionCount: (text.match(/מאי|מנלן|היכי|מה טעם|כיצד|למאי/g) || []).length,
      proofCount: (text.match(/שנאמר|דכתיב|שכתוב/g) || []).length,
      sourceCount: (text.match(/תנן|תניא|תנו רבנן/g) || []).length,
      objectionCount: (text.match(/מיתיבי|ורמינהו|והתניא|והאמר/g) || []).length,
      conclusionCount: (text.match(/שמע מינה|מכלל|אלמא|משמע/g) || []).length,
      rulingCount: (text.match(/חייב|פטור|מותר|אסור|טהור|טמא|כשר|פסול/g) || []).length
    };

    // Category distribution of key terms
    const categoryDistribution = {};
    keyTerms.forEach(t => {
      if (t.category) categoryDistribution[t.category] = (categoryDistribution[t.category] || 0) + 1;
    });

    // Calculate confidence score (0-100) based on multiple signals
    const confidenceFactors = [
      structure.hasMishna ? 15 : 0,
      structure.hasGemara ? 10 : 0,
      structure.hasHalacha ? 20 : 0,
      structure.hasConclusion ? 15 : 0,
      Math.min(statistics.questionCount * 5, 15),
      Math.min(statistics.proofCount * 5, 10),
      Math.min(statistics.bigramCount * 3, 15),
      keyTerms.length >= 5 ? 10 : keyTerms.length * 2
    ];
    const confidence = Math.min(100, confidenceFactors.reduce((a, b) => a + b, 0));

    return {
      keyTerms,
      keySegments,
      structure,
      statistics,
      categoryDistribution,
      topRoots: keyTerms.filter(t => t.root).map(t => t.root).slice(0, 5),
      // New: confidence score for summary quality
      confidence,
      // New: detected n-grams for display
      detectedNgrams: ngrams.map(n => n.ngram.replace(/_/g, ' '))
    };
  }
}

const talmudicSummarizer = new TalmudicTextSummarizer();

/** Extract key terms using TF-IDF (PRO SCHOLAR) */
export function extractKeyTermsTfIdf(text, topN = 12) {
  return talmudicSummarizer.extractKeyTerms(text, topN);
}

/** Extract key text segments by importance (PRO SCHOLAR) */
export function extractKeySegments(text, topN = 6) {
  return talmudicSummarizer.extractKeySegments(text, topN);
}

/** Get full Talmudic text summary (PRO SCHOLAR) */
export function summarizeText(text) {
  return talmudicSummarizer.summarize(text);
}
