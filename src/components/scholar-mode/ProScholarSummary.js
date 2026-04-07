/**
 * ProScholarSummary - Complete Mishna + Gemara Summary with Full Sugya Loading
 *
 * Extracted from TalmudToolsTab.js (lines 545-2689)
 * Works dynamically for ANY Gemara page - Loads extended content
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { parseReference, stripNikud as stripNikudLocal, stripHtmlTags } from '../../constants/talmudStudy';
import { getFullSugya, getFullSugyaUntilResolution } from '../../services/sefariaApi';
import { detectStructuralMarkers, extractGemaraQA } from '../../services/scholarly/discoursePatternService';
import { sanitizeHtmlContent } from '../../utils/safeHtml';

const ProScholarSummary = React.memo(function ProScholarSummary({ text, reference }) {
  // State for full sugya loading
  const [sugyaData, setSugyaData] = useState(null);
  const [sugyaLoading, setSugyaLoading] = useState(false);
  const [sugyaError, setSugyaError] = useState(null);
  const [sugyaExpanded, setSugyaExpanded] = useState(false);

  // Auto-fetch FULL SUGYA (multiple pages) when Gemara content is incomplete
  const [fullText, setFullText] = useState(text);
  const [fetchingFullText, setFetchingFullText] = useState(false);

  // Parse reference for sugya loading
  const parsedRef = useMemo(() => parseReference(reference), [reference]);

  // Auto-fetch FULL SUGYA (multiple pages) when Gemara is incomplete
  useEffect(() => {
    if (!parsedRef || !text) return;

    // Check if text likely has incomplete Gemara (look for short Gemara section)
    const cleanText = stripNikudLocal(text.replace(/<[^>]+>/g, ''));
    const hasGemaraMarker = /גמ[׳']|גמרא|תנן\s+התם|אמר\s+רב/.test(cleanText);

    // If we have Gemara markers but text is short (< 3000 chars), likely incomplete
    // A single page is ~1200 chars, but full Gemara discussions span 4-8+ pages
    if (hasGemaraMarker && cleanText.length < 3000) {
      console.log('[ProScholar V23] Detected incomplete Gemara, fetching FULL SUGYA (4 pages)...');
      setFetchingFullText(true);

      // Use getFullSugya to fetch 4 consecutive pages (2 full leaves)
      // This ensures we get the complete Gemara discussion, not just the first page
      getFullSugya(parsedRef.tractate, parsedRef.daf, 4)
        .then(result => {
          // getFullSugya returns fullHebrewText (combined string) and hebrew (array)
          const combined = result.fullHebrewText || result.hebrew?.join(' ') || '';
          if (combined.length > cleanText.length) {
            console.log(`[ProScholar V23] Fetched full sugya: ${combined.length} chars from ${result.pageCount || 4} pages (was ${cleanText.length})`);
            setFullText(combined);
          } else {
            console.log('[ProScholar V23] No additional content from sugya fetch');
            setFullText(text);
          }
          setFetchingFullText(false);
        })
        .catch(err => {
          console.error('[ProScholar V23] Failed to fetch full sugya:', err);
          setFetchingFullText(false);
          setFullText(text); // Fallback to original text on error
        });
    } else {
      setFullText(text);
    }
  }, [parsedRef, text]);

  // Smart sugya loading until Gemara resolves the Mishna
  const loadFullSugya = useCallback(async (useSmartLoading = true) => {
    if (!parsedRef) {
      setSugyaError('לא ניתן לזהות מסכת ודף');
      return;
    }

    setSugyaLoading(true);
    setSugyaError(null);

    try {
      // Use smart loading by default - loads until resolution or next Mishna
      const data = useSmartLoading
        ? await getFullSugyaUntilResolution(parsedRef.tractate, parsedRef.daf, 8) // Up to 8 pages
        : await getFullSugya(parsedRef.tractate, parsedRef.daf, 4); // Legacy: fixed 4 pages

      setSugyaData(data);
      setSugyaExpanded(true);

      // Log loading status
      if (data.status) {
        const statusMessages = {
          'resolved': 'נמצא תירוץ/מסקנה',
          'next_mishna': 'נמצאה משנה הבאה',
          'max_pages': 'הגיע למקסימום דפים',
          'incomplete': 'טעינה חלקית'
        };
        console.log(`[ProScholar V22] Loaded sugya: ${data.ref} | Status: ${statusMessages[data.status] || data.status} | ${data.segments?.length || 0} segments`);
      }
    } catch (err) {
      console.error('[ProScholar V22] Failed to load sugya:', err);
      setSugyaError(err.message || 'שגיאה בטעינת הסוגיה');
    } finally {
      setSugyaLoading(false);
    }
  }, [parsedRef]);
  // COMPREHENSIVE text analysis - follows scholarly template
  // Uses fullText state which may be auto-fetched from Sefaria
  const analysis = useMemo(() => {
    const textToAnalyze = fullText || text;
    if (!textToAnalyze || textToAnalyze.length < 30) return null;

    // Clean text: strip HTML tags AND nikud
    const rawCleanText = stripHtmlTags(textToAnalyze);
    const cleanText = stripNikudLocal(rawCleanText);

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
        console.log('[ProScholar V22] Found Gemara at position', bestIndex, 'marker:', bestMatch);
      }
    }

    // STRATEGY 4: If text is long enough and has no clear Mishna, treat it all as Gemara
    if (!gemaraText && !mishnaText && cleanText.length > 100 && hasGemaraDiscoursePatterns) {
      gemaraText = cleanText;
      console.log('[ProScholar V22] Treating full text as Gemara, length:', cleanText.length);
    }

    // Store the Gemara content
    if (gemaraText) {
      result.gemaraContent = gemaraText;
      result.gemaraFullText = gemaraText;
      console.log('[ProScholar V22] Gemara extracted:', gemaraText.length, 'chars');
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
  }, [fullText, text]); // Re-analyze when fullText updates from fetch

  // Show loading state while fetching full text
  if (fetchingFullText) {
    return (
      <div className="pro-summary-loading">
        <div className="loading-spinner" />
        <span>טוען טקסט מלא מסֵפַרְיָא...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="pro-summary-empty">
        <span className="empty-icon">📚</span>
        <span>נווט לדף בתלמוד לקבלת סיכום מפורט</span>
      </div>
    );
  }

  return (
    <div className="pro-scholar-summary v23" dir="rtl">
      {/* Header */}
      <div className="summary-header-pro">
        <span className="header-badge">PRO SCHOLAR V23</span>
        <span className="header-ref">{reference}</span>
        {analysis.isMishnaOnly && (
          <span className="mode-badge mishna-only">משנה בלבד</span>
        )}
        {!analysis.isMishnaOnly && analysis.hasGemaraMarker && (
          <span className="mode-badge full-page">משנה + גמרא</span>
        )}
      </div>

      {/* PRO SCHOLAR V22: Smart Sugya Loading Button */}
      {parsedRef && !sugyaData && (
        <div className="sugya-load-section v22">
          <button
            className={`load-sugya-btn smart ${sugyaLoading ? 'loading' : ''}`}
            onClick={() => loadFullSugya(true)}
            disabled={sugyaLoading}
          >
            {sugyaLoading ? (
              <>
                <span className="loading-spinner"></span>
                <span>טוען סוגיה עד התירוץ...</span>
              </>
            ) : (
              <>
                <span className="btn-icon">🎯</span>
                <span>טען סוגיה מלאה עד התירוץ</span>
              </>
            )}
          </button>
          <div className="sugya-load-hint">
            <span className="hint-icon">💡</span>
            <span>טוען את כל הגמרא עד שמגיעה לתירוץ או משנה הבאה</span>
          </div>
          {sugyaError && (
            <div className="sugya-error">{sugyaError}</div>
          )}
        </div>
      )}

      {/* PRO SCHOLAR V22: Full Sugya Display with Status */}
      {sugyaData && sugyaExpanded && (
        <div className="section full-sugya-section v22">
          <div className="section-header">
            <span className="section-icon">📚</span>
            <span className="section-title">סוגיה מלאה: {sugyaData.heRef}</span>
            <span className="page-count">{sugyaData.pageCount} דפים</span>
            {/* V22: Status badge */}
            {sugyaData.status && (
              <span className={`sugya-status-badge ${sugyaData.status}`}>
                {sugyaData.status === 'resolved' ? '✓ נמצא תירוץ' :
                 sugyaData.status === 'next_mishna' ? '📜 עד המשנה הבאה' :
                 sugyaData.status === 'max_pages' ? '⚠️ מקסימום דפים' :
                 '⏳ חלקי'}
              </span>
            )}
            <button
              className="collapse-btn"
              onClick={() => setSugyaExpanded(false)}
            >
              צמצם
            </button>
          </div>

          {/* V22: Resolution indicator */}
          {sugyaData.foundResolution && (
            <div className="resolution-indicator">
              <span className="resolution-icon">🎯</span>
              <span className="resolution-text">הגמרא הגיעה לתירוץ/מסקנה</span>
            </div>
          )}

          {/* Page markers and content */}
          <div className="sugya-content">
            {sugyaData.pageMarkers?.map((marker, idx) => (
              <div key={marker.daf} className="sugya-page">
                <div className="page-marker">
                  <span className="marker-daf">{sugyaData.tractate} {marker.daf}</span>
                  <span className="marker-count">{marker.segmentCount} קטעים</span>
                </div>
                <div className="page-text">
                  {sugyaData.segments
                    .filter(seg => seg.daf === marker.daf)
                    .map((seg, i) => (
                      <div key={i} className="segment-row">
                        <span className="segment-hebrew" dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(seg.hebrew) }} />
                        {seg.english && (
                          <span className="segment-english">{seg.english}</span>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Sugya Stats */}
          <div className="sugya-stats">
            <span className="sugya-stat">סה"כ: {sugyaData.segments?.length || 0} קטעים</span>
            <span className="sugya-stat">{sugyaData.fullHebrewText?.length || 0} תווים</span>
            <span className="sugya-stat">{sugyaData.pageCount} דפים</span>
          </div>

          {/* V22: Analyze loaded sugya button */}
          <button
            className="analyze-sugya-btn"
            onClick={() => {
              // Update fullText with the loaded sugya text to trigger re-analysis
              if (sugyaData.fullHebrewText) {
                setFullText(sugyaData.fullHebrewText);
                console.log('[ProScholar V22] Analyzing loaded sugya text:', sugyaData.fullHebrewText.length, 'chars');
              }
            }}
          >
            <span className="btn-icon">🔬</span>
            <span>נתח את הסוגיה המלאה</span>
          </button>
        </div>
      )}

      {/* Collapsed Sugya indicator */}
      {sugyaData && !sugyaExpanded && (
        <div className="sugya-collapsed">
          <button
            className="expand-sugya-btn"
            onClick={() => setSugyaExpanded(true)}
          >
            <span className="btn-icon">📚</span>
            <span>הצג סוגיה מלאה ({sugyaData.pageCount} דפים)</span>
          </button>
        </div>
      )}

      {/* Enhanced Stats Bar */}
      <div className="stats-bar-pro">
        <div className="stat-group">
          <div className="stat-item-pro">
            <span className="stat-label">מילים</span>
            <span className="stat-value-pro">{analysis.stats.words}</span>
          </div>
          <div className="stat-item-pro">
            <span className="stat-label">משפטים</span>
            <span className="stat-value-pro">{analysis.stats.sentences}</span>
          </div>
          {analysis.sages.length > 0 && (
            <div className="stat-item-pro">
              <span className="stat-label">חכמים</span>
              <span className="stat-value-pro">{analysis.sages.length}</span>
            </div>
          )}
          {analysis.pesukim.length > 0 && (
            <div className="stat-item-pro">
              <span className="stat-label">פסוקים</span>
              <span className="stat-value-pro">{analysis.pesukim.length}</span>
            </div>
          )}
          {analysis.keyTerms?.length > 0 && (
            <div className="stat-item-pro">
              <span className="stat-label">מונחים</span>
              <span className="stat-value-pro">{analysis.keyTerms.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          FULL MISHNA TEXT - Complete Content
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.mishna?.fullContent && (
        <div className="section mishna-full-text">
          <div className="section-header">
            <span className="section-icon">📜</span>
            <span className="section-title">משנה - טקסט מלא</span>
            <span className="char-count">{analysis.mishna.fullContent.length} תווים</span>
          </div>
          <div className="full-text-content mishna">
            {analysis.mishna.fullContent}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          FULL GEMARA TEXT - Complete Content
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.gemaraFullText && (
        <div className="section gemara-full-text">
          <div className="section-header">
            <span className="section-icon">📖</span>
            <span className="section-title">גמרא - טקסט מלא</span>
            <span className="char-count">{analysis.gemaraFullText.length} תווים</span>
          </div>
          <div className="full-text-content gemara">
            {analysis.gemaraFullText}
          </div>
          {analysis.gemaraFullText.length < 100 && !sugyaData && (
            <div className="short-content-hint">
              <span className="hint-icon">💡</span>
              <span className="hint-text">הגמרא קצרה - לחץ על "טען סוגיה מלאה" למעלה לקבלת ניתוח מקיף יותר</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PRO SCHOLAR V22: SUGYA SUMMARY - Main question and resolution
          ═══════════════════════════════════════════════════════════════════════ */}
      {(analysis.sugyaSummary || analysis.mainQuestion || analysis.mainResolution) && (
        <div className="section sugya-summary-section">
          <div className="section-header">
            <span className="section-icon">📋</span>
            <span className="section-title">סיכום הסוגיא</span>
          </div>

          {/* Auto-generated summary sentence */}
          {analysis.sugyaSummary && (
            <div className="sugya-summary-text">
              <p>{analysis.sugyaSummary}</p>
            </div>
          )}

          {/* Main Question and Resolution Cards */}
          <div className="qa-cards">
            {analysis.mainQuestion && (
              <div className="qa-card question-card">
                <div className="qa-card-header">
                  <span className="qa-icon">❓</span>
                  <span className="qa-label">שאלה מרכזית</span>
                </div>
                <div className="qa-card-content">
                  {analysis.mainQuestion.text}
                </div>
              </div>
            )}

            {analysis.mainResolution && (
              <div className={`qa-card resolution-card ${analysis.mainResolution.type}`}>
                <div className="qa-card-header">
                  <span className="qa-icon">
                    {analysis.mainResolution.type === 'unresolved' ? '🟡' :
                     analysis.mainResolution.type === 'difficulty' ? '❌' : '✓'}
                  </span>
                  <span className="qa-label">
                    {analysis.mainResolution.type === 'unresolved' ? 'תיקו' :
                     analysis.mainResolution.type === 'difficulty' ? 'קשיא' : 'תירוץ/מסקנה'}
                  </span>
                </div>
                <div className="qa-card-content">
                  {analysis.mainResolution.text}
                </div>
              </div>
            )}
          </div>

          {/* Halachic takeaway if found */}
          {analysis.halachicTakeaway?.rule && (
            <div className="halacha-takeaway">
              <span className="halacha-icon">⚖️</span>
              <span className="halacha-text">{analysis.halachicTakeaway.rule}</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          KEY TERMS ANALYSIS
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.keyTerms?.length > 0 && (
        <div className="section key-terms-section">
          <div className="section-header">
            <span className="section-icon">🔤</span>
            <span className="section-title">מונחים מרכזיים</span>
          </div>
          <div className="key-terms-grid">
            {analysis.keyTerms.map((item, i) => (
              <div key={i} className="key-term-item">
                <span className="term-word">{item.term}</span>
                <span className="term-count">×{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: MISHNA STRUCTURED ANALYSIS
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.mishna?.content && (
        <div className="section mishna-structured">
          <div className="section-header">
            <span className="section-num">1</span>
            <span className="section-icon">🔍</span>
            <span className="section-title">ניתוח מובנה של המשנה</span>
            {analysis.mishna.structureType && (
              <span className={`structure-badge ${analysis.mishna.structureType}`}>
                {analysis.mishna.structureType === 'enumeration' ? 'מנייה' :
                 analysis.mishna.structureType === 'explanation' ? 'הסבר' :
                 analysis.mishna.structureType === 'conditional' ? 'תנאי' :
                 analysis.mishna.structureType === 'ruling' ? 'פסק' :
                 analysis.mishna.structureType === 'dispute' ? 'מחלוקת' : ''}
              </span>
            )}
          </div>

          <div className="mishna-grid">
            {/* Topic - Full width */}
            {analysis.mishna.topic && (
              <div className="mishna-field topic full-width">
                <span className="field-label">נושא המשנה</span>
                <span className="field-value large">{analysis.mishna.topic}</span>
              </div>
            )}

            {/* Numbers/Enumeration if detected */}
            {analysis.mishna.numbers?.length > 0 && (
              <div className="mishna-field numbers">
                <span className="field-label">מניין</span>
                <div className="numbers-list">
                  {analysis.mishna.numbers.map((n, i) => (
                    <span key={i} className="number-badge">{n}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Cases if enumeration type */}
            {analysis.mishna.cases?.length > 0 && (
              <div className="mishna-field cases full-width">
                <span className="field-label">מקרים במשנה</span>
                <div className="cases-list">
                  {analysis.mishna.cases.map((c, i) => (
                    <div key={i} className="case-item">
                      <span className="case-num">{i + 1}</span>
                      <span className="case-text">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Case Details */}
            {(analysis.mishna.caseDetails?.who?.length > 0 || analysis.mishna.caseDetails?.conditions?.length > 0) && (
              <div className="mishna-field case-details">
                <span className="field-label">פרטי המקרה</span>
                <div className="case-content">
                  {analysis.mishna.caseDetails.who.length > 0 && (
                    <div className="case-who">
                      <span className="case-label">מי:</span>
                      {analysis.mishna.caseDetails.who.map((w, i) => (
                        <span key={i} className="case-chip who">{w}</span>
                      ))}
                    </div>
                  )}
                  {analysis.mishna.caseDetails.conditions.length > 0 && (
                    <div className="case-conditions">
                      <span className="case-label">תנאים:</span>
                      {analysis.mishna.caseDetails.conditions.map((c, i) => (
                        <span key={i} className="case-chip condition">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ruling */}
            {analysis.mishna.ruling?.decision && (
              <div className="mishna-field ruling">
                <span className="field-label">פסק</span>
                <div className="ruling-content">
                  <span className={`ruling-badge ${analysis.mishna.ruling.isDispute ? 'dispute' : 'unanimous'}`}>
                    {analysis.mishna.ruling.author}
                  </span>
                  <span className="ruling-text">{analysis.mishna.ruling.decision}</span>
                </div>
              </div>
            )}

            {/* Key Principle */}
            {analysis.mishna.keyPrinciple && (
              <div className="mishna-field principle">
                <span className="field-label">עיקרון</span>
                <span className="field-value highlight">{analysis.mishna.keyPrinciple}</span>
              </div>
            )}

            {/* One-Line Summary */}
            {analysis.mishna.oneLine && (
              <div className="mishna-field one-line">
                <span className="field-label">בקצרה</span>
                <span className="field-value summary">{analysis.mishna.oneLine}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: QUESTIONS THE GEMARA ASKS
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.gemaraQuestions?.length > 0 && (
        <div className="section gemara-questions">
          <div className="section-header">
            <span className="section-num">2</span>
            <span className="section-icon">🔍</span>
            <span className="section-title">שאלות הגמרא על המשנה</span>
            <span className="count-badge">{analysis.gemaraQuestions.length}</span>
          </div>

          {/* PRO SCHOLAR V23: Enhanced questions display with full context */}
          <div className="questions-list v23">
            {analysis.gemaraQuestions.map((q, i) => (
              <div key={i} className={`question-item ${q.type}`}>
                <div className="question-header">
                  <span className="question-num">{i + 1}</span>
                  <span className={`question-type-badge ${q.type}`}>{q.label}</span>
                </div>
                <div className="question-content">
                  {/* Show fullContext if available, otherwise fall back to context or label */}
                  <span className="question-text">
                    {q.fullContext || q.context || q.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2.5: HALACHIC SCENARIOS (from Mishna)
          PRO SCHOLAR V20: Visual representation of case scenarios
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.halachicScenarios?.length > 0 && (
        <div className="section halachic-scenarios">
          <div className="section-header">
            <span className="section-icon">⚖️</span>
            <span className="section-title">תרחישים ודינים</span>
            <span className="count-badge">{analysis.halachicScenarios.length} מקרים</span>
          </div>

          <div className="scenarios-grid">
            {analysis.halachicScenarios.map((scenario, i) => (
              <div key={i} className={`scenario-card ruling-${scenario.ruling?.toLowerCase() || 'neutral'}`}>
                <div className="scenario-header">
                  <span className="scenario-num">{i + 1}</span>
                  <span className="scenario-actor">{scenario.actor}</span>
                </div>
                <div className="scenario-action">
                  {scenario.action && <span className="action-text">{scenario.action}</span>}
                </div>
                <div className="scenario-ruling">
                  <span className={`ruling-badge ${scenario.ruling?.toLowerCase() || ''}`}>
                    {scenario.ruling === 'חייב' ? '🔴 חייב' :
                     scenario.ruling === 'פטור' ? '🟢 פטור' :
                     scenario.ruling === 'מותר' ? '✅ מותר' :
                     scenario.ruling === 'אסור' ? '🚫 אסור' :
                     scenario.ruling || '⚪ לא ידוע'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Show contrasting summary if there are both חייב and פטור */}
          {analysis.halachicScenarios.some(s => s.ruling === 'חייב') &&
           analysis.halachicScenarios.some(s => s.ruling === 'פטור') && (
            <div className="scenarios-summary">
              <div className="summary-item chiyuv">
                <span className="summary-icon">🔴</span>
                <span className="summary-count">
                  {analysis.halachicScenarios.filter(s => s.ruling === 'חייב').length}
                </span>
                <span className="summary-label">חייב</span>
              </div>
              <div className="summary-divider">⟷</div>
              <div className="summary-item ptur">
                <span className="summary-icon">🟢</span>
                <span className="summary-count">
                  {analysis.halachicScenarios.filter(s => s.ruling === 'פטור').length}
                </span>
                <span className="summary-label">פטור</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3: GEMARA STEP-BY-STEP FLOW - PRO SCHOLAR V22 Enhanced Diagram
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.sugyaSteps?.length > 0 && (
        <div className="section sugya-steps enhanced v22">
          <div className="section-header">
            <span className="section-num">3</span>
            <span className="section-icon">🔄</span>
            <span className="section-title">מהלך הסוגיא</span>
            <span className="count-badge">{analysis.sugyaSteps.length} שלבים</span>
          </div>

          {/* PRO SCHOLAR V22: Flow type summary badges */}
          <div className="flow-summary-badges">
            {(() => {
              const typeCounts = analysis.sugyaSteps.reduce((acc, s) => {
                acc[s.type] = (acc[s.type] || 0) + 1;
                return acc;
              }, {});
              return Object.entries(typeCounts).map(([type, count]) => (
                <span key={type} className={`flow-badge ${type}`}>
                  {type === 'question' ? '❓' : type === 'proof' ? '📖' : type === 'objection' ? '⚡' :
                   type === 'resolution' ? '✓' : type === 'conclusion' ? '⚖️' : type === 'statement' ? '💬' :
                   type === 'reason' ? '💡' : type === 'logical' ? '🔗' : type === 'example' ? '📝' :
                   type === 'tradition' ? '📜' : type === 'chain' ? '🔗' : type === 'distinction' ? '⚡' :
                   type === 'support' ? '✅' : type === 'alternative' ? '🔄' : '•'} {count}
                </span>
              ));
            })()}
          </div>

          <div className="steps-flow-enhanced v22">
            {/* PRO SCHOLAR V22: Start marker */}
            <div className="flow-marker start">
              <span className="marker-dot"></span>
              <span className="marker-label">התחלה</span>
            </div>

            {analysis.sugyaSteps.map((step, i) => {
              const prevStep = i > 0 ? analysis.sugyaSteps[i - 1] : null;
              const isTransition = prevStep && prevStep.type !== step.type;
              const isQuestion = step.type === 'question' || step.type === 'inquiry';
              const isObjection = step.type === 'objection';
              const isResolution = step.type === 'resolution' || step.type === 'answer';
              const isConclusion = step.type === 'conclusion';

              return (
                <div key={i} className={`step-card-v22 ${step.type} ${isTransition ? 'transition' : ''}`}>
                  {/* Connection line with type indicator */}
                  <div className="step-connector-v22">
                    <div className={`connector-line-v22 ${isObjection ? 'challenge' : isResolution ? 'resolve' : ''}`}>
                      {isObjection && <span className="connector-icon">↯</span>}
                      {isResolution && <span className="connector-icon">↻</span>}
                      {isConclusion && <span className="connector-icon">⬇</span>}
                    </div>
                  </div>

                  {/* Step node */}
                  <div className={`step-node-v22 ${step.type}`}>
                    <span className="node-num">{step.step}</span>
                    <span className="node-icon">{step.icon}</span>
                  </div>

                  {/* Step content card */}
                  <div className={`step-content-v22 ${step.type}`}>
                    <div className="step-header-v22">
                      <span className={`step-type-badge ${step.type}`}>
                        {step.type === 'question' ? 'שאלה' : step.type === 'inquiry' ? 'בירור' :
                         step.type === 'proof' ? 'מקור' : step.type === 'answer' ? 'תשובה' :
                         step.type === 'objection' ? 'קושיא' : step.type === 'resolution' ? 'תירוץ' :
                         step.type === 'conclusion' ? 'מסקנה' : step.type === 'statement' ? 'אמירה' :
                         step.type === 'reason' ? 'טעם' : step.type === 'logical' ? 'היגיון' :
                         step.type === 'example' ? 'דוגמא' : step.type === 'tradition' ? 'מסורת' :
                         step.type === 'chain' ? 'שלשלת' : step.type === 'distinction' ? 'חילוק' :
                         step.type === 'support' ? 'סיוע' : step.type === 'alternative' ? 'אפשרות' : step.type}
                      </span>
                      <span className="step-label-v22">{step.label}</span>
                    </div>
                    {step.content && (
                      <div className="step-text-v22">
                        <span className="quote-mark">״</span>
                        <span className="step-content">{step.content}</span>
                        <span className="quote-mark">״</span>
                      </div>
                    )}
                    {/* Visual indicator for flow type */}
                    {isQuestion && <div className="step-flow-indicator question-indicator">?</div>}
                    {isObjection && <div className="step-flow-indicator objection-indicator">!</div>}
                    {isResolution && <div className="step-flow-indicator resolution-indicator">✓</div>}
                  </div>
                </div>
              );
            })}

            {/* PRO SCHOLAR V22: End marker */}
            <div className="flow-marker end">
              <span className="marker-dot"></span>
              <span className="marker-label">סיום</span>
            </div>
          </div>

          {/* PRO SCHOLAR V22: Enhanced visual legend */}
          <div className="steps-legend v22">
            <div className="legend-title">מפתח סימנים</div>
            <div className="legend-grid">
              <div className="legend-item question"><span className="legend-icon">❓</span><span className="legend-text">שאלה / בירור</span></div>
              <div className="legend-item proof"><span className="legend-icon">📖</span><span className="legend-text">מקור / ראיה</span></div>
              <div className="legend-item objection"><span className="legend-icon">⚡</span><span className="legend-text">קושיא / סתירה</span></div>
              <div className="legend-item resolution"><span className="legend-icon">✓</span><span className="legend-text">תירוץ / יישוב</span></div>
              <div className="legend-item conclusion"><span className="legend-icon">⚖️</span><span className="legend-text">מסקנה / פסק</span></div>
              <div className="legend-item statement"><span className="legend-icon">💬</span><span className="legend-text">אמירת חכם</span></div>
              <div className="legend-item reason"><span className="legend-icon">💡</span><span className="legend-text">טעם / הסבר</span></div>
              <div className="legend-item logical"><span className="legend-icon">🔗</span><span className="legend-text">היגיון לוגי</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: OPINIONS (if multiple) - PRO SCHOLAR V22 Enhanced
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.opinions?.length > 0 && (
        <div className="section opinions-section v22">
          <div className="section-header">
            <span className="section-num">4</span>
            <span className="section-icon">⚖️</span>
            <span className="section-title">דעות ומחלוקות</span>
            <span className="count-badge">{analysis.opinions.length} שיטות</span>
          </div>

          {/* PRO SCHOLAR V22: Visual debate diagram when 2 opinions */}
          {analysis.opinions.length === 2 && (
            <div className="debate-diagram">
              <div className={`debate-side left ${analysis.opinions[0].type || 'amora'}`}>
                <div className="debate-avatar">
                  {analysis.opinions[0].type === 'tanna' ? '📜' :
                   analysis.opinions[0].type === 'school' ? '🏛️' :
                   analysis.opinions[0].type === 'dispute' ? '⚔️' : '👤'}
                </div>
                <div className="debate-name">{analysis.opinions[0].name}</div>
                <div className="debate-type-badge">
                  {analysis.opinions[0].type === 'tanna' ? 'תנא' :
                   analysis.opinions[0].type === 'amora' ? 'אמורא' :
                   analysis.opinions[0].type === 'school' ? 'בית מדרש' :
                   analysis.opinions[0].type === 'dispute' ? 'מחלוקת' : 'חכם'}
                </div>
                <div className="debate-position">{analysis.opinions[0].position}</div>
              </div>
              <div className="debate-vs">
                <span className="vs-icon">⚔️</span>
                <span className="vs-text">מחלוקת</span>
              </div>
              <div className={`debate-side right ${analysis.opinions[1].type || 'amora'}`}>
                <div className="debate-avatar">
                  {analysis.opinions[1].type === 'tanna' ? '📜' :
                   analysis.opinions[1].type === 'school' ? '🏛️' :
                   analysis.opinions[1].type === 'dispute' ? '⚔️' : '👤'}
                </div>
                <div className="debate-name">{analysis.opinions[1].name}</div>
                <div className="debate-type-badge">
                  {analysis.opinions[1].type === 'tanna' ? 'תנא' :
                   analysis.opinions[1].type === 'amora' ? 'אמורא' :
                   analysis.opinions[1].type === 'school' ? 'בית מדרש' :
                   analysis.opinions[1].type === 'dispute' ? 'מחלוקת' : 'חכם'}
                </div>
                <div className="debate-position">{analysis.opinions[1].position}</div>
              </div>
            </div>
          )}

          {/* PRO SCHOLAR V22: Grid for 3+ opinions */}
          {analysis.opinions.length !== 2 && (
            <div className="opinions-grid v22">
              {analysis.opinions.map((op, i) => (
                <div key={i} className={`opinion-card-v22 ${op.type || 'amora'}`}>
                  <div className="opinion-header-v22">
                    <span className="opinion-avatar">
                      {op.type === 'tanna' ? '📜' :
                       op.type === 'school' ? '🏛️' :
                       op.type === 'dispute' ? '⚔️' : '👤'}
                    </span>
                    <div className="opinion-info">
                      <span className="opinion-name-v22">{op.name}</span>
                      <span className={`opinion-type-badge ${op.type || 'amora'}`}>
                        {op.type === 'tanna' ? 'תנא' :
                         op.type === 'amora' ? 'אמורא' :
                         op.type === 'school' ? 'בית מדרש' :
                         op.type === 'opinion' ? 'סובר' :
                         op.type === 'dispute' ? 'מחלוקת' : 'חכם'}
                      </span>
                    </div>
                  </div>
                  <div className="opinion-position-v22">
                    <span className="position-quote">״</span>
                    {op.position}
                    <span className="position-quote">״</span>
                  </div>
                  {op.reason && (
                    <div className="opinion-reason">
                      <span className="reason-label">טעם:</span>
                      <span className="reason-text">{op.reason}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* PRO SCHOLAR V22: Enhanced main difference display */}
          {analysis.mainDifference && (
            <div className="main-difference-v22">
              <div className="diff-header">
                <span className="diff-icon">🎯</span>
                <span className="diff-label">עיקר המחלוקת</span>
              </div>
              <div className="diff-content">
                <span className="diff-text">{analysis.mainDifference}</span>
              </div>
            </div>
          )}

          {/* PRO SCHOLAR V22: Opinion type legend */}
          <div className="opinion-legend">
            <span className="legend-item tanna"><span>📜</span> תנא</span>
            <span className="legend-item amora"><span>👤</span> אמורא</span>
            <span className="legend-item school"><span>🏛️</span> בית מדרש</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5: CORE LOGIC OF THE SUGYA
          ═══════════════════════════════════════════════════════════════════════ */}
      {(analysis.coreLogic?.principle || analysis.middot?.length > 0) && (
        <div className="section core-logic">
          <div className="section-header">
            <span className="section-num">5</span>
            <span className="section-icon">🧠</span>
            <span className="section-title">היגיון הסוגיא</span>
          </div>

          <div className="logic-content">
            {analysis.coreLogic?.principle && (
              <div className="logic-principle">
                <span className="principle-badge">{analysis.coreLogic.principle}</span>
              </div>
            )}

            {analysis.middot?.length > 0 && (
              <div className="middot-used">
                <span className="middot-label">מידות דרש:</span>
                {analysis.middot.map((m, i) => (
                  <span key={i} className="midda-chip">
                    <span className="midda-name">{m.name}</span>
                  </span>
                ))}
              </div>
            )}

            {analysis.pesukim?.length > 0 && (
              <div className="pesukim-cited">
                <span className="pesukim-label">פסוקים שנדרשו:</span>
                {analysis.pesukim.map((p, i) => (
                  <div key={i} className="pasuk-item">
                    <span className="pasuk-icon">📖</span>
                    <span className="pasuk-text">{p.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 6: CONNECTION BACK TO MISHNA
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.mishnaConnection?.type && (
        <div className="section mishna-connection">
          <div className="section-header">
            <span className="section-num">6</span>
            <span className="section-icon">🔗</span>
            <span className="section-title">חזרה למשנה</span>
          </div>

          <div className="connection-content">
            <span className={`connection-type ${analysis.mishnaConnection.type}`}>
              {analysis.mishnaConnection.type === 'explains' ? 'מפרשת' :
               analysis.mishnaConnection.type === 'limits' ? 'מצמצמת' :
               analysis.mishnaConnection.type === 'expands' ? 'מרחיבה' :
               analysis.mishnaConnection.type === 'reinterprets' ? 'מפרשת מחדש' : ''}
            </span>
            {analysis.mishnaConnection.description && (
              <span className="connection-desc">{analysis.mishnaConnection.description}</span>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 7: FINAL HALACHIC TAKEAWAY
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.halachicTakeaway?.rule && (
        <div className="section halachic-takeaway">
          <div className="section-header">
            <span className="section-num">7</span>
            <span className="section-icon">📌</span>
            <span className="section-title">מסקנה הלכתית</span>
          </div>

          <div className="takeaway-content">
            <div className="takeaway-rule">
              <span className="rule-icon">⚖️</span>
              <span className="rule-text">{analysis.halachicTakeaway.rule}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SAGES MENTIONED (Supplementary)
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.sages?.length > 0 && (
        <div className="section sages-section supplementary">
          <div className="section-header">
            <span className="section-icon">👤</span>
            <span className="section-title">חכמים שהוזכרו</span>
          </div>
          <div className="sages-chips">
            {analysis.sages.map((sage, i) => (
              <span key={i} className={`sage-chip ${sage.type}`}>
                {sage.type === 'tanna' ? '📜' : sage.type === 'amora' ? '📖' : '🏛️'} {sage.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cross References (Supplementary) */}
      {analysis.crossRefs?.length > 0 && (
        <div className="section crossref-section supplementary">
          <div className="section-header">
            <span className="section-icon">🔗</span>
            <span className="section-title">מקורות מקבילים</span>
          </div>
          {analysis.crossRefs.map((ref, i) => (
            <div key={i} className="crossref-item">
              <span className="crossref-source">{ref.source}:</span>
              <span className="crossref-text">{ref.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Key Terms (Supplementary) */}
      {analysis.keyTerms?.length > 0 && (
        <div className="section terms-section supplementary">
          <div className="section-header">
            <span className="section-icon">🔑</span>
            <span className="section-title">מילות מפתח</span>
          </div>
          <div className="terms-grid">
            {analysis.keyTerms.map((t, i) => (
              <span key={i} className={`term-chip ${t.category || ''}`}>
                {t.term} <span className="term-count">×{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PRO SCHOLAR V13: REVIEW QUESTIONS (Chazara)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="section review-questions supplementary">
        <div className="section-header">
          <span className="section-icon">📝</span>
          <span className="section-title">שאלות חזרה</span>
        </div>
        <div className="questions-list chazara">
          {/* Question 1: Topic */}
          {analysis.mishna?.topic && (
            <div className="review-question">
              <span className="q-num">1</span>
              <span className="q-text">מה נושא המשנה/הסוגיא?</span>
              <details className="q-answer">
                <summary>לחץ לתשובה</summary>
                <p>{analysis.mishna.topic}</p>
              </details>
            </div>
          )}

          {/* Question 2: Opinions */}
          {analysis.opinions?.length > 1 && (
            <div className="review-question">
              <span className="q-num">2</span>
              <span className="q-text">מה המחלוקת בסוגיא ומי הצדדים?</span>
              <details className="q-answer">
                <summary>לחץ לתשובה</summary>
                <p>
                  {analysis.opinions.map(o => o.name).join(' ו')}
                  {analysis.mainDifference && ` - ${analysis.mainDifference}`}
                </p>
              </details>
            </div>
          )}

          {/* Question 3: Halacha */}
          {analysis.halachicTakeaway?.rule && (
            <div className="review-question">
              <span className="q-num">3</span>
              <span className="q-text">מה ההלכה למעשה?</span>
              <details className="q-answer">
                <summary>לחץ לתשובה</summary>
                <p>{analysis.halachicTakeaway.rule}</p>
              </details>
            </div>
          )}

          {/* Question 4: Sages */}
          {analysis.sages?.length > 0 && (
            <div className="review-question">
              <span className="q-num">4</span>
              <span className="q-text">אילו חכמים מוזכרים בסוגיא?</span>
              <details className="q-answer">
                <summary>לחץ לתשובה</summary>
                <p>{analysis.sages.map(s => s.name).join(', ')}</p>
              </details>
            </div>
          )}

          {/* Question 5: Key Terms */}
          {analysis.keyTerms?.length >= 3 && (
            <div className="review-question">
              <span className="q-num">5</span>
              <span className="q-text">מהם המושגים המרכזיים בסוגיא?</span>
              <details className="q-answer">
                <summary>לחץ לתשובה</summary>
                <p>{analysis.keyTerms.slice(0, 5).map(t => t.term).join(', ')}</p>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PRO SCHOLAR V13: ONE-LINE SUMMARY
          ═══════════════════════════════════════════════════════════════════════ */}
      {(analysis.mishna?.oneLine || analysis.halachicTakeaway?.rule) && (
        <div className="section one-line-summary">
          <div className="section-header">
            <span className="section-icon">💡</span>
            <span className="section-title">סיכום במשפט אחד</span>
          </div>
          <div className="one-line-content">
            <p className="one-line-text">
              {analysis.mishna?.oneLine || analysis.halachicTakeaway?.rule ||
               `${analysis.mishna?.topic || 'הסוגיא'} - ${analysis.sages?.[0]?.name || 'חכמים'} דנים ב${analysis.keyTerms?.[0]?.term || 'נושא זה'}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

export default ProScholarSummary;
