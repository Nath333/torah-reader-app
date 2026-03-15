// Hebcal API Service for accurate Jewish calendar and parsha information
// Uses the free Hebcal API for Jewish calendar calculations

const HEBCAL_BASE_URL = 'https://www.hebcal.com/hebcal';
const SHABBAT_API_URL = 'https://www.hebcal.com/shabbat';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Fallback parsha data for offline mode - calculated based on approximate yearly cycle
const FALLBACK_PARSHIOT = [
  { name: 'Bereshit', book: 'Genesis', chapter: 1 },
  { name: 'Noach', book: 'Genesis', chapter: 6 },
  { name: 'Lech-Lecha', book: 'Genesis', chapter: 12 },
  { name: 'Vayera', book: 'Genesis', chapter: 18 },
  { name: 'Chayei Sara', book: 'Genesis', chapter: 23 },
  { name: 'Toldot', book: 'Genesis', chapter: 25 },
  { name: 'Vayetzei', book: 'Genesis', chapter: 28 },
  { name: 'Vayishlach', book: 'Genesis', chapter: 32 },
  { name: 'Vayeshev', book: 'Genesis', chapter: 37 },
  { name: 'Miketz', book: 'Genesis', chapter: 41 },
  { name: 'Vayigash', book: 'Genesis', chapter: 44 },
  { name: 'Vayechi', book: 'Genesis', chapter: 47 }
];

// Get a fallback parsha based on week of year (simple approximation)
const getFallbackParsha = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekOfYear = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  const parshaIndex = weekOfYear % FALLBACK_PARSHIOT.length;
  return FALLBACK_PARSHIOT[parshaIndex];
};

// Hebrew month names for fallback
const HEBREW_MONTHS = [
  'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar',
  'Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul'
];

// Get approximate Hebrew date (fallback when API unavailable)
const getApproximateHebrewDate = () => {
  const now = new Date();
  // Rough approximation: Hebrew year = Gregorian year + 3760
  // This is simplified - actual Hebrew date calculation is complex
  const hebrewYear = now.getFullYear() + 3760;
  // Simple month approximation (very rough)
  const monthIndex = (now.getMonth() + 7) % 12; // Offset for Tishrei starting in Sept/Oct
  return {
    hebrewDay: now.getDate(),
    hebrewMonth: HEBREW_MONTHS[monthIndex],
    hebrewYear: hebrewYear,
    formatted: `${now.getDate()} ${HEBREW_MONTHS[monthIndex]} ${hebrewYear}`,
    isFallback: true
  };
};

// Fallback Daf Yomi cycle data (simplified)
const DAF_YOMI_TRACTATES = [
  { name: 'Berakhot', pages: 64 },
  { name: 'Shabbat', pages: 157 },
  { name: 'Eruvin', pages: 105 },
  { name: 'Pesachim', pages: 121 },
  { name: 'Shekalim', pages: 22 },
  { name: 'Yoma', pages: 88 },
  { name: 'Sukkah', pages: 56 },
  { name: 'Beitzah', pages: 40 },
  { name: 'Rosh Hashanah', pages: 35 },
  { name: 'Taanit', pages: 31 },
  { name: 'Megillah', pages: 32 },
  { name: 'Moed Katan', pages: 29 },
  { name: 'Chagigah', pages: 27 },
  { name: 'Yevamot', pages: 122 },
  { name: 'Ketubot', pages: 112 },
  { name: 'Nedarim', pages: 91 },
  { name: 'Nazir', pages: 66 },
  { name: 'Sotah', pages: 49 },
  { name: 'Gittin', pages: 90 },
  { name: 'Kiddushin', pages: 82 },
  { name: 'Bava Kamma', pages: 119 },
  { name: 'Bava Metzia', pages: 119 },
  { name: 'Bava Batra', pages: 176 },
  { name: 'Sanhedrin', pages: 113 },
  { name: 'Makkot', pages: 24 },
  { name: 'Shevuot', pages: 49 },
  { name: 'Avodah Zarah', pages: 76 },
  { name: 'Horayot', pages: 14 },
  { name: 'Zevachim', pages: 120 },
  { name: 'Menachot', pages: 110 },
  { name: 'Chullin', pages: 142 },
  { name: 'Bekhorot', pages: 61 },
  { name: 'Arakhin', pages: 34 },
  { name: 'Temurah', pages: 34 },
  { name: 'Keritot', pages: 28 },
  { name: 'Meilah', pages: 22 },
  { name: 'Kinnim', pages: 4 },
  { name: 'Tamid', pages: 10 },
  { name: 'Middot', pages: 4 },
  { name: 'Niddah', pages: 73 }
];

// Get approximate Daf Yomi (fallback when API unavailable)
const getApproximateDafYomi = () => {
  // Cycle 14 started January 5, 2020
  const cycleStart = new Date(2020, 0, 5);
  const today = new Date();
  const daysSinceStart = Math.floor((today - cycleStart) / (1000 * 60 * 60 * 24));

  // Find current tractate and daf
  let daysAccumulated = 0;
  for (const tractate of DAF_YOMI_TRACTATES) {
    if (daysAccumulated + tractate.pages > daysSinceStart) {
      const daf = daysSinceStart - daysAccumulated + 2; // Daf starts at 2
      return {
        title: `${tractate.name} ${daf}`,
        tractate: tractate.name,
        daf: daf.toString(),
        hebrew: null,
        date: today.toISOString().split('T')[0],
        isFallback: true
      };
    }
    daysAccumulated += tractate.pages;
  }

  // If past the cycle, return first daf
  return {
    title: 'Berakhot 2',
    tractate: 'Berakhot',
    daf: '2',
    hebrew: null,
    date: today.toISOString().split('T')[0],
    isFallback: true
  };
};

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Get today's Jewish date and calendar information
 * @returns {Promise<Object>} Jewish date info
 */
export const getJewishDate = async () => {
  const cacheKey = `jewishDate:${new Date().toDateString()}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const today = new Date();
    const params = new URLSearchParams({
      v: '1',
      cfg: 'json',
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
      maj: 'on',
      min: 'on',
      mod: 'on',
      nx: 'on',
      ss: 'on',
      mf: 'on',
      c: 'on',
      s: 'on',
      D: 'on',
      d: 'on',
      o: 'on',
      F: 'on'
    });

    const response = await fetch(`${HEBCAL_BASE_URL}?${params}`);
    if (!response.ok) throw new Error('Hebcal API error');

    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching Jewish date:', error);
    // Return fallback data for offline mode
    return getApproximateHebrewDate();
  }
};

/**
 * Get this week's parsha information
 * @param {string} geonameid - Optional location ID for accurate times
 * @returns {Promise<Object>} Parsha and Shabbat info
 */
export const getWeeklyParsha = async (geonameid = '281184') => {
  const cacheKey = `parsha:${new Date().toDateString()}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      cfg: 'json',
      geonameid: geonameid, // Default: Jerusalem
      M: 'on', // Havdalah minutes
      leyning: 'on' // Include Torah reading info
    });

    const response = await fetch(`${SHABBAT_API_URL}?${params}`);
    if (!response.ok) throw new Error('Shabbat API error');

    const data = await response.json();

    // Extract parsha info
    const parshaEvent = data.items?.find(item =>
      item.category === 'parashat' || item.category === 'holiday'
    );

    const result = {
      parsha: parshaEvent?.title || null,
      parshaHebrew: parshaEvent?.hebrew || null,
      date: parshaEvent?.date || null,
      leyning: parshaEvent?.leyning || null,
      items: data.items || [],
      location: data.location || null
    };

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching weekly parsha:', error);
    // Return fallback data for offline mode
    const fallback = getFallbackParsha();
    return {
      parsha: `Parashat ${fallback.name}`,
      parshaHebrew: null,
      date: null,
      leyning: null,
      items: [],
      location: null,
      isFallback: true
    };
  }
};

/**
 * Get upcoming holidays and special days
 * @param {number} days - Number of days to look ahead
 * @returns {Promise<Array>} List of upcoming events
 */
export const getUpcomingHolidays = async (days = 30) => {
  const cacheKey = `holidays:${days}:${new Date().toDateString()}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const params = new URLSearchParams({
      v: '1',
      cfg: 'json',
      year: today.getFullYear(),
      maj: 'on',
      min: 'on',
      mod: 'on',
      nx: 'on',
      ss: 'on',
      mf: 'on',
      c: 'on'
    });

    const response = await fetch(`${HEBCAL_BASE_URL}?${params}`);
    if (!response.ok) throw new Error('Hebcal API error');

    const data = await response.json();

    // Filter to upcoming events only
    const events = (data.items || []).filter(item => {
      const eventDate = new Date(item.date);
      return eventDate >= today && eventDate <= endDate;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    setCachedData(cacheKey, events);
    return events;
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
};

/**
 * Get Daf Yomi for today
 * @returns {Promise<Object>} Daf Yomi info
 */
export const getDafYomi = async () => {
  const cacheKey = `dafyomi:${new Date().toDateString()}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const today = new Date();
    const params = new URLSearchParams({
      v: '1',
      cfg: 'json',
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      F: 'on' // Daf Yomi
    });

    const response = await fetch(`${HEBCAL_BASE_URL}?${params}`);
    if (!response.ok) throw new Error('Hebcal API error');

    const data = await response.json();

    // Find today's Daf Yomi
    const todayStr = today.toISOString().split('T')[0];
    const dafYomi = data.items?.find(item =>
      item.category === 'dafyomi' && item.date === todayStr
    );

    const result = dafYomi ? {
      title: dafYomi.title,
      hebrew: dafYomi.hebrew,
      date: dafYomi.date,
      // Parse tractate and daf from title (e.g., "Bava Kamma 42")
      tractate: dafYomi.title?.split(' ').slice(0, -1).join(' '),
      daf: dafYomi.title?.split(' ').pop()
    } : null;

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching Daf Yomi:', error);
    // Return fallback data for offline mode
    return getApproximateDafYomi();
  }
};

/**
 * Convert a parsha name to book and chapter reference
 * @param {string} parshaName - Name of the parsha
 * @returns {Object} Book and starting chapter
 */
export const parshaToReference = (parshaName) => {
  const parshaMap = {
    // Bereishit / Genesis
    'Bereshit': { book: 'Genesis', chapter: 1 },
    'Noach': { book: 'Genesis', chapter: 6 },
    'Lech-Lecha': { book: 'Genesis', chapter: 12 },
    'Vayera': { book: 'Genesis', chapter: 18 },
    'Chayei Sara': { book: 'Genesis', chapter: 23 },
    'Toldot': { book: 'Genesis', chapter: 25 },
    'Vayetzei': { book: 'Genesis', chapter: 28 },
    'Vayishlach': { book: 'Genesis', chapter: 32 },
    'Vayeshev': { book: 'Genesis', chapter: 37 },
    'Miketz': { book: 'Genesis', chapter: 41 },
    'Vayigash': { book: 'Genesis', chapter: 44 },
    'Vayechi': { book: 'Genesis', chapter: 47 },

    // Shemot / Exodus
    'Shemot': { book: 'Exodus', chapter: 1 },
    'Vaera': { book: 'Exodus', chapter: 6 },
    'Bo': { book: 'Exodus', chapter: 10 },
    'Beshalach': { book: 'Exodus', chapter: 13 },
    'Yitro': { book: 'Exodus', chapter: 18 },
    'Mishpatim': { book: 'Exodus', chapter: 21 },
    'Terumah': { book: 'Exodus', chapter: 25 },
    'Tetzaveh': { book: 'Exodus', chapter: 27 },
    'Ki Tisa': { book: 'Exodus', chapter: 30 },
    'Vayakhel': { book: 'Exodus', chapter: 35 },
    'Pekudei': { book: 'Exodus', chapter: 38 },

    // Vayikra / Leviticus
    'Vayikra': { book: 'Leviticus', chapter: 1 },
    'Tzav': { book: 'Leviticus', chapter: 6 },
    'Shmini': { book: 'Leviticus', chapter: 9 },
    'Shemini': { book: 'Leviticus', chapter: 9 },
    'Tazria': { book: 'Leviticus', chapter: 12 },
    'Metzora': { book: 'Leviticus', chapter: 14 },
    'Achrei Mot': { book: 'Leviticus', chapter: 16 },
    'Kedoshim': { book: 'Leviticus', chapter: 19 },
    'Emor': { book: 'Leviticus', chapter: 21 },
    'Behar': { book: 'Leviticus', chapter: 25 },
    'Bechukotai': { book: 'Leviticus', chapter: 26 },

    // Bamidbar / Numbers
    'Bamidbar': { book: 'Numbers', chapter: 1 },
    'Nasso': { book: 'Numbers', chapter: 4 },
    'Behaalotecha': { book: 'Numbers', chapter: 8 },
    "Beha'alotcha": { book: 'Numbers', chapter: 8 },
    'Shelach': { book: 'Numbers', chapter: 13 },
    "Sh'lach": { book: 'Numbers', chapter: 13 },
    'Korach': { book: 'Numbers', chapter: 16 },
    'Chukat': { book: 'Numbers', chapter: 19 },
    'Balak': { book: 'Numbers', chapter: 22 },
    'Pinchas': { book: 'Numbers', chapter: 25 },
    'Matot': { book: 'Numbers', chapter: 30 },
    'Masei': { book: 'Numbers', chapter: 33 },

    // Devarim / Deuteronomy
    'Devarim': { book: 'Deuteronomy', chapter: 1 },
    'Vaetchanan': { book: 'Deuteronomy', chapter: 3 },
    "Va'etchanan": { book: 'Deuteronomy', chapter: 3 },
    'Eikev': { book: 'Deuteronomy', chapter: 7 },
    "Re'eh": { book: 'Deuteronomy', chapter: 11 },
    'Reeh': { book: 'Deuteronomy', chapter: 11 },
    'Shoftim': { book: 'Deuteronomy', chapter: 16 },
    'Ki Teitzei': { book: 'Deuteronomy', chapter: 21 },
    'Ki Tavo': { book: 'Deuteronomy', chapter: 26 },
    'Nitzavim': { book: 'Deuteronomy', chapter: 29 },
    'Vayelech': { book: 'Deuteronomy', chapter: 31 },
    "Ha'azinu": { book: 'Deuteronomy', chapter: 32 },
    'Haazinu': { book: 'Deuteronomy', chapter: 32 },
    "V'Zot HaBerachah": { book: 'Deuteronomy', chapter: 33 },
    'Vezot Habracha': { book: 'Deuteronomy', chapter: 33 }
  };

  // Clean up parsha name (remove "Parashat " prefix if present)
  const cleanName = parshaName?.replace(/^Parashat\s+/i, '').trim();

  // Handle double parshiot (e.g., "Vayakhel-Pekudei")
  if (cleanName?.includes('-')) {
    const firstParsha = cleanName.split('-')[0].trim();
    return parshaMap[firstParsha] || null;
  }

  return parshaMap[cleanName] || null;
};

/**
 * Get aliyot breakdown for a parsha
 * @param {string} parshaName - Name of the parsha
 * @returns {Promise<Array>} Aliyot information
 */
export const getAliyot = async (parshaName) => {
  try {
    const parshaData = await getWeeklyParsha();
    if (parshaData?.leyning) {
      return {
        torah: parshaData.leyning.torah || null,
        haftarah: parshaData.leyning.haftarah || null,
        maftir: parshaData.leyning.maftir || null,
        aliyot: parshaData.leyning['1'] ? {
          '1': parshaData.leyning['1'],
          '2': parshaData.leyning['2'],
          '3': parshaData.leyning['3'],
          '4': parshaData.leyning['4'],
          '5': parshaData.leyning['5'],
          '6': parshaData.leyning['6'],
          '7': parshaData.leyning['7']
        } : null
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching aliyot:', error);
    return null;
  }
};

const hebcalService = {
  getJewishDate,
  getWeeklyParsha,
  getUpcomingHolidays,
  getDafYomi,
  parshaToReference,
  getAliyot
};

export default hebcalService;
