/**
 * Source Credibility Service - Academic Trust Indicators
 *
 * Features:
 * - Source classification (Primary, Secondary, Modern)
 * - Authority scoring based on tradition
 * - Citation chain tracking
 * - Consensus detection
 * - Academic vs Traditional weighting
 */

// Source categories with credibility metadata
export const SOURCE_CATEGORIES = {
  PRIMARY: {
    id: 'primary',
    label: 'Primary Source',
    hebrewLabel: 'מקור ראשון',
    description: 'Original text (Torah, Navi, Ketuvim)',
    credibilityScore: 100,
    color: '#1565c0'
  },
  TALMUD: {
    id: 'talmud',
    label: 'Talmudic',
    hebrewLabel: 'תלמודי',
    description: 'Mishnah, Gemara, Tosefta',
    credibilityScore: 95,
    color: '#7b1fa2'
  },
  RISHONIM: {
    id: 'rishonim',
    label: 'Rishonim',
    hebrewLabel: 'ראשונים',
    description: 'Early medieval commentators (1000-1500 CE)',
    credibilityScore: 90,
    color: '#00838f'
  },
  ACHARONIM: {
    id: 'acharonim',
    label: 'Acharonim',
    hebrewLabel: 'אחרונים',
    description: 'Later commentators (1500-1800 CE)',
    credibilityScore: 85,
    color: '#558b2f'
  },
  MODERN: {
    id: 'modern',
    label: 'Modern',
    hebrewLabel: 'מודרני',
    description: 'Contemporary scholars and commentators',
    credibilityScore: 75,
    color: '#ef6c00'
  },
  ACADEMIC: {
    id: 'academic',
    label: 'Academic',
    hebrewLabel: 'אקדמי',
    description: 'University and scholarly research',
    credibilityScore: 70,
    color: '#5d4037'
  },
  MIDRASH: {
    id: 'midrash',
    label: 'Midrashic',
    hebrewLabel: 'מדרשי',
    description: 'Homiletical and aggadic literature',
    credibilityScore: 80,
    color: '#c62828'
  },
  KABBALAH: {
    id: 'kabbalah',
    label: 'Kabbalistic',
    hebrewLabel: 'קבלי',
    description: 'Mystical and kabbalistic sources',
    credibilityScore: 75,
    color: '#6a1b9a'
  }
};

// Known sources with their metadata
const SOURCE_DATABASE = {
  // Primary
  'Torah': { category: 'PRIMARY', authority: 100, dates: 'Ancient', consensus: 'universal' },
  'Tanakh': { category: 'PRIMARY', authority: 100, dates: 'Ancient', consensus: 'universal' },

  // Talmudic
  'Mishnah': { category: 'TALMUD', authority: 98, dates: '~200 CE', consensus: 'universal' },
  'Talmud Bavli': { category: 'TALMUD', authority: 97, dates: '~500 CE', consensus: 'universal' },
  'Talmud Yerushalmi': { category: 'TALMUD', authority: 95, dates: '~400 CE', consensus: 'universal' },
  'Tosefta': { category: 'TALMUD', authority: 92, dates: '~300 CE', consensus: 'high' },

  // Rishonim
  'Rashi': { category: 'RISHONIM', authority: 98, dates: '1040-1105', consensus: 'universal', style: 'peshat' },
  'Tosafot': { category: 'RISHONIM', authority: 95, dates: '1100-1300', consensus: 'universal', style: 'dialectic' },
  'Rambam': { category: 'RISHONIM', authority: 98, dates: '1138-1204', consensus: 'universal', style: 'halachic' },
  'Ramban': { category: 'RISHONIM', authority: 95, dates: '1194-1270', consensus: 'high', style: 'kabbalistic' },
  'Ibn Ezra': { category: 'RISHONIM', authority: 92, dates: '1089-1167', consensus: 'high', style: 'grammatical' },
  'Rashbam': { category: 'RISHONIM', authority: 90, dates: '1085-1158', consensus: 'high', style: 'peshat' },
  'Radak': { category: 'RISHONIM', authority: 88, dates: '1160-1235', consensus: 'high', style: 'grammatical' },
  'Sforno': { category: 'RISHONIM', authority: 88, dates: '1475-1550', consensus: 'high', style: 'philosophical' },
  'Abarbanel': { category: 'RISHONIM', authority: 87, dates: '1437-1508', consensus: 'moderate', style: 'philosophical' },

  // Acharonim
  'Or HaChaim': { category: 'ACHARONIM', authority: 88, dates: '1696-1743', consensus: 'high', style: 'kabbalistic' },
  'Maharsha': { category: 'ACHARONIM', authority: 90, dates: '1555-1631', consensus: 'high', style: 'analytical' },
  'Kli Yakar': { category: 'ACHARONIM', authority: 85, dates: '1550-1619', consensus: 'moderate', style: 'homiletical' },
  'Malbim': { category: 'ACHARONIM', authority: 85, dates: '1809-1879', consensus: 'moderate', style: 'grammatical' },
  'Netziv': { category: 'ACHARONIM', authority: 85, dates: '1816-1893', consensus: 'moderate', style: 'analytical' },
  'Sefat Emet': { category: 'ACHARONIM', authority: 82, dates: '1847-1905', consensus: 'chassidic', style: 'chassidic' },

  // Modern
  'Rav Soloveitchik': { category: 'MODERN', authority: 85, dates: '1903-1993', consensus: 'high', style: 'philosophical' },
  'Rav Kook': { category: 'MODERN', authority: 85, dates: '1865-1935', consensus: 'high', style: 'mystical' },
  'Leibowitz': { category: 'MODERN', authority: 75, dates: '1903-1998', consensus: 'moderate', style: 'analytical' },
  'Artscroll': { category: 'MODERN', authority: 70, dates: 'Contemporary', consensus: 'moderate', style: 'traditional' },

  // Midrash
  'Midrash Rabbah': { category: 'MIDRASH', authority: 90, dates: '~400-900 CE', consensus: 'universal' },
  'Midrash Tanchuma': { category: 'MIDRASH', authority: 85, dates: '~800 CE', consensus: 'high' },
  'Pirkei d\'Rabbi Eliezer': { category: 'MIDRASH', authority: 82, dates: '~800 CE', consensus: 'moderate' },
  'Yalkut Shimoni': { category: 'MIDRASH', authority: 80, dates: '~1300 CE', consensus: 'moderate' },

  // Targum
  'Onkelos': { category: 'TALMUD', authority: 95, dates: '~100 CE', consensus: 'universal' },
  'Targum Yonatan': { category: 'TALMUD', authority: 88, dates: 'Ancient', consensus: 'high' },

  // Kabbalah
  'Zohar': { category: 'KABBALAH', authority: 85, dates: '~1280 CE', consensus: 'kabbalistic', style: 'mystical' },
  'Tanya': { category: 'KABBALAH', authority: 82, dates: '1796', consensus: 'chassidic', style: 'chassidic' }
};

/**
 * Get credibility info for a source
 */
export function getSourceCredibility(sourceName) {
  // Try exact match
  if (SOURCE_DATABASE[sourceName]) {
    const source = SOURCE_DATABASE[sourceName];
    const category = SOURCE_CATEGORIES[source.category];
    return {
      name: sourceName,
      ...source,
      categoryInfo: category,
      overallScore: calculateOverallScore(source)
    };
  }

  // Try fuzzy match
  const normalized = sourceName.toLowerCase().replace(/[^a-z]/g, '');
  for (const [name, data] of Object.entries(SOURCE_DATABASE)) {
    if (name.toLowerCase().replace(/[^a-z]/g, '').includes(normalized) ||
        normalized.includes(name.toLowerCase().replace(/[^a-z]/g, ''))) {
      const category = SOURCE_CATEGORIES[data.category];
      return {
        name,
        ...data,
        categoryInfo: category,
        overallScore: calculateOverallScore(data)
      };
    }
  }

  // Unknown source
  return {
    name: sourceName,
    category: 'UNKNOWN',
    authority: 50,
    consensus: 'unknown',
    categoryInfo: {
      id: 'unknown',
      label: 'Unknown',
      description: 'Source not in database',
      credibilityScore: 50,
      color: '#9e9e9e'
    },
    overallScore: 50
  };
}

/**
 * Calculate overall credibility score
 */
function calculateOverallScore(source) {
  const categoryScore = SOURCE_CATEGORIES[source.category]?.credibilityScore || 50;
  const authorityScore = source.authority || 50;

  // Weight authority more heavily
  return Math.round(categoryScore * 0.3 + authorityScore * 0.7);
}

/**
 * Compare multiple sources and determine consensus
 */
export function analyzeConsensus(sources) {
  const credibilities = sources.map(s => getSourceCredibility(s.name || s));

  // Group by opinion/interpretation
  const opinions = {};
  sources.forEach((source, i) => {
    const key = source.opinion || source.interpretation || 'view_' + i;
    if (!opinions[key]) {
      opinions[key] = {
        sources: [],
        totalWeight: 0,
        highestAuthority: 0
      };
    }
    opinions[key].sources.push(credibilities[i]);
    opinions[key].totalWeight += credibilities[i].overallScore;
    opinions[key].highestAuthority = Math.max(
      opinions[key].highestAuthority,
      credibilities[i].overallScore
    );
  });

  // Determine consensus
  const opinionEntries = Object.entries(opinions);
  let consensus = {
    type: 'none',
    confidence: 0,
    mainView: null,
    alternativeViews: []
  };

  if (opinionEntries.length === 1) {
    consensus = {
      type: 'unanimous',
      confidence: 100,
      mainView: opinionEntries[0][0],
      alternativeViews: []
    };
  } else if (opinionEntries.length > 1) {
    // Sort by total weight
    opinionEntries.sort((a, b) => b[1].totalWeight - a[1].totalWeight);

    const mainWeight = opinionEntries[0][1].totalWeight;
    const totalWeight = opinionEntries.reduce((sum, [, v]) => sum + v.totalWeight, 0);
    const mainPercentage = (mainWeight / totalWeight) * 100;

    if (mainPercentage >= 70) {
      consensus = {
        type: 'strong-majority',
        confidence: Math.round(mainPercentage),
        mainView: opinionEntries[0][0],
        mainViewSources: opinionEntries[0][1].sources,
        alternativeViews: opinionEntries.slice(1).map(([view, data]) => ({
          view,
          sources: data.sources,
          weight: Math.round((data.totalWeight / totalWeight) * 100)
        }))
      };
    } else if (mainPercentage >= 50) {
      consensus = {
        type: 'majority',
        confidence: Math.round(mainPercentage),
        mainView: opinionEntries[0][0],
        mainViewSources: opinionEntries[0][1].sources,
        alternativeViews: opinionEntries.slice(1).map(([view, data]) => ({
          view,
          sources: data.sources,
          weight: Math.round((data.totalWeight / totalWeight) * 100)
        }))
      };
    } else {
      consensus = {
        type: 'disputed',
        confidence: Math.round(mainPercentage),
        mainView: opinionEntries[0][0],
        alternativeViews: opinionEntries.map(([view, data]) => ({
          view,
          sources: data.sources,
          weight: Math.round((data.totalWeight / totalWeight) * 100)
        }))
      };
    }
  }

  return {
    sources: credibilities,
    consensus,
    averageCredibility: Math.round(
      credibilities.reduce((sum, c) => sum + c.overallScore, 0) / credibilities.length
    ),
    categories: [...new Set(credibilities.map(c => c.category))]
  };
}

/**
 * Get credibility badge info for display
 */
export function getCredibilityBadge(score) {
  if (score >= 95) {
    return { label: 'Authoritative', icon: '⭐⭐⭐', color: '#1565c0', tier: 'gold' };
  } else if (score >= 85) {
    return { label: 'Highly Reliable', icon: '⭐⭐', color: '#2e7d32', tier: 'silver' };
  } else if (score >= 75) {
    return { label: 'Reliable', icon: '⭐', color: '#558b2f', tier: 'bronze' };
  } else if (score >= 60) {
    return { label: 'Moderate', icon: '○', color: '#f57c00', tier: 'basic' };
  } else {
    return { label: 'Supplementary', icon: '·', color: '#9e9e9e', tier: 'supplementary' };
  }
}

/**
 * Sort sources by credibility
 */
export function sortByCredibility(sources) {
  return sources
    .map(source => ({
      source,
      credibility: getSourceCredibility(source.name || source)
    }))
    .sort((a, b) => b.credibility.overallScore - a.credibility.overallScore)
    .map(item => ({
      ...item.source,
      credibility: item.credibility
    }));
}

/**
 * Get category distribution for a set of sources
 */
export function getCategoryDistribution(sources) {
  const distribution = {};

  sources.forEach(source => {
    const cred = getSourceCredibility(source.name || source);
    const category = cred.category || 'UNKNOWN';
    distribution[category] = (distribution[category] || 0) + 1;
  });

  return Object.entries(distribution)
    .map(([category, count]) => ({
      category,
      categoryInfo: SOURCE_CATEGORIES[category],
      count,
      percentage: Math.round((count / sources.length) * 100)
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Check if source is from a specific period
 */
export function isFromPeriod(sourceName, period) {
  const cred = getSourceCredibility(sourceName);
  return cred.category === period.toUpperCase();
}

/**
 * Get all sources from a category
 */
export function getSourcesByCategory(category) {
  return Object.entries(SOURCE_DATABASE)
    .filter(([, data]) => data.category === category)
    .map(([name, data]) => ({
      name,
      ...data,
      categoryInfo: SOURCE_CATEGORIES[data.category]
    }))
    .sort((a, b) => b.authority - a.authority);
}

const sourceCredibilityService = {
  SOURCE_CATEGORIES,
  getSourceCredibility,
  analyzeConsensus,
  getCredibilityBadge,
  sortByCredibility,
  getCategoryDistribution,
  isFromPeriod,
  getSourcesByCategory
};

export default sourceCredibilityService;
