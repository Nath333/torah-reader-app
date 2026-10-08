/**
 * Fuseau de l'étude du jour. Les calendriers Sefaria (parasha, Daf Yomi…)
 * changent de jour à minuit LOCAL du fidèle : l'ancien défaut codé en dur
 * « America/New_York » donnait la parasha de la veille jusqu'à 6 h du matin
 * en France. On utilise le fuseau du navigateur, avec repli Europe/Paris
 * (public principal de l'app).
 */
export const getStudyTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  } catch {
    return 'Europe/Paris';
  }
};

export default getStudyTimezone;
