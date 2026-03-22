/**
 * Rabbi Biography Database
 * Comprehensive data for Talmudic and Medieval scholars
 */

export const RABBIS = {
  // === TANNAIM (Mishnaic Period, 10-220 CE) ===
  "רבי עקיבא": {
    english: "Rabbi Akiva",
    fullName: "Rabbi Akiva ben Yosef",
    dates: "c. 50–135 CE",
    era: "Tanna",
    generation: "3rd Generation",
    location: "Bnei Brak, Eretz Israel",
    teachers: ["Nachum Ish Gamzu", "Rabbi Eliezer", "Rabbi Yehoshua"],
    students: ["Rabbi Meir", "Rabbi Yehuda", "Rabbi Shimon bar Yochai", "Rabbi Yose"],
    keyTeaching: "Love your neighbor as yourself is a great principle of the Torah",
    methodology: "Derives laws from every letter and crown of the Torah"
  },
  "רבי מאיר": {
    english: "Rabbi Meir",
    fullName: "Rabbi Meir Baal HaNes",
    dates: "c. 110–160 CE",
    era: "Tanna",
    generation: "4th Generation",
    location: "Tiberias, Eretz Israel",
    teachers: ["Rabbi Akiva", "Rabbi Yishmael", "Elisha ben Avuyah"],
    students: ["Rabbi Yehuda HaNasi"],
    keyTeaching: "Look not at the vessel but at what it contains",
    methodology: "Brilliant dialectician, anonymous Mishnayot follow his view"
  },
  "רבי יהודה": {
    english: "Rabbi Yehuda",
    fullName: "Rabbi Yehuda bar Ilai",
    dates: "c. 110–180 CE",
    era: "Tanna",
    generation: "4th Generation",
    location: "Usha, Eretz Israel",
    teachers: ["Rabbi Akiva", "Rabbi Tarfon"],
    keyTeaching: "Be careful with your words",
    methodology: "Most frequently cited Tanna in the Mishnah"
  },
  "רבי שמעון": {
    english: "Rabbi Shimon",
    fullName: "Rabbi Shimon bar Yochai (Rashbi)",
    dates: "c. 100–160 CE",
    era: "Tanna",
    generation: "4th Generation",
    location: "Meron, Eretz Israel",
    teachers: ["Rabbi Akiva"],
    students: ["Rabbi Yehuda HaNasi", "Rabbi Elazar ben Rabbi Shimon"],
    keyTeaching: "Three things acquired together: Torah, this world, and the World to Come",
    methodology: "Seeks reasons behind laws; traditionally associated with Zohar"
  },
  "רבי יוסי": {
    english: "Rabbi Yose",
    fullName: "Rabbi Yose ben Chalafta",
    dates: "c. 100–160 CE",
    era: "Tanna",
    generation: "4th Generation",
    location: "Sepphoris, Eretz Israel",
    teachers: ["Rabbi Akiva"],
    keyTeaching: "Let your fellow's property be as dear to you as your own",
    methodology: "Known for precise, balanced rulings"
  },
  "רבי יהודה הנשיא": {
    english: "Rabbi Yehuda HaNasi",
    fullName: "Rabbi Yehuda HaNasi (Rebbi)",
    dates: "c. 135–217 CE",
    era: "Tanna",
    generation: "6th Generation",
    location: "Beit Shearim, then Sepphoris",
    teachers: ["Rabbi Shimon bar Yochai", "Rabbi Meir"],
    keyTeaching: "Which is the right path? One that is honorable for oneself and earns honor from others",
    methodology: "Compiled and edited the Mishnah"
  },
  "הלל": {
    english: "Hillel",
    fullName: "Hillel the Elder",
    dates: "c. 110 BCE–10 CE",
    era: "Zugot",
    generation: "Last of the Zugot",
    location: "Jerusalem",
    teachers: ["Shemaya", "Avtalyon"],
    students: ["Shammai", "Yochanan ben Zakkai"],
    keyTeaching: "What is hateful to you, do not do to others",
    methodology: "Known for patience and humility; lenient rulings"
  },
  "שמאי": {
    english: "Shammai",
    fullName: "Shammai the Elder",
    dates: "c. 50 BCE–30 CE",
    era: "Zugot",
    generation: "Last of the Zugot",
    location: "Jerusalem",
    teachers: ["Shemaya", "Avtalyon"],
    keyTeaching: "Say little and do much",
    methodology: "Strict interpretations; disputes with Hillel"
  },

  // === AMORAIM (Talmudic Period, 220-500 CE) ===
  "רב": {
    english: "Rav",
    fullName: "Abba Arikha (Rav)",
    dates: "c. 175–247 CE",
    era: "Amora",
    generation: "1st Generation Babylonian",
    location: "Sura, Babylonia",
    teachers: ["Rabbi Yehuda HaNasi", "Rabbi Chiya"],
    students: ["Rav Huna", "Rav Yehuda"],
    keyTeaching: "A person will have to give account for everything his eye saw but he did not eat",
    methodology: "Founded Sura academy; often disputes with Shmuel"
  },
  "שמואל": {
    english: "Shmuel",
    fullName: "Shmuel Yarchinai",
    dates: "c. 165–257 CE",
    era: "Amora",
    generation: "1st Generation Babylonian",
    location: "Nehardea, Babylonia",
    teachers: ["Rabbi Yehuda HaNasi", "Levi bar Sisi"],
    keyTeaching: "Dina d'malkhuta dina (the law of the land is the law)",
    methodology: "Expert in civil law; astronomer and physician"
  },
  "רבי יוחנן": {
    english: "Rabbi Yochanan",
    fullName: "Rabbi Yochanan bar Nafcha",
    dates: "c. 180–279 CE",
    era: "Amora",
    generation: "2nd Generation",
    location: "Tiberias, Eretz Israel",
    teachers: ["Rabbi Yehuda HaNasi", "Rabbi Oshaya"],
    students: ["Reish Lakish", "Rabbi Ami", "Rabbi Asi"],
    keyTeaching: "Jerusalem was destroyed because they judged strictly by Torah law",
    methodology: "Primary authority of Jerusalem Talmud"
  },
  "ריש לקיש": {
    english: "Reish Lakish",
    fullName: "Rabbi Shimon ben Lakish",
    dates: "c. 200–275 CE",
    era: "Amora",
    generation: "2nd Generation",
    location: "Tiberias, Eretz Israel",
    teachers: ["Rabbi Yochanan"],
    keyTeaching: "Words of Torah endure only in one who kills himself over it",
    methodology: "Sharp debater; often disputes with Rabbi Yochanan"
  },
  "רבא": {
    english: "Rava",
    fullName: "Rava bar Yosef bar Chama",
    dates: "c. 280–352 CE",
    era: "Amora",
    generation: "4th Generation Babylonian",
    location: "Machoza, Babylonia",
    teachers: ["Rav Nachman", "Rav Chisda"],
    keyTeaching: "The goal of wisdom is repentance and good deeds",
    methodology: "Sharp analytical reasoning; halacha follows Rava vs Abaye except in 6 cases"
  },
  "אביי": {
    english: "Abaye",
    fullName: "Abaye Nachmani",
    dates: "c. 280–339 CE",
    era: "Amora",
    generation: "4th Generation Babylonian",
    location: "Pumbedita, Babylonia",
    teachers: ["Rabbah", "Rav Yosef"],
    keyTeaching: "One should always be soft as a reed and not hard as a cedar",
    methodology: "Often disputes with Rava; only wins in YAL KGAM cases"
  },

  // === RISHONIM (Medieval Period, 1000-1500 CE) ===
  "רש״י": {
    english: "Rashi",
    fullName: "Rabbi Shlomo Yitzchaki",
    dates: "1040–1105",
    era: "Rishon",
    location: "Troyes, France",
    teachers: ["Rabbis of Mainz and Worms"],
    students: ["Rashbam", "Rivam", "Rabbi Yehuda ben Natan"],
    keyTeaching: "I have come only to explain the plain meaning of the text",
    methodology: "Clear, concise commentary on Torah and Talmud; foundation of all study"
  },
  "תוספות": {
    english: "Tosafot",
    fullName: "Tosafot (The Tosafists)",
    dates: "12th–14th centuries",
    era: "Rishonim",
    location: "France and Germany",
    keyTeaching: "Critical analysis and harmonization of Talmudic passages",
    methodology: "Dialectical analysis building on Rashi; resolves contradictions"
  },
  "רמב״ם": {
    english: "Rambam",
    fullName: "Rabbi Moshe ben Maimon (Maimonides)",
    dates: "1138–1204",
    era: "Rishon",
    location: "Cordoba, Fez, Egypt",
    teachers: ["His father Rabbi Maimon", "Ibn Migash's students"],
    keyTeaching: "The purpose of the Torah is to perfect both body and soul",
    methodology: "Systematic codification; philosophical approach; Mishneh Torah"
  },
  "רמב״ן": {
    english: "Ramban",
    fullName: "Rabbi Moshe ben Nachman (Nachmanides)",
    dates: "1194–1270",
    era: "Rishon",
    location: "Girona, Spain; later Eretz Israel",
    teachers: ["Rabbenu Yonah", "Rabbi Yehuda ben Yakar"],
    keyTeaching: "The Torah contains hidden meanings beyond the literal",
    methodology: "Kabbalistic insights; defends tradition against Rambam's rationalism"
  },
  "אבן עזרא": {
    english: "Ibn Ezra",
    fullName: "Rabbi Avraham ibn Ezra",
    dates: "1089–1167",
    era: "Rishon",
    location: "Spain, Italy, France, England (wandering)",
    keyTeaching: "The peshat (plain meaning) is the foundation of all interpretation",
    methodology: "Grammatical analysis; rational approach; hints at critical insights"
  },
  "רשב״א": {
    english: "Rashba",
    fullName: "Rabbi Shlomo ben Aderet",
    dates: "1235–1310",
    era: "Rishon",
    location: "Barcelona, Spain",
    teachers: ["Ramban", "Rabbenu Yonah"],
    keyTeaching: "Thousands of responsa on practical halacha",
    methodology: "Comprehensive Talmud commentary; major posek"
  },
  "ריטב״א": {
    english: "Ritva",
    fullName: "Rabbi Yom Tov ben Avraham Asevilli",
    dates: "1250–1330",
    era: "Rishon",
    location: "Seville, Spain",
    teachers: ["Rashba", "Re'ah"],
    keyTeaching: "Clarity in explaining Talmudic dialectics",
    methodology: "Clear, methodical Talmud commentary"
  },
  "ר״ן": {
    english: "Ran",
    fullName: "Rabbenu Nissim ben Reuven Gerondi",
    dates: "1320–1380",
    era: "Rishon",
    location: "Barcelona and Girona, Spain",
    teachers: ["Rabbenu Peretz HaKohen"],
    keyTeaching: "Comprehensive halachic analysis",
    methodology: "Commentary on Rif; Drashot (sermons)"
  },
  "מאירי": {
    english: "Meiri",
    fullName: "Rabbi Menachem ben Shlomo Meiri",
    dates: "1249–1315",
    era: "Rishon",
    location: "Perpignan, Provence",
    keyTeaching: "Beit HaBechirah - encyclopedic Talmud commentary",
    methodology: "Comprehensive summaries; respectful of other religions"
  }
};

/**
 * Lookup rabbi by Hebrew or English name
 */
export function findRabbi(name) {
  // Direct Hebrew lookup
  if (RABBIS[name]) return { key: name, ...RABBIS[name] };

  // Search by English name
  for (const [key, data] of Object.entries(RABBIS)) {
    if (data.english.toLowerCase() === name.toLowerCase() ||
        data.fullName?.toLowerCase().includes(name.toLowerCase())) {
      return { key, ...data };
    }
  }

  return null;
}

/**
 * Get all rabbi names (Hebrew) for text matching
 */
export function getAllRabbiNames() {
  const names = new Set();
  for (const [key] of Object.entries(RABBIS)) {
    names.add(key);
    // Add common variations
    if (key.includes('רבי')) {
      names.add(key.replace('רבי ', 'ר\' '));
      names.add(key.replace('רבי ', "ר'"));
    }
  }
  return Array.from(names);
}

/**
 * Create regex pattern for matching rabbi names in text
 */
export function createRabbiMatcher() {
  const names = getAllRabbiNames().sort((a, b) => b.length - a.length); // Longest first
  const pattern = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`(${pattern})`, 'g');
}

export default RABBIS;
