// PRO SCHOLAR Pre-Classification — BASES DE DONNÉES (split 03/10/2026)
// Noms bibliques, sages, abréviations, particules, homographes… — données
// pures uniquement ; la logique est dans preClassificationService.js qui
// importe et ré-exporte ces noms.

// =============================================================================
// BIBLICAL PROPER NAMES
// These should NEVER be looked up as regular words
// =============================================================================

export const BIBLICAL_NAMES = {
  // Patriarchs & Matriarchs
  'אברהם': { name: 'Abraham', type: 'patriarch', note: 'First patriarch' },
  'אברם': { name: 'Abram', type: 'patriarch', note: 'Original name of Abraham' },
  'יצחק': { name: 'Isaac', type: 'patriarch', note: 'Second patriarch' },
  'יעקב': { name: 'Jacob', type: 'patriarch', note: 'Third patriarch, also called Israel' },
  'ישראל': { name: 'Israel', type: 'patriarch', note: 'Name given to Jacob' },
  'שרה': { name: 'Sarah', type: 'matriarch', note: 'Wife of Abraham' },
  'שרי': { name: 'Sarai', type: 'matriarch', note: 'Original name of Sarah' },
  'רבקה': { name: 'Rebecca', type: 'matriarch', note: 'Wife of Isaac' },
  'רחל': { name: 'Rachel', type: 'matriarch', note: 'Wife of Jacob' },
  'לאה': { name: 'Leah', type: 'matriarch', note: 'Wife of Jacob' },

  // Moses & Exodus figures
  'משה': { name: 'Moses', type: 'prophet', note: 'Greatest prophet, received Torah at Sinai' },
  'אהרן': { name: 'Aaron', type: 'priest', note: 'First High Priest, brother of Moses' },
  'מרים': { name: 'Miriam', type: 'prophetess', note: 'Sister of Moses and Aaron' },
  'פרעה': { name: 'Pharaoh', type: 'title', note: 'King of Egypt' },

  // Judges & Kings
  'דוד': { name: 'David', type: 'king', note: 'King of Israel, author of Psalms' },
  'שלמה': { name: 'Solomon', type: 'king', note: 'King of Israel, son of David' },
  'שאול': { name: 'Saul', type: 'king', note: 'First king of Israel' },
  'שמואל': { name: 'Samuel', type: 'prophet', note: 'Prophet and judge' },

  // Tribes (as proper names)
  'יהודה': { name: 'Judah', type: 'tribe', note: 'Tribe of Judah / Son of Jacob' },
  'לוי': { name: 'Levi', type: 'tribe', note: 'Tribe of Levi / Son of Jacob' },
  'בנימין': { name: 'Benjamin', type: 'tribe', note: 'Tribe of Benjamin / Son of Jacob' },
  'בנימן': { name: 'Benjamin', type: 'tribe', note: 'Alternate spelling' },
  'יוסף': { name: 'Joseph', type: 'tribe', note: 'Son of Jacob' },
  'ראובן': { name: 'Reuben', type: 'tribe', note: 'Firstborn of Jacob' },
  'שמעון': { name: 'Simeon', type: 'tribe', note: 'Son of Jacob' },

  // Prophets
  'ישעיהו': { name: 'Isaiah', type: 'prophet', note: 'Major prophet' },
  'ישעיה': { name: 'Isaiah', type: 'prophet', note: 'Alternate spelling' },
  'ירמיהו': { name: 'Jeremiah', type: 'prophet', note: 'Major prophet' },
  'ירמיה': { name: 'Jeremiah', type: 'prophet', note: 'Alternate spelling' },
  'יחזקאל': { name: 'Ezekiel', type: 'prophet', note: 'Major prophet' },
  'אליהו': { name: 'Elijah', type: 'prophet', note: 'Prophet who ascended to heaven' },
  'אלישע': { name: 'Elisha', type: 'prophet', note: 'Disciple of Elijah' },

  // Divine names (handled specially)
  'אלהים': { name: 'God', type: 'divine', note: 'Name of God' },
  'אלקים': { name: 'God', type: 'divine', note: 'Respectful spelling' },

  // PRO SCHOLAR V6.2: Additional tribal/family names
  'גד': { name: 'Gad', type: 'tribe', note: 'Son of Jacob' },
  'אשר': { name: 'Asher', type: 'tribe', note: 'Son of Jacob' },
  'נפתלי': { name: 'Naphtali', type: 'tribe', note: 'Son of Jacob' },
  'דן': { name: 'Dan', type: 'tribe', note: 'Son of Jacob' },
  'זבולון': { name: 'Zebulun', type: 'tribe', note: 'Son of Jacob' },
  'יששכר': { name: 'Issachar', type: 'tribe', note: 'Son of Jacob' },
  'מנשה': { name: 'Manasseh', type: 'tribe', note: 'Son of Joseph' },
  'אפרים': { name: 'Ephraim', type: 'tribe', note: 'Son of Joseph' },

  // Additional Prophets
  'הושע': { name: 'Hosea', type: 'prophet', note: 'Minor prophet' },
  'עמוס': { name: 'Amos', type: 'prophet', note: 'Minor prophet' },
  'יונה': { name: 'Jonah', type: 'prophet', note: 'Minor prophet' },
  'מיכה': { name: 'Micah', type: 'prophet', note: 'Minor prophet' },
  'נחום': { name: 'Nahum', type: 'prophet', note: 'Minor prophet' },
  'חבקוק': { name: 'Habakkuk', type: 'prophet', note: 'Minor prophet' },
  'צפניה': { name: 'Zephaniah', type: 'prophet', note: 'Minor prophet' },
  'חגי': { name: 'Haggai', type: 'prophet', note: 'Minor prophet' },
  'זכריה': { name: 'Zechariah', type: 'prophet', note: 'Minor prophet' },
  'מלאכי': { name: 'Malachi', type: 'prophet', note: 'Minor prophet' },

  // Additional Biblical figures
  'נח': { name: 'Noah', type: 'patriarch', note: 'Builder of the ark' },
  'יהושע': { name: 'Joshua', type: 'prophet', note: 'Led Israel into Canaan' },
  'גדעון': { name: 'Gideon', type: 'judge', note: 'Judge of Israel' },
  'שמשון': { name: 'Samson', type: 'judge', note: 'Judge of Israel' },
  'רות': { name: 'Ruth', type: 'matriarch', note: 'Great-grandmother of David' },
  'אסתר': { name: 'Esther', type: 'queen', note: 'Queen of Persia' },
  'דניאל': { name: 'Daniel', type: 'prophet', note: 'Prophet in Babylon' },
  'עזרא': { name: 'Ezra', type: 'scribe', note: 'Scribe and priest' },
  'נחמיה': { name: 'Nehemiah', type: 'leader', note: 'Rebuilt Jerusalem walls' },
  'מרדכי': { name: 'Mordecai', type: 'leader', note: 'Uncle of Esther' },
  'איוב': { name: 'Job', type: 'figure', note: 'Subject of Book of Job' },

  // PRO SCHOLAR V6.2: Biblical Places
  'ירושלים': { name: 'Jerusalem', type: 'place', note: 'Holy city' },
  'ירושלם': { name: 'Jerusalem', type: 'place', note: 'Alternate spelling' },
  'ציון': { name: 'Zion', type: 'place', note: 'Mountain of Jerusalem' },
  'מצרים': { name: 'Egypt', type: 'place', note: 'Land of bondage' },
  'בבל': { name: 'Babylon', type: 'place', note: 'Place of exile' },
  'סיני': { name: 'Sinai', type: 'place', note: 'Mountain of Torah giving' },
  'כנען': { name: 'Canaan', type: 'place', note: 'Promised land' },
  'גלות': { name: 'exile/diaspora', type: 'concept', note: 'The exile' },
};

// =============================================================================
// TALMUDIC SAGES (Amoraim & Tannaim)
// =============================================================================

export const TALMUDIC_SAGES = {
  // Major Tannaim
  'רבי': { name: 'Rabbi', type: 'title', note: 'Title for Tannaim/Amoraim' },
  'רב': { name: 'Rav', type: 'title', note: 'Title for Babylonian Amoraim' },
  'רבן': { name: 'Rabban', type: 'title', note: 'Higher title than Rabbi' },
  'עקיבא': { name: 'Akiva', type: 'tanna', note: 'Rabbi Akiva, major Tanna' },
  'הלל': { name: 'Hillel', type: 'tanna', note: 'Hillel the Elder' },
  'שמאי': { name: 'Shammai', type: 'tanna', note: 'Contemporary of Hillel' },
  'יהודה': { name: 'Yehuda', type: 'tanna', note: 'Rabbi Yehuda HaNasi (compiler of Mishnah)' },
  'מאיר': { name: 'Meir', type: 'tanna', note: 'Rabbi Meir' },
  'שמעון': { name: 'Shimon', type: 'tanna', note: 'Rabbi Shimon bar Yochai' },

  // Major Amoraim
  'אביי': { name: 'Abaye', type: 'amora', note: 'Babylonian Amora, 4th generation' },
  'רבא': { name: 'Rava', type: 'amora', note: 'Babylonian Amora, 4th generation' },
  'רבה': { name: 'Rabbah', type: 'amora', note: 'Babylonian Amora' },
  'הונא': { name: 'Huna', type: 'amora', note: 'Rav Huna' },
  'נחמן': { name: 'Nachman', type: 'amora', note: 'Rav Nachman' },
  'ששת': { name: 'Sheshet', type: 'amora', note: 'Rav Sheshet' },
  'יוחנן': { name: 'Yochanan', type: 'amora', note: 'Rabbi Yochanan' },
  'לקיש': { name: 'Lakish', type: 'amora', note: 'Reish Lakish' },
  'אשי': { name: 'Ashi', type: 'amora', note: 'Rav Ashi, compiler of Talmud' },
  'רבינא': { name: 'Ravina', type: 'amora', note: 'Final editor of Talmud' },
};

// =============================================================================
// TALMUDIC ABBREVIATIONS
// Common abbreviations that should be expanded
// =============================================================================

export const TALMUDIC_ABBREVIATIONS = {
  // Domain abbreviations (Shabbat-specific) - with ALL quote character variants
  'רה"י': { expansion: 'רשות היחיד', meaning: 'private domain' },
  'רה״י': { expansion: 'רשות היחיד', meaning: 'private domain' },
  'רה"ר': { expansion: 'רשות הרבים', meaning: 'public domain' },
  'רה״ר': { expansion: 'רשות הרבים', meaning: 'public domain' },
  // ר"ה for public domain (Shabbat context) - distinct from tractate/rabbi names
  'ר"ה': { expansion: 'רשות הרבים', meaning: 'public domain', context: 'shabbat' },
  'ר״ה': { expansion: 'רשות הרבים', meaning: 'public domain', context: 'shabbat' },
  // Prefixed domain abbreviations (ASCII quote variants)
  'מרה"י': { expansion: 'מרשות היחיד', meaning: 'from private domain' },
  'לרה"י': { expansion: 'לרשות היחיד', meaning: 'to private domain' },
  'לר"ה': { expansion: 'לרשות הרבים', meaning: 'to public domain' },
  'מר"ה': { expansion: 'מרשות הרבים', meaning: 'from public domain' },
  // Prefixed domain abbreviations (Hebrew gershayim variants)
  'מרה״י': { expansion: 'מרשות היחיד', meaning: 'from private domain' },
  'לרה״י': { expansion: 'לרשות היחיד', meaning: 'to private domain' },
  'לר״ה': { expansion: 'לרשות הרבים', meaning: 'to public domain' },
  'מר״ה': { expansion: 'מרשות הרבים', meaning: 'from public domain' },

  // Common honorifics/titles (with Unicode variants)
  "ע\"ה": { expansion: 'עליו השלום', meaning: 'peace be upon him' },
  'ע״ה': { expansion: 'עליו השלום', meaning: 'peace be upon him' },
  "ע\"ש": { expansion: 'על שם', meaning: 'named after / because of' },
  'ע״ש': { expansion: 'על שם', meaning: 'named after / because of' },
  "ז\"ל": { expansion: 'זכרונו לברכה', meaning: 'of blessed memory' },
  'ז״ל': { expansion: 'זכרונו לברכה', meaning: 'of blessed memory' },
  "זצ\"ל": { expansion: 'זכר צדיק לברכה', meaning: 'may the memory of the righteous be a blessing' },
  'זצ״ל': { expansion: 'זכר צדיק לברכה', meaning: 'may the memory of the righteous be a blessing' },
  "שליט\"א": { expansion: 'שיחיה לאורך ימים טובים אמן', meaning: 'may he live long' },
  'שליט״א': { expansion: 'שיחיה לאורך ימים טובים אמן', meaning: 'may he live long' },

  // Talmudic citation abbreviations (with all Unicode variants)
  "וגו'": { expansion: 'וגומר', meaning: 'etc. (and so on)' },
  "וגו׳": { expansion: 'וגומר', meaning: 'etc. (and so on)' },
  'וגו': { expansion: 'וגומר', meaning: 'etc. (and so on)' }, // Without marker
  "וכו'": { expansion: 'וכולי', meaning: 'etc.' },
  "וכו׳": { expansion: 'וכולי', meaning: 'etc.' },
  'וכו': { expansion: 'וכולי', meaning: 'etc.' }, // Without marker
  "ובפ'": { expansion: 'ובפרק', meaning: 'and in chapter' },
  'ובפ׳': { expansion: 'ובפרק', meaning: 'and in chapter' },
  "בפ'": { expansion: 'בפרק', meaning: 'in chapter' },
  'בפ׳': { expansion: 'בפרק', meaning: 'in chapter' },
  "דב'": { expansion: 'דברים', meaning: 'Deuteronomy' },
  'דב׳': { expansion: 'דברים', meaning: 'Deuteronomy' },
  "בע\"ה": { expansion: 'בעל הבית', meaning: 'homeowner / master of the house' },
  'בע״ה': { expansion: 'בעל הבית', meaning: 'homeowner / master of the house' },
  "דבע\"ה": { expansion: 'דבעל הבית', meaning: 'of the homeowner' },
  'דבע״ה': { expansion: 'דבעל הבית', meaning: 'of the homeowner' },

  // Halachic abbreviations
  "מדאו'": { expansion: 'מדאורייתא', meaning: 'by Torah law' },
  "מדאו׳": { expansion: 'מדאורייתא', meaning: 'by Torah law' },
  "מדרבנן": { expansion: 'מדרבנן', meaning: 'by rabbinic law' },
  "לכתח'": { expansion: 'לכתחילה', meaning: 'ideally / ab initio' },
  "בדיעב'": { expansion: 'בדיעבד', meaning: 'post facto' },
};

// =============================================================================
// TECHNICAL TERMS (Context-Specific)
// Terms that have specialized meanings in Talmudic context
// =============================================================================

export const TALMUDIC_TECHNICAL_TERMS = {
  // Shabbat Melachot (39 forbidden labors) - with prefix variants
  'הוצאה': { meaning: 'carrying out', context: 'Shabbat melakha', note: 'Transferring from private to public domain' },
  'והוצאה': { meaning: 'and carrying out', context: 'Shabbat melakha', note: 'Transferring from private to public domain' },
  'הכנסה': { meaning: 'bringing in', context: 'Shabbat melakha', note: 'Transferring from public to private domain' },
  'והכנסה': { meaning: 'and bringing in', context: 'Shabbat melakha', note: 'Transferring from public to private domain' },
  'מלאכה': { meaning: 'creative labor', context: 'Shabbat', note: 'One of 39 categories of forbidden work' },
  'מלאכות': { meaning: 'creative labors', context: 'Shabbat', note: 'Plural of melakha' },
  'עקירה': { meaning: 'lifting', context: 'Shabbat', note: 'Initial lifting of object' },
  'הנחה': { meaning: 'placing down', context: 'Shabbat', note: 'Final placement of object' },
  'תפיקו': { meaning: 'you shall bring out', context: 'Shabbat', note: 'Hiphil of יצא' },
  'לויה': { meaning: 'Levite (adj.)', context: 'Mishkan', note: 'As in מחנה לויה - Levite camp' },
  'מחנה': { meaning: 'camp', context: 'Mishkan', note: 'Encampment' },
  'נדבה': { meaning: 'voluntary offering', context: 'korban', note: 'Free-will gift' },
  'מדבריהם': { meaning: 'from their words', context: 'halacha', note: 'Rabbinic enactment' },
  'לכתחלה': { meaning: 'from the outset', context: 'halacha', note: 'Ideally' },
  'בדיעבד': { meaning: 'after the fact', context: 'halacha', note: 'Post facto' },

  // Punishments
  'כרת': { meaning: 'excision', context: 'punishment', note: 'Divine punishment, cutting off from people' },
  'סקילה': { meaning: 'stoning', context: 'punishment', note: 'Capital punishment by court' },
  'חטאת': { meaning: 'sin offering', context: 'korban', note: 'Sacrifice for unintentional sin' },
  'שגגה': { meaning: 'unintentional sin', context: 'halacha', note: 'Violation without knowledge' },
  'זדון': { meaning: 'intentional sin', context: 'halacha', note: 'Willful violation' },

  // Legal terms
  'חייב': { meaning: 'liable', context: 'halacha', note: 'Obligated or guilty' },
  'פטור': { meaning: 'exempt', context: 'halacha', note: 'Free from obligation' },
  'מותר': { meaning: 'permitted', context: 'halacha', note: 'Allowed by law' },
  'אסור': { meaning: 'forbidden', context: 'halacha', note: 'Prohibited by law' },
  'התראה': { meaning: 'warning', context: 'legal', note: 'Required warning before punishment' },

  // Talmudic structure
  'מתני\'': { meaning: 'Mishnah', context: 'structure', note: 'Mishnaic teaching' },
  'גמ\'': { meaning: 'Gemara', context: 'structure', note: 'Talmudic discussion' },
  'תנא': { meaning: 'Tanna taught', context: 'structure', note: 'Mishnaic-era teaching' },
  'אמר': { meaning: 'said', context: 'structure', note: 'Statement by an Amora' },

  // Aramaic logical terms
  'נפקא': { meaning: 'derives', context: 'logic', note: 'Aramaic: we derive from this' },
  'מנלן': { meaning: 'from where do we know', context: 'logic', note: 'Aramaic question formula' },
  'תנינא': { meaning: 'we learned', context: 'logic', note: 'Reference to Mishnah' },

  // PRO SCHOLAR V4.2: Aramaic positional terms
  'ברישא': { meaning: 'at the beginning', context: 'structure', note: 'Aramaic: at the head/start' },
  'ברישיה': { meaning: 'at its beginning', context: 'structure', note: 'Aramaic: at its head (with suffix)' },
  'בסיפא': { meaning: 'at the end', context: 'structure', note: 'Aramaic: at the conclusion' },
  'בסיפיה': { meaning: 'at its end', context: 'structure', note: 'Aramaic: at its conclusion (with suffix)' },
  'רישא': { meaning: 'the beginning', context: 'structure', note: 'Aramaic: head, beginning' },
  'סיפא': { meaning: 'the end', context: 'structure', note: 'Aramaic: conclusion' },
  'בתרא': { meaning: 'final/latter', context: 'structure', note: 'Aramaic: the final one' },
  'קמא': { meaning: 'first/former', context: 'structure', note: 'Aramaic: the first one' },
};

// =============================================================================
// PLACE NAMES
// =============================================================================

export const PLACE_NAMES = {
  'ירושלים': { name: 'Jerusalem', type: 'city' },
  'בבל': { name: 'Babylon', type: 'region' },
  'ארץ ישראל': { name: 'Land of Israel', type: 'region' },
  'מצרים': { name: 'Egypt', type: 'country' },
  'סיני': { name: 'Sinai', type: 'mountain' },
  'ציון': { name: 'Zion', type: 'place' },
};

// =============================================================================
// ARAMAIC PARTICLES - PRO SCHOLAR V4.2
// High-frequency Talmudic words with instant definitions (no dictionary lookup needed)
// Extracted from multiHypothesisEngine.js
// =============================================================================

export const ARAMAIC_PARTICLES = {
  // === COMMON VERBAL FORMS ===
  'נפקא': { meaning: 'it derives/goes out', root: 'נפק', form: '3fs', confidence: 95 },
  'נפקי': { meaning: 'they go out', root: 'נפק', form: '3mp', confidence: 95 },
  'נפקינן': { meaning: 'we derive', root: 'נפק', form: '1p', confidence: 95 },
  // PRO SCHOLAR V8: Aphel forms of נפק (Pe-Nun verb where נ assimilates)
  'תפיקו': { meaning: 'you shall bring out', root: 'נפק', form: 'Aphel 2mp', confidence: 95, weakVerb: 'פ״נ', note: 'Aphel imperative: תפיקו from נפק (נ assimilated)' },
  'תפיק': { meaning: 'it shall bring out / you shall bring out', root: 'נפק', form: 'Aphel 3fs/2ms', confidence: 95, weakVerb: 'פ״נ' },
  'מפיק': { meaning: 'bringing out / one who brings out', root: 'נפק', form: 'Aphel participle', confidence: 95, weakVerb: 'פ״נ' },
  'אפיק': { meaning: 'I shall bring out / he brought out', root: 'נפק', form: 'Aphel 1cs/3ms', confidence: 95, weakVerb: 'פ״נ' },
  'מפקינן': { meaning: 'we bring out', root: 'נפק', form: 'Aphel 1p', confidence: 95, weakVerb: 'פ״נ' },
  // Common Aphel forms of other Pe-Nun verbs
  'אתינן': { meaning: 'we brought', root: 'נתן', form: 'Aphel 1p', confidence: 90, weakVerb: 'פ״נ' },
  'מתרמי': { meaning: 'it occurs', root: 'נרם', form: 'Ithpaal 3ms', confidence: 90 },
  'אמרי': { meaning: 'they say', root: 'אמר', form: '3mp', confidence: 95 },
  'אמרינן': { meaning: 'we say', root: 'אמר', form: '1p', confidence: 95 },
  'תנא': { meaning: 'he taught / a Tanna', root: 'תני', confidence: 95 },
  'תנן': { meaning: 'we learned (Mishnah)', root: 'תני', form: '1p', confidence: 95 },
  'תניא': { meaning: 'it was taught (Baraita)', root: 'תני', confidence: 95 },
  'בעי': { meaning: 'he asks / wants', root: 'בעי', form: '3ms', confidence: 95 },
  'בעינן': { meaning: 'we need', root: 'בעי', form: '1p', confidence: 95 },
  'סבר': { meaning: 'he thinks/holds', root: 'סבר', form: '3ms', confidence: 95 },
  'סברי': { meaning: 'they think', root: 'סבר', form: '3mp', confidence: 95 },
  'קסבר': { meaning: 'he holds', root: 'סבר', confidence: 95 },
  'אזיל': { meaning: 'he goes', root: 'אזל', form: '3ms', confidence: 95 },
  'ואזיל': { meaning: 'and goes on', root: 'אזל', confidence: 95 },
  'אתי': { meaning: 'he comes', root: 'אתי', form: '3ms', confidence: 95 },
  'אתא': { meaning: 'he came', root: 'אתי', confidence: 95 },
  'יתיב': { meaning: 'he sits', root: 'יתב', form: '3ms', confidence: 95 },
  'קאי': { meaning: 'he stands', root: 'קום', confidence: 95 },
  'קיימא': { meaning: 'it stands', root: 'קום', confidence: 95 },
  'חזי': { meaning: 'look! / sees', root: 'חזי', confidence: 95 },
  'חזינן': { meaning: 'we see', root: 'חזי', form: '1p', confidence: 95 },
  'יליף': { meaning: 'he learns/derives', root: 'ילף', form: '3ms', confidence: 95 },
  'ילפינן': { meaning: 'we learn/derive', root: 'ילף', form: '1p', confidence: 95 },
  'דיליף': { meaning: 'that he learns', root: 'ילף', confidence: 95 },
  'כדיליף': { meaning: 'as he derives', root: 'ילף', confidence: 95 },

  // === PRONOMINAL PARTICLES ===
  'לן': { meaning: 'to us', type: 'particle', confidence: 95 },
  'להו': { meaning: 'to them', type: 'particle', confidence: 95 },
  'ליה': { meaning: 'to him', type: 'particle', confidence: 95 },
  'לה': { meaning: 'to her/it', type: 'particle', confidence: 95 },
  'מינה': { meaning: 'from it (f)', type: 'particle', confidence: 95 },
  'מיניה': { meaning: 'from him/it', type: 'particle', confidence: 95 },
  'ביה': { meaning: 'in him/it', type: 'particle', confidence: 95 },
  'בה': { meaning: 'in her/it', type: 'particle', confidence: 95 },
  'עלה': { meaning: 'on it (f)', type: 'particle', confidence: 95 },
  'עליה': { meaning: 'on him/it', type: 'particle', confidence: 95 },

  // === EXISTENTIALS ===
  'אית': { meaning: 'there is', type: 'existential', confidence: 95 },
  'לית': { meaning: 'there is not', type: 'existential', confidence: 95 },
  'איכא': { meaning: 'there is', type: 'existential', confidence: 95 },
  'ליכא': { meaning: 'there is not', type: 'existential', confidence: 95 },

  // === QUESTION WORDS ===
  'מאי': { meaning: 'what', type: 'interrogative', confidence: 95 },
  'מאן': { meaning: 'who', type: 'interrogative', confidence: 95 },
  'היכי': { meaning: 'how', type: 'interrogative', confidence: 95 },
  'אמאי': { meaning: 'why', type: 'interrogative', confidence: 95 },
  'מנא': { meaning: 'from where', type: 'interrogative', confidence: 95 },

  // === ADVERBS/CONNECTORS ===
  'השתא': { meaning: 'now', type: 'adverb', confidence: 95 },
  'לקמן': { meaning: 'below, further on', type: 'adverb', confidence: 95 },
  'לעיל': { meaning: 'above', type: 'adverb', confidence: 95 },
  'התם': { meaning: 'there', type: 'adverb', confidence: 95 },
  'הכא': { meaning: 'here', type: 'adverb', confidence: 95 },
  'אלא': { meaning: 'but, rather', type: 'conjunction', confidence: 95 },
  'אלמא': { meaning: 'therefore', type: 'conjunction', confidence: 95 },
  'הלכך': { meaning: 'therefore', type: 'conjunction', confidence: 95 },

  // === COMMON PHRASES ===
  'פשיטא': { meaning: 'it is obvious', type: 'phrase', confidence: 95 },
  'קשיא': { meaning: 'difficulty', type: 'phrase', confidence: 95 },
  'תיובתא': { meaning: 'refutation', type: 'phrase', confidence: 95 },
  'לימא': { meaning: 'let us say', type: 'phrase', confidence: 95 },

  // === DEMONSTRATIVES ===
  'האי': { meaning: 'this', type: 'demonstrative', confidence: 95 },
  'ההוא': { meaning: 'that', type: 'demonstrative', confidence: 95 },
  'הני': { meaning: 'these', type: 'demonstrative', confidence: 95 },
  'הנהו': { meaning: 'those', type: 'demonstrative', confidence: 95 },

  // === PRO SCHOLAR V5: ADDITIONAL TALMUDIC EXPRESSIONS ===
  // Legal/Halachic terminology
  'מותר': { meaning: 'permitted', root: 'נתר', type: 'halachic', confidence: 95 },
  'אסור': { meaning: 'forbidden', root: 'אסר', type: 'halachic', confidence: 95 },
  'פטור': { meaning: 'exempt', root: 'פטר', type: 'halachic', confidence: 95 },
  'חייב': { meaning: 'obligated/liable', root: 'חוב', type: 'halachic', confidence: 95 },
  'טמא': { meaning: 'ritually impure', root: 'טמא', type: 'halachic', confidence: 95 },
  'טהור': { meaning: 'ritually pure', root: 'טהר', type: 'halachic', confidence: 95 },
  'כשר': { meaning: 'valid/fit', root: 'כשר', type: 'halachic', confidence: 95 },
  'פסול': { meaning: 'invalid/disqualified', root: 'פסל', type: 'halachic', confidence: 95 },

  // Dialectical terminology
  'מיתיבי': { meaning: 'they objected (from Baraita)', root: 'תוב', type: 'dialectic', confidence: 95 },
  'תיקו': { meaning: 'unresolved question', type: 'dialectic', confidence: 95 },
  'שמע מינה': { meaning: 'conclude from this', type: 'dialectic', confidence: 95 },
  'מנלן': { meaning: 'from where do we know', type: 'dialectic', confidence: 95 },
  'דתנן': { meaning: 'as we learned (Mishnah)', root: 'תני', type: 'dialectic', confidence: 95 },
  'דתניא': { meaning: 'as it was taught (Baraita)', root: 'תני', type: 'dialectic', confidence: 95 },
  'אמר ליה': { meaning: 'he said to him', root: 'אמר', type: 'narrative', confidence: 95 },
  'אמר לו': { meaning: 'he said to him', root: 'אמר', type: 'narrative', confidence: 95 },

  // Temporal/conditional
  'אי': { meaning: 'if', type: 'conditional', confidence: 95 },
  'אילו': { meaning: 'if (contrary to fact)', type: 'conditional', confidence: 95 },
  'כי': { meaning: 'when/because', type: 'conjunction', confidence: 90 },
  'דהא': { meaning: 'for behold', type: 'conjunction', confidence: 95 },
  'דהכי': { meaning: 'that thus', type: 'conjunction', confidence: 95 },

  // PRO SCHOLAR V6.2: Aramaic positional/structural terms
  'ברישא': { meaning: 'at the beginning', type: 'structural', confidence: 95 },
  'ברישיה': { meaning: 'at its beginning', type: 'structural', confidence: 95 },
  'בסיפא': { meaning: 'at the end', type: 'structural', confidence: 95 },
  'בסיפיה': { meaning: 'at its end', type: 'structural', confidence: 95 },
  'רישא': { meaning: 'the beginning', root: 'ריש', type: 'structural', confidence: 95 },
  'סיפא': { meaning: 'the end', root: 'סיף', type: 'structural', confidence: 95 },
  'בתרא': { meaning: 'final/latter', type: 'structural', confidence: 95 },
  'קמא': { meaning: 'first/former', type: 'structural', confidence: 95 },
};

// =============================================================================
// BIBLICAL PARTICLES - PRO SCHOLAR V5
// High-frequency Biblical Hebrew words with instant definitions
// =============================================================================

export const BIBLICAL_PARTICLES = {
  // === DIVINE NAMES (handle with care) ===
  'יהוה': { meaning: 'LORD (Tetragrammaton)', type: 'divine_name', confidence: 100, note: 'The ineffable Name' },
  'אלהים': { meaning: 'God', root: 'אלה', type: 'divine_name', confidence: 100 },
  'אדני': { meaning: 'Lord/my Lord', root: 'אדן', type: 'divine_name', confidence: 100 },
  'שדי': { meaning: 'Almighty', type: 'divine_name', confidence: 100 },

  // === COMMON PREPOSITIONS ===
  'אל': { meaning: 'to, toward', type: 'preposition', confidence: 95 },
  'על': { meaning: 'on, upon, concerning', type: 'preposition', confidence: 95 },
  'את': { meaning: 'with / [accusative marker]', type: 'preposition', confidence: 95 },
  'עם': { meaning: 'with, together with', type: 'preposition', confidence: 95 },
  'מן': { meaning: 'from, out of', type: 'preposition', confidence: 95 },
  'תחת': { meaning: 'under, instead of', type: 'preposition', confidence: 95 },
  'בין': { meaning: 'between, among', type: 'preposition', confidence: 95 },
  'אחר': { meaning: 'after, behind', type: 'preposition', confidence: 95 },
  'לפני': { meaning: 'before, in front of', type: 'preposition', confidence: 95 },
  'אצל': { meaning: 'beside, near', type: 'preposition', confidence: 95 },

  // === CONJUNCTIONS ===
  'כי': { meaning: 'that, because, when, if', type: 'conjunction', confidence: 90 },
  'אשר': { meaning: 'who, which, that', type: 'conjunction', confidence: 95 },
  'פן': { meaning: 'lest', type: 'conjunction', confidence: 95 },
  'למען': { meaning: 'in order that, for the sake of', type: 'conjunction', confidence: 95 },
  'אם': { meaning: 'if', type: 'conjunction', confidence: 95 },
  'גם': { meaning: 'also, even', type: 'conjunction', confidence: 95 },
  'רק': { meaning: 'only, but', type: 'conjunction', confidence: 95 },
  'אך': { meaning: 'surely, but, only', type: 'conjunction', confidence: 95 },

  // === ADVERBS ===
  'מאד': { meaning: 'very, exceedingly', type: 'adverb', confidence: 95 },
  'עוד': { meaning: 'still, yet, again', type: 'adverb', confidence: 95 },
  'כן': { meaning: 'thus, so', type: 'adverb', confidence: 95 },
  'לא': { meaning: 'not, no', type: 'adverb', confidence: 95 },
  'אין': { meaning: 'there is not, nothing', type: 'adverb', confidence: 95 },
  'יש': { meaning: 'there is, there are', type: 'adverb', confidence: 95 },
  'הנה': { meaning: 'behold, here', type: 'adverb', confidence: 95 },
  'שם': { meaning: 'there', type: 'adverb', confidence: 95 },
  'פה': { meaning: 'here', type: 'adverb', confidence: 95 },
  'עתה': { meaning: 'now', type: 'adverb', confidence: 95 },

  // === INTERROGATIVES ===
  'מה': { meaning: 'what', type: 'interrogative', confidence: 95 },
  'מי': { meaning: 'who', type: 'interrogative', confidence: 95 },
  'איך': { meaning: 'how', type: 'interrogative', confidence: 95 },
  'איה': { meaning: 'where', type: 'interrogative', confidence: 95 },
  'למה': { meaning: 'why', type: 'interrogative', confidence: 95 },
  'מדוע': { meaning: 'why', type: 'interrogative', confidence: 95 },
  'מתי': { meaning: 'when', type: 'interrogative', confidence: 95 },

  // === DEMONSTRATIVES ===
  'זה': { meaning: 'this (m)', type: 'demonstrative', confidence: 95 },
  'זאת': { meaning: 'this (f)', type: 'demonstrative', confidence: 95 },
  'אלה': { meaning: 'these', type: 'demonstrative', confidence: 95 },
  'ההוא': { meaning: 'that (m)', type: 'demonstrative', confidence: 95 },
  'ההיא': { meaning: 'that (f)', type: 'demonstrative', confidence: 95 },

  // === NUMERALS ===
  'אחד': { meaning: 'one', type: 'numeral', confidence: 95 },
  'שנים': { meaning: 'two (m)', type: 'numeral', confidence: 95 },
  'שתים': { meaning: 'two (f)', type: 'numeral', confidence: 95 },
  'שלש': { meaning: 'three', type: 'numeral', confidence: 95 },
  'ארבע': { meaning: 'four', type: 'numeral', confidence: 95 },
  'חמש': { meaning: 'five', type: 'numeral', confidence: 95 },
  'שש': { meaning: 'six', type: 'numeral', confidence: 95 },
  'שבע': { meaning: 'seven', type: 'numeral', confidence: 95 },
  'שמנה': { meaning: 'eight', type: 'numeral', confidence: 95 },
  'תשע': { meaning: 'nine', type: 'numeral', confidence: 95 },
  'עשר': { meaning: 'ten', type: 'numeral', confidence: 95 },
  'מאה': { meaning: 'hundred', type: 'numeral', confidence: 95 },
  'אלף': { meaning: 'thousand', type: 'numeral', confidence: 95 },

  // === HIGH-FREQUENCY VERBS (common forms) ===
  'ויאמר': { meaning: 'and he said', root: 'אמר', form: 'wayyiqtol', confidence: 95 },
  'ויהי': { meaning: 'and it was/came to pass', root: 'היה', form: 'wayyiqtol', confidence: 95 },
  'וידבר': { meaning: 'and he spoke', root: 'דבר', form: 'wayyiqtol', confidence: 95 },
  'ויעש': { meaning: 'and he did/made', root: 'עשה', form: 'wayyiqtol', confidence: 95 },
  'וילך': { meaning: 'and he went', root: 'הלך', form: 'wayyiqtol', confidence: 95 },
  'ויבא': { meaning: 'and he came', root: 'בוא', form: 'wayyiqtol', confidence: 95 },
  'ויקח': { meaning: 'and he took', root: 'לקח', form: 'wayyiqtol', confidence: 95 },
  'וירא': { meaning: 'and he saw', root: 'ראה', form: 'wayyiqtol', confidence: 95 },
  'ויקרא': { meaning: 'and he called', root: 'קרא', form: 'wayyiqtol', confidence: 95 },
  'ויתן': { meaning: 'and he gave', root: 'נתן', form: 'wayyiqtol', confidence: 95 },
};

// =============================================================================
// SEMANTIC FIELDS - PRO SCHOLAR V5
// Categorize words by meaning domain for enhanced understanding
// =============================================================================

export const SEMANTIC_FIELDS = {
  LEGAL: {
    name: 'Legal/Halachic',
    description: 'Terms relating to Jewish law',
    words: ['מותר', 'אסור', 'פטור', 'חייב', 'כשר', 'פסול', 'טמא', 'טהור']
  },
  DIALECTIC: {
    name: 'Dialectical',
    description: 'Terms used in Talmudic argumentation',
    words: ['מיתיבי', 'תיקו', 'קשיא', 'פשיטא', 'תיובתא', 'אלא']
  },
  TEMPORAL: {
    name: 'Time/Sequence',
    description: 'Words indicating time or sequence',
    words: ['השתא', 'עתה', 'אז', 'עוד', 'מתי']
  },
  SPATIAL: {
    name: 'Location/Direction',
    description: 'Words indicating place or direction',
    words: ['הכא', 'התם', 'שם', 'פה', 'לקמן', 'לעיל']
  },
  CITATION: {
    name: 'Citation/Source',
    description: 'Terms for citing sources',
    words: ['תנא', 'תנן', 'תניא', 'דתנן', 'דתניא', 'אמר']
  }
};

// =============================================================================
// ROOT FAMILIES - PRO SCHOLAR V5
// Cross-reference related Hebrew roots by semantic domain
// =============================================================================

export const ROOT_FAMILIES = {
  // === SPEECH/COMMUNICATION ===
  SPEECH: {
    name: 'Speech & Communication',
    roots: {
      'אמר': { meaning: 'say', related: ['דבר', 'שיח', 'ענה'], notes: 'General speaking' },
      'דבר': { meaning: 'speak, word', related: ['אמר', 'מלל'], notes: 'Formal speech, matter' },
      'קרא': { meaning: 'call, read', related: ['זעק', 'שוע'], notes: 'Calling out, proclamation' },
      'ענה': { meaning: 'answer', related: ['אמר', 'שוב'], notes: 'Response' },
      'שאל': { meaning: 'ask', related: ['דרש', 'בקש'], notes: 'Inquiry' },
      'מלל': { meaning: 'speak (Aramaic)', related: ['דבר', 'אמר'], notes: 'Aramaic speech verb' },
    }
  },

  // === MOTION/MOVEMENT ===
  MOTION: {
    name: 'Motion & Movement',
    roots: {
      'הלך': { meaning: 'go, walk', related: ['בוא', 'יצא', 'שוב'], notes: 'General motion' },
      'בוא': { meaning: 'come, enter', related: ['הלך', 'יצא'], notes: 'Entering' },
      'יצא': { meaning: 'go out', related: ['בוא', 'נפק'], notes: 'Exiting' },
      'שוב': { meaning: 'return', related: ['הלך', 'פנה'], notes: 'Returning, repentance' },
      'עלה': { meaning: 'go up', related: ['ירד', 'סלק'], notes: 'Ascending' },
      'ירד': { meaning: 'go down', related: ['עלה', 'נחת'], notes: 'Descending' },
      'נפק': { meaning: 'go out (Aramaic)', related: ['יצא', 'עאל'], notes: 'Aramaic exit' },
      'עאל': { meaning: 'enter (Aramaic)', related: ['בוא', 'נפק'], notes: 'Aramaic enter' },
      'אזל': { meaning: 'go (Aramaic)', related: ['הלך', 'אתי'], notes: 'Aramaic go' },
      'אתי': { meaning: 'come (Aramaic)', related: ['בוא', 'אזל'], notes: 'Aramaic come' },
    }
  },

  // === COGNITION/KNOWLEDGE ===
  COGNITION: {
    name: 'Knowledge & Understanding',
    roots: {
      'ידע': { meaning: 'know', related: ['בין', 'שכל', 'חכם'], notes: 'Knowledge' },
      'בין': { meaning: 'understand', related: ['ידע', 'שכל'], notes: 'Discernment' },
      'שכל': { meaning: 'be wise', related: ['חכם', 'בין'], notes: 'Intelligence' },
      'חכם': { meaning: 'be wise', related: ['שכל', 'בין'], notes: 'Wisdom' },
      'למד': { meaning: 'learn, teach', related: ['ידע', 'שנה'], notes: 'Study' },
      'שמע': { meaning: 'hear, understand', related: ['ידע', 'אזן'], notes: 'Hearing/obeying' },
      'סבר': { meaning: 'think (Aramaic)', related: ['חשב', 'ידע'], notes: 'Aramaic reasoning' },
    }
  },

  // === GIVING/TAKING ===
  TRANSFER: {
    name: 'Giving & Taking',
    roots: {
      'נתן': { meaning: 'give', related: ['לקח', 'שים'], notes: 'General giving' },
      'לקח': { meaning: 'take', related: ['נתן', 'אחז'], notes: 'Taking, receiving' },
      'שים': { meaning: 'put, place', related: ['נתן', 'הנח'], notes: 'Placing' },
      'שלח': { meaning: 'send', related: ['נתן', 'בוא'], notes: 'Sending away' },
      'קבל': { meaning: 'receive', related: ['לקח', 'נתן'], notes: 'Accepting' },
      'יהב': { meaning: 'give (Aramaic)', related: ['נתן', 'קבל'], notes: 'Aramaic give' },
    }
  },

  // === SEEING/PERCEPTION ===
  PERCEPTION: {
    name: 'Seeing & Perception',
    roots: {
      'ראה': { meaning: 'see', related: ['חזה', 'נבט', 'שקף'], notes: 'Vision' },
      'חזה': { meaning: 'see, behold', related: ['ראה', 'נבט'], notes: 'Prophetic vision' },
      'נבט': { meaning: 'look at', related: ['ראה', 'שקף'], notes: 'Gazing' },
      'חזי': { meaning: 'see (Aramaic)', related: ['ראה', 'חזה'], notes: 'Aramaic see' },
    }
  },

  // === DOING/MAKING ===
  ACTION: {
    name: 'Doing & Making',
    roots: {
      'עשה': { meaning: 'do, make', related: ['פעל', 'יצר', 'ברא'], notes: 'General action' },
      'פעל': { meaning: 'work, do', related: ['עשה', 'עבד'], notes: 'Working' },
      'עבד': { meaning: 'work, serve (Heb/Aram)', related: ['פעל', 'שרת', 'עשה'], notes: 'Service, labor - same root in Hebrew and Aramaic' },
      'יצר': { meaning: 'form, create', related: ['עשה', 'ברא'], notes: 'Forming' },
      'ברא': { meaning: 'create', related: ['יצר', 'עשה'], notes: 'Divine creation' },
    }
  },

  // === LIFE/DEATH ===
  EXISTENCE: {
    name: 'Life & Death',
    roots: {
      'חיה': { meaning: 'live', related: ['מות', 'היה'], notes: 'Life' },
      'מות': { meaning: 'die', related: ['חיה', 'הרג'], notes: 'Death' },
      'היה': { meaning: 'be, become', related: ['חיה', 'הוה'], notes: 'Existence' },
      'הוה': { meaning: 'be (Aramaic)', related: ['היה', 'איתא'], notes: 'Aramaic be' },
    }
  },

  // === LEGAL/HALACHIC ===
  LEGAL: {
    name: 'Legal Terms',
    roots: {
      'דין': { meaning: 'judge', related: ['שפט', 'פסק'], notes: 'Judging' },
      'שפט': { meaning: 'judge', related: ['דין', 'משפט'], notes: 'Biblical judging' },
      'חוב': { meaning: 'be liable', related: ['זכה', 'פטר'], notes: 'Obligation' },
      'זכה': { meaning: 'merit, acquit', related: ['חוב', 'פטר'], notes: 'Acquittal, merit' },
      'פטר': { meaning: 'exempt', related: ['חוב', 'זכה'], notes: 'Exemption' },
      'אסר': { meaning: 'forbid', related: ['התר', 'נתר'], notes: 'Prohibition' },
      'התר': { meaning: 'permit', related: ['אסר', 'נתר'], notes: 'Permission' },
    }
  },
};

// =============================================================================
// HISTORICAL PERIODS - PRO SCHOLAR V5
// Date words by linguistic era
// =============================================================================

export const HISTORICAL_PERIODS = {
  BIBLICAL: {
    name: 'Biblical Hebrew',
    range: '1200-200 BCE',
    characteristics: ['Classical syntax', 'Pausal forms', 'Waw-consecutive'],
    indicators: ['ויהי', 'ויאמר', 'הנה', 'לאמר'],
    dictionaries: ['BDB', 'HALOT', "Strong's"]
  },
  MISHNAIC: {
    name: 'Mishnaic Hebrew',
    range: '200 BCE - 200 CE',
    characteristics: ['Simplified syntax', 'Loss of waw-consecutive', 'Greek/Latin loanwords'],
    indicators: ['הרי', 'כיצד', 'לפיכך', 'אף על פי'],
    dictionaries: ['Jastrow', 'Even-Shoshan']
  },
  TALMUDIC_ARAMAIC: {
    name: 'Talmudic Aramaic',
    range: '200-600 CE',
    characteristics: ['Eastern Aramaic', 'Legal terminology', 'Dialectical structure'],
    indicators: ['מאי', 'היכי', 'פשיטא', 'תיקו', 'איכא', 'ליכא'],
    dictionaries: ['Jastrow', 'CAL', 'Sokoloff']
  },
  GEONIC: {
    name: 'Geonic Period',
    range: '600-1000 CE',
    characteristics: ['Arabic influence', 'Legal responsa style'],
    indicators: [],
    dictionaries: ['Jastrow']
  },
  MEDIEVAL: {
    name: 'Medieval Hebrew',
    range: '1000-1500 CE',
    characteristics: ['Arabic philosophical terms', 'Poetry conventions'],
    indicators: [],
    dictionaries: ['Even-Shoshan', 'Alcalay']
  }
};

// =============================================================================
// COMMON VERB FORMS - PRO SCHOLAR V5
// Instant lookup for high-frequency conjugated verbs
// =============================================================================

export const COMMON_VERB_FORMS = {
  // === היה (to be) - most common verb ===
  'היה': { root: 'היה', meaning: 'was/became', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'היתה': { root: 'היה', meaning: 'was/became', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'היו': { root: 'היה', meaning: 'were/became', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יהיה': { root: 'היה', meaning: 'will be', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'תהיה': { root: 'היה', meaning: 'will be', binyan: 'Qal', tense: 'imperfect', person: '3fs/2ms' },
  'יהיו': { root: 'היה', meaning: 'will be', binyan: 'Qal', tense: 'imperfect', person: '3mp' },
  'הייתי': { root: 'היה', meaning: 'I was', binyan: 'Qal', tense: 'perfect', person: '1s' },
  'היינו': { root: 'היה', meaning: 'we were', binyan: 'Qal', tense: 'perfect', person: '1p' },
  'ויהי': { root: 'היה', meaning: 'and it was', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'ותהי': { root: 'היה', meaning: 'and she was', binyan: 'Qal', tense: 'wayyiqtol', person: '3fs' },
  'והיה': { root: 'היה', meaning: 'and it will be', binyan: 'Qal', tense: 'weqatal', person: '3ms' },

  // === אמר (to say) ===
  'אמר': { root: 'אמר', meaning: 'said', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'אמרה': { root: 'אמר', meaning: 'said', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'אמרו': { root: 'אמר', meaning: 'said', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יאמר': { root: 'אמר', meaning: 'will say', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'תאמר': { root: 'אמר', meaning: 'will say', binyan: 'Qal', tense: 'imperfect', person: '3fs/2ms' },
  'ויאמר': { root: 'אמר', meaning: 'and he said', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'ותאמר': { root: 'אמר', meaning: 'and she said', binyan: 'Qal', tense: 'wayyiqtol', person: '3fs' },
  'לאמר': { root: 'אמר', meaning: 'saying', binyan: 'Qal', tense: 'infinitive' },
  'אומר': { root: 'אמר', meaning: 'saying/says', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'אומרת': { root: 'אמר', meaning: 'saying/says', binyan: 'Qal', tense: 'participle', person: 'fs' },
  'אומרים': { root: 'אמר', meaning: 'saying/say', binyan: 'Qal', tense: 'participle', person: 'mp' },

  // === עשה (to do/make) ===
  'עשה': { root: 'עשה', meaning: 'did/made', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'עשתה': { root: 'עשה', meaning: 'did/made', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'עשו': { root: 'עשה', meaning: 'did/made', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יעשה': { root: 'עשה', meaning: 'will do/make', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'ויעש': { root: 'עשה', meaning: 'and he did', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'עושה': { root: 'עשה', meaning: 'doing/makes', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לעשות': { root: 'עשה', meaning: 'to do/make', binyan: 'Qal', tense: 'infinitive' },

  // === נתן (to give) - Pe-Nun verb ===
  'נתן': { root: 'נתן', meaning: 'gave', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'נתנה': { root: 'נתן', meaning: 'gave', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'נתנו': { root: 'נתן', meaning: 'gave', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יתן': { root: 'נתן', meaning: 'will give', binyan: 'Qal', tense: 'imperfect', person: '3ms', note: 'Pe-Nun assimilation' },
  'ויתן': { root: 'נתן', meaning: 'and he gave', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'תן': { root: 'נתן', meaning: 'give!', binyan: 'Qal', tense: 'imperative', person: '2ms' },
  'נותן': { root: 'נתן', meaning: 'giving/gives', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לתת': { root: 'נתן', meaning: 'to give', binyan: 'Qal', tense: 'infinitive', note: 'Pe-Nun assimilation' },

  // === בוא (to come) - Ayin-Vav verb ===
  'בא': { root: 'בוא', meaning: 'came', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'באה': { root: 'בוא', meaning: 'came', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'באו': { root: 'בוא', meaning: 'came', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יבוא': { root: 'בוא', meaning: 'will come', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'ויבא': { root: 'בוא', meaning: 'and he came', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'בוא': { root: 'בוא', meaning: 'come!', binyan: 'Qal', tense: 'imperative', person: '2ms' },
  'לבוא': { root: 'בוא', meaning: 'to come', binyan: 'Qal', tense: 'infinitive' },

  // === הלך (to go) - Pe-He verb ===
  'הלך': { root: 'הלך', meaning: 'went', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'הלכה': { root: 'הלך', meaning: 'went', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'הלכו': { root: 'הלך', meaning: 'went', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'ילך': { root: 'הלך', meaning: 'will go', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'וילך': { root: 'הלך', meaning: 'and he went', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'לך': { root: 'הלך', meaning: 'go!', binyan: 'Qal', tense: 'imperative', person: '2ms' },
  'הולך': { root: 'הלך', meaning: 'going/goes', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'ללכת': { root: 'הלך', meaning: 'to go', binyan: 'Qal', tense: 'infinitive' },

  // === ראה (to see) - Lamed-He verb ===
  'ראה': { root: 'ראה', meaning: 'saw', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'ראתה': { root: 'ראה', meaning: 'saw', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'ראו': { root: 'ראה', meaning: 'saw', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יראה': { root: 'ראה', meaning: 'will see', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'וירא': { root: 'ראה', meaning: 'and he saw', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'רואה': { root: 'ראה', meaning: 'seeing/sees', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לראות': { root: 'ראה', meaning: 'to see', binyan: 'Qal', tense: 'infinitive' },

  // === ידע (to know) - Pe-Yod verb ===
  'ידע': { root: 'ידע', meaning: 'knew', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'ידעה': { root: 'ידע', meaning: 'knew', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'ידעו': { root: 'ידע', meaning: 'knew', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'ידעתי': { root: 'ידע', meaning: 'I knew', binyan: 'Qal', tense: 'perfect', person: '1s' },
  'יידע': { root: 'ידע', meaning: 'will know', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'יודע': { root: 'ידע', meaning: 'knowing/knows', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'יודעת': { root: 'ידע', meaning: 'knowing/knows', binyan: 'Qal', tense: 'participle', person: 'fs' },
  'לדעת': { root: 'ידע', meaning: 'to know', binyan: 'Qal', tense: 'infinitive' },

  // === לקח (to take) - Pe-Lamed verb ===
  'לקח': { root: 'לקח', meaning: 'took', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'לקחה': { root: 'לקח', meaning: 'took', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'לקחו': { root: 'לקח', meaning: 'took', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יקח': { root: 'לקח', meaning: 'will take', binyan: 'Qal', tense: 'imperfect', person: '3ms', note: 'Pe-Lamed drops' },
  'ויקח': { root: 'לקח', meaning: 'and he took', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'קח': { root: 'לקח', meaning: 'take!', binyan: 'Qal', tense: 'imperative', person: '2ms' },
  'לקחת': { root: 'לקח', meaning: 'to take', binyan: 'Qal', tense: 'infinitive' },

  // === שמע (to hear) ===
  'שמע': { root: 'שמע', meaning: 'heard', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'שמעה': { root: 'שמע', meaning: 'heard', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'שמעו': { root: 'שמע', meaning: 'heard', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'ישמע': { root: 'שמע', meaning: 'will hear', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'וישמע': { root: 'שמע', meaning: 'and he heard', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'שומע': { root: 'שמע', meaning: 'hearing/hears', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לשמוע': { root: 'שמע', meaning: 'to hear', binyan: 'Qal', tense: 'infinitive' },

  // === קרא (to call/read) ===
  'קרא': { root: 'קרא', meaning: 'called/read', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'קראה': { root: 'קרא', meaning: 'called/read', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'יקרא': { root: 'קרא', meaning: 'will call', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'ויקרא': { root: 'קרא', meaning: 'and he called', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'קורא': { root: 'קרא', meaning: 'calling/reads', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לקרוא': { root: 'קרא', meaning: 'to call/read', binyan: 'Qal', tense: 'infinitive' },

  // === עבר (to pass/cross) - includes Hiphil forms ===
  // Qal forms (to pass, cross over)
  'עבר': { root: 'עבר', meaning: 'passed/crossed', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'עברה': { root: 'עבר', meaning: 'passed/crossed', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'עברו': { root: 'עבר', meaning: 'passed/crossed', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יעבור': { root: 'עבר', meaning: 'will pass', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'יעברו': { root: 'עבר', meaning: 'will pass', binyan: 'Qal', tense: 'imperfect', person: '3mp' },
  'ויעבור': { root: 'עבר', meaning: 'and he passed', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'ויעברו': { root: 'עבר', meaning: 'and they passed', binyan: 'Qal', tense: 'wayyiqtol', person: '3mp' },
  'עובר': { root: 'עבר', meaning: 'passing/crosses', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לעבור': { root: 'עבר', meaning: 'to pass', binyan: 'Qal', tense: 'infinitive' },

  // Hiphil forms (to cause to pass, proclaim, transfer)
  'העביר': { root: 'עבר', meaning: 'caused to pass/proclaimed', binyan: 'Hiphil', tense: 'perfect', person: '3ms' },
  'העבירה': { root: 'עבר', meaning: 'caused to pass/proclaimed', binyan: 'Hiphil', tense: 'perfect', person: '3fs' },
  'העבירו': { root: 'עבר', meaning: 'caused to pass/proclaimed', binyan: 'Hiphil', tense: 'perfect', person: '3p' },
  'יעביר': { root: 'עבר', meaning: 'will cause to pass/proclaim', binyan: 'Hiphil', tense: 'imperfect', person: '3ms' },
  'יעבירו': { root: 'עבר', meaning: 'will cause to pass/proclaim', binyan: 'Hiphil', tense: 'imperfect', person: '3mp' },
  'ויעבר': { root: 'עבר', meaning: 'and he caused to pass', binyan: 'Hiphil', tense: 'wayyiqtol', person: '3ms' },
  'ויעבירו': { root: 'עבר', meaning: 'and they caused to pass/proclaimed', binyan: 'Hiphil', tense: 'wayyiqtol', person: '3mp' },
  'מעביר': { root: 'עבר', meaning: 'causing to pass/proclaiming', binyan: 'Hiphil', tense: 'participle', person: 'ms' },
  'להעביר': { root: 'עבר', meaning: 'to cause to pass/proclaim', binyan: 'Hiphil', tense: 'infinitive' },

  // === יצא (to go out) - includes Hiphil (to bring out) ===
  'יצא': { root: 'יצא', meaning: 'went out', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'יצאה': { root: 'יצא', meaning: 'went out', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'יצאו': { root: 'יצא', meaning: 'went out', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'ויצא': { root: 'יצא', meaning: 'and he went out', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'יוצא': { root: 'יצא', meaning: 'going out', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לצאת': { root: 'יצא', meaning: 'to go out', binyan: 'Qal', tense: 'infinitive' },
  'הוציא': { root: 'יצא', meaning: 'brought out', binyan: 'Hiphil', tense: 'perfect', person: '3ms' },
  'הוציאו': { root: 'יצא', meaning: 'brought out', binyan: 'Hiphil', tense: 'perfect', person: '3p' },
  'יוציא': { root: 'יצא', meaning: 'will bring out', binyan: 'Hiphil', tense: 'imperfect', person: '3ms' },
  'להוציא': { root: 'יצא', meaning: 'to bring out', binyan: 'Hiphil', tense: 'infinitive' },
  'מוציא': { root: 'יצא', meaning: 'bringing out', binyan: 'Hiphil', tense: 'participle', person: 'ms' },

  // === כנס (to enter/gather) - Hiphil: to bring in ===
  'נכנס': { root: 'כנס', meaning: 'entered', binyan: 'Nifal', tense: 'perfect', person: '3ms' },
  'נכנסו': { root: 'כנס', meaning: 'entered', binyan: 'Nifal', tense: 'perfect', person: '3p' },
  'הכניס': { root: 'כנס', meaning: 'brought in', binyan: 'Hiphil', tense: 'perfect', person: '3ms' },
  'הכניסו': { root: 'כנס', meaning: 'brought in', binyan: 'Hiphil', tense: 'perfect', person: '3p' },
  'יכניס': { root: 'כנס', meaning: 'will bring in', binyan: 'Hiphil', tense: 'imperfect', person: '3ms' },
  'להכניס': { root: 'כנס', meaning: 'to bring in', binyan: 'Hiphil', tense: 'infinitive' },
  'מכניס': { root: 'כנס', meaning: 'bringing in', binyan: 'Hiphil', tense: 'participle', person: 'ms' },
};

// =============================================================================
// BINYAN PARADIGMS - PRO SCHOLAR V5
// Complete verb pattern information for scholarly analysis
// =============================================================================

export const BINYAN_PARADIGMS = {
  QAL: {
    name: 'Qal (קל)',
    hebrewName: 'קל',
    meaning: 'Simple active',
    description: 'Basic form of the verb, active voice',
    characteristics: ['No prefix pattern', 'Basic meaning of root'],
    examples: {
      'כתב': { perfect: 'כָּתַב', imperfect: 'יִכְתֹּב', participle: 'כֹּתֵב', infinitive: 'כְּתֹב' },
      'שמר': { perfect: 'שָׁמַר', imperfect: 'יִשְׁמֹר', participle: 'שֹׁמֵר', infinitive: 'שְׁמֹר' }
    },
    frequencyRank: 1
  },
  NIPHAL: {
    name: "Nif'al (נפעל)",
    hebrewName: 'נפעל',
    meaning: 'Simple passive/reflexive',
    description: 'Passive or reflexive of Qal',
    characteristics: ['נ prefix in perfect', 'Doubled middle letter feeling'],
    examples: {
      'כתב': { perfect: 'נִכְתַּב', imperfect: 'יִכָּתֵב', participle: 'נִכְתָּב' },
      'שמר': { perfect: 'נִשְׁמַר', imperfect: 'יִשָּׁמֵר', participle: 'נִשְׁמָר' }
    },
    frequencyRank: 4
  },
  PIEL: {
    name: "Pi'el (פיעל)",
    hebrewName: 'פיעל',
    meaning: 'Intensive active',
    description: 'Intensified or causative action',
    characteristics: ['Doubled middle root letter', 'Often denominative'],
    examples: {
      'דבר': { perfect: 'דִּבֵּר', imperfect: 'יְדַבֵּר', participle: 'מְדַבֵּר', meaning: 'spoke (intensive)' },
      'קדש': { perfect: 'קִדֵּשׁ', imperfect: 'יְקַדֵּשׁ', participle: 'מְקַדֵּשׁ', meaning: 'sanctified' }
    },
    frequencyRank: 2
  },
  PUAL: {
    name: "Pu'al (פועל)",
    hebrewName: 'פועל',
    meaning: 'Intensive passive',
    description: 'Passive of Piel',
    characteristics: ['Doubled middle letter', 'Qibbuts under first letter'],
    examples: {
      'דבר': { perfect: 'דֻּבַּר', imperfect: 'יְדֻבַּר', participle: 'מְדֻבָּר' },
      'קדש': { perfect: 'קֻדַּשׁ', imperfect: 'יְקֻדַּשׁ', participle: 'מְקֻדָּשׁ' }
    },
    frequencyRank: 6
  },
  HIPHIL: {
    name: "Hif'il (הפעיל)",
    hebrewName: 'הפעיל',
    meaning: 'Causative active',
    description: 'Causes someone to do the action',
    characteristics: ['ה prefix in perfect', 'Causative meaning'],
    examples: {
      'מלך': { perfect: 'הִמְלִיךְ', imperfect: 'יַמְלִיךְ', participle: 'מַמְלִיךְ', meaning: 'made king' },
      'גדל': { perfect: 'הִגְדִּיל', imperfect: 'יַגְדִּיל', participle: 'מַגְדִּיל', meaning: 'made great' }
    },
    frequencyRank: 3
  },
  HOPHAL: {
    name: "Hof'al (הופעל)",
    hebrewName: 'הופעל',
    meaning: 'Causative passive',
    description: 'Passive of Hiphil',
    characteristics: ['הֻ/הָ prefix', 'Passive causative'],
    examples: {
      'מלך': { perfect: 'הָמְלַךְ', imperfect: 'יָמְלַךְ', meaning: 'was made king' },
      'גדל': { perfect: 'הָגְדַּל', imperfect: 'יָגְדַּל', meaning: 'was made great' }
    },
    frequencyRank: 7
  },
  HITPAEL: {
    name: "Hitpa'el (התפעל)",
    hebrewName: 'התפעל',
    meaning: 'Reflexive/reciprocal',
    description: 'Action done to oneself or mutually',
    characteristics: ['הת prefix', 'Reflexive action'],
    examples: {
      'קדש': { perfect: 'הִתְקַדֵּשׁ', imperfect: 'יִתְקַדֵּשׁ', participle: 'מִתְקַדֵּשׁ', meaning: 'sanctified oneself' },
      'פלל': { perfect: 'הִתְפַּלֵּל', imperfect: 'יִתְפַּלֵּל', participle: 'מִתְפַּלֵּל', meaning: 'prayed' }
    },
    frequencyRank: 5
  }
};

// =============================================================================
// HOMOGRAPH DISAMBIGUATION - PRO SCHOLAR V5
// Context-aware disambiguation for words with multiple meanings
// =============================================================================

export const HOMOGRAPHS = {
  // === CRITICAL HOMOGRAPHS (high-impact disambiguation) ===
  'עבד': {
    meanings: [
      { meaning: 'servant, slave', pos: 'noun', contexts: ['all'], frequency: 'high' },
      { meaning: 'he served/worked', pos: 'verb', root: 'עבד', binyan: 'Qal', tense: 'perfect', contexts: ['all'] },
      { meaning: 'to serve (Aramaic)', pos: 'verb', contexts: ['talmudic'], note: 'Aramaic equivalent' }
    ],
    disambiguationHints: ['Check for verbal prefixes/suffixes', 'Context: ritual vs labor']
  },
  'דבר': {
    meanings: [
      { meaning: 'word, thing, matter', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'he spoke', pos: 'verb', root: 'דבר', binyan: 'Piel', tense: 'perfect', contexts: ['all'] },
      { meaning: 'plague, pestilence', pos: 'noun', contexts: ['biblical'], note: 'Different vocalization' }
    ],
    disambiguationHints: ['Piel = spoke', 'With article = the word/thing']
  },
  'מלך': {
    meanings: [
      { meaning: 'king', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'he reigned', pos: 'verb', root: 'מלך', binyan: 'Qal', tense: 'perfect', contexts: ['all'] },
      { meaning: 'counsel (Aramaic)', pos: 'noun', contexts: ['talmudic'], note: 'Aramaic meaning' }
    ],
    disambiguationHints: ['With ה prefix = the king', 'After subject = verb']
  },
  'בית': {
    meanings: [
      { meaning: 'house, household', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'temple (בית המקדש)', pos: 'noun', contexts: ['all'], note: 'When referring to Temple' },
      { meaning: 'school (בית מדרש)', pos: 'noun', contexts: ['talmudic'], note: 'Study hall' }
    ],
    disambiguationHints: ['Check construct chain', 'בית + noun often = institution']
  },
  'אב': {
    meanings: [
      { meaning: 'father', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'Av (month)', pos: 'noun', contexts: ['all'], note: 'Fifth month' },
      { meaning: 'archetype, prototype', pos: 'noun', contexts: ['talmudic'], note: 'אב מלאכה = prototype labor' }
    ],
    disambiguationHints: ['With possessive suffix = father', 'In date context = month']
  },
  'שם': {
    meanings: [
      { meaning: 'name', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'there', pos: 'adverb', contexts: ['all'], frequency: 'very high' },
      { meaning: 'he placed', pos: 'verb', root: 'שים', binyan: 'Qal', tense: 'perfect', contexts: ['all'] }
    ],
    disambiguationHints: ['With לְ prefix = name (לשם)', 'Location context = there']
  },
  'כל': {
    meanings: [
      { meaning: 'all, every', pos: 'noun', contexts: ['all'], frequency: 'extremely high' },
      { meaning: 'vessel (archaic)', pos: 'noun', contexts: ['biblical'], note: 'Rare usage' }
    ],
    disambiguationHints: ['Almost always = all/every']
  },
  'עד': {
    meanings: [
      { meaning: 'until, up to', pos: 'preposition', contexts: ['all'], frequency: 'very high' },
      { meaning: 'witness', pos: 'noun', contexts: ['all'], frequency: 'high' },
      { meaning: 'forever (עַד עוֹלָם)', pos: 'noun', contexts: ['biblical'], note: 'In construct' },
      { meaning: 'prey, booty', pos: 'noun', contexts: ['biblical'], note: 'Rare' }
    ],
    disambiguationHints: ['Before place/time = until', 'Legal context = witness']
  },
  'פה': {
    meanings: [
      { meaning: 'here', pos: 'adverb', contexts: ['all'], frequency: 'high' },
      { meaning: 'mouth', pos: 'noun', contexts: ['all'], frequency: 'high' }
    ],
    disambiguationHints: ['With על = oral (על פה)', 'Location context = here']
  },
  'יד': {
    meanings: [
      { meaning: 'hand', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'power, authority', pos: 'noun', contexts: ['all'], note: 'Figurative' },
      { meaning: 'portion, share', pos: 'noun', contexts: ['talmudic'], note: 'יד = handle/portion' },
      { meaning: 'memorial, monument', pos: 'noun', contexts: ['biblical'], note: 'Rare (יָד)' }
    ],
    disambiguationHints: ['Literal = hand', 'ביד = by means of/through']
  },

  // === TALMUDIC-SPECIFIC HOMOGRAPHS ===
  'אמר': {
    meanings: [
      { meaning: 'he said', pos: 'verb', root: 'אמר', tense: 'perfect', contexts: ['all'], frequency: 'extremely high' },
      { meaning: 'word, statement', pos: 'noun', contexts: ['talmudic'], note: 'מאמר = statement' },
      { meaning: 'lamb (Aramaic)', pos: 'noun', contexts: ['talmudic'], note: 'אִמְּרָא' }
    ],
    disambiguationHints: ['Usually = said', 'With דְּ prefix (דאמר) = who said']
  },
  'דין': {
    meanings: [
      { meaning: 'law, judgment', pos: 'noun', contexts: ['all'], frequency: 'high' },
      { meaning: 'this (Aramaic)', pos: 'demonstrative', contexts: ['talmudic'], frequency: 'high' },
      { meaning: 'he judged', pos: 'verb', root: 'דין', tense: 'perfect', contexts: ['all'] }
    ],
    disambiguationHints: ['Aramaic דין = this', 'Hebrew דין = judgment']
  },
  'מר': {
    meanings: [
      { meaning: 'master, sir (Aramaic)', pos: 'noun', contexts: ['talmudic'], frequency: 'high', note: 'Title' },
      { meaning: 'bitter', pos: 'adjective', contexts: ['all'], frequency: 'medium' },
      { meaning: 'myrrh', pos: 'noun', contexts: ['biblical'], note: 'Spice' }
    ],
    disambiguationHints: ['Before name = master', 'Taste context = bitter']
  }
};

// =============================================================================
// SOURCE CONFIDENCE SCORING - PRO SCHOLAR V3
// =============================================================================

/**
 * Source reliability tiers
 */
export const SOURCE_TIERS = {
  gold: {
    sources: ['jastrow', 'bdb', 'halot', 'cal'],
    reliability: 0.95,
    description: 'Academic standard dictionaries'
  },
  silver: {
    sources: ['strongs', 'klein', 'gesenius'],
    reliability: 0.85,
    description: 'Established reference works'
  },
  bronze: {
    sources: ['sefaria', 'local', 'pattern', 'talmudic'],
    reliability: 0.70,
    description: 'Algorithmic or general'
  }
};
