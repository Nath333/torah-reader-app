/**
 * Enhanced Gemara Parser
 *
 * Extracts shakla v'tarya with:
 * - Dialectical flow tracking (question → challenge → resolution chain)
 * - Speaker attribution (which Amora said what)
 * - Conclusion detection (what the Gemara ultimately decides)
 * - Surviving opinion determination
 */

// ═══════════════════════════════════════════════════════════
// Known Amoraim for speaker detection
// ═══════════════════════════════════════════════════════════

const KNOWN_AMORAIM = [
  { hebrew: 'רב', english: 'Rav', generation: 1 },
  { hebrew: 'שמואל', english: 'Shmuel', generation: 1 },
  { hebrew: 'רבי יוחנן', english: 'Rabbi Yochanan', generation: 2 },
  { hebrew: 'ריש לקיש', english: 'Reish Lakish', generation: 2 },
  { hebrew: 'רב הונא', english: 'Rav Huna', generation: 2 },
  { hebrew: 'רב יהודה', english: 'Rav Yehuda', generation: 2 },
  { hebrew: 'רב נחמן', english: 'Rav Nachman', generation: 3 },
  { hebrew: 'רבה', english: 'Rabbah', generation: 3 },
  { hebrew: 'רב יוסף', english: 'Rav Yosef', generation: 3 },
  { hebrew: 'אביי', english: 'Abaye', generation: 4 },
  { hebrew: 'רבא', english: 'Rava', generation: 4 },
  { hebrew: 'רב פפא', english: 'Rav Papa', generation: 5 },
  { hebrew: 'רב אשי', english: 'Rav Ashi', generation: 6 },
  { hebrew: 'רבינא', english: 'Ravina', generation: 6 }
];

// ═══════════════════════════════════════════════════════════
// Dialectical step types
// ═══════════════════════════════════════════════════════════

const STEP_TYPES = {
  QUESTION: 'question',
  CHALLENGE: 'challenge',
  PROOF: 'proof',
  ANSWER: 'answer',
  REJECTION: 'rejection',
  RESOLUTION: 'resolution',
  CONCLUSION: 'conclusion',
  STATEMENT: 'statement',
  BRAITA: 'braita'
};

// Pattern groups with step type classification
const DIALECTIC_PATTERNS = [
  // Questions
  { pattern: /מאי\s+טעמא/, type: STEP_TYPES.QUESTION, label: 'What is the reason?' },
  { pattern: /מנא\s+(?:הני\s+)?מילי/, type: STEP_TYPES.QUESTION, label: 'From where do we know?' },
  { pattern: /קא\s+מיבעיא\s+(?:ליה|להו)/, type: STEP_TYPES.QUESTION, label: 'The question is...' },
  { pattern: /מה\s+(?:בין|הפרש)/, type: STEP_TYPES.QUESTION, label: 'What is the difference?' },
  { pattern: /למה\s+לי/, type: STEP_TYPES.QUESTION, label: 'Why do I need this?' },

  // Challenges
  { pattern: /קשיא/, type: STEP_TYPES.CHALLENGE, label: 'Difficulty' },
  { pattern: /איתיביה/, type: STEP_TYPES.CHALLENGE, label: 'Objection raised' },
  { pattern: /מתיב\s/, type: STEP_TYPES.CHALLENGE, label: 'Objection' },
  { pattern: /והא\s+(?:תניא|תנן|אמר)/, type: STEP_TYPES.CHALLENGE, label: 'But we learned...' },
  { pattern: /לימא\s+(?:מסייע|תיובתא)/, type: STEP_TYPES.CHALLENGE, label: 'Should we say...' },

  // Proofs
  { pattern: /(?:דכתיב|שנאמר|דאמר\s+קרא)/, type: STEP_TYPES.PROOF, label: 'Scriptural proof' },
  { pattern: /תנן/, type: STEP_TYPES.PROOF, label: 'We learned in Mishnah' },
  { pattern: /תניא/, type: STEP_TYPES.BRAITA, label: 'Braita taught' },

  // Answers / Resolutions
  { pattern: /אלא\s+(?:הכא|הכי|אמר|מאי)/, type: STEP_TYPES.ANSWER, label: 'Rather...' },
  { pattern: /הכא\s+במאי\s+עסקינן/, type: STEP_TYPES.ANSWER, label: 'Here we deal with...' },
  { pattern: /הכי\s+קאמר/, type: STEP_TYPES.ANSWER, label: 'This is what it means...' },
  { pattern: /לא\s+קשיא/, type: STEP_TYPES.RESOLUTION, label: 'No difficulty...' },
  { pattern: /תרוי?הו/, type: STEP_TYPES.RESOLUTION, label: 'Both are correct' },

  // Conclusions
  { pattern: /(?:שמע\s+מינה|ש"מ)/, type: STEP_TYPES.CONCLUSION, label: 'We derive from this...' },
  { pattern: /הלכתא/, type: STEP_TYPES.CONCLUSION, label: 'The halacha is...' },
  { pattern: /(?:מסקנא|מסתברא)/, type: STEP_TYPES.CONCLUSION, label: 'The conclusion is...' },
  { pattern: /תיובתא\s+ד/, type: STEP_TYPES.CONCLUSION, label: 'Refutation of...' },
  { pattern: /תיקו/, type: STEP_TYPES.CONCLUSION, label: 'Unresolved (Teyku)' }
];

// ═══════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════

/**
 * Extract Gemara analysis with dialectical flow
 */
export const extractGemaraAnalysis = async (text, signal) => {
  if (signal?.aborted) throw new Error('AbortError');

  // Step 1: Detect speakers
  const speakers = detectSpeakers(text);

  // Step 2: Identify dialectical steps in order
  const dialecticSteps = identifyDialecticSteps(text);

  // Step 3: Build connected flow (which step responds to which)
  const flow = buildDialecticFlow(dialecticSteps);

  // Step 4: Detect conclusion
  const conclusion = detectConclusion(text, dialecticSteps);

  // Step 5: Convert to analysis array format (backwards-compatible)
  const analysis = convertToAnalysis(flow, speakers, conclusion);

  return analysis;
};

/**
 * Detect which Amoraim speak in this text
 */
const detectSpeakers = (text) => {
  const speakers = [];

  KNOWN_AMORAIM.forEach(amora => {
    // Look for "אמר [amora]" or "[amora] אמר" patterns
    const saidPattern = new RegExp(`(?:אמר\\s+${amora.hebrew}|${amora.hebrew}\\s+אמר)`, 'g');
    let match;
    while ((match = saidPattern.exec(text)) !== null) {
      // Extract what they said (next ~200 chars)
      const statementEnd = Math.min(text.length, match.index + match[0].length + 200);
      const statement = text.substring(match.index + match[0].length, statementEnd).trim();
      // Cut at next speaker or structural marker
      const cutPoint = statement.search(/(?:אמר\s+(?:רב|רבי|אביי|רבא)|קשיא|איתיביה|אלא)/);
      const cleanStatement = cutPoint > 10 ? statement.substring(0, cutPoint).trim() : statement.substring(0, 150).trim();

      speakers.push({
        ...amora,
        position: match.index,
        statement: cleanStatement
      });
    }
  });

  // Sort by position in text
  speakers.sort((a, b) => a.position - b.position);
  return speakers;
};

/**
 * Identify all dialectical steps in order of appearance
 */
const identifyDialecticSteps = (text) => {
  const steps = [];

  DIALECTIC_PATTERNS.forEach(({ pattern, type, label }) => {
    // Need to create a new regex for each search to avoid lastIndex issues
    const regex = new RegExp(pattern.source, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Extract context around the match
      const contextStart = Math.max(0, match.index - 20);
      const contextEnd = Math.min(text.length, match.index + 250);
      const fullContext = text.substring(contextStart, contextEnd).trim();

      steps.push({
        type,
        label,
        position: match.index,
        matchText: match[0],
        context: fullContext
      });
    }
  });

  // Sort by position and deduplicate overlapping steps
  steps.sort((a, b) => a.position - b.position);

  // Remove duplicates that are within 30 chars of each other
  const deduped = [];
  steps.forEach(step => {
    const last = deduped[deduped.length - 1];
    if (!last || Math.abs(step.position - last.position) > 30) {
      deduped.push(step);
    }
  });

  return deduped;
};

/**
 * Build a connected dialectic flow — which step responds to which
 */
const buildDialecticFlow = (steps) => {
  const flow = [];
  let currentExchange = null;

  steps.forEach(step => {
    if (step.type === STEP_TYPES.QUESTION || step.type === STEP_TYPES.STATEMENT || step.type === STEP_TYPES.BRAITA) {
      // New exchange starts
      if (currentExchange) flow.push(currentExchange);
      currentExchange = {
        opening: step,
        challenges: [],
        answers: [],
        conclusion: null
      };
    } else if (currentExchange) {
      if (step.type === STEP_TYPES.CHALLENGE || step.type === STEP_TYPES.REJECTION) {
        currentExchange.challenges.push(step);
      } else if (step.type === STEP_TYPES.ANSWER || step.type === STEP_TYPES.RESOLUTION || step.type === STEP_TYPES.PROOF) {
        currentExchange.answers.push(step);
      } else if (step.type === STEP_TYPES.CONCLUSION) {
        currentExchange.conclusion = step;
      }
    } else {
      // Step without a current exchange — create one
      currentExchange = {
        opening: step,
        challenges: [],
        answers: [],
        conclusion: null
      };
    }
  });

  if (currentExchange) flow.push(currentExchange);
  return flow;
};

/**
 * Detect the Gemara's conclusion
 */
const detectConclusion = (text, steps) => {
  // Look for explicit conclusion markers
  const conclusionStep = steps.find(s => s.type === STEP_TYPES.CONCLUSION);

  if (conclusionStep) {
    // Check if it's a teyku (unresolved)
    if (/תיקו/.test(conclusionStep.matchText)) {
      return {
        type: 'teyku',
        text: 'The question remains unresolved (תיקו)',
        winningOpinion: null
      };
    }

    // Check if it's a refutation
    if (/תיובתא/.test(conclusionStep.matchText)) {
      // Try to identify whose opinion was refuted
      const refutedMatch = conclusionStep.context.match(/תיובתא\s+ד[א-ת\s"']{2,20}/);
      return {
        type: 'refutation',
        text: conclusionStep.context.substring(0, 200),
        refuted: refutedMatch ? refutedMatch[0] : null,
        winningOpinion: null
      };
    }

    return {
      type: 'resolution',
      text: conclusionStep.context.substring(0, 200),
      winningOpinion: null
    };
  }

  // If no explicit conclusion, check if the last exchange has a resolution
  const lastStep = steps[steps.length - 1];
  if (lastStep && (lastStep.type === STEP_TYPES.RESOLUTION || lastStep.type === STEP_TYPES.ANSWER)) {
    return {
      type: 'implicit_resolution',
      text: lastStep.context.substring(0, 200),
      winningOpinion: null
    };
  }

  return null;
};

/**
 * Convert flow to backwards-compatible analysis array
 */
const convertToAnalysis = (flow, speakers, conclusion) => {
  const analysis = flow.map((exchange, i) => {
    // Find speaker for this exchange if any
    const nearestSpeaker = speakers.find(s =>
      exchange.opening && Math.abs(s.position - exchange.opening.position) < 100
    );

    return {
      id: `exchange_${i}`,
      // Backwards-compatible fields
      question: exchange.opening?.context?.substring(0, 200) || null,
      questions: exchange.opening ? [{
        type: exchange.opening.type,
        text: exchange.opening.context?.substring(0, 200),
        label: exchange.opening.label
      }] : [],
      rejections: exchange.challenges.map(c => c.context?.substring(0, 200)),
      resolutions: exchange.answers.map(a => a.context?.substring(0, 200)),
      fullText: exchange.opening?.context?.substring(0, 300) || '',

      // Enhanced fields
      speaker: nearestSpeaker ? {
        hebrew: nearestSpeaker.hebrew,
        english: nearestSpeaker.english,
        generation: nearestSpeaker.generation
      } : null,
      stepType: exchange.opening?.type || 'unknown',
      stepLabel: exchange.opening?.label || '',
      challengeCount: exchange.challenges.length,
      isResolved: exchange.answers.length > 0 || exchange.conclusion != null,
      conclusion: exchange.conclusion ? {
        type: exchange.conclusion.type,
        text: exchange.conclusion.context?.substring(0, 200),
        label: exchange.conclusion.label
      } : null
    };
  });

  // Add overall conclusion as a special entry if exists
  if (conclusion) {
    analysis.push({
      id: 'conclusion',
      question: null,
      questions: [],
      rejections: [],
      resolutions: [conclusion.text],
      fullText: conclusion.text,
      speaker: null,
      stepType: STEP_TYPES.CONCLUSION,
      stepLabel: conclusion.type === 'teyku' ? 'Unresolved (Teyku)' : 'Gemara Conclusion',
      challengeCount: 0,
      isResolved: conclusion.type !== 'teyku',
      conclusion: conclusion,
      isFinalConclusion: true
    });
  }

  return analysis;
};

/**
 * Identify structural markers in Gemara
 */
export const identifyStructuralMarkers = (text) => ({
  hasQuestion: DIALECTIC_PATTERNS.some(p => p.type === STEP_TYPES.QUESTION && new RegExp(p.pattern.source).test(text)),
  hasRejection: DIALECTIC_PATTERNS.some(p => p.type === STEP_TYPES.CHALLENGE && new RegExp(p.pattern.source).test(text)),
  hasResolution: DIALECTIC_PATTERNS.some(p => (p.type === STEP_TYPES.ANSWER || p.type === STEP_TYPES.RESOLUTION) && new RegExp(p.pattern.source).test(text)),
  hasConclusion: DIALECTIC_PATTERNS.some(p => p.type === STEP_TYPES.CONCLUSION && new RegExp(p.pattern.source).test(text)),
  isBraita: /תניא/.test(text),
  isMishnaReference: /תנן/.test(text),
  isChallenge: /איתיביה/.test(text),
  isTeyku: /תיקו/.test(text)
});

/**
 * Check if text is primarily Gemara (vs Mishnah)
 */
export const isGemaraText = (text) => {
  const indicators = [
    /מאי\s+טעמא/, /קא\s+מיבעיא/, /קשיא/, /איתיביה/,
    /אלא\s+הכא/, /מודה\s+הוא/, /רב\s+אמר/, /אביי\s+אמר/, /רבא\s+אמר/
  ];
  return indicators.some(p => p.test(text));
};

export default { extractGemaraAnalysis, identifyStructuralMarkers, isGemaraText };
