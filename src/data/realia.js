/**
 * Realia Database - Measures, currencies, objects in Jewish texts
 */

export const MEASURES = {
  // === CURRENCY ===
  "זוז": {
    english: "Zuz",
    category: "currency",
    description: "Standard silver coin",
    equivalents: "1/4 Shekel, 1 Dinar",
    modern: "~$5-10 USD",
    context: "Used for marriage contracts, fines, purchases"
  },
  "דינר": {
    english: "Dinar",
    category: "currency",
    description: "Gold or silver coin",
    equivalents: "= 1 Zuz (silver), = 25 Zuz (gold)",
    modern: "Silver: ~$5, Gold: ~$125",
    context: "Major currency unit in Talmudic period"
  },
  "שקל": {
    english: "Shekel",
    category: "currency",
    description: "Biblical silver weight/coin",
    equivalents: "= 4 Zuz = 2 Sela",
    modern: "~$20 USD",
    context: "Half-shekel given to Temple annually"
  },
  "פרוטה": {
    english: "Perutah",
    category: "currency",
    description: "Smallest copper coin",
    equivalents: "1/8 of an Issar",
    modern: "< $0.01",
    context: "Minimum value for legal transactions"
  },
  "מנה": {
    english: "Maneh (Mina)",
    category: "currency",
    description: "Large silver unit",
    equivalents: "= 100 Zuz = 25 Shekel",
    modern: "~$500",
    context: "Used in ketubah, large transactions"
  },
  "ככר": {
    english: "Kikar (Talent)",
    category: "currency",
    description: "Largest currency unit",
    equivalents: "= 60 Maneh = 6000 Zuz",
    modern: "~$30,000",
    context: "Temple donations, royal gifts"
  },

  // === LENGTH ===
  "אמה": {
    english: "Amah (Cubit)",
    category: "length",
    description: "Forearm length",
    equivalents: "= 6 Tefachim = 24 Etzbaot",
    modern: "~18 inches / 45-48 cm",
    context: "Primary building measure; Ark, Temple dimensions"
  },
  "טפח": {
    english: "Tefach (Handbreadth)",
    category: "length",
    description: "Width of palm",
    equivalents: "= 4 Etzbaot = 1/6 Amah",
    modern: "~3 inches / 8 cm",
    context: "Sukkah walls, mezuzah placement"
  },
  "אצבע": {
    english: "Etzba (Fingerbreadth)",
    category: "length",
    description: "Width of thumb",
    equivalents: "= 1/4 Tefach",
    modern: "~3/4 inch / 2 cm",
    context: "Smallest precise measure"
  },
  "מיל": {
    english: "Mil (Mile)",
    category: "length",
    description: "Walking distance",
    equivalents: "= 2000 Amot",
    modern: "~1 km / 0.6 miles",
    context: "Techum Shabbat, travel times"
  },
  "פרסה": {
    english: "Parsah (Parasang)",
    category: "length",
    description: "Persian league",
    equivalents: "= 4 Milin = 8000 Amot",
    modern: "~4 km / 2.5 miles",
    context: "Day's walking distance = 10 Parsah"
  },

  // === VOLUME (DRY) ===
  "סאה": {
    english: "Se'ah",
    category: "volume",
    description: "Dry measure",
    equivalents: "= 6 Kabin = 24 Login",
    modern: "~13 liters / 3.5 gallons",
    context: "Mikvah requires 40 Se'ah"
  },
  "קב": {
    english: "Kav",
    category: "volume",
    description: "Basic dry measure",
    equivalents: "= 4 Login = 1/6 Se'ah",
    modern: "~2.2 liters",
    context: "Daily bread ration"
  },
  "עומר": {
    english: "Omer",
    category: "volume",
    description: "Barley measure",
    equivalents: "= 1/10 Ephah = 43.2 eggs",
    modern: "~2.5 liters",
    context: "First barley offering; Manna portion"
  },
  "כור": {
    english: "Kor (Homer)",
    category: "volume",
    description: "Largest dry measure",
    equivalents: "= 30 Se'ah",
    modern: "~390 liters",
    context: "Land yields, Temple offerings"
  },

  // === VOLUME (LIQUID) ===
  "לוג": {
    english: "Log",
    category: "volume",
    description: "Basic liquid measure",
    equivalents: "= 6 Beitzim (eggs)",
    modern: "~0.5 liters",
    context: "Oil for menorah, wine measures"
  },
  "הין": {
    english: "Hin",
    category: "volume",
    description: "Liquid measure",
    equivalents: "= 12 Login",
    modern: "~6 liters",
    context: "Temple libations"
  },
  "רביעית": {
    english: "Revi'it",
    category: "volume",
    description: "Quarter-log",
    equivalents: "= 1/4 Log = 1.5 eggs",
    modern: "~86 ml / 3 oz",
    context: "Kiddush wine, netilat yadayim"
  },

  // === WEIGHT ===
  "סלע": {
    english: "Sela",
    category: "weight",
    description: "Silver weight",
    equivalents: "= 2 Shekel = 8 Zuz",
    modern: "~17 grams",
    context: "Pidyon haben = 5 Sela"
  },
  "כזית": {
    english: "K'zayit",
    category: "volume/weight",
    description: "Olive's bulk",
    equivalents: "= 1/2 K'beitzah",
    modern: "~27 ml (varies by opinion)",
    context: "Minimum for blessings, matzah, maror"
  },
  "כביצה": {
    english: "K'beitzah",
    category: "volume",
    description: "Egg's bulk",
    equivalents: "= 2 K'zaytim",
    modern: "~54 ml (varies)",
    context: "Tumah transfer, food measures"
  },

  // === TIME ===
  "שעה": {
    english: "Sha'ah (Hour)",
    category: "time",
    description: "Variable hour",
    equivalents: "= 1/12 of daylight",
    modern: "~60 min at equinox",
    context: "Prayer times, chametz deadline"
  },
  "עונה": {
    english: "Onah",
    category: "time",
    description: "Half-day period",
    equivalents: "= Day or Night portion",
    modern: "~12 hours",
    context: "Niddah counting, corpse tumah"
  }
};

/**
 * Find measure by Hebrew or English name
 */
export function findMeasure(name) {
  if (MEASURES[name]) return { key: name, ...MEASURES[name] };

  for (const [key, data] of Object.entries(MEASURES)) {
    if (data.english.toLowerCase() === name.toLowerCase()) {
      return { key, ...data };
    }
  }
  return null;
}

/**
 * Get all measure names for text matching
 */
export function getAllMeasureNames() {
  return Object.keys(MEASURES);
}

/**
 * Get measures by category
 */
export function getMeasuresByCategory(category) {
  return Object.entries(MEASURES)
    .filter(([_, data]) => data.category === category)
    .map(([key, data]) => ({ key, ...data }));
}

export default MEASURES;
