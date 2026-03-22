/**
 * CAL - Comprehensive Aramaic Lexicon Local Data
 * Source: Comprehensive Aramaic Lexicon Project (HUC)
 *
 * Contains common Aramaic vocabulary from:
 * - Biblical Aramaic (BA)
 * - Targumic Aramaic (Tg)
 * - Talmudic/Rabbinic Aramaic (JBA, JPA)
 * - Syriac (Syr)
 */

export const CAL_ARAMAIC = {
  // Hebrew-Aramaic Shared Roots (Biblical & Talmudic)
  "ברא": {
    lemma: "ברא",
    cal: "br)",
    pos: "verb",
    definition: "to create; (Aram.) to be outside, external",
    dialects: ["BA", "JBA", "Tg"],
    forms: ["ברא", "בריא", "ברי", "בראת"],
    hebrew: "ברא",
    notes: "In Aramaic also means 'son' (בר) or 'outside' (בר/ברא)",
    related: ["בר", "ברייתא"]
  },
  "בר": {
    lemma: "בר",
    cal: "br",
    pos: "noun",
    definition: "son; outside, external; (construct) son of",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["בר", "בריה", "בני", "בנין", "ברא"],
    hebrew: "בן",
    notes: "Very common - בר נש (son of man), ברייתא (external teaching)"
  },
  "מלך": {
    lemma: "מלך",
    cal: "mlk",
    pos: "verb/noun",
    definition: "(v.) to reign, rule; (n.) king",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["מלך", "מלכא", "מלכי", "מלכין"],
    hebrew: "מלך",
    related: ["מלכותא", "מלכא"]
  },
  "כתב": {
    lemma: "כתב",
    cal: "ktb",
    pos: "verb",
    definition: "to write",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["כתב", "כתיב", "כתבי", "כתבת"],
    hebrew: "כתב",
    related: ["כתובה", "כתבא"]
  },
  "עשה": {
    lemma: "עבד",
    cal: "(bd",
    pos: "verb",
    definition: "to do, make (Aramaic עבד = Hebrew עשה)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["עבד", "עביד", "עבדי", "עבדת"],
    hebrew: "עשה",
    notes: "Aramaic עבד corresponds to Hebrew עשה"
  },
  "דבר": {
    lemma: "מילתא",
    cal: "mylt)",
    pos: "noun",
    definition: "word, matter, thing (Aramaic מילתא = Hebrew דבר)",
    dialects: ["JBA", "JPA"],
    forms: ["מילתא", "מילי", "מילין"],
    hebrew: "דבר"
  },
  "ראה": {
    lemma: "חזא",
    cal: "xz)",
    pos: "verb",
    definition: "to see (Aramaic חזא = Hebrew ראה)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["חזא", "חזי", "חזינן", "חזית"],
    hebrew: "ראה"
  },
  "שמע": {
    lemma: "שמע",
    cal: "$m(",
    pos: "verb",
    definition: "to hear, listen, obey",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["שמע", "שמעי", "שמעת", "שמעינן"],
    hebrew: "שמע",
    related: ["שמעתא", "שמעתתא"]
  },
  "לקח": {
    lemma: "נסב",
    cal: "nsb",
    pos: "verb",
    definition: "to take (Aramaic נסב = Hebrew לקח)",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["נסב", "נסיב", "נסבי", "נסיבנא"],
    hebrew: "לקח"
  },
  "נתן": {
    lemma: "יהב",
    cal: "yhb",
    pos: "verb",
    definition: "to give (Aramaic יהב = Hebrew נתן)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["יהב", "יהיב", "יהבי", "יהבינן"],
    hebrew: "נתן"
  },
  "הלך": {
    lemma: "אזל",
    cal: ")zl",
    pos: "verb",
    definition: "to go, walk (Aramaic אזל = Hebrew הלך)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אזל", "אזיל", "אזלי", "אזלינן"],
    hebrew: "הלך"
  },
  "בא": {
    lemma: "אתא",
    cal: ")t)",
    pos: "verb",
    definition: "to come (Aramaic אתא = Hebrew בא)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אתא", "אתי", "אתו", "אתינן"],
    hebrew: "בא"
  },
  "ישב": {
    lemma: "יתב",
    cal: "ytb",
    pos: "verb",
    definition: "to sit, dwell (Aramaic יתב = Hebrew ישב)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["יתב", "יתיב", "יתבי", "מותבינן"],
    hebrew: "ישב"
  },
  "יצא": {
    lemma: "נפק",
    cal: "npq",
    pos: "verb",
    definition: "to go out, exit (Aramaic נפק = Hebrew יצא)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["נפק", "נפיק", "נפקי", "נפקא מינה"],
    hebrew: "יצא",
    notes: "נפקא מינה = practical difference"
  },
  "אדם": {
    lemma: "נש",
    cal: "n$",
    pos: "noun",
    definition: "man, person (בר נש = son of man)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["נש", "אינש", "אנשא", "בר נש"],
    hebrew: "אדם/איש"
  },
  "אש": {
    lemma: "נורא",
    cal: "nwr)",
    pos: "noun",
    definition: "fire (Aramaic נורא = Hebrew אש)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["נורא", "נורי"],
    hebrew: "אש"
  },
  "מים": {
    lemma: "מיא",
    cal: "my)",
    pos: "noun",
    definition: "water (Aramaic מיא = Hebrew מים)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["מיא", "מיין"],
    hebrew: "מים"
  },
  "שמים": {
    lemma: "שמיא",
    cal: "$my)",
    pos: "noun",
    definition: "heaven, sky (Aramaic שמיא = Hebrew שמים)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["שמיא", "שמי שמיא"],
    hebrew: "שמים"
  },
  "ארץ": {
    lemma: "ארעא",
    cal: ")r()",
    pos: "noun",
    definition: "land, earth (Aramaic ארעא = Hebrew ארץ)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ארעא", "ארעתא"],
    hebrew: "ארץ"
  },
  "יום": {
    lemma: "יומא",
    cal: "ywm)",
    pos: "noun",
    definition: "day (Aramaic יומא = Hebrew יום)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["יומא", "יומי", "יומין"],
    hebrew: "יום",
    notes: "Tractate יומא deals with Yom Kippur"
  },
  "לילה": {
    lemma: "ליליא",
    cal: "lyly)",
    pos: "noun",
    definition: "night (Aramaic ליליא = Hebrew לילה)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ליליא", "לילותא", "לילי"],
    hebrew: "לילה"
  },
  "בית": {
    lemma: "ביתא",
    cal: "byt)",
    pos: "noun",
    definition: "house, home (Aramaic ביתא = Hebrew בית)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ביתא", "בי", "בתי"],
    hebrew: "בית",
    notes: "בי רב = school of the rabbi"
  },
  "אב": {
    lemma: "אבא",
    cal: ")b)",
    pos: "noun",
    definition: "father (Aramaic אבא = Hebrew אב)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אבא", "אבוה", "אבהן"],
    hebrew: "אב",
    notes: "Also title of respect for sages"
  },
  "אם": {
    lemma: "אימא",
    cal: ")ym)",
    pos: "noun",
    definition: "mother (Aramaic אימא = Hebrew אם)",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["אימא", "אימיה", "אימהתא"],
    hebrew: "אם"
  },
  "בן": {
    lemma: "בר",
    cal: "br",
    pos: "noun",
    definition: "son (Aramaic בר = Hebrew בן)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["בר", "בריה", "בני", "בנין"],
    hebrew: "בן"
  },
  "בת": {
    lemma: "ברתא",
    cal: "brt)",
    pos: "noun",
    definition: "daughter (Aramaic ברתא = Hebrew בת)",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["ברתא", "ברתיה", "בנתא"],
    hebrew: "בת"
  },
  "איש": {
    lemma: "גברא",
    cal: "gbr)",
    pos: "noun",
    definition: "man, husband (Aramaic גברא = Hebrew איש)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["גברא", "גברי", "גוברין"],
    hebrew: "איש"
  },
  "אשה": {
    lemma: "איתתא",
    cal: ")ytt)",
    pos: "noun",
    definition: "woman, wife (Aramaic איתתא = Hebrew אשה)",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["איתתא", "איתתיה", "נשי"],
    hebrew: "אשה"
  },
  "לב": {
    lemma: "לבא",
    cal: "lb)",
    pos: "noun",
    definition: "heart, mind (Aramaic לבא = Hebrew לב)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["לבא", "לביה", "לבוותא"],
    hebrew: "לב"
  },
  "יד": {
    lemma: "ידא",
    cal: "yd)",
    pos: "noun",
    definition: "hand (Aramaic ידא = Hebrew יד)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ידא", "ידיה", "ידין"],
    hebrew: "יד"
  },
  "עין": {
    lemma: "עינא",
    cal: "(yn)",
    pos: "noun",
    definition: "eye (Aramaic עינא = Hebrew עין)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["עינא", "עיניה", "עינין"],
    hebrew: "עין"
  },
  "פה": {
    lemma: "פומא",
    cal: "pwm)",
    pos: "noun",
    definition: "mouth (Aramaic פומא = Hebrew פה)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["פומא", "פומיה"],
    hebrew: "פה"
  },
  "ראש": {
    lemma: "רישא",
    cal: "ry$)",
    pos: "noun",
    definition: "head, beginning (Aramaic רישא = Hebrew ראש)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["רישא", "רישיה", "רישי"],
    hebrew: "ראש"
  },
  "רגל": {
    lemma: "רגלא",
    cal: "rgl)",
    pos: "noun",
    definition: "foot, leg (Aramaic רגלא = Hebrew רגל)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["רגלא", "רגליה", "רגלין"],
    hebrew: "רגל"
  },
  "נפש": {
    lemma: "נפשא",
    cal: "np$)",
    pos: "noun",
    definition: "soul, self (Aramaic נפשא = Hebrew נפש)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["נפשא", "נפשיה", "נפשתא"],
    hebrew: "נפש"
  },
  "עולם": {
    lemma: "עלמא",
    cal: "(lm)",
    pos: "noun",
    definition: "world, eternity (Aramaic עלמא = Hebrew עולם)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["עלמא", "עלמין", "לעלם"],
    hebrew: "עולם"
  },
  "טוב": {
    lemma: "טבא",
    cal: "Tb)",
    pos: "adj",
    definition: "good (Aramaic טבא = Hebrew טוב)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["טבא", "טב", "טבין"],
    hebrew: "טוב"
  },
  "רע": {
    lemma: "בישא",
    cal: "by$)",
    pos: "adj",
    definition: "bad, evil (Aramaic בישא = Hebrew רע)",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["בישא", "ביש", "בישין"],
    hebrew: "רע"
  },
  "גדול": {
    lemma: "רבא",
    cal: "rb)",
    pos: "adj",
    definition: "great, large (Aramaic רבא = Hebrew גדול)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["רבא", "רבה", "רברבין"],
    hebrew: "גדול",
    notes: "Also means teacher, master"
  },
  "קטן": {
    lemma: "זעירא",
    cal: "z(yr)",
    pos: "adj",
    definition: "small, little (Aramaic זעירא = Hebrew קטן)",
    dialects: ["JBA", "JPA"],
    forms: ["זעירא", "זעירי"],
    hebrew: "קטן"
  },
  "אחד": {
    lemma: "חד",
    cal: "xd",
    pos: "numeral",
    definition: "one (Aramaic חד = Hebrew אחד)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["חד", "חדא"],
    hebrew: "אחד"
  },
  "שנים": {
    lemma: "תרי",
    cal: "try",
    pos: "numeral",
    definition: "two (Aramaic תרי = Hebrew שנים)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["תרי", "תרין", "תרתי"],
    hebrew: "שנים"
  },
  "שלוש": {
    lemma: "תלת",
    cal: "tlt",
    pos: "numeral",
    definition: "three (Aramaic תלת = Hebrew שלוש)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["תלת", "תלתא"],
    hebrew: "שלוש"
  },

  // Common Talmudic/Rabbinic Terms
  "אמר": {
    lemma: "אמר",
    cal: ")mr",
    pos: "verb",
    definition: "to say, speak, tell",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אמר", "אמרי", "אמרת", "אמרינן", "אמרו"],
    related: ["מאמר", "אימרא"]
  },
  "הוה": {
    lemma: "הוה",
    cal: "hwh",
    pos: "verb",
    definition: "to be, exist, become, happen",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["הוה", "הוי", "הויא", "הוו", "להוי"],
    notes: "Auxiliary verb in periphrastic constructions"
  },
  "אית": {
    lemma: "אית",
    cal: ")yt",
    pos: "particle",
    definition: "there is, there are; to have (with ל)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אית", "אית ליה", "אית להו"],
    opposite: "לית"
  },
  "לית": {
    lemma: "לית",
    cal: "lyt",
    pos: "particle",
    definition: "there is not, there are not; to not have",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["לית", "לית ליה", "ליתא"],
    opposite: "אית"
  },
  "מאי": {
    lemma: "מאי",
    cal: "m)y",
    pos: "interrogative",
    definition: "what? why?",
    dialects: ["JBA", "JPA"],
    forms: ["מאי", "מאי טעמא", "מאי שנא"],
    hebrew: "מה"
  },
  "היכי": {
    lemma: "היכי",
    cal: "hyky",
    pos: "interrogative",
    definition: "how? in what manner?",
    dialects: ["JBA"],
    forms: ["היכי", "היכי דמי", "היכי עביד"],
    hebrew: "איך"
  },
  "הכי": {
    lemma: "הכי",
    cal: "hky",
    pos: "adverb",
    definition: "thus, so, in this way",
    dialects: ["JBA", "JPA"],
    forms: ["הכי", "הכי נמי", "אי הכי"],
    hebrew: "כך"
  },
  "תנא": {
    lemma: "תנא",
    cal: "tn)",
    pos: "noun/verb",
    definition: "1. (n.) Tanna, teacher of Mishnah; 2. (v.) to teach, recite tradition",
    dialects: ["JBA", "JPA"],
    forms: ["תנא", "תנאי", "תנן", "תניא"],
    related: ["מתניתא", "תנינא"]
  },
  "אמורא": {
    lemma: "אמורא",
    cal: ")mwr)",
    pos: "noun",
    definition: "Amora, interpreter; Talmudic sage",
    dialects: ["JBA", "JPA"],
    forms: ["אמורא", "אמוראי", "אמוראים"],
    related: ["אמר"]
  },
  "גמרא": {
    lemma: "גמרא",
    cal: "gmr)",
    pos: "noun",
    definition: "1. learning, study; 2. Gemara, Talmudic discussion",
    dialects: ["JBA", "JPA"],
    forms: ["גמרא", "גמירי"],
    root: "גמר"
  },
  "משנה": {
    lemma: "משנה",
    cal: "m$nh",
    pos: "noun",
    definition: "Mishnah; teaching, tradition",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["משנה", "משניות"],
    root: "שנה"
  },
  "ברייתא": {
    lemma: "ברייתא",
    cal: "bryyt)",
    pos: "noun",
    definition: "Baraita, external teaching not in Mishnah",
    dialects: ["JBA"],
    forms: ["ברייתא", "ברייתות"],
    related: ["בר", "חיצון"]
  },
  "הלכה": {
    lemma: "הלכה",
    cal: "hlkh",
    pos: "noun",
    definition: "law, legal ruling, accepted practice",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["הלכה", "הלכתא", "הלכות"],
    root: "הלך"
  },
  "אגדה": {
    lemma: "אגדה",
    cal: ")gdh",
    pos: "noun",
    definition: "Aggadah, non-legal narrative, homily",
    dialects: ["JBA", "JPA"],
    forms: ["אגדה", "אגדתא", "אגדות"],
    root: "נגד"
  },

  // Talmudic Discussion Terms
  "קשיא": {
    lemma: "קשיא",
    cal: "q$y)",
    pos: "noun/adj",
    definition: "difficulty, objection; it is difficult",
    dialects: ["JBA"],
    forms: ["קשיא", "קושיא", "קשיין"],
    root: "קשה"
  },
  "תיובתא": {
    lemma: "תיובתא",
    cal: "tywbt)",
    pos: "noun",
    definition: "refutation, conclusive objection",
    dialects: ["JBA"],
    forms: ["תיובתא", "תיובתיה"],
    root: "תוב"
  },
  "פירוקא": {
    lemma: "פירוקא",
    cal: "pyrwq)",
    pos: "noun",
    definition: "solution, resolution, answer",
    dialects: ["JBA"],
    forms: ["פירוקא", "פירוקי"],
    root: "פרק"
  },
  "סברא": {
    lemma: "סברא",
    cal: "sbr)",
    pos: "noun",
    definition: "reasoning, logical deduction, opinion",
    dialects: ["JBA", "JPA"],
    forms: ["סברא", "סברי", "סבירא ליה"],
    root: "סבר"
  },
  "שמעתא": {
    lemma: "שמעתא",
    cal: "$m(t)",
    pos: "noun",
    definition: "teaching, tradition; Talmudic discussion",
    dialects: ["JBA"],
    forms: ["שמעתא", "שמעתתא"],
    root: "שמע"
  },
  "מימרא": {
    lemma: "מימרא",
    cal: "mymr)",
    pos: "noun",
    definition: "statement, saying, dictum",
    dialects: ["JBA", "Tg"],
    forms: ["מימרא", "מימרי"],
    root: "אמר"
  },
  "פלוגתא": {
    lemma: "פלוגתא",
    cal: "plwgt)",
    pos: "noun",
    definition: "dispute, disagreement, controversy",
    dialects: ["JBA"],
    forms: ["פלוגתא", "פלוגתייהו"],
    root: "פלג"
  },

  // Common Verbs
  "עבד": {
    lemma: "עבד",
    cal: "(bd",
    pos: "verb",
    definition: "to do, make, act, work",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["עבד", "עביד", "עבדי", "עבדינן"],
    related: ["עובדא", "עבידתא"]
  },
  "יהב": {
    lemma: "יהב",
    cal: "yhb",
    pos: "verb",
    definition: "to give, place, set",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["יהב", "יהיב", "יהבי", "יהבינן"],
    hebrew: "נתן"
  },
  "נסב": {
    lemma: "נסב",
    cal: "nsb",
    pos: "verb",
    definition: "to take, marry, receive",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["נסב", "נסיב", "נסבי", "נסיבנא"],
    hebrew: "לקח"
  },
  "אזל": {
    lemma: "אזל",
    cal: ")zl",
    pos: "verb",
    definition: "to go, walk, proceed",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אזל", "אזיל", "אזלי", "אזלינן"],
    hebrew: "הלך"
  },
  "אתא": {
    lemma: "אתא",
    cal: ")t)",
    pos: "verb",
    definition: "to come, arrive",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אתא", "אתי", "אתו", "אתינן"],
    hebrew: "בא"
  },
  "חזא": {
    lemma: "חזא",
    cal: "xz)",
    pos: "verb",
    definition: "to see, perceive, understand",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["חזא", "חזי", "חזינן", "חזיתיה"],
    hebrew: "ראה"
  },
  "ידע": {
    lemma: "ידע",
    cal: "yd(",
    pos: "verb",
    definition: "to know, understand, recognize",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ידע", "ידעי", "ידעינן", "ידעת"],
    hebrew: "ידע"
  },
  "בעא": {
    lemma: "בעא",
    cal: "b()",
    pos: "verb",
    definition: "to seek, ask, request, want",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["בעא", "בעי", "בעינן", "מיבעיא"],
    hebrew: "בקש"
  },
  "קרא": {
    lemma: "קרא",
    cal: "qr)",
    pos: "verb",
    definition: "to read, call, recite Scripture",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["קרא", "קרי", "קרינן"],
    related: ["קריאה", "מקרא"]
  },
  "נפק": {
    lemma: "נפק",
    cal: "npq",
    pos: "verb",
    definition: "to go out, exit, derive",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["נפק", "נפיק", "נפקי", "נפקא מינה"],
    hebrew: "יצא"
  },
  "עאל": {
    lemma: "עאל",
    cal: "(l",
    pos: "verb",
    definition: "to enter, go in",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["עאל", "עייל", "עיילי"],
    hebrew: "בא/נכנס"
  },
  "יתב": {
    lemma: "יתב",
    cal: "ytb",
    pos: "verb",
    definition: "to sit, dwell, settle",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["יתב", "יתיב", "יתבי", "מותבינן"],
    hebrew: "ישב"
  },
  "קום": {
    lemma: "קום",
    cal: "qwm",
    pos: "verb",
    definition: "to stand, rise, establish",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["קם", "קאי", "קיימי", "קיימא"],
    hebrew: "קם"
  },
  "אכל": {
    lemma: "אכל",
    cal: ")kl",
    pos: "verb",
    definition: "to eat, consume",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אכל", "אכיל", "אכלי"],
    hebrew: "אכל"
  },
  "שתא": {
    lemma: "שתא",
    cal: "$t)",
    pos: "verb",
    definition: "to drink",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["שתא", "שתי", "שתינן"],
    hebrew: "שתה"
  },
  "קטל": {
    lemma: "קטל",
    cal: "qTl",
    pos: "verb",
    definition: "to kill, execute",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["קטל", "קטיל", "קטלי"],
    hebrew: "הרג"
  },
  "שרי": {
    lemma: "שרי",
    cal: "$ry",
    pos: "verb",
    definition: "to permit, begin, loosen",
    dialects: ["JBA", "JPA"],
    forms: ["שרי", "שריא", "שרו"],
    opposite: "אסר"
  },
  "אסר": {
    lemma: "אסר",
    cal: ")sr",
    pos: "verb",
    definition: "to forbid, prohibit, bind",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אסר", "אסיר", "אסרי", "אסירא"],
    opposite: "שרי"
  },

  // Common Nouns
  "מילתא": {
    lemma: "מילתא",
    cal: "mylt)",
    pos: "noun",
    definition: "word, matter, thing, case",
    dialects: ["JBA", "JPA"],
    forms: ["מילתא", "מילי", "מילין"],
    hebrew: "דבר"
  },
  "עובדא": {
    lemma: "עובדא",
    cal: "(wbd)",
    pos: "noun",
    definition: "incident, story, case; deed, action",
    dialects: ["JBA", "JPA"],
    forms: ["עובדא", "עובדי"],
    root: "עבד"
  },
  "גברא": {
    lemma: "גברא",
    cal: "gbr)",
    pos: "noun",
    definition: "man, person, husband",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["גברא", "גברי", "גוברין"],
    hebrew: "איש"
  },
  "איתתא": {
    lemma: "איתתא",
    cal: ")ytt)",
    pos: "noun",
    definition: "woman, wife",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["איתתא", "איתתיה", "נשי"],
    hebrew: "אשה"
  },
  "ברתא": {
    lemma: "ברתא",
    cal: "brt)",
    pos: "noun",
    definition: "daughter",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["ברתא", "ברתיה", "בנתא"],
    hebrew: "בת"
  },
  "אבא": {
    lemma: "אבא",
    cal: ")b)",
    pos: "noun",
    definition: "father; title of respect",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אבא", "אבוה", "אבהן"],
    hebrew: "אב"
  },
  "אימא": {
    lemma: "אימא",
    cal: ")ym)",
    pos: "noun",
    definition: "mother",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["אימא", "אימיה", "אימהתא"],
    hebrew: "אם"
  },
  "ביתא": {
    lemma: "ביתא",
    cal: "byt)",
    pos: "noun",
    definition: "house, home; school",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ביתא", "בי", "בתי"],
    hebrew: "בית"
  },
  "ארעא": {
    lemma: "ארעא",
    cal: ")r()",
    pos: "noun",
    definition: "land, earth, ground",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ארעא", "ארעתא"],
    hebrew: "ארץ"
  },
  "שמיא": {
    lemma: "שמיא",
    cal: "$my)",
    pos: "noun",
    definition: "heaven, sky",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["שמיא", "שמי שמיא"],
    hebrew: "שמים"
  },
  "מיא": {
    lemma: "מיא",
    cal: "my)",
    pos: "noun",
    definition: "water",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["מיא", "מיין"],
    hebrew: "מים"
  },
  "נורא": {
    lemma: "נורא",
    cal: "nwr)",
    pos: "noun",
    definition: "fire",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["נורא", "נורי"],
    hebrew: "אש"
  },
  "יומא": {
    lemma: "יומא",
    cal: "ywm)",
    pos: "noun",
    definition: "day",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["יומא", "יומי", "יומין"],
    hebrew: "יום"
  },
  "ליליא": {
    lemma: "ליליא",
    cal: "lyly)",
    pos: "noun",
    definition: "night",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ליליא", "לילותא"],
    hebrew: "לילה"
  },
  "עלמא": {
    lemma: "עלמא",
    cal: "(lm)",
    pos: "noun",
    definition: "world, eternity",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["עלמא", "עלמין", "לעלם"],
    hebrew: "עולם"
  },
  "נפשא": {
    lemma: "נפשא",
    cal: "np$)",
    pos: "noun",
    definition: "soul, self, person, life",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["נפשא", "נפשיה", "נפשתא"],
    hebrew: "נפש"
  },
  "לבא": {
    lemma: "לבא",
    cal: "lb)",
    pos: "noun",
    definition: "heart, mind",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["לבא", "לביה", "לבוותא"],
    hebrew: "לב"
  },
  "ידא": {
    lemma: "ידא",
    cal: "yd)",
    pos: "noun",
    definition: "hand, power",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ידא", "ידיה", "ידין"],
    hebrew: "יד"
  },
  "רגלא": {
    lemma: "רגלא",
    cal: "rgl)",
    pos: "noun",
    definition: "foot, leg",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["רגלא", "רגליה", "רגלין"],
    hebrew: "רגל"
  },
  "עינא": {
    lemma: "עינא",
    cal: "(yn)",
    pos: "noun",
    definition: "eye, spring",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["עינא", "עיניה", "עינין"],
    hebrew: "עין"
  },
  "פומא": {
    lemma: "פומא",
    cal: "pwm)",
    pos: "noun",
    definition: "mouth",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["פומא", "פומיה"],
    hebrew: "פה"
  },
  "רישא": {
    lemma: "רישא",
    cal: "ry$)",
    pos: "noun",
    definition: "head, beginning, chapter",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["רישא", "רישיה", "רישי"],
    hebrew: "ראש"
  },
  "מלכא": {
    lemma: "מלכא",
    cal: "mlk)",
    pos: "noun",
    definition: "king",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["מלכא", "מלכי", "מלכין"],
    hebrew: "מלך"
  },
  "מלכותא": {
    lemma: "מלכותא",
    cal: "mlkwt)",
    pos: "noun",
    definition: "kingdom, reign, sovereignty",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["מלכותא", "מלכוותא"],
    hebrew: "מלכות"
  },
  "רבא": {
    lemma: "רבא",
    cal: "rb)",
    pos: "adj/noun",
    definition: "great, large; master, teacher",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["רבא", "רבה", "רברבין"],
    hebrew: "גדול/רב"
  },
  "זעירא": {
    lemma: "זעירא",
    cal: "z(yr)",
    pos: "adj",
    definition: "small, little, young",
    dialects: ["JBA", "JPA"],
    forms: ["זעירא", "זעירי"],
    hebrew: "קטן"
  },
  "טבא": {
    lemma: "טבא",
    cal: "Tb)",
    pos: "adj",
    definition: "good, well",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["טבא", "טב", "טבין"],
    hebrew: "טוב"
  },
  "בישא": {
    lemma: "בישא",
    cal: "by$)",
    pos: "adj",
    definition: "bad, evil",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["בישא", "ביש", "בישין"],
    hebrew: "רע"
  },

  // Legal/Halachic Terms
  "דינא": {
    lemma: "דינא",
    cal: "dyn)",
    pos: "noun",
    definition: "law, judgment, case",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["דינא", "דיני", "דינין"],
    hebrew: "דין"
  },
  "דיינא": {
    lemma: "דיינא",
    cal: "dyyn)",
    pos: "noun",
    definition: "judge",
    dialects: ["JBA", "JPA"],
    forms: ["דיינא", "דייני", "דיינין"],
    hebrew: "דיין"
  },
  "חיובא": {
    lemma: "חיובא",
    cal: "xywb)",
    pos: "noun",
    definition: "obligation, liability, debt",
    dialects: ["JBA"],
    forms: ["חיובא", "חיובי"],
    root: "חיב"
  },
  "פטורא": {
    lemma: "פטורא",
    cal: "pTwr)",
    pos: "noun",
    definition: "exemption, acquittal",
    dialects: ["JBA"],
    forms: ["פטורא", "פטורי"],
    root: "פטר"
  },
  "איסורא": {
    lemma: "איסורא",
    cal: ")yswr)",
    pos: "noun",
    definition: "prohibition, forbidden thing",
    dialects: ["JBA"],
    forms: ["איסורא", "איסורי"],
    root: "אסר"
  },
  "היתרא": {
    lemma: "היתרא",
    cal: "hytr)",
    pos: "noun",
    definition: "permission, permitted thing",
    dialects: ["JBA"],
    forms: ["היתרא", "היתרי"],
    root: "נתר"
  },
  "ממונא": {
    lemma: "ממונא",
    cal: "mmwn)",
    pos: "noun",
    definition: "money, property, monetary matters",
    dialects: ["JBA", "JPA"],
    forms: ["ממונא", "ממוני"],
    hebrew: "ממון"
  },
  "נזיקין": {
    lemma: "נזיקין",
    cal: "nzyqyn",
    pos: "noun",
    definition: "damages, torts",
    dialects: ["JBA", "JPA"],
    forms: ["נזיקין", "נזק"],
    root: "נזק"
  },
  "שבועה": {
    lemma: "שבועה",
    cal: "$bw(h",
    pos: "noun",
    definition: "oath, vow",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["שבועה", "שבועתא"],
    root: "שבע"
  },
  "עדות": {
    lemma: "עדות",
    cal: "(dwt",
    pos: "noun",
    definition: "testimony, witness",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["עדות", "סהדותא"],
    hebrew: "עדות"
  },
  "סהדא": {
    lemma: "סהדא",
    cal: "shd)",
    pos: "noun",
    definition: "witness",
    dialects: ["JBA", "JPA"],
    forms: ["סהדא", "סהדי", "סהדין"],
    hebrew: "עד"
  },
  "זכותא": {
    lemma: "זכותא",
    cal: "zkwt)",
    pos: "noun",
    definition: "merit, right, acquittal",
    dialects: ["JBA", "JPA"],
    forms: ["זכותא", "זכוותא"],
    root: "זכה"
  },
  "חובה": {
    lemma: "חובה",
    cal: "xwbh",
    pos: "noun",
    definition: "guilt, liability, obligation",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["חובה", "חובתא"],
    root: "חוב"
  },
  "קנין": {
    lemma: "קנין",
    cal: "qnyn",
    pos: "noun",
    definition: "acquisition, property, kinyan",
    dialects: ["JBA", "JPA"],
    forms: ["קנין", "קנייני"],
    root: "קנה"
  },

  // Particles and Connectives
  "ד": {
    lemma: "ד",
    cal: "d",
    pos: "particle",
    definition: "of, which, that, who (relative particle)",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ד", "די", "דהא"],
    hebrew: "ש/אשר"
  },
  "הא": {
    lemma: "הא",
    cal: "h)",
    pos: "particle",
    definition: "behold, here is, this",
    dialects: ["JBA", "JPA"],
    forms: ["הא", "הך"],
    hebrew: "הנה/זה"
  },
  "אלא": {
    lemma: "אלא",
    cal: ")l)",
    pos: "conjunction",
    definition: "but, rather, except",
    dialects: ["JBA", "JPA"],
    forms: ["אלא", "אלא מאי"],
    hebrew: "אלא"
  },
  "דלמא": {
    lemma: "דלמא",
    cal: "dlm)",
    pos: "adverb",
    definition: "perhaps, lest, maybe",
    dialects: ["JBA"],
    forms: ["דלמא"],
    hebrew: "שמא/פן"
  },
  "השתא": {
    lemma: "השתא",
    cal: "h$t)",
    pos: "adverb",
    definition: "now, at this time",
    dialects: ["JBA", "JPA"],
    forms: ["השתא"],
    hebrew: "עכשיו"
  },
  "לעולם": {
    lemma: "לעולם",
    cal: "l(wlm",
    pos: "adverb",
    definition: "always, forever; actually (in dialectic)",
    dialects: ["JBA"],
    forms: ["לעולם"],
    hebrew: "לעולם"
  },
  "ודאי": {
    lemma: "ודאי",
    cal: "wd)y",
    pos: "adverb",
    definition: "certainly, definitely",
    dialects: ["JBA", "JPA"],
    forms: ["ודאי"],
    hebrew: "ודאי"
  },
  "מיהו": {
    lemma: "מיהו",
    cal: "myhw",
    pos: "adverb",
    definition: "however, nevertheless, anyway",
    dialects: ["JBA"],
    forms: ["מיהו", "מיהא"],
    hebrew: "מכל מקום"
  },
  "נמי": {
    lemma: "נמי",
    cal: "nmy",
    pos: "adverb",
    definition: "also, too, likewise",
    dialects: ["JBA"],
    forms: ["נמי", "הכי נמי"],
    hebrew: "גם"
  },
  "תו": {
    lemma: "תו",
    cal: "tw",
    pos: "adverb",
    definition: "again, further, anymore",
    dialects: ["JBA"],
    forms: ["תו", "תו לא"],
    hebrew: "עוד"
  },
  "כולי": {
    lemma: "כולי",
    cal: "kwly",
    pos: "adjective",
    definition: "all, every",
    dialects: ["JBA", "JPA"],
    forms: ["כולי", "כולה", "כולהו"],
    hebrew: "כל"
  },

  // Religious/Ritual Terms
  "קדושה": {
    lemma: "קדושה",
    cal: "qdw$h",
    pos: "noun",
    definition: "holiness, sanctification",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["קדושה", "קדושתא"],
    root: "קדש"
  },
  "טומאה": {
    lemma: "טומאה",
    cal: "Twm)h",
    pos: "noun",
    definition: "impurity, ritual uncleanness",
    dialects: ["JBA", "JPA"],
    forms: ["טומאה", "טומאתא"],
    root: "טמא"
  },
  "טהרה": {
    lemma: "טהרה",
    cal: "Thrh",
    pos: "noun",
    definition: "purity, ritual cleanness",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["טהרה", "טהרתא"],
    root: "טהר"
  },
  "קרבנא": {
    lemma: "קרבנא",
    cal: "qrbn)",
    pos: "noun",
    definition: "sacrifice, offering",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["קרבנא", "קרבני", "קרבנות"],
    hebrew: "קרבן"
  },
  "מצוה": {
    lemma: "מצוה",
    cal: "mcwh",
    pos: "noun",
    definition: "commandment, religious duty",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["מצוה", "מצוותא", "מצוות"],
    root: "צוה"
  },
  "עבירה": {
    lemma: "עבירה",
    cal: "(byrh",
    pos: "noun",
    definition: "sin, transgression",
    dialects: ["JBA", "JPA"],
    forms: ["עבירה", "עבירתא", "עבירות"],
    root: "עבר"
  },
  "תשובה": {
    lemma: "תשובה",
    cal: "t$wbh",
    pos: "noun",
    definition: "repentance; answer, response",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["תשובה", "תשובתא"],
    root: "שוב"
  },
  "תפילה": {
    lemma: "תפילה",
    cal: "tplyh",
    pos: "noun",
    definition: "prayer",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["תפילה", "תפילתא", "צלותא"],
    root: "פלל"
  },
  "ברכה": {
    lemma: "ברכה",
    cal: "brkh",
    pos: "noun",
    definition: "blessing, benediction",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["ברכה", "ברכתא", "ברכות"],
    root: "ברך"
  },
  "שבתא": {
    lemma: "שבתא",
    cal: "$bt)",
    pos: "noun",
    definition: "Sabbath",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["שבתא", "שבתות"],
    hebrew: "שבת"
  },
  "מועדא": {
    lemma: "מועדא",
    cal: "mw(d)",
    pos: "noun",
    definition: "festival, appointed time",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["מועדא", "מועדי", "מועדיא"],
    hebrew: "מועד"
  },
  "פסחא": {
    lemma: "פסחא",
    cal: "psx)",
    pos: "noun",
    definition: "Passover",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["פסחא"],
    hebrew: "פסח"
  },
  "סוכה": {
    lemma: "סוכה",
    cal: "swkh",
    pos: "noun",
    definition: "booth, tabernacle, sukkah",
    dialects: ["JBA", "JPA", "Tg"],
    forms: ["סוכה", "סוכתא", "מטללתא"],
    hebrew: "סוכה"
  },

  // Biblical Aramaic (Daniel, Ezra)
  "מלה": {
    lemma: "מלה",
    cal: "mlh",
    pos: "noun",
    definition: "word, matter, thing",
    dialects: ["BA"],
    forms: ["מלה", "מלין", "מלתא"],
    hebrew: "דבר"
  },
  "פתגם": {
    lemma: "פתגם",
    cal: "ptgm",
    pos: "noun",
    definition: "word, decree, sentence",
    dialects: ["BA"],
    forms: ["פתגם", "פתגמא"],
    notes: "Persian loanword"
  },
  "רז": {
    lemma: "רז",
    cal: "rz",
    pos: "noun",
    definition: "secret, mystery",
    dialects: ["BA"],
    forms: ["רז", "רזא", "רזין"],
    notes: "Persian loanword"
  },
  "פשר": {
    lemma: "פשר",
    cal: "p$r",
    pos: "noun/verb",
    definition: "(n.) interpretation; (v.) to interpret",
    dialects: ["BA"],
    forms: ["פשר", "פשרא"],
    hebrew: "פתר"
  },
  "חלם": {
    lemma: "חלם",
    cal: "xlm",
    pos: "noun",
    definition: "dream",
    dialects: ["BA", "JBA", "Tg"],
    forms: ["חלם", "חלמא", "חלמין"],
    hebrew: "חלום"
  },
  "חזו": {
    lemma: "חזו",
    cal: "xzw",
    pos: "noun",
    definition: "vision, appearance",
    dialects: ["BA", "JBA", "Tg"],
    forms: ["חזו", "חזוא", "חזון"],
    hebrew: "חזון"
  },
  "צלם": {
    lemma: "צלם",
    cal: "clm",
    pos: "noun",
    definition: "image, statue",
    dialects: ["BA", "JBA", "Tg"],
    forms: ["צלם", "צלמא"],
    hebrew: "צלם"
  },
  "אלה": {
    lemma: "אלה",
    cal: ")lh",
    pos: "noun",
    definition: "god, God",
    dialects: ["BA", "JBA", "Tg"],
    forms: ["אלה", "אלהא", "אלהין"],
    hebrew: "אלוה"
  },
  "מלאך": {
    lemma: "מלאך",
    cal: "ml)k",
    pos: "noun",
    definition: "angel, messenger",
    dialects: ["BA", "JBA", "Tg"],
    forms: ["מלאך", "מלאכא", "מלאכין"],
    hebrew: "מלאך"
  },

  // Numbers
  "חד": {
    lemma: "חד",
    cal: "xd",
    pos: "numeral",
    definition: "one",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["חד", "חדא"],
    hebrew: "אחד"
  },
  "תרי": {
    lemma: "תרי",
    cal: "try",
    pos: "numeral",
    definition: "two",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["תרי", "תרין", "תרתי"],
    hebrew: "שנים"
  },
  "תלת": {
    lemma: "תלת",
    cal: "tlt",
    pos: "numeral",
    definition: "three",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["תלת", "תלתא"],
    hebrew: "שלוש"
  },
  "ארבע": {
    lemma: "ארבע",
    cal: ")rb(",
    pos: "numeral",
    definition: "four",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["ארבע", "ארבעא"],
    hebrew: "ארבע"
  },
  "חמש": {
    lemma: "חמש",
    cal: "xm$",
    pos: "numeral",
    definition: "five",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["חמש", "חמשא"],
    hebrew: "חמש"
  },
  "שית": {
    lemma: "שית",
    cal: "$yt",
    pos: "numeral",
    definition: "six",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["שית", "שיתא"],
    hebrew: "שש"
  },
  "שבע": {
    lemma: "שבע",
    cal: "$b(",
    pos: "numeral",
    definition: "seven",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["שבע", "שבעא"],
    hebrew: "שבע"
  },
  "תמני": {
    lemma: "תמני",
    cal: "tmny",
    pos: "numeral",
    definition: "eight",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["תמני", "תמניא"],
    hebrew: "שמונה"
  },
  "תשע": {
    lemma: "תשע",
    cal: "t$(",
    pos: "numeral",
    definition: "nine",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["תשע", "תשעא"],
    hebrew: "תשע"
  },
  "עשר": {
    lemma: "עשר",
    cal: "($r",
    pos: "numeral",
    definition: "ten",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["עשר", "עשרא"],
    hebrew: "עשר"
  },
  "מאה": {
    lemma: "מאה",
    cal: "m)h",
    pos: "numeral",
    definition: "hundred",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["מאה", "מאתא"],
    hebrew: "מאה"
  },
  "אלף": {
    lemma: "אלף",
    cal: ")lp",
    pos: "numeral",
    definition: "thousand",
    dialects: ["BA", "JBA", "JPA", "Tg"],
    forms: ["אלף", "אלפא", "אלפין"],
    hebrew: "אלף"
  }
};

/**
 * Lookup a word in CAL local data
 * @param {string} word - Hebrew/Aramaic word to lookup
 * @returns {Object|null} - CAL entry or null if not found
 */
export const lookupCAL = (word) => {
  if (!word) return null;

  // Clean the word of nikud/cantillation
  const cleaned = word.replace(/[\u0591-\u05C7]/g, '');

  // Direct lookup
  if (CAL_ARAMAIC[cleaned]) {
    return { ...CAL_ARAMAIC[cleaned], source: 'CAL' };
  }

  // Try without final letters (כ→ך, מ→ם, etc.)
  const normalized = cleaned
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');

  if (CAL_ARAMAIC[normalized]) {
    return { ...CAL_ARAMAIC[normalized], source: 'CAL' };
  }

  // Search in forms array
  for (const [, entry] of Object.entries(CAL_ARAMAIC)) {
    if (entry.forms && entry.forms.includes(cleaned)) {
      return { ...entry, matchedForm: cleaned, source: 'CAL' };
    }
  }

  return null;
};

/**
 * Get all entries for a specific dialect
 * @param {string} dialect - Dialect code (BA, JBA, JPA, Tg, Syr)
 * @returns {Array} - Array of entries
 */
export const getByDialect = (dialect) => {
  return Object.entries(CAL_ARAMAIC)
    .filter(([_, entry]) => entry.dialects && entry.dialects.includes(dialect))
    .map(([lemma, entry]) => ({ lemma, ...entry }));
};

/**
 * Search CAL entries by definition
 * @param {string} query - English search term
 * @returns {Array} - Matching entries
 */
export const searchCAL = (query) => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();

  return Object.entries(CAL_ARAMAIC)
    .filter(([_, entry]) =>
      entry.definition.toLowerCase().includes(lowerQuery) ||
      (entry.notes && entry.notes.toLowerCase().includes(lowerQuery))
    )
    .map(([lemma, entry]) => ({ lemma, ...entry }));
};

export default CAL_ARAMAIC;
