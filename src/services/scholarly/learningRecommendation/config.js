// =============================================================================
// Configuration des recommandations d'apprentissage — niveaux, modes,
// progressions de sujets, ordre des parashiot.
// (extrait de learningRecommendationService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

export const STORAGE_KEY = 'learning-recommendations';

// Learning levels with progression criteria
// label en français (affiché tel quel par le badge de niveau du dashboard) ;
// le jugement de niveau est piloté par versesStudied (la même source que le
// badge studyTracker) — vocabulary/commentators restent des statistiques.
export const LEARNING_LEVELS = {
  BEGINNER: {
    id: 'beginner',
    label: 'Débutant',
    hebrewLabel: 'מתחיל',
    criteria: {
      versesStudied: 0,
      vocabularyMastered: 0,
      commentatorsExplored: 0
    },
    suggestedModes: ['summary', 'translation'],
    suggestedCommentators: ['Rashi'],
    maxComplexity: 1
  },
  INTERMEDIATE: {
    id: 'intermediate',
    label: 'Intermédiaire',
    hebrewLabel: 'בינוני',
    criteria: {
      versesStudied: 50,
      vocabularyMastered: 30,
      commentatorsExplored: 2
    },
    suggestedModes: ['summary', 'iyun', 'mussar'],
    suggestedCommentators: ['Rashi', 'Ibn Ezra', 'Sforno'],
    maxComplexity: 2
  },
  ADVANCED: {
    id: 'advanced',
    label: 'Avancé',
    hebrewLabel: 'מתקדם',
    criteria: {
      versesStudied: 200,
      vocabularyMastered: 100,
      commentatorsExplored: 4
    },
    suggestedModes: ['iyun', 'machloket', 'halacha'],
    suggestedCommentators: ['Rashi', 'Ramban', 'Ibn Ezra', 'Sforno', 'Or HaChaim'],
    maxComplexity: 3
  },
  SCHOLAR: {
    id: 'scholar',
    label: 'Savant',
    hebrewLabel: 'תלמיד חכם',
    criteria: {
      versesStudied: 500,
      vocabularyMastered: 300,
      commentatorsExplored: 6
    },
    suggestedModes: ['iyun', 'machloket', 'halacha', 'chavruta'],
    suggestedCommentators: ['All commentators'],
    maxComplexity: 4
  }
};

// Libellés FR des modes d'étude (clés internes de l'IA)
export const MODE_LABELS = {
  summary: 'Synthèse',
  translation: 'Traduction',
  iyun: 'Iyoun (analyse)',
  mussar: 'Moussar',
  machloket: 'Mahloket (débat)',
  halacha: 'Halakha',
  chavruta: 'Havrouta'
};

// Topic progressions (what to study after mastering a topic)
export const TOPIC_PROGRESSIONS = {
  'creation': ['covenant', 'blessing', 'sabbath'],
  'covenant': ['commandment', 'promise', 'faith'],
  'exodus': ['redemption', 'freedom', 'promised_land'],
  'sacrifice': ['temple', 'prayer', 'worship'],
  'commandment': ['halacha', 'righteousness', 'sin'],
  'prayer': ['faith', 'worship', 'blessing'],
  'love': ['mercy', 'forgiveness', 'kindness'],
  'sin': ['repentance', 'forgiveness', 'redemption']
};

// Parsha study order (for systematic Torah learning)
export const PARSHA_ORDER = [
  'Bereishit', 'Noach', 'Lech Lecha', 'Vayera', 'Chayei Sarah',
  'Toldot', 'Vayetzei', 'Vayishlach', 'Vayeshev', 'Miketz',
  'Vayigash', 'Vayechi', 'Shemot', 'Vaera', 'Bo', 'Beshalach',
  'Yitro', 'Mishpatim', 'Terumah', 'Tetzaveh', 'Ki Tisa',
  'Vayakhel', 'Pekudei', 'Vayikra', 'Tzav', 'Shemini',
  'Tazria', 'Metzora', 'Acharei Mot', 'Kedoshim', 'Emor',
  'Behar', 'Bechukotai', 'Bamidbar', 'Naso', 'Behaalotecha',
  'Shelach', 'Korach', 'Chukat', 'Balak', 'Pinchas',
  'Matot', 'Masei', 'Devarim', 'Vaetchanan', 'Eikev',
  'Reeh', 'Shoftim', 'Ki Teitzei', 'Ki Tavo', 'Nitzavim',
  'Vayelech', 'Haazinu', "Vezot HaBracha"
];
