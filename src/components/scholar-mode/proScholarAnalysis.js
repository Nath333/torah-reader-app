/**
 * proScholarAnalysis.js - Text analysis engine for ProScholarSummary
 *
 * Extracted from ProScholarSummary.js useMemo block.
 * Performs comprehensive Mishna + Gemara text analysis using regex-based
 * pattern matching for scholarly discourse structures.
 *
 * @param {string} textToAnalyze - The primary text to analyze
 * @param {Function} stripNikudFn - Function to strip nikud from Hebrew text
 * @param {Function} stripHtmlTagsFn - Function to strip HTML tags from text
 * @returns {Object|null} The analysis result object, or null if text is too short
 */
export function analyzeText(textToAnalyze, stripNikudFn, stripHtmlTagsFn) {
  if (!textToAnalyze || textToAnalyze.length < 30) return null;

  // Clean text: strip HTML tags AND nikud
  const rawCleanText = stripHtmlTagsFn(textToAnalyze);
  const cleanText = stripNikudFn(rawCleanText);

  // =========================================================================
  // FULL TEXT (cleaned for display) - COMPLETE, NO TRUNCATION
  // =========================================================================
  const displayFullText = rawCleanText; // Complete text for display

  // Enhanced Gemara detection - check for explicit markers AND discourse patterns
  // Many Gemara sections don't have "גמ'" marker but start with Aramaic discourse
  const hasExplicitGemaraMarker = /גמ[׳']|גמרא/.test(cleanText);
  const hasGemaraDiscoursePatterns = /תנן\s+התם|אמר\s+רב|אמר\s+ר[׳']|תנו\s+רבנן|תניא|מאי\s+[א-ת]|פשיטא|איבעיא|מנא\s+הני|מנלן|היכי\s+דמי|תא\s+שמע|מיתיבי|והתניא|אמר\s+אביי|אמר\s+רבא|למימרא|אלא\s+מעתה/.test(cleanText);
  const hasGemaraMarker = hasExplicitGemaraMarker || hasGemaraDiscoursePatterns;
  const isMishnaOnly = !hasGemaraMarker;

  // =========================================================================
  // SECTION 1: MISHNA STRUCTURED SUMMARY
  // =========================================================================
  const mishna = {
    content: null,
    fullContent: null,        // Full mishna text for display
    topic: null,              // What is being discussed
    caseDetails: {
      who: [],                // Actors involved
      what: null,             // The action/situation
      conditions: []          // Conditions/circumstances
    },
    ruling: {
      decision: null,         // Final ruling
      author: null,           // Who says it (Tanna/anonymous/dispute)
      isDispute: false
    },
    keyPrinciple: null,       // Main extracted principle
    oneLine: null,            // One-line summary
    structureType: null,      // enumeration, conditional, etc.
    cases: [],                // Multiple cases/scenarios in the Mishna
    numbers: []               // Numbers mentioned (שתים, ארבע, etc.)
  };

  // =========================================================================
  // SECTION 2: GEMARA QUESTIONS ON MISHNA
  // =========================================================================
  const gemaraQuestions = [];  // List of all questions

  // =========================================================================
  // SECTION 3: GEMARA STEP-BY-STEP FLOW
  // =========================================================================
  const sugyaSteps = [];       // Array of {type, content, explanation}

  // =========================================================================
  // SECTION 4: OPINIONS (If Multiple)
  // =========================================================================
  const opinions = [];         // Array of {name, position, reason}
  let mainDifference = null;   // What exactly they argue about

  // =========================================================================
  // SECTION 5: CORE LOGIC
  // =========================================================================
  let coreLogic = {
    principle: null,
    distinction: null,
    reasoning: null
  };

  // =========================================================================
  // SECTION 6: CONNECTION BACK TO MISHNA
  // =========================================================================
  let mishnaConnection = {
    type: null,               // explains, limits, expands, reinterprets
    description: null
  };

  // =========================================================================
  // SECTION 7: HALACHIC TAKEAWAY
  // =========================================================================
  let halachicTakeaway = {
    rule: null,
    whenApplies: null,
    whenNot: null
  };

  // =========================================================================
  // ADDITIONAL DATA
  // =========================================================================
  const result = {
    mishna,
    gemaraQuestions,
    sugyaSteps,
    opinions,
    mainDifference,
    coreLogic,
    mishnaConnection,
    halachicTakeaway,
    // Halachic scenarios from Mishna
    halachicScenarios: [],
    // NEW: Full text and mode detection
    fullText: displayFullText,
    isMishnaOnly,
    hasGemaraMarker,
    // Legacy fields for compatibility
    gemaraContent: null,
    sages: [],
    pesukim: [],
    middot: [],
    crossRefs: [],
    keyTerms: [],
    halachicCategories: [],
    stats: { words: 0, sentences: 0, chars: 0 }
  };

  // Character count
  result.stats.chars = cleanText.length;

  // === STATS ===
  const sentences = cleanText.split(/[.!?]/);
  result.stats.sentences = sentences.filter(s => s.trim().length > 5).length;
  result.stats.words = cleanText.split(/\s+/).filter(w => w.length > 1).length;

  // =========================================================================
  // EXTRACT MISHNA CONTENT - PRO SCHOLAR V20: Enhanced patterns for all sugyot
  // =========================================================================
  const mishnaPatterns = [
    // Standard mishna marker with gemara following
    /מתני[׳']?\s*[:.]\s*([^]*?)(?=גמ[׳']|גמרא)/i,
    // Mishna marker without punctuation
    /מתני[׳']?\s+([^]*?)(?=גמ[׳']|גמרא)/i,
    // "משנה" spelled out
    /משנה\s*[:.]\s*([^]*?)(?=גמ[׳']|גמרא)/i,
    // Text before gemara marker (fallback)
    /^([^]*?)(?=גמ[׳']|גמרא)/i,
    // הדרן pattern (end of chapter marker)
    /^([^]*?)(?=הדרן\s+עלך)/i
  ];

  let mishnaText = '';
  for (const pattern of mishnaPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]?.trim().length > 15) {
      mishnaText = match[1].trim();
      // Remove leading "מתני׳:" if captured
      mishnaText = mishnaText.replace(/^מתני[׳']?\s*[:.]\s*/i, '');
      mishna.content = mishnaText;
      mishna.fullContent = mishnaText;
      break;
    }
  }

  // If no Gemara marker found, check for other structural markers
  if (!mishnaText && isMishnaOnly && cleanText.length > 15) {
    // Check for baraita-only text (תניא, תנו רבנן)
    const baraitaMatch = cleanText.match(/^(תניא|תנו\s+רבנן|תנא)\s*[:.]\s*([^]*)/i);
    if (baraitaMatch) {
      mishnaText = baraitaMatch[2]?.trim() || cleanText;
      mishna.structureType = 'baraita';
    } else {
      mishnaText = cleanText;
    }
    mishna.content = mishnaText;
    mishna.fullContent = mishnaText;
  }

  if (mishnaText) {
    // === TOPIC ===
    const firstSentence = mishnaText.split(/[.!?]/)[0];
    if (firstSentence) {
      mishna.topic = firstSentence.trim().slice(0, 120); // More chars for topic
    }

    // === EXTRACT NUMBERS (שתים, שלש, ארבע, etc.) - PRO SCHOLAR V20 ===
    const numberPatterns = [
      /(?:שתים|שנים)\s+(?:שהן|שהם|דברים|מיני)/gi,
      /(?:שלש|שלשה)\s+(?:שהן|שהם|דברים|מיני)/gi,
      /(?:ארבע|ארבעה)\s+(?:שהן|שהם|דברים|מיני|אבות)/gi,
      /(?:חמש|חמשה)\s+(?:שהן|שהם|דברים|מיני)/gi,
      /(?:שש|ששה)\s+(?:שהן|שהם|דברים|מיני)/gi,
      /(?:שבע|שבעה)\s+(?:שהן|שהם|דברים|מיני)/gi,
      /(?:שמונה)\s+(?:שהן|שהם|דברים|מיני)/gi,
      /עשרה?\s+(?:דברים|מיני)/gi,
      /שלשים\s+ותשע/gi, // 39 melachot
      /(?:הראשון|השני|השלישי|הרביעי|החמישי)/gi // Ordinals
    ];
    const allNumberMatches = [];
    numberPatterns.forEach(p => {
      const matches = mishnaText.match(p);
      if (matches) allNumberMatches.push(...matches);
    });
    if (allNumberMatches.length > 0) {
      mishna.numbers = [...new Set(allNumberMatches.map(n => n.trim()))];
    }

    // === EXTRACT CASES/SCENARIOS - PRO SCHOLAR V20 ===
    // Multiple patterns for different enumeration styles
    const casePatterns = [
      /([א-ת]{2,})\s+(?:שהן|שהם)\s+([א-ת]+)/gi,  // X שהן Y
      /(?:ואלו|אלו)\s+הן[:\s]+([^.]+)/gi,  // אלו הן: ...
      /(?:אחד|שני|שלישי|רביעי)[:\s]+([^,;.]{5,40})/gi,  // אחד: ...
      /הראשון[:\s]+([^,;.]{5,40})/gi,  // הראשון: ...
    ];
    casePatterns.forEach(pattern => {
      const matches = [...mishnaText.matchAll(pattern)];
      matches.forEach(m => {
        if (mishna.cases.length < 8) {
          const caseText = m[1] && m[2] ? `${m[1]} שהן ${m[2]}` : m[1]?.trim();
          if (caseText && caseText.length > 3) {
            mishna.cases.push(caseText);
          }
        }
      });
    });

    // === STRUCTURE TYPE - PRO SCHOLAR V20: More comprehensive detection ===
    // Skip if already set (e.g., baraita)
    if (!mishna.structureType) {
      if (/שתים\s+שהן|שלש\s+שהן|ארבע\s+שהן|שלשה\s+דברים|ארבעה\s+אבות|ארבע\s+מיתות/.test(mishnaText)) {
        mishna.structureType = 'enumeration';
      } else if (/ואלו\s+הן|אלו\s+הם/.test(mishnaText)) {
        mishna.structureType = 'enumeration';
      } else if (/כיצד[?]?\s/.test(mishnaText)) {
        mishna.structureType = 'explanation';
      } else if (/במה\s+דברים\s+אמורים|אימתי/.test(mishnaText)) {
        mishna.structureType = 'conditional';
      } else if (/אם\s+[^,]{3,}/.test(mishnaText)) {
        mishna.structureType = 'conditional';
      } else if (/רבי\s+[א-ת]+\s+אומר|בית\s+שמאי|בית\s+הלל|נחלקו/.test(mishnaText)) {
        mishna.structureType = 'dispute';
      } else if (/זה\s+הכלל|כלל\s+גדול/.test(mishnaText)) {
        mishna.structureType = 'principle';
      } else if (/חייב|פטור|מותר|אסור|כשר|פסול|טמא|טהור/.test(mishnaText)) {
        mishna.structureType = 'ruling';
      } else if (/מי\s+ש|האומר|המקדש|הנותן|הלוקח/.test(mishnaText)) {
        mishna.structureType = 'case-law';
      }
    }

    // === CASE DETAILS: WHO - PRO SCHOLAR V20: Comprehensive actor extraction ===
    const actorPatterns = [
      // Definite article actors with verbs
      /ה([א-ת]{2,10})\s+(?:עומד|יושב|פושט|נותן|נוטל|הולך|בא|עושה|לוקח|מוכר|שואל|משאיל)/gi,
      // Compound actors (בעל הבית, etc.)
      /(בעל\s+הבית|בעה"ב|בעל\s+המעשר|בעל\s+הקרקע)/gi,
      // Role-based actors
      /(העני|העשיר|הנותן|המקבל|המוציא|המכניס|השואל|המשאיל|הלוקח|המוכר|הגוזל|הנגזל|השוכר|המשכיר)/gi,
      // Person-type actors
      /(כהן|לוי|ישראל|גר|עבד|שפחה|אשה|איש|קטן|גדול|זקן)/gi,
      // Specific actors in halachic contexts
      /(המוצא|האומר|המקדש|המגרש|החולץ|היבמה|היבם)/gi
    ];
    const seenActors = new Set();
    actorPatterns.forEach(p => {
      const matches = [...mishnaText.matchAll(p)];
      matches.forEach(m => {
        const actor = (m[1] || m[0]).trim().slice(0, 25);
        if (actor.length > 2 && !seenActors.has(actor) && mishna.caseDetails.who.length < 6) {
          seenActors.add(actor);
          mishna.caseDetails.who.push(actor);
        }
      });
    });

    // === CASE DETAILS: CONDITIONS - PRO SCHOLAR V20 ===
    const conditionPatterns = [
      /כיצד[?]?\s*([^.]{10,100})/gi,
      /אימתי[?]?\s*([^.]{10,80})/gi,
      /במה\s+דברים\s+אמורים[?]?\s*([^.]{10,80})/gi,
      /בזמן\s+ש([^.]{10,60})/gi,
      /אם\s+היה\s+([^.]{10,60})/gi,
      /(?:בין|בין\s+ש)([^.]{10,50})\s+(?:בין|ובין)/gi
    ];
    conditionPatterns.forEach(pattern => {
      const matches = [...mishnaText.matchAll(pattern)];
      matches.forEach(m => {
        if (m[1] && mishna.caseDetails.conditions.length < 5) {
          mishna.caseDetails.conditions.push(m[1].trim().slice(0, 80));
        }
      });
    });

    // === RULING - PRO SCHOLAR V20: Comprehensive ruling extraction ===
    const rulingPatterns = [
      // Obligation/Exemption
      /([^.]*(?:חייב|פטור|חייבים|פטורים|חייבת|פטורה)[^.]*)/i,
      // Permission/Prohibition
      /([^.]*(?:מותר|אסור|מותרים|אסורים|מותרת|אסורה)[^.]*)/i,
      // Validity
      /([^.]*(?:כשר|פסול|כשרים|פסולים|כשרה|פסולה)[^.]*)/i,
      // Purity
      /([^.]*(?:טמא|טהור|טמאים|טהורים|טמאה|טהורה)[^.]*)/i,
      // Fulfillment
      /([^.]*(?:יצא|לא\s+יצא|יוצא|אינו\s+יוצא)[^.]*)/i,
      // Acquisition
      /([^.]*(?:קנה|לא\s+קנה|קונה|אינו\s+קונה)[^.]*)/i
    ];

    for (const pattern of rulingPatterns) {
      const rulingMatch = mishnaText.match(pattern);
      if (rulingMatch && rulingMatch[1]?.trim().length > 10) {
        mishna.ruling.decision = rulingMatch[1].trim().slice(0, 120);
        break;
      }
    }

    // Check if dispute - PRO SCHOLAR V20: More comprehensive
    if (/רבי\s+[א-ת]+\s+אומר|בית\s+שמאי|בית\s+הלל|פליגי|נחלקו|חולקין|דברי\s+רבי/.test(mishnaText)) {
      mishna.ruling.isDispute = true;
      // Try to identify the disputing parties
      const disputeMatch = mishnaText.match(/(רבי\s+[א-ת]+|בית\s+(?:שמאי|הלל))\s+(?:אומר|אומרים)/);
      if (disputeMatch) {
        mishna.ruling.author = `מחלוקת (${disputeMatch[1]})`;
      } else {
        mishna.ruling.author = 'מחלוקת';
      }
    } else if (/סתם\s+משנה|חכמים\s+אומרים/.test(mishnaText)) {
      mishna.ruling.author = 'סתם משנה';
    } else {
      mishna.ruling.author = 'סתם משנה';
    }

    // === KEY PRINCIPLE - PRO SCHOLAR V20: More patterns ===
    const principlePatterns = [
      /זה\s+הכלל[:\s]+([^.]+)/i,
      /כלל\s+גדול[:\s]+([^.]+)/i,
      /כלל\s+אמרו[:\s]+([^.]+)/i,
      /הרי\s+זה[:\s]+([^.]+)/i,
      /העיקר[:\s]+([^.]+)/i,
      /מכאן\s+אמרו[:\s]+([^.]+)/i
    ];
    for (const pp of principlePatterns) {
      const pm = mishnaText.match(pp);
      if (pm && pm[1]?.trim().length > 5) {
        mishna.keyPrinciple = pm[1].trim().slice(0, 120);
        break;
      }
    }

    // === ONE-LINE SUMMARY (auto-generated) - PRO SCHOLAR V20: Smarter summary ===
    if (mishna.topic) {
      let summary = mishna.topic.slice(0, 50);

      // Add ruling word if found
      const rulingWord = mishna.ruling?.decision?.match(/חייב|פטור|מותר|אסור|כשר|פסול|טמא|טהור|יצא|קנה/)?.[0];
      if (rulingWord) {
        summary += ` - ${rulingWord}`;
      }

      // Add structure indicator
      if (mishna.structureType === 'enumeration' && mishna.numbers?.length > 0) {
        summary = `${mishna.numbers[0]} - ${summary}`;
      } else if (mishna.structureType === 'dispute') {
        summary += ' (מחלוקת)';
      }

      mishna.oneLine = summary;
    }

    // =========================================================================
    // EXTRACT HALACHIC SCENARIOS FROM MISHNA
    // Detects patterns like "פשט X... חייב/פטור" for visual case display
    // =========================================================================
    const scenarioPatterns = [
      // Pattern: "פשט העני... — העני חייב ובעל הבית פטור"
      {
        regex: /פשט\s+(ה?[א-ת]+(?:\s+ה?[א-ת]+)?)\s+(?:את\s+)?(?:ידו\s+)?(?:ל[א-ת]+\s+)?(?:ו?נתן|ו?נטל|ו?הוציא|ו?הכניס)[^—]*[-–—]\s*([^.]+)/gi,
        parseMatch: (m) => {
          const fullRuling = m[2]?.trim() || '';
          // Extract multiple rulings if present (e.g., "העני חייב ובעל הבית פטור")
          const rulings = [];

          // Check for compound rulings
          const compoundMatch = fullRuling.match(/(ה?[א-ת]+(?:\s+ה?[א-ת]+)?)\s+(חייב|פטור|פטורי[ןם]|חייבי[ןם]|מותר|אסור)/g);
          if (compoundMatch) {
            compoundMatch.forEach(r => {
              const parts = r.match(/(ה?[א-ת]+(?:\s+ה?[א-ת]+)?)\s+(חייב|פטור|פטורי[ןם]|חייבי[ןם]|מותר|אסור)/);
              if (parts) {
                let ruling = parts[2];
                if (ruling.includes('פטור')) ruling = 'פטור';
                if (ruling.includes('חייב')) ruling = 'חייב';
                rulings.push({
                  actor: parts[1].trim(),
                  action: m[1]?.trim().replace(/^ה/, ''),
                  ruling
                });
              }
            });
          }

          // Check for "שניהם פטורין"
          if (fullRuling.includes('שניהם')) {
            let ruling = fullRuling.includes('פטור') ? 'פטור' : fullRuling.includes('חייב') ? 'חייב' : null;
            if (ruling) {
              rulings.push({ actor: 'שניהם', action: m[1]?.trim(), ruling });
            }
          }

          return rulings;
        }
      },
      // Simpler pattern: "X - חייב/פטור"
      {
        regex: /(ה?[א-ת]+(?:\s+ה?[א-ת]+)?)\s*[-–—]\s*(חייב|פטור|פטורי[ןם]|חייבי[ןם]|מותר|אסור)/gi,
        parseMatch: (m) => {
          let ruling = m[2];
          if (ruling.includes('פטור')) ruling = 'פטור';
          if (ruling.includes('חייב')) ruling = 'חייב';
          return [{ actor: m[1].trim(), action: null, ruling }];
        }
      }
    ];

    const seenScenarios = new Set();
    scenarioPatterns.forEach(({ regex, parseMatch }) => {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(mishnaText)) !== null) {
        const scenarios = parseMatch(match);
        scenarios.forEach(scenario => {
          const key = `${scenario.actor}-${scenario.ruling}`;
          if (!seenScenarios.has(key) && scenario.actor && scenario.ruling) {
            seenScenarios.add(key);
            result.halachicScenarios.push(scenario);
          }
        });
      }
    });
  }

  // =========================================================================
  // EXTRACT GEMARA CONTENT - PRO SCHOLAR V22: Complete Gemara extraction
  // =========================================================================

  let gemaraText = '';

  // STRATEGY 1: Look for explicit "גמ'" marker
  const explicitGemaraPatterns = [
    /גמ[׳']?\s*[:.]\s*([^]*)/i,
    /גמרא\s*[:.]\s*([^]*)/i,
    /גמ[׳']\s+([^]*)/i
  ];

  for (const pattern of explicitGemaraPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]?.trim().length > 15) {
      gemaraText = match[1].trim();
      break;
    }
  }

  // STRATEGY 2: Find Gemara by looking for Mishna end + discourse markers
  if (!gemaraText && mishnaText && cleanText.length > mishnaText.length + 20) {
    // Find where the Mishna ends in the text
    const mishnaEndIndex = cleanText.indexOf(mishnaText) + mishnaText.length;
    const afterMishna = cleanText.slice(mishnaEndIndex).trim();

    if (afterMishna.length > 20) {
      gemaraText = afterMishna;
    }
  }

  // STRATEGY 3: Find Gemara by first discourse marker when no clear Mishna
  if (!gemaraText && hasGemaraDiscoursePatterns) {
    // Comprehensive list of Gemara-starting patterns
    const gemaraStartPatterns = [
      { pattern: /תנן\s+התם/, priority: 1 },
      { pattern: /אמר\s+רב\s+[א-ת]+/, priority: 2 },
      { pattern: /אמר\s+ר[׳']\s+[א-ת]+/, priority: 2 },
      { pattern: /א"ר\s+[א-ת]+/, priority: 2 },
      { pattern: /תנו\s+רבנן/, priority: 1 },
      { pattern: /תניא/, priority: 1 },
      { pattern: /מאי\s+[א-ת]{2,}/, priority: 3 },
      { pattern: /פשיטא/, priority: 3 },
      { pattern: /איבעיא\s+להו/, priority: 2 },
      { pattern: /מנא\s+הני\s+מילי/, priority: 2 },
      { pattern: /היכי\s+דמי/, priority: 3 },
      { pattern: /תא\s+שמע/, priority: 2 },
      { pattern: /אמר\s+אביי/, priority: 2 },
      { pattern: /אמר\s+רבא/, priority: 2 },
      { pattern: /אמר\s+רב\s+הונא/, priority: 2 },
      { pattern: /אמר\s+רב\s+יהודה/, priority: 2 }
    ];

    let bestMatch = null;
    let bestIndex = cleanText.length;
    let bestPriority = 99;

    for (const { pattern, priority } of gemaraStartPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const idx = cleanText.indexOf(match[0]);
        // Prefer earlier matches with better priority
        if (idx !== -1 && (idx < bestIndex || (idx === bestIndex && priority < bestPriority))) {
          bestIndex = idx;
          bestMatch = match[0];
          bestPriority = priority;
        }
      }
    }

    // If we found a Gemara marker and it's after potential Mishna content
    if (bestMatch && bestIndex > 50 && bestIndex < cleanText.length - 20) {
      gemaraText = cleanText.slice(bestIndex).trim();
    }
  }

  // STRATEGY 4: If text is long enough and has no clear Mishna, treat it all as Gemara
  if (!gemaraText && !mishnaText && cleanText.length > 100 && hasGemaraDiscoursePatterns) {
    gemaraText = cleanText;
  }

  // Store the Gemara content
  if (gemaraText) {
    result.gemaraContent = gemaraText;
    result.gemaraFullText = gemaraText;
  }

  if (gemaraText) {
    // =========================================================================
    // GEMARA QUESTIONS ON MISHNA - PRO SCHOLAR V20: Comprehensive patterns
    // =========================================================================
    const questionPatterns = [
      // Definition questions
      { regex: /מאי\s+([^\s.?]{2,20})/gi, type: 'definition', label: 'מהו' },
      { regex: /מאי\s+טעמא/gi, type: 'reason', label: 'מה הטעם' },
      { regex: /מאי\s+שנא/gi, type: 'distinction', label: 'מה ההבדל' },
      { regex: /מאי\s+קמ"ל/gi, type: 'novelty', label: 'מה קמ"ל' },
      { regex: /מאי\s+איריא/gi, type: 'specification', label: 'למה דווקא' },
      // Source questions
      { regex: /מנא\s+הני\s+מילי/gi, type: 'source', label: 'מנין לנו' },
      { regex: /מנלן/gi, type: 'source', label: 'מנלן' },
      { regex: /מנא\s+אמינא/gi, type: 'source', label: 'מנין אומר' },
      // Necessity questions
      { regex: /פשיטא/gi, type: 'obvious', label: 'פשיטא - מובן מאליו?' },
      { regex: /למה\s+לי/gi, type: 'necessity', label: 'למה צריך' },
      { regex: /למה\s+לן/gi, type: 'necessity', label: 'למה לנו' },
      { regex: /תרתי\s+למה\s+לי/gi, type: 'redundancy', label: 'שניים למה לי' },
      // Case clarification
      { regex: /היכי\s+דמי/gi, type: 'case', label: 'באיזה מקרה' },
      { regex: /במאי\s+עסקינן/gi, type: 'case', label: 'במה עסקינן' },
      { regex: /היכא\s+דמי/gi, type: 'case', label: 'היכא דמי' },
      // Inquiry questions (בעיות)
      { regex: /איבעיא\s+להו/gi, type: 'inquiry', label: 'איבעיא להו' },
      { regex: /בעי\s+([^\s:]{2,15})/gi, type: 'inquiry', label: 'בעי' },
      { regex: /מיבעיא\s+ליה/gi, type: 'inquiry', label: 'מיבעיא' },
      // Contradiction questions
      { regex: /והא\s+תנן/gi, type: 'contradiction', label: 'סתירה ממשנה' },
      { regex: /והתנן/gi, type: 'contradiction', label: 'והתנן' },
      { regex: /ורמינהו/gi, type: 'contradiction', label: 'סתירה' },
      { regex: /מיתיבי/gi, type: 'objection', label: 'קושיא מברייתא' },
      { regex: /והתניא/gi, type: 'contradiction', label: 'והתניא' },
      // Challenges
      { regex: /מתקיף\s+לה/gi, type: 'challenge', label: 'מתקיף לה' },
      { regex: /איתיביה/gi, type: 'challenge', label: 'איתיביה' },
      { regex: /ומי\s+אמר/gi, type: 'challenge', label: 'ומי אמר' },
      // Other
      { regex: /אטו/gi, type: 'rhetorical', label: 'וכי?' }
    ];

    // Enhanced question extraction with full context
    questionPatterns.forEach(qp => {
      const matches = [...gemaraText.matchAll(qp.regex)];
      matches.forEach(m => {
        if (gemaraQuestions.length < 15) { // Increased limit to 15
          // Extract the position of the match
          const matchStart = m.index || 0;
          // Get text AFTER the match for context (up to 100 chars or until sentence end)
          const afterMatch = gemaraText.slice(matchStart, matchStart + 120);
          // Find natural break points (sentence end or new question marker)
          const breakMatch = afterMatch.match(/[.!?:]/);
          let fullContext = breakMatch
            ? afterMatch.slice(0, breakMatch.index + 1).trim()
            : afterMatch.slice(0, 80).trim();

          // Clean up HTML tags
          fullContext = fullContext.replace(/<[^>]+>/g, '');

          // Use capture group if available, otherwise use full context
          const context = m[1] ? m[1].trim() : '';

          gemaraQuestions.push({
            type: qp.type,
            label: qp.label,
            context: context.slice(0, 60), // Increased from 35 to 60
            fullContext: fullContext // Full context for display
          });
        }
      });
    });

    // =========================================================================
    // SUGYA STEP-BY-STEP FLOW - PRO SCHOLAR V20: Comprehensive discourse patterns
    // =========================================================================
    const stepPatterns = [
      // QUESTIONS & INQUIRIES
      { regex: /מאי\s+[^\s.?]+/i, type: 'question', icon: '❓', label: 'שאלה' },
      { regex: /מנא\s+הני\s+מילי/i, type: 'question', icon: '❓', label: 'מקור' },
      { regex: /מנלן/i, type: 'question', icon: '❓', label: 'מנלן' },
      { regex: /פשיטא/i, type: 'question', icon: '❓', label: 'פשיטא' },
      { regex: /איבעיא\s+להו/i, type: 'inquiry', icon: '🤔', label: 'בעיא' },
      { regex: /בעי\s+[^\s:]+/i, type: 'inquiry', icon: '🤔', label: 'בעי' },
      { regex: /היכי\s+דמי/i, type: 'question', icon: '❓', label: 'היכי דמי' },
      { regex: /למה\s+לי/i, type: 'question', icon: '❓', label: 'למה לי' },
      // SOURCES & PROOFS (תא שמע)
      { regex: /תא\s+שמע/i, type: 'proof', icon: '📖', label: 'תא שמע' },
      { regex: /אמר\s+קרא/i, type: 'answer', icon: '📖', label: 'תשובה מפסוק' },
      { regex: /שנאמר/i, type: 'answer', icon: '📖', label: 'ראיה מפסוק' },
      { regex: /דכתיב/i, type: 'answer', icon: '📖', label: 'דכתיב' },
      { regex: /תנן\s+התם/i, type: 'proof', icon: '📜', label: 'תנן התם' },
      { regex: /תניא/i, type: 'proof', icon: '📜', label: 'ברייתא' },
      { regex: /תנו\s+רבנן/i, type: 'proof', icon: '📜', label: 'תנו רבנן' },
      // OBJECTIONS & CHALLENGES
      { regex: /מיתיבי/i, type: 'objection', icon: '⚡', label: 'קושיא' },
      { regex: /ורמינהו/i, type: 'objection', icon: '⚡', label: 'סתירה' },
      { regex: /והא\s+תנן/i, type: 'objection', icon: '⚡', label: 'והא תנן' },
      { regex: /והתניא/i, type: 'objection', icon: '⚡', label: 'והתניא' },
      { regex: /מתקיף\s+לה/i, type: 'objection', icon: '⚡', label: 'מתקיף' },
      { regex: /איתיביה/i, type: 'objection', icon: '⚡', label: 'איתיביה' },
      { regex: /לימא\s+מתני/i, type: 'objection', icon: '⚡', label: 'לימא מתני׳' },
      // RESOLUTIONS & ANSWERS
      { regex: /לא\s+קשיא/i, type: 'resolution', icon: '✓', label: 'לא קשיא' },
      { regex: /הכי\s+קאמר/i, type: 'resolution', icon: '✓', label: 'הכי קאמר' },
      { regex: /הכא\s+במאי\s+עסקינן/i, type: 'resolution', icon: '✓', label: 'במאי עסקינן' },
      { regex: /שאני/i, type: 'resolution', icon: '✓', label: 'שאני' },
      { regex: /התם/i, type: 'resolution', icon: '✓', label: 'התם' },
      { regex: /אלא/i, type: 'resolution', icon: '✓', label: 'אלא' },
      // CONCLUSIONS
      { regex: /הלכה\s+כ/i, type: 'conclusion', icon: '⚖️', label: 'פסק הלכה' },
      { regex: /שמע\s+מינה/i, type: 'conclusion', icon: '✓', label: 'שמע מינה' },
      { regex: /תיקו/i, type: 'conclusion', icon: '🟡', label: 'תיקו' },
      { regex: /קשיא$/i, type: 'conclusion', icon: '❌', label: 'קשיא' },
      { regex: /הלכתא/i, type: 'conclusion', icon: '⚖️', label: 'הלכתא' },
      // STATEMENTS
      { regex: /אמר\s+רב\s+[^\s:]+/i, type: 'statement', icon: '💬', label: 'אמר רב' },
      { regex: /אמר\s+רבי\s+[^\s:]+/i, type: 'statement', icon: '💬', label: 'אמר רבי' },
      // ALTERNATIVE VIEWS
      { regex: /איכא\s+דאמרי/i, type: 'alternative', icon: '🔄', label: 'איכא דאמרי' },
      { regex: /לישנא\s+אחרינא/i, type: 'alternative', icon: '🔄', label: 'לישנא אחרינא' },
      // Additional discourse patterns
      // LOGICAL PROGRESSION
      { regex: /אי\s+הכי/i, type: 'logical', icon: '🔗', label: 'אי הכי' },
      { regex: /אלא\s+מעתה/i, type: 'logical', icon: '🔗', label: 'אלא מעתה' },
      { regex: /ולטעמיך/i, type: 'logical', icon: '🔗', label: 'ולטעמיך' },
      { regex: /לעולם/i, type: 'resolution', icon: '✓', label: 'לעולם' },
      // REASON/EXPLANATION
      { regex: /מאי\s+טעמא/i, type: 'question', icon: '❓', label: 'מאי טעמא' },
      { regex: /טעמא\s+מאי/i, type: 'question', icon: '❓', label: 'טעמא מאי' },
      { regex: /משום\s+ד/i, type: 'reason', icon: '💡', label: 'משום ד' },
      { regex: /היינו\s+טעמא/i, type: 'reason', icon: '💡', label: 'היינו טעמא' },
      // EXAMPLES & APPLICATIONS
      { regex: /כגון/i, type: 'example', icon: '📝', label: 'כגון' },
      { regex: /כיצד/i, type: 'example', icon: '📝', label: 'כיצד' },
      { regex: /הא\s+כיצד/i, type: 'example', icon: '📝', label: 'הא כיצד' },
      // QUOTES & TRADITIONS
      { regex: /תנא/i, type: 'tradition', icon: '📜', label: 'תנא' },
      { regex: /כי\s+אמר/i, type: 'tradition', icon: '📜', label: 'כי אמר' },
      { regex: /הכי\s+נמי\s+מסתברא/i, type: 'support', icon: '✅', label: 'הכי נמי מסתברא' },
      // DISTINCTIONS
      { regex: /הני\s+מילי/i, type: 'distinction', icon: '⚡', label: 'הני מילי' },
      { regex: /אבל/i, type: 'distinction', icon: '⚡', label: 'אבל' },
      // TRANSMISSION CHAIN
      { regex: /אמר\s+[^\s]+\s+אמר/i, type: 'chain', icon: '🔗', label: 'שלשלת מסירה' }
    ];

    // Track ALL steps with positions for proper ordering
    // Use matchAll to find ALL instances, not just the first
    const stepsWithPositions = [];
    stepPatterns.forEach(sp => {
      // Create a global version of the regex to find all matches
      const globalRegex = new RegExp(sp.regex.source, 'gi');
      let match;
      while ((match = globalRegex.exec(gemaraText)) !== null) {
        // Capture more context immediately at match time
        const startPos = match.index;
        const endPos = Math.min(startPos + 150, gemaraText.length);
        let contextText = gemaraText.slice(startPos, endPos).trim();
        // Clean HTML
        contextText = contextText.replace(/<[^>]+>/g, '');

        stepsWithPositions.push({
          ...sp,
          content: contextText.slice(0, 100), // Increased from 50 to 100
          position: match.index
        });
      }
    });

    // Sort by position and capture more distinct steps
    stepsWithPositions.sort((a, b) => a.position - b.position);
    const seenPositions = new Set();
    let stepNum = 1;

    // Grouping distance 20, increased step limit to 25
    stepsWithPositions.forEach(step => {
      const posKey = Math.floor(step.position / 20); // Group nearby positions
      if (!seenPositions.has(posKey) && sugyaSteps.length < 25) {
        seenPositions.add(posKey);

        // Extract meaningful content (up to 120 chars)
        const startPos = step.position;
        const endPos = Math.min(startPos + 150, gemaraText.length);
        let fullContent = gemaraText.slice(startPos, endPos).trim();

        // Clean up the content - remove HTML
        fullContent = fullContent.replace(/<[^>]+>/g, '');

        // Find natural break points but ensure at least 30 chars
        const minChars = 30;
        const breakPoints = /[.!?:]/g;
        let breakIndex = -1;
        let breakMatch;
        while ((breakMatch = breakPoints.exec(fullContent)) !== null) {
          if (breakMatch.index >= minChars) {
            breakIndex = breakMatch.index;
            break;
          }
        }

        if (breakIndex > 0 && breakIndex < 100) {
          fullContent = fullContent.slice(0, breakIndex + 1);
        } else {
          // No break found, take up to 80 chars
          fullContent = fullContent.slice(0, 80);
        }

        sugyaSteps.push({
          step: stepNum++,
          type: step.type,
          icon: step.icon,
          label: step.label,
          content: fullContent || step.content
        });
      }
    });

    // =========================================================================
    // OPINIONS (Multiple Views) - PRO SCHOLAR V13: Enhanced rabbi argument extraction
    // =========================================================================
    const opinionPatterns = [
      // Standard אמר רב/רבי patterns
      { regex: /אמר\s+(רב\s+[א-ת]+(?:\s+בר\s+[א-ת]+)?)[:\s]+([^.]{5,80})/gi, type: 'amora' },
      { regex: /אמר\s+(רבי\s+[א-ת]+(?:\s+בן\s+[א-ת]+)?)[:\s]+([^.]{5,80})/gi, type: 'tanna' },
      // Famous Amoraim direct statements
      { regex: /(אביי)\s+אמר[:\s]+([^.]{5,80})/gi, type: 'amora' },
      { regex: /(רבא)\s+אמר[:\s]+([^.]{5,80})/gi, type: 'amora' },
      { regex: /(רב\s+נחמן)\s+אמר[:\s]+([^.]{5,80})/gi, type: 'amora' },
      { regex: /(רב\s+הונא)\s+אמר[:\s]+([^.]{5,80})/gi, type: 'amora' },
      { regex: /(רב\s+יהודה)\s+אמר[:\s]+([^.]{5,80})/gi, type: 'amora' },
      // Schools
      { regex: /בית\s+(שמאי)\s+אומרים[:\s]+([^.]{5,80})/gi, type: 'school' },
      { regex: /בית\s+(הלל)\s+אומרים[:\s]+([^.]{5,80})/gi, type: 'school' },
      // Abbreviated forms (א"ר)
      { regex: /א"ר\s+([א-ת]+(?:\s+בר\s+[א-ת]+)?)[:\s]+([^.]{5,80})/gi, type: 'amora' },
      { regex: /א״ר\s+([א-ת]+(?:\s+בר\s+[א-ת]+)?)[:\s]+([^.]{5,80})/gi, type: 'amora' },
      // X אומר patterns (opinion markers)
      { regex: /(רבי\s+[א-ת]+)\s+אומר[:\s]+([^.]{5,80})/gi, type: 'tanna' },
      { regex: /(רב\s+[א-ת]+)\s+אומר[:\s]+([^.]{5,80})/gi, type: 'amora' },
      // X סבר patterns (holds opinion)
      { regex: /(רבי?\s+[א-ת]+)\s+סבר[:\s]+([^.]{5,80})/gi, type: 'opinion' },
      // Dispute markers
      { regex: /מר\s+אמר[:\s]+([^.]{5,60}).*?ומר\s+אמר[:\s]+([^.]{5,60})/gi, type: 'dispute' }
    ];

    const seenOpinions = new Set();
    opinionPatterns.forEach(op => {
      const matches = [...gemaraText.matchAll(op.regex)];
      matches.forEach(m => {
        // Handle special "מר אמר...ומר אמר" pattern
        if (op.type === 'dispute' && m[1] && m[2]) {
          if (!seenOpinions.has('חד מרבנן') && opinions.length < 8) {
            seenOpinions.add('חד מרבנן');
            opinions.push({ name: 'חד אמר', position: m[1].trim().slice(0, 60), reason: null, type: 'dispute' });
          }
          if (!seenOpinions.has('אידך מרבנן') && opinions.length < 8) {
            seenOpinions.add('אידך מרבנן');
            opinions.push({ name: 'וחד אמר', position: m[2].trim().slice(0, 60), reason: null, type: 'dispute' });
          }
        } else {
          const name = m[1]?.trim();
          const position = m[2]?.trim().slice(0, 80);
          // Increased limit from 4 to 8
          if (name && position && position.length > 5 && !seenOpinions.has(name) && opinions.length < 8) {
            seenOpinions.add(name);
            opinions.push({ name, position, reason: null, type: op.type });
          }
        }
      });
    });

    // Check for main difference with more patterns
    if (opinions.length >= 2) {
      const diffPatterns = [
        /(?:פליגי|נחלקו)\s+ב([^.]+)/i,
        /במאי\s+(?:קא\s+)?מיפלגי[?]?\s*([^.]*)/i,
        /מאי\s+בינייהו[?]?\s*([^.]*)/i,
        /והא\s+פליגי\s+ב([^.]+)/i
      ];
      for (const pattern of diffPatterns) {
        const diffMatch = gemaraText.match(pattern);
        if (diffMatch && diffMatch[1]?.trim().length > 3) {
          result.mainDifference = diffMatch[1].trim().slice(0, 80);
          break;
        }
      }
    }

    // =========================================================================
    // CORE LOGIC
    // =========================================================================
    // Try to extract the deep principle
    const logicPatterns = [
      { regex: /מ?דאורייתא/gi, label: 'דאורייתא' },
      { regex: /מ?דרבנן/gi, label: 'דרבנן' },
      { regex: /גזירה\s+שמא/gi, label: 'גזירה' },
      { regex: /טעמא\s+ד/gi, label: 'טעם' }
    ];
    logicPatterns.forEach(lp => {
      if (gemaraText.match(lp.regex) && !coreLogic.principle) {
        coreLogic.principle = lp.label;
      }
    });

    // =========================================================================
    // CONNECTION BACK TO MISHNA
    // =========================================================================
    if (/הכי\s+קאמר|הכי\s+קתני/.test(gemaraText)) {
      mishnaConnection.type = 'reinterprets';
      mishnaConnection.description = 'הגמרא מפרשת מחדש את המשנה';
    } else if (/אוקימתא|אוקמה/.test(gemaraText)) {
      mishnaConnection.type = 'limits';
      mishnaConnection.description = 'הגמרא מצמצמת את המשנה למקרה מסוים';
    } else if (/לרבות|אף/.test(gemaraText)) {
      mishnaConnection.type = 'expands';
      mishnaConnection.description = 'הגמרא מרחיבה את דברי המשנה';
    } else if (gemaraQuestions.length > 0) {
      mishnaConnection.type = 'explains';
      mishnaConnection.description = 'הגמרא מבארת את המשנה';
    }

    // =========================================================================
    // HALACHIC TAKEAWAY - PRO SCHOLAR V22: Enhanced extraction
    // =========================================================================
    const halachaPatterns = [
      /הלכה\s+כ([א-ת\s]+)/i,
      /הלכתא\s+כ([א-ת\s]+)/i,
      /והלכתא\s*[:\s]+([^.]{10,60})/i,
      /פסק\s*[:\s]+([^.]{10,60})/i,
      /למעשה\s*[:\s]+([^.]{10,60})/i
    ];

    for (const pattern of halachaPatterns) {
      const match = gemaraText.match(pattern);
      if (match && match[1]) {
        halachicTakeaway.rule = match[0].trim().slice(0, 60);
        break;
      }
    }

    // =========================================================================
    // MAIN QUESTION & RESOLUTION SUMMARY
    // Capture the primary question asked and how it's resolved
    // =========================================================================

    // Find the main question
    const mainQuestionPatterns = [
      { regex: /מאי\s+([^\s.?]+[^.?]{0,40})/i, type: 'what' },
      { regex: /מנא\s+הני\s+מילי([^.?]{0,50})/i, type: 'source' },
      { regex: /פשיטא([^.?]{0,40})/i, type: 'obvious' },
      { regex: /מאי\s+שנא([^.?]{0,40})/i, type: 'distinction' },
      { regex: /למה\s+לי([^.?]{0,40})/i, type: 'necessity' }
    ];

    for (const qp of mainQuestionPatterns) {
      const match = gemaraText.match(qp.regex);
      if (match) {
        result.mainQuestion = {
          type: qp.type,
          text: match[0].trim().slice(0, 60)
        };
        break;
      }
    }

    // Find the main resolution/answer
    const resolutionPatterns = [
      { regex: /לא\s+קשיא[:\s]*([^.]{0,60})/i, type: 'lav-kashya' },
      { regex: /הכי\s+קאמר[:\s]*([^.]{0,60})/i, type: 'interpretation' },
      { regex: /הכא\s+במאי\s+עסקינן[:\s]*([^.]{0,60})/i, type: 'limitation' },
      { regex: /שאני[:\s]*([^.]{0,50})/i, type: 'distinction' },
      { regex: /שמע\s+מינה[:\s]*([^.]{0,60})/i, type: 'conclusion' },
      { regex: /תיקו/i, type: 'unresolved' },
      { regex: /קשיא$/i, type: 'difficulty' }
    ];

    for (const rp of resolutionPatterns) {
      const match = gemaraText.match(rp.regex);
      if (match) {
        result.mainResolution = {
          type: rp.type,
          text: match[0].trim().slice(0, 80)
        };
        break;
      }
    }

    // =========================================================================
    // SUGYA SUMMARY - Auto-generate a one-sentence summary
    // =========================================================================
    let sugyaSummary = '';

    // Build summary based on what we found
    if (mishna.topic) {
      sugyaSummary = `הסוגיא עוסקת ב${mishna.topic.slice(0, 40)}`;
    }

    if (result.mainQuestion) {
      const qTypes = {
        'what': 'שואלת מהו',
        'source': 'שואלת מנין',
        'obvious': 'שואלת פשיטא',
        'distinction': 'שואלת מה ההבדל',
        'necessity': 'שואלת למה צריך'
      };
      if (sugyaSummary) {
        sugyaSummary += `, והגמרא ${qTypes[result.mainQuestion.type] || 'שואלת'}`;
      }
    }

    if (result.mainResolution) {
      const rTypes = {
        'lav-kashya': 'ומתרצת לא קשיא',
        'interpretation': 'ומפרשת הכי קאמר',
        'limitation': 'ומעמידה במקרה מסוים',
        'distinction': 'ומחלקת',
        'conclusion': 'ומסיקה',
        'unresolved': 'ונשארת בתיקו',
        'difficulty': 'ונשארת בקושיא'
      };
      if (sugyaSummary) {
        sugyaSummary += ` ${rTypes[result.mainResolution.type] || ''}`;
      }
    }

    if (halachicTakeaway.rule) {
      sugyaSummary += `. ${halachicTakeaway.rule}`;
    }

    result.sugyaSummary = sugyaSummary || null;
  }

  // =========================================================================
  // SAGES EXTRACTION
  // =========================================================================
  const sagePatterns = [
    { regex: /אמר\s+(רב\s+[א-ת]+(?:\s+בר\s+[א-ת]+)?)/gi, type: 'amora' },
    { regex: /אמר\s+(רבי\s+[א-ת]+(?:\s+בן\s+[א-ת]+)?)/gi, type: 'tanna' },
    { regex: /א"ר\s+([א-ת]+)/gi, type: 'amora' },
    { regex: /(אביי|רבא|רב\s+אשי|רבינא|רב\s+פפא|רב\s+הונא|רב\s+נחמן|רב\s+יהודה|רב\s+חסדא|רב\s+ששת|רב\s+יוסף)/gi, type: 'amora' },
    { regex: /(ריש\s+לקיש|רבי\s+יוחנן|רבי\s+אלעזר|רבי\s+אמי|רבי\s+אסי|רבי\s+חייא|רבי\s+אבהו)/gi, type: 'amora' },
    { regex: /(רבי\s+עקיבא|רבי\s+ישמעאל|רבי\s+מאיר|רבי\s+יהודה|רבי\s+שמעון|רבי\s+יוסי|רבי\s+אליעזר)/gi, type: 'tanna' },
    { regex: /(רבן\s+גמליאל|רבן\s+שמעון|הלל|שמאי)/gi, type: 'tanna' },
    { regex: /בית\s+(שמאי|הלל)/gi, type: 'school' },
    { regex: /משמיה\s+ד([א-ת]+)/gi, type: 'source' }
  ];
  const seenSages = new Set();
  sagePatterns.forEach(p => {
    const matches = [...cleanText.matchAll(p.regex)];
    matches.forEach(m => {
      const name = m[1]?.trim();
      if (name && name.length > 2 && !seenSages.has(name) && result.sages.length < 15) {
        seenSages.add(name);
        result.sages.push({ name, type: p.type });
      }
    });
  });

  // =========================================================================
  // PESUKIM (Biblical Verses)
  // =========================================================================
  const pesukimPatterns = [
    /שנאמר[:\s]+["']?([^"'.]{5,80})["']?/gi,
    /דכתיב[:\s]+["']?([^"'.]{5,80})["']?/gi,
    /כתיב[:\s]+["']?([^"'.]{5,80})["']?/gi,
    /כדכתיב[:\s]+["']?([^"'.]{5,80})["']?/gi,
    /אמר\s+קרא[:\s]+["']?([^"'.]{5,80})["']?/gi,
    /מנלן[?]?\s+דכתיב[:\s]+["']?([^"'.]{5,80})["']?/gi
  ];
  pesukimPatterns.forEach(p => {
    const matches = [...cleanText.matchAll(p)];
    matches.forEach(m => {
      if (m[1] && result.pesukim.length < 8) {
        result.pesukim.push({ text: m[1].trim().slice(0, 70) });
      }
    });
  });

  // =========================================================================
  // MIDDOT (Hermeneutical Principles)
  // =========================================================================
  const middotPatterns = [
    { regex: /קל\s+וחומר/gi, name: 'קל וחומר', num: 1 },
    { regex: /גזרה\s+שוה/gi, name: 'גזירה שווה', num: 2 },
    { regex: /בנין\s+אב/gi, name: 'בנין אב', num: 3 },
    { regex: /כלל\s+ופרט/gi, name: 'כלל ופרט', num: 4 },
    { regex: /פרט\s+וכלל/gi, name: 'פרט וכלל', num: 5 },
    { regex: /היקש/gi, name: 'היקש' },
    { regex: /סמוכין/gi, name: 'סמוכין' },
    { regex: /ריבוי\s+ומיעוט/gi, name: 'ריבוי ומיעוט' },
    { regex: /אם\s+אינו\s+ענין/gi, name: 'אם אינו ענין' }
  ];
  const seenMiddot = new Set();
  middotPatterns.forEach(p => {
    if (cleanText.match(p.regex) && !seenMiddot.has(p.name)) {
      seenMiddot.add(p.name);
      result.middot.push({ name: p.name, num: p.num });
    }
  });

  // =========================================================================
  // CROSS REFERENCES
  // =========================================================================
  const crossRefPatterns = [
    { regex: /תנן\s+התם[:\s]+([^.]{10,80})/gi, source: 'משנה אחרת' },
    { regex: /מתניתין[:\s]+([^.]{10,80})/gi, source: 'משנתנו' },
    { regex: /תניא[:\s]+([^.]{10,80})/gi, source: 'ברייתא' },
    { regex: /תנו\s+רבנן[:\s]+([^.]{10,80})/gi, source: 'תנו רבנן' },
    { regex: /תנא[:\s]+([^.]{10,80})/gi, source: 'תנא' },
    { regex: /בתוספתא[:\s]+([^.]{10,60})/gi, source: 'תוספתא' },
    { regex: /בספרא[:\s]+([^.]{10,60})/gi, source: 'ספרא' },
    { regex: /בספרי[:\s]+([^.]{10,60})/gi, source: 'ספרי' }
  ];
  crossRefPatterns.forEach(p => {
    const matches = [...cleanText.matchAll(p.regex)];
    matches.forEach(m => {
      if (m[1] && result.crossRefs.length < 8) {
        result.crossRefs.push({ source: p.source, text: m[1].trim().slice(0, 70) });
      }
    });
  });

  // =========================================================================
  // KEY TERMS
  // =========================================================================
  const stopwords = new Set([
    'את', 'של', 'על', 'אם', 'כי', 'לא', 'הוא', 'היא', 'זה', 'זו', 'מה', 'כל', 'או', 'גם', 'עד', 'אלא',
    'אמר', 'אומר', 'אמרי', 'דאמר', 'והא', 'מאי', 'הכי', 'התם', 'הכא', 'דהא', 'והאי',
    'מן', 'אל', 'עם', 'בין', 'תחת', 'לפני', 'אחרי', 'למה', 'איך', 'מתי', 'היכן'
  ]);
  const halachicTerms = new Set(['חייב', 'פטור', 'מותר', 'אסור', 'כשר', 'פסול', 'טמא', 'טהור']);
  const wordFreq = new Map();
  cleanText.split(/\s+/).forEach(w => {
    const clean = w.replace(/[^\u0590-\u05FF]/g, '');
    if (clean.length >= 3 && !stopwords.has(clean)) {
      const current = wordFreq.get(clean) || { count: 0, category: null };
      current.count++;
      if (halachicTerms.has(clean)) current.category = 'halacha';
      wordFreq.set(clean, current);
    }
  });
  result.keyTerms = [...wordFreq.entries()]
    .filter(([, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12)
    .map(([term, data]) => ({ term, count: data.count, category: data.category }));

  return result;
}
