/**
 * cantillationService.js - Taamei HaMikra (טעמי המקרא) Analysis
 *
 * Comprehensive service for analyzing cantillation marks (trop/ta'amim) in biblical text.
 * Provides:
 * - Classification of conjunctive/disjunctive marks
 * - Hierarchical structure analysis
 * - Musical melody patterns
 * - Syntactic parsing based on cantillation
 * - Ashkenazi/Sephardi variations
 */

// Unicode ranges for Hebrew cantillation marks
const CANTILLATION_RANGE = /[\u0591-\u05AF]/g;

// Complete cantillation mark database
export const CANTILLATION_MARKS = {
  // === DISJUNCTIVE (Melakhim/Emperors) - Major stops ===

  // Sof Pasuk (end of verse)
  '\u05C3': {
    name: 'Sof Pasuk',
    hebrewName: 'סוֹף פָּסוּק',
    type: 'disjunctive',
    rank: 0,
    meaning: 'End of verse - absolute pause',
    musical: 'Final cadence, falling pitch',
    ashkenazi: 'Complete descending phrase',
    sephardi: 'Final closing cadence',
    unicode: 'U+05C3',
    symbol: '׃'
  },

  // Silluq (under last stressed syllable)
  '\u05BD': {
    name: 'Silluq',
    hebrewName: 'סִלּוּק',
    type: 'disjunctive',
    rank: 0,
    meaning: 'End of verse, pairs with Sof Pasuk',
    musical: 'Low pitch, prepares for Sof Pasuk',
    ashkenazi: 'Low sustained note',
    sephardi: 'Descending preparation',
    unicode: 'U+05BD',
    symbol: '֭'
  },

  // Atnach (primary break)
  '\u0591': {
    name: 'Atnach',
    hebrewName: 'אֶתְנַחְתָּא',
    type: 'disjunctive',
    rank: 1,
    meaning: 'Primary logical/syntactic break, divides verse in two',
    musical: 'Strong pause with rising-falling melody',
    ashkenazi: 'Major ascending then descending cadence',
    sephardi: 'Strong middle pause',
    unicode: 'U+0591',
    symbol: '֑'
  },

  // Segol/Segolta
  '\u0592': {
    name: 'Segol',
    hebrewName: 'סְגוֹלְתָּא',
    type: 'disjunctive',
    rank: 2,
    meaning: 'Strong disjunctive in first half of verse',
    musical: 'High pitch with ornamental turn',
    ashkenazi: 'Ascending ornamental phrase',
    sephardi: 'Rising with trill',
    unicode: 'U+0592',
    symbol: '֒'
  },

  // Shalshelet
  '\u0593': {
    name: 'Shalshelet',
    hebrewName: 'שַׁלְשֶׁלֶת',
    type: 'disjunctive',
    rank: 2,
    meaning: 'Rare - indicates hesitation, emotion, or drama',
    musical: 'Extended wavering melody (chain-like)',
    ashkenazi: 'Long wavering phrase, very dramatic',
    sephardi: 'Extended oscillating melody',
    unicode: 'U+0593',
    symbol: '֓',
    rare: true,
    occurrences: 4, // Only 4 times in Torah
    locations: ['Genesis 19:16', 'Genesis 24:12', 'Genesis 39:8', 'Leviticus 8:23']
  },

  // Zaqef Qatan
  '\u0594': {
    name: 'Zaqef Qatan',
    hebrewName: 'זָקֵף קָטָן',
    type: 'disjunctive',
    rank: 3,
    meaning: 'Moderate break, common disjunctive',
    musical: 'Rising pitch ending',
    ashkenazi: 'Short ascending phrase',
    sephardi: 'Brief upward inflection',
    unicode: 'U+0594',
    symbol: '֔'
  },

  // Zaqef Gadol
  '\u0595': {
    name: 'Zaqef Gadol',
    hebrewName: 'זָקֵף גָּדוֹל',
    type: 'disjunctive',
    rank: 3,
    meaning: 'Moderate break, emphatic form of Zaqef',
    musical: 'Rising pitch with emphasis',
    ashkenazi: 'Ascending with stress',
    sephardi: 'Emphasized upward phrase',
    unicode: 'U+0595',
    symbol: '֕'
  },

  // Revia
  '\u0597': {
    name: 'Revia',
    hebrewName: 'רְבִיעַ',
    type: 'disjunctive',
    rank: 4,
    meaning: 'Minor break',
    musical: 'Short pause, diamond shape above',
    ashkenazi: 'Brief sustained note',
    sephardi: 'Short melodic unit',
    unicode: 'U+0597',
    symbol: '֗'
  },

  // Tifcha
  '\u0596': {
    name: 'Tifcha',
    hebrewName: 'טִפְחָא / טַרְחָא',
    type: 'disjunctive',
    rank: 5,
    meaning: 'Minor disjunctive, often precedes Silluq or Atnach',
    musical: 'Preparatory pause',
    ashkenazi: 'Descending preparation',
    sephardi: 'Lead-in phrase',
    unicode: 'U+0596',
    symbol: '֖'
  },

  // Pashta
  '\u0599': {
    name: 'Pashta',
    hebrewName: 'פַּשְׁטָא',
    type: 'disjunctive',
    rank: 5,
    meaning: 'Light break, positioned over last letter',
    musical: 'Quick rising turn',
    ashkenazi: 'Short ascending ornament',
    sephardi: 'Brief upward turn',
    unicode: 'U+0599',
    symbol: '֙'
  },

  // Yetiv
  '\u059A': {
    name: 'Yetiv',
    hebrewName: 'יְתִיב',
    type: 'disjunctive',
    rank: 5,
    meaning: 'Minor break, appears post-positive',
    musical: 'Short melodic break',
    ashkenazi: 'Brief pause',
    sephardi: 'Light stop',
    unicode: 'U+059A',
    symbol: '֚'
  },

  // Tevir
  '\u059B': {
    name: 'Tevir',
    hebrewName: 'תְּבִיר',
    type: 'disjunctive',
    rank: 5,
    meaning: 'Minor disjunctive, "broken"',
    musical: 'Breaking melody',
    ashkenazi: 'Broken descending phrase',
    sephardi: 'Fragmented melody',
    unicode: 'U+059B',
    symbol: '֛'
  },

  // Geresh
  '\u059C': {
    name: 'Geresh',
    hebrewName: 'גֵּרֶשׁ',
    type: 'disjunctive',
    rank: 5,
    meaning: 'Light break, also called Azla when conjunctive',
    musical: 'Quick accent',
    ashkenazi: 'Sharp accent',
    sephardi: 'Brief emphasis',
    unicode: 'U+059C',
    symbol: '֜'
  },

  // Gershayim
  '\u059E': {
    name: 'Gershayim',
    hebrewName: 'גֵּרְשַׁיִם',
    type: 'disjunctive',
    rank: 5,
    meaning: 'Double geresh, stronger form',
    musical: 'Double accent',
    ashkenazi: 'Doubled sharp accent',
    sephardi: 'Emphasized double accent',
    unicode: 'U+059E',
    symbol: '֞'
  },

  // Pazer
  '\u05A1': {
    name: 'Pazer',
    hebrewName: 'פָּזֵר',
    type: 'disjunctive',
    rank: 4,
    meaning: 'Moderate break, "scattered"',
    musical: 'Scattered melodic pattern',
    ashkenazi: 'Ornamental scattered notes',
    sephardi: 'Distributed melody',
    unicode: 'U+05A1',
    symbol: '֡'
  },

  // Pazer Gadol / Qarne Para / Telisha Gedola (share same Unicode point)
  '\u05A0': {
    name: 'Qarne Para / Telisha Gedola',
    hebrewName: 'קַרְנֵי פָרָה / תְּלִישָׁא גְּדוֹלָה',
    type: 'disjunctive',
    rank: 4,
    meaning: 'Context-dependent: Qarne Para (rare, strong emphasis) or Telisha Gedola (light break)',
    musical: 'Elaborate ornamental phrase or quick initial accent',
    ashkenazi: 'Extended ornamental run / brief opening ornament',
    sephardi: 'Elaborate melodic flourish / initial accent',
    unicode: 'U+05A0',
    symbol: '֠',
    note: 'Same Unicode point used for both marks; distinguished by position and context'
  },

  // === CONJUNCTIVE (Meshartim/Servants) - Connect words ===

  // Munach
  '\u05A3': {
    name: 'Munach',
    hebrewName: 'מֻנָּח',
    type: 'conjunctive',
    meaning: 'Common connector, "resting"',
    musical: 'Sustained connecting note',
    ashkenazi: 'Sustained tone',
    sephardi: 'Held note',
    unicode: 'U+05A3',
    symbol: '֣'
  },

  // Mahapakh
  '\u05A4': {
    name: 'Mahapakh',
    hebrewName: 'מַהְפָּךְ',
    type: 'conjunctive',
    meaning: 'Connector, "reversed"',
    musical: 'Turning melody',
    ashkenazi: 'Melodic turn',
    sephardi: 'Inverted phrase',
    unicode: 'U+05A4',
    symbol: '֤'
  },

  // Merkha
  '\u05A5': {
    name: 'Merkha',
    hebrewName: 'מֵרְכָא',
    type: 'conjunctive',
    meaning: 'Common connector, "prolonged"',
    musical: 'Extended connection',
    ashkenazi: 'Smooth connection',
    sephardi: 'Flowing connector',
    unicode: 'U+05A5',
    symbol: '֥'
  },

  // Merkha Kefula
  '\u05A6': {
    name: 'Merkha Kefula',
    hebrewName: 'מֵרְכָא כְּפוּלָה',
    type: 'conjunctive',
    meaning: 'Double merkha, emphatic connection',
    musical: 'Double extended connection',
    ashkenazi: 'Doubled smooth connection',
    sephardi: 'Extended flowing connector',
    unicode: 'U+05A6',
    symbol: '֦'
  },

  // Darga
  '\u05A7': {
    name: 'Darga',
    hebrewName: 'דַּרְגָּא',
    type: 'conjunctive',
    meaning: 'Connector, "step"',
    musical: 'Stepping connection',
    ashkenazi: 'Stepwise melody',
    sephardi: 'Gradual connection',
    unicode: 'U+05A7',
    symbol: '֧'
  },

  // Qadma / Azla
  '\u05A8': {
    name: 'Qadma',
    hebrewName: 'קַדְמָא / אַזְלָא',
    type: 'conjunctive',
    meaning: 'Forward-moving connector',
    musical: 'Advancing melody',
    ashkenazi: 'Forward push',
    sephardi: 'Progressive connection',
    unicode: 'U+05A8',
    symbol: '֨'
  },

  // Telisha Qetana
  '\u05A9': {
    name: 'Telisha Qetana',
    hebrewName: 'תְּלִישָׁא קְטַנָּה',
    type: 'conjunctive',
    meaning: 'Small telisha, connector at word end',
    musical: 'Quick ending ornament',
    ashkenazi: 'Brief final ornament',
    sephardi: 'Terminal accent',
    unicode: 'U+05A9',
    symbol: '֩'
  },

  // Yerah Ben Yomo
  '\u05AA': {
    name: 'Yerah Ben Yomo',
    hebrewName: 'יֵרֶךְ בֶּן יוֹמוֹ',
    type: 'conjunctive',
    meaning: 'Rare connector, "moon in its day"',
    musical: 'Sustained crescent',
    ashkenazi: 'Extended sustained note',
    sephardi: 'Long hold',
    unicode: 'U+05AA',
    symbol: '֪',
    rare: true
  },

  // Ole
  '\u05AB': {
    name: 'Ole',
    hebrewName: 'עוֹלֶה',
    type: 'conjunctive',
    meaning: 'Ascending connector',
    musical: 'Rising pitch',
    ashkenazi: 'Ascending phrase',
    sephardi: 'Upward motion',
    unicode: 'U+05AB',
    symbol: '֫'
  },

  // Iluy
  '\u05AC': {
    name: 'Iluy',
    hebrewName: 'עִלּוּי',
    type: 'conjunctive',
    meaning: 'High connector',
    musical: 'High pitch accent',
    ashkenazi: 'High note',
    sephardi: 'Elevated pitch',
    unicode: 'U+05AC',
    symbol: '֬'
  }
};

/**
 * Extract cantillation marks from text
 */
export const extractCantillation = (text) => {
  const marks = [];
  const words = text.split(/\s+/);

  words.forEach((word, wordIndex) => {
    const wordMarks = word.match(CANTILLATION_RANGE) || [];
    wordMarks.forEach(mark => {
      const markInfo = CANTILLATION_MARKS[mark];
      if (markInfo) {
        marks.push({
          mark,
          word: word.replace(CANTILLATION_RANGE, '').replace(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g, ''),
          wordIndex,
          ...markInfo
        });
      }
    });
  });

  return marks;
};

/**
 * Analyze verse structure based on cantillation
 */
export const analyzeVerseStructure = (text) => {
  const marks = extractCantillation(text);

  // Find primary divisions
  const atnachIndex = marks.findIndex(m => m.name === 'Atnach');
  const silluqIndex = marks.findIndex(m => m.name === 'Silluq');

  // Build hierarchical structure
  const structure = {
    firstHalf: [],
    secondHalf: [],
    primaryBreak: atnachIndex >= 0 ? marks[atnachIndex] : null,
    endMark: silluqIndex >= 0 ? marks[silluqIndex] : null,
    hierarchy: buildHierarchy(marks),
    totalMarks: marks.length,
    disjunctiveCount: marks.filter(m => m.type === 'disjunctive').length,
    conjunctiveCount: marks.filter(m => m.type === 'conjunctive').length
  };

  // Divide marks by Atnach
  if (atnachIndex >= 0) {
    structure.firstHalf = marks.slice(0, atnachIndex + 1);
    structure.secondHalf = marks.slice(atnachIndex + 1);
  } else {
    structure.secondHalf = marks;
  }

  return structure;
};

/**
 * Build hierarchical tree of cantillation
 */
const buildHierarchy = (marks) => {
  // Group by rank
  const byRank = {};
  marks.forEach(mark => {
    const rank = mark.rank ?? 6;
    if (!byRank[rank]) byRank[rank] = [];
    byRank[rank].push(mark);
  });

  return {
    level0: byRank[0] || [], // Silluq/Sof Pasuk
    level1: byRank[1] || [], // Atnach
    level2: byRank[2] || [], // Segol, Shalshelet
    level3: byRank[3] || [], // Zaqef
    level4: byRank[4] || [], // Revia, Pazer
    level5: byRank[5] || [], // Minor disjunctives
    conjunctives: marks.filter(m => m.type === 'conjunctive')
  };
};

/**
 * Get syntactic parsing based on cantillation
 */
export const getSyntacticParsing = (text) => {
  const structure = analyzeVerseStructure(text);

  // Determine clause boundaries
  const clauses = [];
  let currentClause = { words: [], marks: [] };
  const words = text.split(/\s+/);

  words.forEach((word, idx) => {
    const wordMarks = extractCantillation(word);
    currentClause.words.push(word);
    currentClause.marks.push(...wordMarks);

    // Check for disjunctive mark (clause boundary)
    const hasDisjunctive = wordMarks.some(m => m.type === 'disjunctive');
    if (hasDisjunctive) {
      clauses.push({
        ...currentClause,
        breakType: wordMarks.find(m => m.type === 'disjunctive')
      });
      currentClause = { words: [], marks: [] };
    }
  });

  // Add remaining words if any
  if (currentClause.words.length > 0) {
    clauses.push(currentClause);
  }

  return {
    clauses,
    structure,
    interpretation: generateInterpretation(clauses)
  };
};

/**
 * Generate natural language interpretation
 */
const generateInterpretation = (clauses) => {
  return clauses.map((clause, idx) => {
    const breakMark = clause.breakType;
    let pauseDesc = 'continues...';

    if (breakMark) {
      switch (breakMark.name) {
        case 'Silluq':
          pauseDesc = '(END of verse)';
          break;
        case 'Atnach':
          pauseDesc = '(MAJOR pause - main logical division)';
          break;
        case 'Segol':
        case 'Zaqef Qatan':
        case 'Zaqef Gadol':
          pauseDesc = '(moderate pause)';
          break;
        case 'Revia':
        case 'Pazer':
          pauseDesc = '(minor pause)';
          break;
        default:
          if (breakMark.type === 'disjunctive') {
            pauseDesc = '(light pause)';
          }
      }
    }

    return {
      clauseNumber: idx + 1,
      text: clause.words.join(' '),
      pause: pauseDesc,
      markName: breakMark?.name || null
    };
  });
};

/**
 * Get musical melody information
 */
export const getMelodyInfo = (markChar, tradition = 'ashkenazi') => {
  const mark = CANTILLATION_MARKS[markChar];
  if (!mark) return null;

  return {
    name: mark.name,
    hebrewName: mark.hebrewName,
    tradition,
    melody: tradition === 'ashkenazi' ? mark.ashkenazi : mark.sephardi,
    general: mark.musical,
    type: mark.type,
    isRare: mark.rare || false
  };
};

/**
 * Get special marks (Shalshelet locations, etc.)
 */
export const getSpecialMarks = () => {
  return Object.entries(CANTILLATION_MARKS)
    .filter(([_, mark]) => mark.rare)
    .map(([char, mark]) => ({
      char,
      ...mark
    }));
};

/**
 * Analyze entire chapter for cantillation patterns
 */
export const analyzeChapterCantillation = (verses) => {
  const analysis = {
    totalVerses: verses.length,
    markFrequency: {},
    averageMarksPerVerse: 0,
    specialMarks: [],
    patterns: []
  };

  let totalMarks = 0;

  verses.forEach((verse, idx) => {
    const marks = extractCantillation(verse.text || verse.he || '');
    totalMarks += marks.length;

    marks.forEach(mark => {
      analysis.markFrequency[mark.name] = (analysis.markFrequency[mark.name] || 0) + 1;

      if (mark.rare) {
        analysis.specialMarks.push({
          verse: idx + 1,
          mark: mark.name,
          hebrewName: mark.hebrewName,
          meaning: mark.meaning
        });
      }
    });
  });

  analysis.averageMarksPerVerse = (totalMarks / verses.length).toFixed(1);

  return analysis;
};

/**
 * Get visual representation for cantillation
 */
export const getCantillationVisual = (mark) => {
  const info = CANTILLATION_MARKS[mark];
  if (!info) return null;

  // Visual representation of hierarchy
  const levels = {
    0: '████████', // Silluq/Sof Pasuk
    1: '██████',   // Atnach
    2: '█████',    // Segol, Shalshelet
    3: '████',     // Zaqef
    4: '███',      // Revia, Pazer
    5: '██',       // Minor disjunctives
    6: '█'         // Conjunctives
  };

  return {
    level: info.rank ?? 6,
    bar: levels[info.rank ?? 6],
    color: info.type === 'disjunctive' ? '#dc2626' : '#3b82f6',
    label: info.name
  };
};

const cantillationService = {
  CANTILLATION_MARKS,
  extractCantillation,
  analyzeVerseStructure,
  getSyntacticParsing,
  getMelodyInfo,
  getSpecialMarks,
  analyzeChapterCantillation,
  getCantillationVisual
};

export default cantillationService;
