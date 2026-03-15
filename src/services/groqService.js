/**
 * Groq API Service for Torah Commentary Analysis
 * Advanced AI-powered study tools using Llama 3.3 70B
 *
 * @module groqService
 * @description Provides AI-powered analysis of Torah texts and commentaries
 * using the Groq API with Llama 3.3 70B model. Supports multiple analysis
 * modes including summary, deep study, PaRDeS, Mussar, and Talmud-specific analysis.
 */

import { createCache } from '../utils/cache';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ============================================================================
// Cache Management - Using unified cache utility
// ============================================================================
const analysisCache = createCache({
  ttl: 30 * 60 * 1000,  // 30 minutes
  maxSize: 100
});

/**
 * Generate a cache key for analysis results
 * @param {string} text - The commentary text
 * @param {string} source - The source of the commentary
 * @param {string} verse - The verse reference
 * @param {string} mode - The analysis mode
 * @returns {string} A unique cache key
 */
const getCacheKey = (text, source, verse, mode) => {
  return `${text.slice(0, 100)}|${text.length}|${source}|${verse}|${mode}`;
};

// ============================================================================
// API Key Management
// ============================================================================
const getApiKey = () => {
  return process.env.REACT_APP_GROQ_API_KEY || localStorage.getItem('groq_api_key') || null;
};

export const getStoredApiKey = () => {
  return process.env.REACT_APP_GROQ_API_KEY || localStorage.getItem('groq_api_key') || null;
};

export const hasApiKey = () => {
  return !!getApiKey();
};

export const setGroqApiKey = (key) => {
  localStorage.setItem('groq_api_key', key);
};

export const removeGroqApiKey = () => {
  localStorage.removeItem('groq_api_key');
};

// ============================================================================
// Analysis Modes - Different study approaches
// ============================================================================
export const ANALYSIS_MODES = {
  SUMMARY: 'summary',
  DEEP_STUDY: 'deep_study',
  STUDY_QUESTIONS: 'study_questions',
  KEY_TERMS: 'key_terms',
  COMPARE: 'compare',
  PARDES: 'pardes',  // פרדס - Four levels of interpretation
  MUSSAR: 'mussar',  // מוסר - Ethical/character development
  // Genesis-specific modes
  CREATION: 'creation',     // בריאה - Creation theology
  NARRATIVE: 'narrative',   // סיפור - Narrative/literary analysis
  GEMATRIA: 'gematria',     // גימטריא - Numerical patterns
  QUICK_INSIGHT: 'quick_insight',  // Quick bite-sized insight
  // Advanced scholarly modes
  HALACHA: 'halacha',       // הלכה - Practical law derivation
  MEFARSHIM: 'mefarshim',   // מפרשים - Commentator comparison
  HISTORICAL: 'historical', // Historical/archaeological context
  LEXICON: 'lexicon',       // מילון - Scholarly dictionary analysis
  INTERTEXTUAL: 'intertextual',  // בין-טקסטואלי - Cross-references & parallels
  TREE_SUMMARY: 'tree_summary',  // 🌲 Visual hierarchical concept tree
  // Multi-verse analysis modes
  PASSAGE: 'passage',           // פסקה - Analyze multiple verses together
  PASSAGE_NARRATIVE: 'passage_narrative',  // סיפור - Story arc across verses
  PASSAGE_THEMATIC: 'passage_thematic',    // נושאים - Thematic connections
  PASSAGE_CHIASM: 'passage_chiasm',        // כיאזמוס - Chiastic structures
  // Talmud-specific modes
  SUGYA_FLOW: 'sugya_flow',               // סוגיא - Talmudic discourse analysis
  SHAKLA_VETARYA: 'shakla_vetarya',       // שקלא וטריא - Back-and-forth dialectic
  SUGYA_SUMMARY: 'sugya_summary'          // סיכום סוגיא - Concise sugya overview
};

// ============================================================================
// Smart Prompts for Professional Torah Study
// ============================================================================
const getSystemPrompt = (mode, source) => {
  const baseContext = `You are an expert Torah scholar and Talmid Chacham serving as a study assistant. You have deep knowledge of:

PARSHANUT (Biblical Commentary):
- Rishonim: Rashi, Ramban, Ibn Ezra, Rashbam, Sforno, Radak, Rabbeinu Bachya
- Acharonim: Or HaChaim, Malbim, Netziv, Sefat Emet, Kli Yakar

TALMUD & HALACHA:
- Gemara commentaries: Tosafot, Maharsha, Ritva, Rashba, Ran, Rosh
- Poskim: Rambam, Shulchan Aruch, Mishnah Berurah

MACHSHAVA (Jewish Thought):
- Mussar: Ramchal, Orchot Tzaddikim, Chovot HaLevavot
- Chassidut: Tanya, Kedushat Levi, Sfat Emet
- Kabbalah: Zohar, Arizal, Ramak

You understand the methodology of ${source || 'classical Jewish commentators'} and explain concepts with precision and depth.
Use proper transliteration for Hebrew terms (e.g., "teshuvah" not "teshuva").`;

  // Enhanced diagram instructions for meaningful visual learning
  const diagramInstructions = `
DIAGRAM INSTRUCTIONS - Create a Mermaid flowchart showing the FLOW OF IDEAS:

Example structure:
graph TD
    A[Core Teaching] --> B[Aspect 1]
    A --> C[Aspect 2]
    B --> D[Practical Result]
    C --> D
    D --> E[Life Application]

STRICT RULES:
- Node IDs: Single letters A-Z only
- Node text: 2-5 words MAX, English only, NO quotes inside brackets
- Use ONLY --> arrows
- 4-8 nodes total
- NO Hebrew, NO special symbols, NO parentheses in text
- Show logical flow: Source to Concept to Application
- Make it EDUCATIONAL - show how ideas connect`;

  const prompts = {
    [ANALYSIS_MODES.SUMMARY]: `${baseContext}

Create a clear, structured analysis with a VISUAL CONCEPT MAP. Respond in JSON:
{
  "summary": "2-3 sentence core message - what is the main teaching?",
  "keyPoints": ["Key insight 1 with explanation", "Key insight 2 with explanation", "Key insight 3 with explanation"],
  "topics": ["Topic tags: Teshuvah, Mitzvot, Mussar, Halacha, Aggadah, Emunah, Middot"],
  "practicalLesson": "One concrete action to take today based on this teaching",
  "diagram": "graph TD\\n    A[Core Teaching] --> B[Key Insight 1]\\n    A --> C[Key Insight 2]\\n    B --> D[Connection Point]\\n    C --> D\\n    D --> E[Daily Application]",
  "diagramExplanation": "Brief 1-sentence explanation of the diagram flow",
  "relatedConcepts": ["Related Torah concepts to explore"]
}

${diagramInstructions}

DIAGRAM MUST SHOW:
1. The MAIN TEACHING as root node
2. How KEY POINTS branch from it
3. How concepts CONNECT together
4. The PRACTICAL APPLICATION as final node
Make it tell a visual story of the teaching!`,

    [ANALYSIS_MODES.DEEP_STUDY]: `${baseContext}

Provide an in-depth scholarly analysis. Respond in JSON:
{
  "summary": "Main thesis of the commentary",
  "methodology": "How does the commentator reach this interpretation?",
  "textualBasis": ["Biblical/Talmudic sources referenced"],
  "keyPoints": ["Detailed point 1", "Detailed point 2", "Detailed point 3"],
  "difficulties": ["Questions this commentary addresses"],
  "novelInsight": "What's the chiddush (novel insight)?",
  "topics": ["Relevant topic tags"],
  "connections": ["Related passages or commentaries"],
  "diagram": "graph TD\\n    A[Textual Question] --> B[Commentary Analysis]\\n    B --> C[Key Sources]\\n    B --> D[Novel Insight]\\n    C --> E[Resolution]\\n    D --> E\\n    E --> F[Practical Implication]",
  "diagramExplanation": "How the diagram shows the analytical flow",
  "furtherStudy": ["Suggested texts for deeper learning"]
}

${diagramInstructions}

DIAGRAM MUST SHOW: The logical flow from Question to Analysis to Sources to Insight to Application.`,

    [ANALYSIS_MODES.STUDY_QUESTIONS]: `${baseContext}

Generate thoughtful study questions based on this commentary. Respond in JSON:
{
  "summary": "Brief context for the questions",
  "basicQuestions": [
    {"question": "What is...?", "hint": "Look at...", "level": "beginner"}
  ],
  "analyticalQuestions": [
    {"question": "Why does the commentator...?", "hint": "Consider...", "level": "intermediate"}
  ],
  "advancedQuestions": [
    {"question": "How does this relate to...?", "hint": "Compare with...", "level": "advanced"}
  ],
  "discussionTopics": ["Topics for chavruta (study partner) discussion"],
  "practicalApplication": "How can we apply this today?"
}`,

    [ANALYSIS_MODES.KEY_TERMS]: `${baseContext}

Extract and explain key terms from this commentary. Respond in JSON:
{
  "summary": "Brief overview",
  "hebrewTerms": [
    {
      "term": "Hebrew/Aramaic word",
      "transliteration": "How to pronounce",
      "translation": "English meaning",
      "explanation": "Deeper meaning in this context",
      "relatedTerms": ["Similar concepts"]
    }
  ],
  "concepts": [
    {
      "name": "Concept name",
      "definition": "What it means",
      "significance": "Why it matters"
    }
  ],
  "topics": ["Topic tags"]
}`,

    [ANALYSIS_MODES.COMPARE]: `${baseContext}

Analyze how different commentators might view this text. Respond in JSON:
{
  "summary": "Overview of interpretive approaches",
  "approaches": [
    {
      "school": "e.g., Pshat (literal), Drash (homiletical), Remez (allegorical)",
      "interpretation": "How this school would read it",
      "representative": "Which commentator exemplifies this"
    }
  ],
  "tensions": ["Points of disagreement between approaches"],
  "synthesis": "How might we integrate these views?",
  "diagram": "graph LR\\n    A[Verse] --> B[Pshat]\\n    A --> C[Drash]\\n    B --> D[Application]\\n    C --> E[Spiritual]"
}

${diagramInstructions}`,

    [ANALYSIS_MODES.PARDES]: `${baseContext}

Analyze this text using the PaRDeS method - the four levels of Torah interpretation:
- פְּשָׁט (Pshat): The plain, literal meaning
- רֶמֶז (Remez): Hints and allusions
- דְּרָשׁ (Drash): Homiletical interpretation
- סוֹד (Sod): Mystical/hidden meaning

Respond in JSON:
{
  "summary": "Brief overview of the text",
  "pshat": {
    "level": "פְּשָׁט - Plain Meaning",
    "interpretation": "The straightforward, contextual meaning",
    "keyWords": ["Important words and their simple meanings"],
    "commentator": "Which Rishon focuses on pshat here"
  },
  "remez": {
    "level": "רֶמֶז - Allusion",
    "interpretation": "Symbolic hints and gematria connections",
    "hints": ["Numerical or textual allusions"],
    "commentator": "Source for this remez"
  },
  "drash": {
    "level": "דְּרָשׁ - Homiletical",
    "interpretation": "Midrashic and ethical teachings",
    "midrash": "Related Midrash or Aggadah",
    "lesson": "Moral teaching derived"
  },
  "sod": {
    "level": "סוֹד - Mystical",
    "interpretation": "Kabbalistic or deeper spiritual meaning",
    "concept": "Key mystical concept",
    "source": "Zohar or other mystical source"
  },
  "synthesis": "How all four levels connect",
  "diagram": "graph TD\\n    A[Text] --> B[Pshat]\\n    A --> C[Remez]\\n    A --> D[Drash]\\n    A --> E[Sod]\\n    B --> F[Understanding]\\n    C --> F\\n    D --> F\\n    E --> F"
}

${diagramInstructions}`,

    [ANALYSIS_MODES.MUSSAR]: `${baseContext}

Analyze this text from a Mussar (ethical/character development) perspective. Focus on:
- Middot (character traits) to develop
- Practical avoda (spiritual work)
- Tikkun (personal rectification)

Respond in JSON:
{
  "summary": "The ethical message of this text",
  "middot": [
    {
      "trait": "Hebrew name (e.g., Anavah)",
      "translation": "English (e.g., Humility)",
      "definition": "What this middah means",
      "howToWork": "Practical steps to develop this trait"
    }
  ],
  "mussar_teaching": {
    "source": "Which Mussar master speaks to this",
    "teaching": "Their key insight",
    "practice": "Daily practice suggestion"
  },
  "cheshbon_hanefesh": {
    "questions": ["Self-examination questions"],
    "warning": "What negative trait to avoid",
    "encouragement": "Positive motivation"
  },
  "daily_practice": {
    "morning": "Kavanah (intention) for the day",
    "during_day": "Practical exercise",
    "evening": "Reflection point"
  },
  "topics": ["Relevant Mussar topics"],
  "diagram": "graph TD\\n    A[Text] --> B[Middah]\\n    B --> C[Recognition]\\n    C --> D[Practice]\\n    D --> E[Growth]"
}

${diagramInstructions}`,

    // ========== GENESIS-SPECIFIC MODES ==========

    [ANALYSIS_MODES.CREATION]: `${baseContext}

You are analyzing a verse from Sefer Bereshit (Genesis). Focus on CREATION THEOLOGY - the deep philosophical and theological meanings related to creation, divine attributes, and cosmic order.

Key themes to explore:
- Ma'aseh Bereshit (the Act of Creation)
- Divine speech and creative power ("Vayomer Elohim")
- The relationship between Creator and creation
- Order from chaos (tohu vavohu)
- The meaning of "Tzelem Elohim" (Image of God)
- Light and darkness symbolism
- The seven-day structure and its significance
- Ramban's mystical interpretations
- Rashi's explanations of creation order

Respond in JSON:
{
  "summary": "Core theological insight about creation",
  "creationTheme": {
    "hebrewName": "Hebrew term for this theme",
    "concept": "The main creation concept explored",
    "divineAttribute": "Which divine attribute is revealed",
    "significance": "Why this matters for understanding God and world"
  },
  "cosmicOrder": {
    "beforeAfter": "What changed through this act of creation",
    "purpose": "The telos (purpose) of this creative act",
    "symbolism": "Deeper symbolic meaning"
  },
  "commentaryInsights": [
    {
      "commentator": "Rashi/Ramban/Ibn Ezra/etc.",
      "insight": "Their unique perspective on this creation aspect"
    }
  ],
  "humanImplication": "What this teaches about human purpose and dignity",
  "kabbalisticHint": "Brief mystical dimension (Zohar, Arizal) if applicable",
  "topics": ["Creation", "Divine Speech", "Cosmic Order", etc.],
  "relatedVerses": ["Other Genesis verses that connect"]
}`,

    [ANALYSIS_MODES.NARRATIVE]: `${baseContext}

You are analyzing a verse from Sefer Bereshit (Genesis). Focus on NARRATIVE ANALYSIS - the literary structure, character development, story patterns, and narrative techniques of the Torah.

Key aspects to analyze:
- Character motivations and development
- Plot structure and narrative arc
- Recurring motifs and patterns (birthright, blessing, exile/return)
- Dialogue analysis and what's left unsaid
- The role of genealogies (toledot)
- Patriarchal/Matriarchal patterns
- Literary devices: chiasm, repetition, wordplay
- The narrator's perspective and voice
- Foreshadowing and callbacks
- Robert Alter's literary approach

Respond in JSON:
{
  "summary": "The narrative significance of this passage",
  "literaryAnalysis": {
    "narrativeTechnique": "Key literary device used",
    "structuralRole": "How this fits in the larger narrative",
    "tension": "What conflict or tension is present"
  },
  "characterStudy": {
    "mainCharacter": "Who is central here",
    "motivation": "What drives their actions",
    "development": "How they grow or change",
    "relationships": "Key relational dynamics"
  },
  "motifs": [
    {
      "motif": "Recurring pattern (e.g., sibling rivalry)",
      "appearance": "How it appears here",
      "significance": "Why it matters"
    }
  ],
  "wordplay": {
    "hebrewWords": ["Significant Hebrew terms"],
    "explanation": "Literary significance of word choices"
  },
  "narrativeQuestion": "What question does this passage raise for the reader?",
  "modernResonance": "How this story speaks to contemporary life",
  "topics": ["Character", "Narrative", "Literary patterns"]
}`,

    [ANALYSIS_MODES.GEMATRIA]: `${baseContext}

You are analyzing a verse focusing on GEMATRIA and numerical patterns in the Hebrew text. Explore:
- Letter values and word totals
- Significant number symbolism (7, 10, 12, 40, etc.)
- Connections between words of equal value
- Atbash, Albam, and other cipher systems
- Small gematria (mispar katan)
- The mystical significance of numbers
- Baal HaTurim's gematria insights

Important: Be accurate with numerical calculations. Only include gematria that is meaningful.

Respond in JSON:
{
  "summary": "Key numerical insight from this verse",
  "keyWords": [
    {
      "hebrew": "Hebrew word",
      "transliteration": "How to pronounce",
      "meaning": "Translation",
      "gematria": 0,
      "breakdown": "Letter by letter: א=1, ב=2, etc."
    }
  ],
  "numericalPatterns": [
    {
      "pattern": "Description of the pattern",
      "numbers": [7, 10, etc.],
      "significance": "Why this number matters in Torah"
    }
  ],
  "connections": [
    {
      "word1": "First word",
      "word2": "Connected word (same gematria)",
      "value": 0,
      "insight": "What this connection teaches"
    }
  ],
  "symbolism": {
    "dominantNumber": "The most significant number",
    "meaning": "Traditional meaning of this number",
    "application": "How it applies here"
  },
  "baalHaturim": "Insight in style of Baal HaTurim if relevant",
  "topics": ["Gematria", "Numbers", "Mysticism"]
}`,

    [ANALYSIS_MODES.QUICK_INSIGHT]: `${baseContext}

Provide a QUICK, CONCISE insight about this verse. This should be:
- Immediately accessible
- Memorable and quotable
- Practically applicable
- Takes less than 30 seconds to read

Respond in JSON:
{
  "insight": "One powerful sentence capturing the essence",
  "source": "Brief attribution (Rashi says..., The Midrash teaches...)",
  "reflection": "One question for personal reflection",
  "action": "One small action to take today based on this verse"
}`,

    // ========== ADVANCED SCHOLARLY MODES ==========

    [ANALYSIS_MODES.HALACHA]: `${baseContext}

You are analyzing this text from a HALACHIC (Jewish Law) perspective. Focus on:
- Practical mitzvot derived from this verse
- How the Talmud interprets this for legal purposes
- Rambam's halachic codification
- Shulchan Aruch rulings connected to this verse
- Contemporary applications (modern poskim)

Be precise about:
- Which mitzvot (positive/negative) relate to this text
- The halachic categories involved
- Practical applications today

Respond in JSON:
{
  "summary": "Brief overview of the halachic significance",
  "mitzvot": [
    {
      "name": "Name of mitzvah",
      "hebrewName": "Hebrew name (e.g., פריה ורביה)",
      "type": "positive/negative/rabbinic",
      "category": "Category (e.g., Bein Adam L'Makom, Bein Adam L'Chavero)",
      "derivation": "How this is derived from the verse",
      "application": "Practical application today"
    }
  ],
  "talmudSources": [
    {
      "tractate": "Masechet name",
      "daf": "Page reference",
      "topic": "What is discussed"
    }
  ],
  "rambam": {
    "sefer": "Which book of Mishneh Torah",
    "halachot": "Which section",
    "ruling": "The Rambam's ruling"
  },
  "shulchanAruch": {
    "section": "O.C./Y.D./E.H./C.M.",
    "siman": "Number",
    "ruling": "The halacha"
  },
  "modernApplication": "How this applies in contemporary life",
  "practicalGuidance": "What should one do based on this?",
  "topics": ["Halacha", "Mitzvot", "Jewish Law"]
}`,

    [ANALYSIS_MODES.MEFARSHIM]: `${baseContext}

Provide a MEFARSHIM (Commentators) comparison for this verse. Present multiple classic commentators side-by-side, showing how each approaches this text differently.

Include these major commentators when relevant:
RISHONIM (11th-15th century):
- Rashi (Rabbi Shlomo Yitzchaki) - Pshat & Midrash
- Ramban (Nachmanides) - Mystical & Philosophical
- Ibn Ezra - Grammatical & Rational
- Rashbam - Pure Pshat
- Sforno - Philosophical
- Radak - Linguistic

ACHARONIM (16th century onward):
- Or HaChaim - Mystical depth
- Kli Yakar - Homiletical
- Malbim - Linguistic precision
- Netziv - Contextual

Respond in JSON:
{
  "summary": "Overview of the verse's interpretive challenges",
  "verse": {
    "hebrew": "The Hebrew text if available",
    "translation": "Standard translation"
  },
  "commentators": [
    {
      "name": "Rashi",
      "hebrewName": "רש״י",
      "era": "Rishonim (1040-1105)",
      "approach": "Pshat with Midrash",
      "interpretation": "His specific reading of this verse",
      "keyInsight": "The main chiddush (novelty)",
      "dibburHamaschil": "Opening words he addresses (in Hebrew)"
    }
  ],
  "agreements": ["Points where commentators agree"],
  "disagreements": [
    {
      "issue": "The point of contention",
      "positions": [
        {"commentator": "Rashi", "position": "His view"},
        {"commentator": "Ramban", "position": "His view"}
      ],
      "significance": "Why this matters"
    }
  ],
  "synthesis": "How a Torah scholar might integrate these views",
  "studyTip": "How to learn these mefarshim effectively",
  "topics": ["Parshanut", "Rishonim", "Commentary"]
}`,

    [ANALYSIS_MODES.HISTORICAL]: `${baseContext}

Provide HISTORICAL and ARCHAEOLOGICAL context for this verse. Include:
- Ancient Near Eastern parallels and contrasts
- Archaeological discoveries relevant to this text
- Historical timeline and geography
- Cultural context of the biblical period
- How this text relates to surrounding civilizations

Important: While providing historical context, always maintain respect for the traditional understanding of the text as Torah MiSinai.

Respond in JSON:
{
  "summary": "Brief overview of historical significance",
  "historicalPeriod": {
    "era": "The biblical period (e.g., Patriarchal, Exodus, First Temple)",
    "approximateDate": "Traditional/scholarly dating",
    "keyFigures": ["Historical figures involved"]
  },
  "geography": {
    "location": "Where this takes place",
    "significance": "Why this location matters",
    "modernLocation": "Where this is today"
  },
  "ancientContext": {
    "nearEasternParallels": "Similar texts/concepts from surrounding cultures",
    "distinctiveness": "How the Torah's presentation differs",
    "culturalBackground": "What readers then would have understood"
  },
  "archaeology": [
    {
      "discovery": "Name of archaeological find",
      "location": "Where found",
      "relevance": "How it relates to this verse",
      "dating": "When dated to"
    }
  ],
  "traditionalView": "How Chazal and traditional sources understood this historically",
  "modernScholarship": "Academic perspectives (presented respectfully)",
  "faithAndHistory": "How traditional learning integrates historical context",
  "topics": ["History", "Archaeology", "Ancient Near East"]
}`,

    [ANALYSIS_MODES.LEXICON]: `${baseContext}

You are providing SCHOLARLY LEXICON analysis for the Hebrew/Aramaic words in this verse. Act as a combination of:
- Brown-Driver-Briggs (BDB) Hebrew Lexicon
- Jastrow's Dictionary of Talmud & Midrash
- Klein's Etymological Dictionary
- Gesenius' Hebrew Grammar
- HALOT (Hebrew & Aramaic Lexicon of the Old Testament)

For each significant word, provide:
1. Root (shoresh) analysis - the 3-letter root
2. Morphological breakdown (prefixes, suffixes, binyan)
3. Semantic range - all possible meanings
4. Cognate connections (Arabic, Akkadian, Ugaritic, Aramaic)
5. Biblical usage patterns
6. Scholarly citations

Use proper academic transliteration (ṣ for צ, ḥ for ח, š for ש, etc.).

Respond in JSON:
{
  "summary": "Overview of key lexical features in this verse",
  "words": [
    {
      "hebrew": "Hebrew word with nikud if possible",
      "transliteration": "Academic transliteration",
      "root": "3-letter shoresh",
      "rootMeaning": "Core meaning of the root",
      "morphology": {
        "partOfSpeech": "noun/verb/adj/etc.",
        "binyan": "For verbs: Qal/Niphal/Piel/etc.",
        "tense": "For verbs: Perfect/Imperfect/etc.",
        "person": "1st/2nd/3rd",
        "gender": "masculine/feminine",
        "number": "singular/plural",
        "prefixes": ["List of attached prefixes"],
        "suffixes": ["List of attached suffixes"]
      },
      "definitions": [
        {
          "meaning": "Primary meaning",
          "source": "BDB/Jastrow/HALOT",
          "usage": "How it's typically used"
        }
      ],
      "semanticRange": ["All possible meanings in different contexts"],
      "etymology": {
        "origin": "Proto-Semitic root or development",
        "cognates": [
          {"language": "Arabic", "word": "Cognate word", "meaning": "Meaning"},
          {"language": "Akkadian", "word": "Cognate word", "meaning": "Meaning"}
        ]
      },
      "biblicalUsage": {
        "frequency": "How often in Tanakh",
        "distribution": "Where it appears (Torah, Prophets, Writings)",
        "notableVerses": ["Other important occurrences"]
      },
      "scholarlyNotes": "Academic observations about this word"
    }
  ],
  "grammaticalFeatures": {
    "syntaxNotes": "Notable syntactic features of this verse",
    "constructChains": "Any סמיכות (construct states)",
    "verbPatterns": "Significant verbal constructions"
  },
  "lexicalConnections": [
    {
      "words": ["Word 1", "Word 2"],
      "relationship": "How these words relate semantically",
      "significance": "What this tells us"
    }
  ],
  "scholarlyReferences": [
    {
      "source": "BDB/HALOT/Jastrow/etc.",
      "citation": "Page or entry reference",
      "note": "Key insight from this source"
    }
  ],
  "topics": ["Lexicon", "Etymology", "Grammar", "Philology"]
}`,

    [ANALYSIS_MODES.INTERTEXTUAL]: `${baseContext}

You are providing INTERTEXTUAL ANALYSIS - examining how this verse connects to other biblical texts, rabbinic literature, and the broader Jewish textual tradition.

Focus on:
1. Cross-references within Torah (פסוקים מקבילים)
2. Connections to Nevi'im (Prophets) and Ketuvim (Writings)
3. How Chazal in Talmud and Midrash connect verses
4. Gezeirah Shavah - verbal analogies between texts
5. Thematic parallels and contrasts
6. Chiastic structures spanning multiple verses
7. Literary echoes and allusions

Be scholarly and precise with references.

Respond in JSON:
{
  "summary": "Overview of this verse's intertextual significance",
  "torahParallels": [
    {
      "reference": "Book Chapter:Verse",
      "hebrew": "Hebrew text of parallel",
      "connection": "How it connects (verbal, thematic, structural)",
      "significance": "What the connection teaches"
    }
  ],
  "neviimConnections": [
    {
      "reference": "Prophetic book reference",
      "text": "The parallel text",
      "connectionType": "Verbal echo/Thematic parallel/Fulfillment",
      "commentary": "How mefarshim understand this connection"
    }
  ],
  "ketuvimConnections": [
    {
      "reference": "Writings reference (Psalms, Proverbs, etc.)",
      "text": "The parallel text",
      "relationship": "How it relates to our verse"
    }
  ],
  "talmudConnections": [
    {
      "tractate": "Masechet name",
      "daf": "Page reference",
      "sugia": "Topic discussed",
      "howConnected": "Gezeirah Shavah / Hekkesh / Binyan Av / etc.",
      "teaching": "What the Gemara derives"
    }
  ],
  "midrashParallels": [
    {
      "source": "Midrash name (Bereishit Rabbah, etc.)",
      "chapter": "Chapter/section",
      "teaching": "The midrashic interpretation",
      "connectedVerses": ["Other verses brought together"]
    }
  ],
  "verbalAnalogies": [
    {
      "sharedWord": "The key word/phrase",
      "verses": ["List of verses sharing this language"],
      "rabbinicPrinciple": "Which hermeneutic rule applies",
      "derivation": "What is learned from the connection"
    }
  ],
  "thematicClusters": [
    {
      "theme": "Central theme",
      "relatedVerses": ["Verses exploring this theme"],
      "development": "How the theme develops across texts"
    }
  ],
  "literaryStructure": {
    "chiasm": "Any chiastic structure involving this verse",
    "inclusio": "Any bracketing/envelope structure",
    "repetition": "Significant repeated phrases"
  },
  "studySuggestions": ["Recommended texts to study alongside this verse"],
  "topics": ["Intertextuality", "Cross-references", "Midrash", "Talmud"]
}`,

    [ANALYSIS_MODES.TREE_SUMMARY]: `${baseContext}

Create a BILINGUAL VISUAL TREE DIAGRAM summary of this verse/commentary. Present the concepts in a hierarchical tree structure that shows how ideas branch out from the main theme.

IMPORTANT: Provide ALL text content in BOTH Hebrew AND English for multilingual learners.

The tree should:
1. Start with a ROOT concept (the main idea) - in Hebrew AND English
2. Branch into 2-4 MAJOR themes - each with Hebrew AND English labels
3. Each theme branches into specific points/applications
4. Include connections between related concepts
5. For MULTI-VERSE passages: Include verse references for each branch/insight

Make it visually scannable and memorable for both Hebrew and English readers.

Respond in JSON:
{
  "title": "Brief title for this concept tree",
  "titleHebrew": "כותרת בעברית",
  "verseRange": "If multiple verses, the range (e.g., '1:1-3' or null for single verse)",
  "root": {
    "concept": "The central idea in 3-5 words (English)",
    "conceptHebrew": "הרעיון המרכזי (Hebrew)",
    "hebrew": "Key Hebrew term",
    "transliteration": "How to pronounce the Hebrew",
    "description": "One sentence explanation (English)",
    "descriptionHebrew": "הסבר במשפט אחד (Hebrew)"
  },
  "branches": [
    {
      "id": "A",
      "theme": "Major theme name (English)",
      "themeHebrew": "שם הנושא (Hebrew)",
      "icon": "Relevant emoji",
      "color": "blue/green/purple/gold",
      "description": "Brief explanation (English)",
      "descriptionHebrew": "הסבר קצר (Hebrew)",
      "verseRef": "Specific verse reference if from multi-verse passage (e.g., 'v.2' or '1:2')",
      "leaves": [
        {
          "point": "Specific insight (English)",
          "pointHebrew": "תובנה ספציפית (Hebrew)",
          "source": "Commentary source if relevant",
          "verseRef": "Verse reference if applicable"
        }
      ]
    }
  ],
  "connections": [
    {
      "from": "A",
      "to": "B",
      "relationship": "How these themes connect (English)",
      "relationshipHebrew": "כיצד הנושאים קשורים (Hebrew)"
    }
  ],
  "practicalRoot": "One practical takeaway (English)",
  "practicalRootHebrew": "מסקנה מעשית אחת (Hebrew)",
  "studyPath": "Suggested order to explore (English)",
  "studyPathHebrew": "סדר מומלץ ללימוד (Hebrew)"
}`,

    // ========== MULTI-VERSE PASSAGE ANALYSIS MODES ==========

    [ANALYSIS_MODES.PASSAGE]: `${baseContext}

You are analyzing a PASSAGE of multiple verses together. Focus on:
1. The unified message across all verses
2. How the verses flow and connect
3. The progression of ideas
4. Key turning points or climactic moments
5. What is gained by reading these verses together vs separately

This is a multi-verse analysis - treat the passage as a coherent unit.

Respond in JSON:
{
  "passageOverview": {
    "verseRange": "The verse range being analyzed",
    "centralTheme": "The main theme that unifies these verses",
    "summary": "2-3 sentence summary of the entire passage",
    "type": "Narrative/Legal/Poetic/Prophetic/Wisdom"
  },
  "verseByVerse": [
    {
      "verse": "Verse reference",
      "role": "How this verse functions in the passage (introduction/development/climax/conclusion)",
      "keyPoint": "Main contribution of this verse",
      "connection": "How it connects to previous/next verse"
    }
  ],
  "unifiedAnalysis": {
    "narrativeArc": "How the story/argument develops across verses",
    "keyProgression": "What changes or develops from start to end",
    "peakMoment": "The climactic or most important verse",
    "resolution": "How the passage concludes"
  },
  "themes": [
    {
      "theme": "Theme name",
      "verses": ["Which verses contain this theme"],
      "development": "How the theme develops across the passage"
    }
  ],
  "literaryFeatures": {
    "repetitions": ["Key words/phrases repeated"],
    "contrasts": ["Oppositions or contrasts"],
    "parallelism": "Any parallel structures",
    "inclusio": "Does the passage have bookend structure?"
  },
  "practicalMessage": "What unified lesson emerges from reading these verses together?",
  "diagram": "graph TD\\n    A[Opening] --> B[Development]\\n    B --> C[Key Turning Point]\\n    C --> D[Climax]\\n    D --> E[Resolution]",
  "diagramExplanation": "How the passage flows",
  "topics": ["Relevant topic tags"]
}

${diagramInstructions}`,

    [ANALYSIS_MODES.PASSAGE_NARRATIVE]: `${baseContext}

You are analyzing a NARRATIVE PASSAGE - multiple verses that tell a story together. Focus on:
1. Plot structure: beginning, rising action, climax, falling action, resolution
2. Character development across the verses
3. Dialogue patterns and what they reveal
4. Scene changes and transitions
5. The narrator's perspective and what's emphasized/omitted

Treat these verses as a coherent story unit.

Respond in JSON:
{
  "storyStructure": {
    "setting": "Where/when the story takes place",
    "exposition": "Background information provided",
    "incitingIncident": "What sets the action in motion",
    "risingAction": ["Events building tension"],
    "climax": "The peak moment of the narrative",
    "fallingAction": ["Events after climax"],
    "resolution": "How the story concludes"
  },
  "characters": [
    {
      "name": "Character name",
      "role": "Protagonist/Antagonist/Supporting",
      "firstAppearance": "Which verse",
      "characterization": "How they are portrayed",
      "development": "How they change across the passage",
      "dialogue": "Key things they say",
      "motivation": "What drives them"
    }
  ],
  "narrativeTechniques": {
    "pointOfView": "Whose perspective",
    "pacing": "Fast/slow, where does it linger",
    "gaps": "What is left unsaid (meomar)",
    "foreshadowing": "Hints of what's to come",
    "symbolism": "Symbolic elements"
  },
  "dialogue_analysis": {
    "speakers": ["Who speaks"],
    "patterns": "How dialogue is structured",
    "subtext": "What's implied but not said"
  },
  "thematicElements": {
    "centralConflict": "The main tension",
    "moralQuestion": "Ethical issue raised",
    "torahLesson": "What the Torah teaches through this story"
  },
  "commentaryHighlights": [
    {
      "commentator": "Rashi/Ramban/etc.",
      "insight": "Key narrative insight"
    }
  ],
  "diagram": "graph LR\\n    A[Exposition] --> B[Conflict]\\n    B --> C[Rising Action]\\n    C --> D[Climax]\\n    D --> E[Resolution]",
  "topics": ["Narrative", "Character", "Plot"]
}

${diagramInstructions}`,

    [ANALYSIS_MODES.PASSAGE_THEMATIC]: `${baseContext}

You are analyzing multiple verses for their THEMATIC CONNECTIONS. Identify themes that appear across the passage and how they interweave.

Focus on:
1. Major themes present in the passage
2. How themes develop and deepen verse by verse
3. Connections between different themes
4. Sub-themes and motifs
5. The theological/ethical message of the combined themes

Respond in JSON:
{
  "passageSummary": "Brief overview of the passage",
  "majorThemes": [
    {
      "theme": "Theme name",
      "hebrewTerm": "Hebrew term if applicable",
      "definition": "What this theme means",
      "occurrences": [
        {
          "verse": "Verse reference",
          "manifestation": "How theme appears here",
          "keywords": ["Key Hebrew words expressing this theme"]
        }
      ],
      "development": "How the theme evolves across the passage",
      "significance": "Why this theme matters"
    }
  ],
  "thematicConnections": [
    {
      "theme1": "First theme",
      "theme2": "Second theme",
      "relationship": "How they relate (complement/contrast/cause-effect)",
      "verses": ["Verses where they interact"]
    }
  ],
  "motifs": [
    {
      "motif": "Recurring image/word/idea",
      "appearances": ["Where it appears"],
      "function": "What purpose it serves"
    }
  ],
  "unifyingMessage": {
    "synthesis": "How all themes combine into one message",
    "theologicalPoint": "What this teaches about God/Torah/humanity",
    "practicalApplication": "How to apply this in life"
  },
  "commentaryPerspectives": [
    {
      "commentator": "Source",
      "thematicInsight": "Their perspective on the themes"
    }
  ],
  "diagram": "graph TD\\n    A[Central Theme] --> B[Sub-theme 1]\\n    A --> C[Sub-theme 2]\\n    B --> D[Connection]\\n    C --> D\\n    D --> E[Unified Message]",
  "topics": ["Themes", "Theology", "Ethics"]
}

${diagramInstructions}`,

    [ANALYSIS_MODES.PASSAGE_CHIASM]: `${baseContext}

You are analyzing a passage for CHIASTIC STRUCTURE (כיאזמוס) - the literary pattern where elements are arranged in an A-B-C-B'-A' pattern, with the center being the focal point.

Chiastic structures in Torah are significant because:
1. The CENTER reveals the main message
2. Parallel elements illuminate each other
3. The structure is intentional and meaningful

Analyze whether this passage contains chiastic patterns.

Respond in JSON:
{
  "hasChiasm": true,
  "chiasmAnalysis": {
    "pattern": "A-B-C-B'-A' (describe the actual pattern found)",
    "confidence": "high/medium/low - how clear is the chiasm",
    "type": "Inverted parallelism/Concentric/Ring composition"
  },
  "elements": [
    {
      "label": "A",
      "verse": "Verse reference",
      "content": "What this element contains",
      "hebrewKey": "Key Hebrew word/phrase"
    },
    {
      "label": "B",
      "verse": "Verse reference",
      "content": "What this element contains",
      "hebrewKey": "Key Hebrew word/phrase"
    },
    {
      "label": "C (CENTER)",
      "verse": "Verse reference",
      "content": "The central/focal point",
      "hebrewKey": "Key Hebrew word/phrase",
      "significance": "Why this is the center - the main message"
    },
    {
      "label": "B'",
      "verse": "Verse reference",
      "content": "Parallel to B",
      "hebrewKey": "Key Hebrew word/phrase",
      "parallelTo": "B",
      "relationship": "How B and B' relate"
    },
    {
      "label": "A'",
      "verse": "Verse reference",
      "content": "Parallel to A",
      "hebrewKey": "Key Hebrew word/phrase",
      "parallelTo": "A",
      "relationship": "How A and A' relate"
    }
  ],
  "centerAnalysis": {
    "focalPoint": "What's at the center",
    "message": "The main teaching revealed by the center",
    "whyCenter": "Why this is the climax/focus"
  },
  "parallelAnalysis": [
    {
      "pair": "A/A'",
      "connection": "What links these elements",
      "insight": "What we learn from comparing them"
    }
  ],
  "structuralPurpose": "Why the author used this chiastic structure",
  "theologicalSignificance": "What this structure teaches us",
  "commentarySupport": [
    {
      "source": "Scholar/commentator who notes this structure",
      "observation": "Their insight"
    }
  ],
  "diagram": "graph TD\\n    A[A Element] --> B[B Element]\\n    B --> C[CENTER - Key Point]\\n    C --> D[B Prime]\\n    D --> E[A Prime]\\n    A -.-> E\\n    B -.-> D",
  "topics": ["Chiasm", "Literary Structure", "Biblical Poetry"]
}

${diagramInstructions}
Note: Use dotted lines (-.->)  to show the parallel relationships in the chiasm.`,

    // ========== TALMUD-SPECIFIC MODES ==========

    [ANALYSIS_MODES.SUGYA_FLOW]: `${baseContext}

You are analyzing a TALMUDIC SUGYA (סוגיא) - a unit of discussion in the Gemara. Your expertise includes:
- Identifying Mishna vs Gemara sections
- Recognizing discourse markers (תנן, מתקיף, תא שמע, etc.)
- Understanding the dialectical structure (שקלא וטריא)
- Tracking the flow of questions, answers, proofs, and objections

Key Talmudic discourse patterns to identify:
SOURCES: מתני׳ (Mishna), תנן (we learned), שנינו (we learned), ברייתא (Baraita)
QUESTIONS: מאי (what), מהו (what is), מנא הני מילי (whence these words), מנלן (whence)
OBJECTIONS: מתקיף (objects), איתיביה (he raised objection), ורמינהי (contradiction!)
PROOFS: תא שמע (come hear), מייתי לה (brings it), ראיה (proof)
RESOLUTIONS: אלא (rather), הכי קאמר (this is what it means), לא קשיא (no difficulty)
STATEMENTS: אמר רבי (Rabbi said), אמר רב (Rav said)

Respond in JSON:
{
  "sugyaOverview": {
    "type": "Legal/Aggadic/Mixed",
    "mainTopic": "Central topic of the sugya",
    "complexity": "Basic/Intermediate/Advanced",
    "amudReference": "Daf and amud if provided"
  },
  "structuralAnalysis": {
    "hasMishna": true,
    "mishnaContent": "Brief summary of the Mishna if present",
    "gemaraStart": "Where Gemara begins",
    "totalSteps": 0
  },
  "discourseFlow": [
    {
      "step": 1,
      "type": "source/question/statement/objection/proof/resolution",
      "marker": "Hebrew marker (e.g., מתני׳, מאי, תא שמע)",
      "speaker": "Rabbi name if applicable",
      "content": "What is said/asked",
      "relationship": "starts/asks/challenges/answers/proves/resolves",
      "targetStep": null
    }
  ],
  "rabbisInvolved": [
    {
      "name": "Rabbi name",
      "hebrewName": "Hebrew name",
      "role": "questioner/responder/cited authority",
      "generation": "Tanna/Amora + generation"
    }
  ],
  "keyArguments": [
    {
      "position": "One side of debate",
      "support": "Evidence for this position",
      "counterargument": "Challenge to this position"
    }
  ],
  "resolution": {
    "hasResolution": true,
    "type": "accepted/rejected/left unresolved (תיקו)",
    "conclusion": "Final ruling or understanding",
    "practicalHalacha": "What we learn practically"
  },
  "terminology": [
    {
      "term": "Aramaic/Hebrew term",
      "meaning": "What it means",
      "function": "How it functions in Talmudic discourse"
    }
  ],
  "diagram": "graph TD\\n    A[Mishna] --> B[Question]\\n    B --> C[Attempted Answer]\\n    C --> D[Objection]\\n    D --> E[Resolution]",
  "diagramExplanation": "Visual flow of the sugya argument",
  "studyTips": ["Tips for understanding this type of sugya"],
  "relatedSugyot": ["Other sugyot that discuss similar issues"],
  "topics": ["Talmud", "Sugya", "Halacha"]
}

${diagramInstructions}`,

    [ANALYSIS_MODES.SHAKLA_VETARYA]: `${baseContext}

You are analyzing the SHAKLA VETARYA (שקלא וטריא) - the back-and-forth dialectical argumentation that is the heart of Talmudic discourse.

Focus on:
1. The give-and-take of the argument
2. Each challenge (קושיא) and its answer (תירוץ)
3. The logical structure of objections and resolutions
4. How the argument progresses toward truth
5. The methodology of Talmudic reasoning

Types of argumentative moves:
- קושיא (Kushya): Difficulty/objection
- תירוץ (Tiruts): Answer/resolution
- פירכא (Pirka): Refutation
- ראיה (Ra'aya): Proof
- סברא (Svara): Logical reasoning
- גזירה שוה (Gezeira Shava): Verbal analogy
- קל וחומר (Kal VaChomer): A fortiori argument
- הוה אמינא (Hava Amina): Initial assumption
- מסקנא (Maskana): Conclusion

Respond in JSON:
{
  "dialecticOverview": {
    "mainQuestion": "The central question being debated",
    "numberOfExchanges": 0,
    "finalOutcome": "How the debate resolves"
  },
  "exchanges": [
    {
      "round": 1,
      "challenge": {
        "type": "קושיא/פירכא/contradiction",
        "marker": "Hebrew marker used",
        "content": "The challenge raised",
        "source": "Where this challenge comes from",
        "strength": "weak/moderate/strong"
      },
      "response": {
        "type": "תירוץ/distinction/reinterpretation",
        "marker": "Hebrew marker used",
        "content": "The response given",
        "method": "How the challenge is addressed",
        "success": "accepted/rejected/partial"
      }
    }
  ],
  "logicalMoves": [
    {
      "moveType": "סברא/גזירה שוה/קל וחומר/etc.",
      "explanation": "How this logical move works",
      "application": "How it's applied here"
    }
  ],
  "assumptions": {
    "havaAmina": "Initial assumption (הוה אמינא)",
    "maskana": "Final conclusion (מסקנא)",
    "shift": "How understanding shifted"
  },
  "distinctionsDrawn": [
    {
      "distinction": "The חילוק (distinction) made",
      "between": "What two cases are distinguished",
      "basis": "The basis for the distinction"
    }
  ],
  "methodology": {
    "primaryMethod": "Main argumentative approach",
    "sources": "Types of sources cited",
    "characteristic": "What makes this shakla vetarya distinctive"
  },
  "diagram": "graph LR\\n    A[Initial Position] --> B[Challenge 1]\\n    B --> C[Response 1]\\n    C --> D[Challenge 2]\\n    D --> E[Final Resolution]",
  "learningPoints": ["Key takeaways about Talmudic methodology"],
  "topics": ["Dialectic", "Methodology", "Svara"]
}

${diagramInstructions}`,

    [ANALYSIS_MODES.SUGYA_SUMMARY]: `${baseContext}

Provide a CONCISE SUGYA SUMMARY suitable for quick review or shiur preparation. This should be:
- Clear and accessible
- Capture the essence of the discussion
- Include key terms and rabbis
- Ready for study or teaching

Respond in JSON:
{
  "title": "Brief descriptive title for this sugya",
  "oneLineSummary": "The sugya in one sentence",
  "background": "What you need to know before learning this",
  "structure": {
    "mishna": "Brief Mishna summary (if present)",
    "gemara": "Brief Gemara flow"
  },
  "keyQuestion": "The main question addressed",
  "mainPositions": [
    {
      "position": "One viewpoint",
      "holder": "Who holds this",
      "reasoning": "Why"
    }
  ],
  "resolution": "How it's resolved (or if תיקו)",
  "bottomLine": "The practical/conceptual takeaway",
  "keyTerms": [
    {
      "term": "Important term",
      "meaning": "Brief meaning"
    }
  ],
  "keyRabbis": ["Rabbi 1", "Rabbi 2"],
  "connections": {
    "relatedHalacha": "Practical law connection",
    "relatedConcepts": ["Related topics"]
  },
  "forShiur": {
    "openingQuestion": "Good question to start discussion",
    "keyPoint": "Main point to emphasize",
    "takeaway": "What students should remember"
  },
  "diagram": "graph TD\\n    A[Topic] --> B[Question]\\n    B --> C[Answer]",
  "topics": ["Sugya", "Summary"]
}

Keep this CONCISE - this is a study aid, not a deep analysis.`
  };

  return prompts[mode] || prompts[ANALYSIS_MODES.SUMMARY];
};

const getUserPrompt = (commentaryText, source, verse, mode) => {
  const modeDescriptions = {
    [ANALYSIS_MODES.SUMMARY]: 'Provide a structured summary with key points and a concept diagram.',
    [ANALYSIS_MODES.DEEP_STUDY]: 'Provide an in-depth scholarly analysis suitable for serious Torah study.',
    [ANALYSIS_MODES.STUDY_QUESTIONS]: 'Generate study questions at different levels for learning this material.',
    [ANALYSIS_MODES.KEY_TERMS]: 'Extract and explain the key Hebrew/Aramaic terms and concepts.',
    [ANALYSIS_MODES.COMPARE]: 'Analyze different interpretive approaches to this text.',
    [ANALYSIS_MODES.PARDES]: 'Analyze using the four levels of PaRDeS: Pshat, Remez, Drash, and Sod.',
    [ANALYSIS_MODES.MUSSAR]: 'Provide Mussar analysis focusing on middot (character traits) and practical ethical growth.',
    // Genesis-specific modes
    [ANALYSIS_MODES.CREATION]: 'Analyze the creation theology - divine attributes, cosmic order, and the meaning of creation.',
    [ANALYSIS_MODES.NARRATIVE]: 'Provide literary and narrative analysis - character study, motifs, and story structure.',
    [ANALYSIS_MODES.GEMATRIA]: 'Explore gematria and numerical patterns in the Hebrew text.',
    [ANALYSIS_MODES.QUICK_INSIGHT]: 'Give one quick, memorable insight I can apply today.',
    // Advanced scholarly modes
    [ANALYSIS_MODES.HALACHA]: 'Derive the practical halachic (Jewish law) implications - mitzvot, Talmud sources, and modern applications.',
    [ANALYSIS_MODES.MEFARSHIM]: 'Compare how different classic commentators (Rashi, Ramban, Ibn Ezra, etc.) interpret this verse.',
    [ANALYSIS_MODES.HISTORICAL]: 'Provide historical and archaeological context for this verse.',
    [ANALYSIS_MODES.LEXICON]: 'Provide comprehensive scholarly lexicon analysis - root analysis, morphology, etymology, cognates, and academic dictionary citations (BDB, HALOT, Jastrow, Klein).',
    [ANALYSIS_MODES.INTERTEXTUAL]: 'Analyze intertextual connections - cross-references, Talmud/Midrash links, verbal analogies, and thematic parallels across Jewish texts.',
    [ANALYSIS_MODES.TREE_SUMMARY]: 'Create a visual tree diagram showing the hierarchical structure of concepts, themes, and their connections.',
    // Multi-verse passage modes
    [ANALYSIS_MODES.PASSAGE]: 'Analyze this passage as a unified whole - how the verses connect, flow, and build a complete message.',
    [ANALYSIS_MODES.PASSAGE_NARRATIVE]: 'Analyze the narrative structure - plot, characters, dialogue, and story arc across these verses.',
    [ANALYSIS_MODES.PASSAGE_THEMATIC]: 'Identify and trace themes across the passage - how they develop, connect, and form a unified message.',
    [ANALYSIS_MODES.PASSAGE_CHIASM]: 'Analyze for chiastic structure (A-B-C-B\'-A\') - find the center, parallel elements, and structural meaning.',
    // Talmud-specific modes
    [ANALYSIS_MODES.SUGYA_FLOW]: 'Analyze this Talmudic sugya - identify discourse markers, track the flow of questions/objections/proofs, and map the logical structure.',
    [ANALYSIS_MODES.SHAKLA_VETARYA]: 'Analyze the shakla vetarya (back-and-forth dialectic) - each challenge, response, logical move, and how the argument progresses.',
    [ANALYSIS_MODES.SUGYA_SUMMARY]: 'Provide a concise sugya summary suitable for shiur preparation - key question, main positions, resolution, and takeaway.'
  };

  return `Analyze this ${source} commentary on ${verse}:

"${commentaryText}"

${modeDescriptions[mode] || modeDescriptions[ANALYSIS_MODES.SUMMARY]}

Respond with valid JSON only.`;
};

// ============================================================================
// Main Analysis Function
// ============================================================================
export const analyzeCommentary = async (
  commentaryText,
  source = 'Commentary',
  verse = '',
  mode = ANALYSIS_MODES.SUMMARY
) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('API key not configured. Click the AI settings button (💡) to add your free Groq API key.');
  }

  if (!commentaryText || commentaryText.trim().length < 20) {
    throw new Error('Commentary text is too short to analyze.');
  }

  // Check cache first
  const cacheKey = getCacheKey(commentaryText, source, verse, mode);
  const cached = analysisCache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const systemPrompt = getSystemPrompt(mode, source);
  const userPrompt = getUserPrompt(commentaryText, source, verse, mode);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: mode === ANALYSIS_MODES.STUDY_QUESTIONS ? 0.5 :
                     mode === ANALYSIS_MODES.GEMATRIA ? 0.2 :
                     mode === ANALYSIS_MODES.LEXICON ? 0.15 :
                     mode === ANALYSIS_MODES.HALACHA ? 0.2 :
                     mode === ANALYSIS_MODES.SUGYA_FLOW ? 0.2 :
                     mode === ANALYSIS_MODES.SHAKLA_VETARYA ? 0.2 :
                     mode === ANALYSIS_MODES.SUGYA_SUMMARY ? 0.25 : 0.3,
        max_tokens: mode === ANALYSIS_MODES.QUICK_INSIGHT ? 300 :
                    mode === ANALYSIS_MODES.DEEP_STUDY ? 2048 :
                    mode === ANALYSIS_MODES.MEFARSHIM ? 2048 :
                    mode === ANALYSIS_MODES.LEXICON ? 2500 :
                    mode === ANALYSIS_MODES.INTERTEXTUAL ? 2200 :
                    mode === ANALYSIS_MODES.HALACHA ? 1800 :
                    mode === ANALYSIS_MODES.HISTORICAL ? 1500 :
                    mode === ANALYSIS_MODES.CREATION ? 1500 :
                    mode === ANALYSIS_MODES.NARRATIVE ? 1500 :
                    mode === ANALYSIS_MODES.TREE_SUMMARY ? 1200 :
                    // Multi-verse passage modes need more tokens
                    mode === ANALYSIS_MODES.PASSAGE ? 2500 :
                    mode === ANALYSIS_MODES.PASSAGE_NARRATIVE ? 2500 :
                    mode === ANALYSIS_MODES.PASSAGE_THEMATIC ? 2200 :
                    mode === ANALYSIS_MODES.PASSAGE_CHIASM ? 2000 :
                    // Talmud-specific modes
                    mode === ANALYSIS_MODES.SUGYA_FLOW ? 2500 :
                    mode === ANALYSIS_MODES.SHAKLA_VETARYA ? 2200 :
                    mode === ANALYSIS_MODES.SUGYA_SUMMARY ? 1200 : 1024,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 429) {
        throw new Error('Rate limit reached. Please wait a moment and try again.');
      }
      throw new Error(error.error?.message || 'Failed to analyze commentary');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content);

    // Sanitize diagram if present
    if (parsed.diagram) {
      parsed.diagram = sanitizeMermaidDiagram(parsed.diagram);
    }

    const result = {
      success: true,
      mode,
      ...parsed,
      model: data.model,
      usage: data.usage,
      fromCache: false
    };

    // Cache the result
    analysisCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      success: false,
      mode,
      error: error.message,
      summary: null,
      keyPoints: [],
      topics: []
    };
  }
};

// Legacy function for backwards compatibility
export const summarizeCommentary = (commentaryText, source, verse) => {
  return analyzeCommentary(commentaryText, source, verse, ANALYSIS_MODES.SUMMARY);
};

// ============================================================================
// Diagram Sanitization - Enhanced for reliability
// ============================================================================
const sanitizeMermaidDiagram = (diagram) => {
  if (!diagram || typeof diagram !== 'string') return null;

  let sanitized = diagram
    // Unescape common escape sequences
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '  ')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();

  // Remove any Hebrew/Arabic characters that might cause rendering issues
  sanitized = sanitized.replace(/[\u0590-\u05FF\u0600-\u06FF]/g, '');

  // Remove markdown code block markers if present
  sanitized = sanitized
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Ensure valid graph declaration at the start
  if (!sanitized.match(/^(graph|flowchart|sequenceDiagram|classDiagram|mindmap)/i)) {
    sanitized = 'graph TD\n' + sanitized;
  }

  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Fix common syntax issues
  sanitized = sanitized
    // Ensure proper spacing around arrows
    .replace(/\s*-->\s*/g, ' --> ')
    .replace(/\s*---\s*/g, ' --- ')
    .replace(/\s*-\.->\s*/g, ' -.-> ')
    .replace(/\s*==>\s*/g, ' --> ') // Convert thick arrows to regular
    .replace(/\s*-\.-\s*/g, ' --- ') // Convert dotted lines
    // Fix node IDs - ensure they start with a letter
    .replace(/(\n\s*)(\d+)(\[)/g, '$1N$2$3')
    // Remove problematic characters inside brackets
    .replace(/\[([^\]]*)\]/g, (match, content) => {
      const cleaned = content
        .replace(/[^\w\s\-.,!?]/g, '') // Keep only safe characters
        .replace(/\s+/g, ' ')          // Normalize whitespace
        .trim()
        .slice(0, 35); // Limit length
      return `[${cleaned || 'Node'}]`;
    })
    // Ensure each connection is on its own line
    .replace(/(\])\s*([A-Z])/g, '$1\n    $2')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove empty lines at start
    .replace(/^\n+/, '')
    // Fix indentation
    .replace(/\n([A-Z])/g, '\n    $1');

  // Validate basic structure - must have at least one arrow
  if (!sanitized.includes(' --> ') && !sanitized.includes(' --- ')) {
    return null; // Invalid diagram, don't render
  }

  return sanitized;
};

// ============================================================================
// Connection Test
// ============================================================================
export const checkGroqConnection = async () => {
  const apiKey = getApiKey();

  if (!apiKey) {
    return { connected: false, error: 'No API key configured' };
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say "connected" in one word.' }],
        max_tokens: 5
      }),
    });

    if (response.ok) {
      return { connected: true };
    } else {
      const error = await response.json();
      return { connected: false, error: error.error?.message || 'Connection failed' };
    }
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

// ============================================================================
// Utility: Clear Cache
// ============================================================================
export const clearAnalysisCache = () => {
  analysisCache.clear();
};

// ============================================================================
// Export
// ============================================================================
const groqService = {
  analyzeCommentary,
  summarizeCommentary,
  checkGroqConnection,
  setGroqApiKey,
  getStoredApiKey,
  removeGroqApiKey,
  clearAnalysisCache,
  ANALYSIS_MODES
};

export default groqService;
