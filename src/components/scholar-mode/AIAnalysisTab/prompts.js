/**
 * Consolidated prompt constants for AI analysis modes.
 *
 * All text-type-aware prompts (Talmud vs Torah/Tanakh) used by the three
 * AI mode components live here so they can be maintained in one place.
 *
 * @module prompts
 */

// =============================================================================
// IYUN (עיון) - Deep Analysis Prompts & Button Sets
// =============================================================================

/**
 * Talmud-specific deep-analysis prompts keyed by analysis type.
 * @type {Record<string, string>}
 */
export const TALMUD_PROMPTS = {
  structure: `Analyze the structure of this Talmudic passage (סוגיא). Identify:
1. **משנה/ברייתא**: The foundational statement being discussed
2. **שאלה (בעיא/קושיא)**: Questions or challenges raised
3. **תירוץ**: Resolutions and answers
4. **ראיה/הוכחה**: Proofs brought from other sources
5. **מחלוקת**: Disputes between Tannaim/Amoraim (name the sages)
6. **מסקנה**: The conclusion or ruling

Mark each structural element clearly. Use original Aramaic/Hebrew terms.
Respond entirely in Hebrew with clear section headers.`,

  sevara: `Explain the underlying sevara (סברא) — the logical reasoning — in this Talmudic passage:
1. **הנחת יסוד**: What is the foundational assumption?
2. **סברא מרכזית**: What is the core reasoning that drives the argument?
3. **למה זה הגיוני**: Why does each position make sense given its assumptions?
4. **חילוק**: What distinctions are being drawn between cases?
5. **נפקא מינה**: What practical difference emerges from this reasoning?

Be thorough. Explain each step as a chavruta partner would. Respond in Hebrew.`,

  shakla: `Analyze the dialectic (שקלא וטריא) in this Talmudic passage step by step:
1. **Opening position**: What claim or ruling starts the discussion?
2. **Challenge (קושיא/איבעיא)**: What question or objection is raised?
3. **Attempted answer**: How is it initially addressed?
4. **Counter-challenge**: Is the answer itself challenged?
5. **Resolution flow**: Trace each back-and-forth exchange in order
6. **Final resolution**: How is the discussion settled?

Number each exchange. Use arrows to show the flow. Identify speakers where possible.
Respond in Hebrew.`,

  mekorot: `Identify and explain all sources (מקורות) referenced in this Talmudic passage:
1. **פסוקים**: Biblical verses cited — give the full verse and explain why it's brought
2. **משניות/ברייתות**: Tannaitic sources — identify which מסכתא and explain the connection
3. **מימרות**: Amoraic statements — who said what and in whose name
4. **גזירות שוות / היקש**: Hermeneutical principles used to derive laws
5. **Cross-references**: Related sugyot in other tractates

For each source explain: (a) the citation, (b) why it's brought here, (c) what it proves or challenges.
Respond in Hebrew.`,

  halacha: `Extract the halachic conclusion (מסקנה הלכתית) from this Talmudic passage:
1. **שאלה הלכתית**: What is the practical legal question?
2. **דעות**: List each opinion and who holds it
3. **הכרעה**: Which opinion is accepted as halacha, and why?
4. **פסק**: State the ruling clearly
5. **נפקא מינה למעשה**: Practical applications and edge cases
6. **הלכה למעשה**: How this is ruled in later codes (Rambam, Shulchan Aruch) if known

Respond in Hebrew. Be precise about the ruling.`,

  diagram: `Create a Mermaid diagram showing the dialectic flow of this Talmudic passage.
Use graph TD format. Include:
- The initial statement/mishna at the top
- Questions as diamond nodes
- Answers as rounded rectangles
- Proofs as hexagons
- Final ruling at the bottom

Keep node labels concise (Hebrew OK, max 6 words per node). Return ONLY the Mermaid code.`
};

/**
 * Torah/Tanakh-specific deep-analysis prompts keyed by analysis type.
 * @type {Record<string, string>}
 */
export const TORAH_PROMPTS = {
  structure: `Analyze the structure of this Torah/Tanakh passage. Identify:
1. **נושא מרכזי**: The central theme or narrative
2. **מבנה ספרותי**: Literary structure (chiasm, parallelism, repetition)
3. **חלוקת הפסוקים**: How verses relate to each other
4. **מילים מנחות**: Guiding/key words that repeat
5. **הקשר**: Connection to surrounding passages

Respond in Hebrew with clear section headers.`,

  sevara: `Explain the reasoning and deeper meaning in this Torah passage:
1. **פשט**: The plain meaning — what is happening?
2. **למה כאן**: Why is this passage placed here in the text?
3. **קושיות**: What questions arise from a careful reading?
4. **רמז/דרש**: Hints at deeper meaning or derivations
5. **הסבר**: Explain the internal logic of the narrative or law

Respond in Hebrew, be thorough but clear.`,

  parshanut: `Provide a multi-layered commentary analysis (פרשנות) of this Torah passage:
1. **רש"י**: What does Rashi likely explain here? What difficulty does he address?
2. **רמב"ן**: What would Ramban's approach be? Where might he disagree with Rashi?
3. **אבן עזרא**: What grammatical or linguistic insight applies?
4. **רשב"ם**: What is the peshat (contextual) reading?
5. **ספורנו/אור החיים**: What philosophical or moral insight emerges?

For each, explain: (a) their likely interpretation, (b) what problem they solve, (c) how they differ from others.
Respond in Hebrew.`,

  lashon: `Analyze the language and literary devices (לשון הכתוב) in this passage:
1. **מילים יחידאיות**: Rare or unique words — their root and meaning
2. **שורשים**: Key roots and their semantic range
3. **דקדוק**: Notable grammatical forms (binyan, tense, gender)
4. **סגנון**: Literary style — narrative, legal, poetic, prophetic
5. **לשון כפולה/יתור**: Redundancies or extra words and what they teach
6. **השוואה**: Compare with the same words used elsewhere in Tanakh

Respond in Hebrew with examples from the text.`,

  mussar: `Extract the ethical and philosophical teachings (מוסר והשקפה) from this passage:
1. **מידות**: Character traits highlighted (positive and negative)
2. **לקח מוסרי**: The moral lesson — what should we learn?
3. **השקפת עולם**: The worldview being conveyed
4. **יחס בין אדם לחברו**: Interpersonal ethics taught
5. **יחס בין אדם למקום**: Human-Divine relationship themes
6. **רלוונטיות**: How does this apply to modern life?

Respond in Hebrew. Draw from traditional mussar sources where relevant.`,

  diagram: `Create a Mermaid diagram showing the structure of this Torah passage.
Use graph TD format. Include:
- Main theme at the top
- Key events/laws as rectangular nodes
- Cause-effect relationships as arrows
- Character interactions as connections

Keep node labels concise (Hebrew OK, max 6 words per node). Return ONLY the Mermaid code.`
};

/** Ordered button keys for Talmud Iyun mode. */
export const TALMUD_BUTTONS = ['structure', 'sevara', 'shakla', 'mekorot', 'halacha', 'diagram'];

/** Ordered button keys for Torah Iyun mode. */
export const TORAH_BUTTONS = ['structure', 'sevara', 'parshanut', 'lashon', 'mussar', 'diagram'];

// =============================================================================
// BEKIUS (בקיאות) - Overview / Summary Prompts
// =============================================================================

/** Talmud Bekius overview prompt. */
export const TALMUD_BEKIUS_PROMPT = `Provide a concise Bekius-style overview (בקיאות) of this Talmudic passage in Hebrew:

1. **סיכום בשורה אחת**: One-sentence summary of the sugya topic
2. **נושא הסוגיא**: What halachic or aggadic topic is discussed?
3. **חכמים מרכזיים**: Key Tannaim/Amoraim and their positions
4. **מחלוקת**: Main dispute (if any) — summarize each side in one line
5. **מסקנה/פסק**: The conclusion — who do we rule like?
6. **נקודות מפתח**: 3-5 bullet points capturing the essential content
7. **קשרים**: Related sugyot or halachic topics to review

Be concise but accurate. Use proper Talmudic terminology. Respond in Hebrew.`;

/** Torah Bekius overview prompt. */
export const TORAH_BEKIUS_PROMPT = `Provide a quick overview (בקיאות) of this Torah/Tanakh passage in Hebrew:

1. **סיכום בשורה אחת**: One-sentence summary
2. **נושא עיקרי**: Main topic — narrative event, mitzvah, or prophecy
3. **דמויות מרכזיות**: Key figures and their roles
4. **עיקר ההלכה**: Main halachic point (if applicable)
5. **נקודות מפתח**: 3-5 bullet points of key takeaways
6. **מסר מרכזי**: The central message or teaching
7. **קשרים**: Related parashot, haftarot, or topics to explore

Format clearly with headers. Be concise but comprehensive. Respond in Hebrew.`;

// =============================================================================
// CHAZARA (חזרה) - Review / Quiz Prompts & Config
// =============================================================================

/** Talmud question-generation prompt for Chazara mode. */
export const TALMUD_GENERATE_PROMPT = `Generate 5 review questions (שאלות חזרה) for this Talmudic passage.

// Question types should include:
- Factual: Who said what? What is the source?
- Comprehension: What is the sevara? Why does this opinion disagree?
- Application: How would this halacha apply in a different case?
- Source identification: Which verse/mishna is being referenced?

// For each question provide:
- Question in Hebrew (use proper Talmudic terminology)
- Type: factual/comprehension/application/source
- Difficulty: 1-3 (1=basic recall, 2=understanding, 3=analytical)
- Correct answer (concise, in Hebrew)
- Brief explanation (1-2 sentences)

// Format as JSON array:
[{"question": "...", "type": "...", "difficulty": 1, "answer": "...", "explanation": "..."}]

Make questions progressively harder. Focus on the sugya's key concepts and disputes.`;

/** Torah question-generation prompt for Chazara mode. */
export const TORAH_GENERATE_PROMPT = `Generate 5 review questions (שאלות חזרה) for this Torah/Tanakh passage.

// Question types should include:
- Factual: What happened? Who is mentioned?
- Comprehension: Why did this occur? What is the meaning?
- Parshanut: What would Rashi/Ramban say about this?
- Application: What mitzvah or moral lesson can we derive?

// For each question provide:
- Question in Hebrew
- Type: factual/comprehension/parshanut/application
- Difficulty: 1-3 (1=basic recall, 2=understanding, 3=analytical)
- Correct answer (concise, in Hebrew)
- Brief explanation (1-2 sentences)

// Format as JSON array:
[{"question": "...", "type": "...", "difficulty": 1, "answer": "...", "explanation": "..."}]

Make questions progressively harder. Focus on key themes and details.`;

/**
 * Build an evaluation prompt for checking a student's answer.
 * @param {string} question - The original question text
 * @param {string} userAnswer - The student's submitted answer
 * @returns {string} The evaluation prompt
 */
export const buildEvalPrompt = (question, userAnswer) => `
// Evaluate this student's answer to a Torah/Talmud review question.

// Question: ${question}
// Student's answer: ${userAnswer}

// You MUST respond in the following format:
1. First line MUST be exactly one of: CORRECT, PARTIAL, INCORRECT
2. Then explain why in Hebrew (2-3 sentences)
3. If partial or incorrect, explain what was missing or wrong
4. Give brief encouragement

// Example format:
// CORRECT
הסבר: התשובה מדויקת...

Respond in Hebrew (except the verdict on line 1).`;

/**
 * Display labels for question types (Hebrew).
 * @type {Record<string, string>}
 */
export const TYPE_LABELS = {
  factual: 'עובדתית',
  comprehension: 'הבנה',
  understanding: 'הבנה',
  application: 'יישום',
  source: 'מקורות',
  parshanut: 'פרשנות'
};

/**
 * Verdict display configuration for answer evaluation results.
 * @type {Record<string, {icon: string, label: string, className: string}>}
 */
export const VERDICT_CONFIG = {
  correct: { icon: '✅', label: 'נכון!', className: 'verdict-correct' },
  partial: { icon: '🟡', label: 'חלקית', className: 'verdict-partial' },
  incorrect: { icon: '❌', label: 'לא מדויק', className: 'verdict-incorrect' },
  unknown: { icon: '❓', label: '', className: 'verdict-unknown' }
};
