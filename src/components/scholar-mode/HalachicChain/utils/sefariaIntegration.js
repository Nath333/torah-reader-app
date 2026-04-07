/**
 * Sefaria Integration
 * 
 * Fetches Rishonim decisions and final psak from Shulchan Aruch/Rema
 * via the Sefaria API.
 */

import { sefariaApiRequest } from '../../../../services/sefariaApi';
import { AUTHORITY_TYPES, AUTHORITY_DISPLAY_NAMES } from '../types';

// Map Talmud tractates to Shulchan Aruch sections
const SHULCHAN_ARUCH_MAP = {
  'Berakhot': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Shabbat': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Eruvin': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Pesachim': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Yoma': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Sukkah': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Beitzah': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Rosh Hashanah': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Taanit': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Megillah': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Moed Katan': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Chagigah': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Yevamot': { section: 'Even HaEzer', hebrew: 'אבן העזר' },
  'Ketubot': { section: 'Even HaEzer', hebrew: 'אבן העזר' },
  'Nedarim': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Nazir': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Sotah': { section: 'Even HaEzer', hebrew: 'אבן העזר' },
  'Gittin': { section: 'Even HaEzer', hebrew: 'אבן העזר' },
  'Kiddushin': { section: 'Even HaEzer', hebrew: 'אבן העזר' },
  'Baba Kamma': { section: 'Choshen Mishpat', hebrew: 'חושן משפט' },
  'Baba Metzia': { section: 'Choshen Mishpat', hebrew: 'חושן משפט' },
  'Baba Batra': { section: 'Choshen Mishpat', hebrew: 'חושן משפט' },
  'Sanhedrin': { section: 'Choshen Mishpat', hebrew: 'חושן משפט' },
  'Makkot': { section: 'Choshen Mishpat', hebrew: 'חושן משפט' },
  'Shevuot': { section: 'Choshen Mishpat', hebrew: 'חושן משפט' },
  'Eduyot': { section: 'Choshen Mishpat', hebrew: 'חושן משפט' },
  'Avodah Zarah': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Avot': { section: 'Orach Chaim', hebrew: 'אורח חיים' },
  'Horayot': { section: 'Choshen Mishpat', hebrew: 'חושן משפט' },
  'Zevachim': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Menachot': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Chullin': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Bekhorot': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Arakhin': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Temurah': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Keritot': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Meilah': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Tamid': { section: 'Yoreh Deah', hebrew: 'יורה דעה' },
  'Niddah': { section: 'Yoreh Deah', hebrew: 'יורה דעה' }
};

// Key Rishonim to fetch
const KEY_RISHONIM = ['Rashi', 'Tosafot', 'Rif', 'Rambam', 'Rosh'];

/**
 * Fetch Rishonim decisions for a given Talmud reference
 * @param {string} reference - Talmud reference (e.g., "Berakhot.2a")
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<Array>} Array of Rishon decisions
 */
export const fetchRishonimDecisions = async (reference, signal) => {
  const decisions = [];
  
  try {
    // Fetch links/commentaries from Sefaria
    const links = await sefariaApiRequest(`/api/links/${reference}`, { signal });
    
    if (!Array.isArray(links)) {
      return decisions;
    }
    
    // Filter for Rishonim commentaries
    const rishonimLinks = links.filter(link => {
      const category = link?.category?.toLowerCase() || '';
      const ref = link?.ref || '';
      return category === 'commentary' && 
             KEY_RISHONIM.some(r => ref.includes(r));
    });
    
    // Process each Rishon's commentary
    for (const link of rishonimLinks.slice(0, 10)) { // Limit to first 10
      if (signal?.aborted) break;
      
      try {
        const decision = await extractDecisionFromLink(link, signal);
        if (decision) {
          decisions.push(decision);
        }
      } catch (err) {
        console.warn(`Failed to extract decision from ${link.ref}:`, err);
      }
    }
    
    return decisions;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.warn('Error fetching Rishonim decisions:', error);
    return decisions;
  }
};

/**
 * Extract decision from a commentary link
 */
const extractDecisionFromLink = async (link, signal) => {
  const ref = link.ref || '';
  
  // Identify which Rishon
  const authority = KEY_RISHONIM.find(r => ref.includes(r));
  if (!authority) return null;
  
  // Get display info
  const displayInfo = AUTHORITY_DISPLAY_NAMES[authority] || {
    hebrew: authority,
    type: AUTHORITY_TYPES.RISHON
  };
  
  // Try to fetch the actual text for deeper analysis
  let text = link.text || '';
  if (!text && link.ref) {
    try {
      const textData = await sefariaApiRequest(`/api/texts/${link.ref}`, { signal });
      if (textData?.he) {
        text = Array.isArray(textData.he) ? textData.he.join(' ') : textData.he;
      }
    } catch (err) {
      // Use link text as fallback
    }
  }
  
  // Extract ruling from text
  const ruling = extractRulingFromText(text);
  
  return {
    authority,
    hebrewName: displayInfo.hebrew,
    ruling: ruling || 'discusses',
    reasoning: text.substring(0, 300),
    sourceRef: ref,
    basedOn: extractBasedOn(text),
    type: displayInfo.type
  };
};

/**
 * Extract ruling from commentary text
 */
const extractRulingFromText = (text) => {
  if (!text) return null;
  
  // Look for key phrases indicating rulings
  const rulingPatterns = [
    { pattern: /מותר|מתיר|פוטר/, ruling: 'permitted' },
    { pattern: /אסור|אוסר|מחייב/, ruling: 'forbidden' },
    { pattern: /טמא|מטמא/, ruling: 'impure' },
    { pattern: /טהור|מטהר/, ruling: 'pure' },
    { pattern: /חייב/, ruling: 'liable' },
    { pattern: /פטור/, ruling: 'exempt' },
    { pattern: /כשר/, ruling: 'valid' },
    { pattern: /פסול/, ruling: 'invalid' }
  ];
  
  for (const { pattern, ruling } of rulingPatterns) {
    if (pattern.test(text)) {
      return ruling;
    }
  }
  
  return null;
};

/**
 * Extract which earlier opinions this is based on
 */
const extractBasedOn = (text) => {
  const basedOn = [];
  const knownAuthorities = Object.keys(AUTHORITY_DISPLAY_NAMES);
  
  knownAuthorities.forEach(authority => {
    const hebrewName = AUTHORITY_DISPLAY_NAMES[authority].hebrew;
    if (text.includes(hebrewName) || text.includes(authority)) {
      basedOn.push(authority);
    }
  });
  
  return basedOn;
};

/**
 * Fetch final psak from Shulchan Aruch/Rema
 * @param {string} reference - Talmud reference
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<Object|null>} Psak result or null
 */
export const fetchPsakFromSefaria = async (reference, signal) => {
  try {
    // Parse reference
    const [book, daf] = reference.split('.');
    if (!book || !daf) return null;
    
    // Get Shulchan Aruch section
    const saInfo = SHULCHAN_ARUCH_MAP[book];
    if (!saInfo) {
      console.warn(`No Shulchan Aruch mapping for ${book}`);
      return null;
    }
    
    // Search for relevant Shulchan Aruch sections
    // This is a simplified approach - in practice, you'd want a more
    // sophisticated mapping between daf and siman
    const searchQuery = `${saInfo.section} ${book}`;
    
    try {
      const searchResults = await sefariaApiRequest(
        `/api/search/${encodeURIComponent(searchQuery)}`,
        { signal }
      );
      
      if (searchResults?.hits?.hits?.length > 0) {
        // Get first relevant result
        const firstHit = searchResults.hits.hits[0];
        const ref = firstHit._source?.ref;
        
        if (ref) {
          // Fetch actual text
          const textData = await sefariaApiRequest(`/api/texts/${ref}`, { signal });
          
          if (textData?.he) {
            const hebrewText = Array.isArray(textData.he) 
              ? textData.he.join(' ') 
              : textData.he;
            
            return {
              ruling: extractRulingFromText(hebrewText) || 'see_text',
              majorityCount: { for: 2, against: 1 }, // Default - would need actual calculation
              source: 'Shulchan Aruch',
              location: ref,
              hebrewLocation: `${saInfo.hebrew}`,
              minorityOpinion: null, // Would need to check Rema
              isDisputed: hebrewText.includes('הגה') || hebrewText.includes('רמ"א'),
              text: hebrewText.substring(0, 500)
            };
          }
        }
      }
    } catch (searchErr) {
      console.warn('Search failed:', searchErr);
    }
    
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.warn('Error fetching psak:', error);
    return null;
  }
};

export default {
  fetchRishonimDecisions,
  fetchPsakFromSefaria,
  SHULCHAN_ARUCH_MAP
};
