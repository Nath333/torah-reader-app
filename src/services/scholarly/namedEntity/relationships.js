// =============================================================================
// Relations entre rabbis — chaînes enseignant/élève et disputes célèbres.
// (extrait de namedEntityService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { RABBI_DATABASE, RABBI_RELATIONSHIPS } from './data';

/**
 * Get teacher-student relationship info for a rabbi
 * @param {string} rabbiName - Hebrew name
 * @returns {Object|null}
 */
export function getRabbiRelationships(rabbiName) {
  const allRabbis = { ...RABBI_DATABASE.tannaim, ...RABBI_DATABASE.amoraim };
  const rabbi = allRabbis[rabbiName];

  if (!rabbi) return null;

  const relationships = {
    teachers: [],
    students: [],
    chavruta: null,
    disputesWith: []
  };

  // Get teachers
  if (rabbi.teachers) {
    relationships.teachers = rabbi.teachers.map(t => {
      const teacherInfo = allRabbis[t];
      return {
        hebrew: t,
        english: teacherInfo?.name || t,
        generation: teacherInfo?.generation
      };
    });
  }

  // Find students (search all rabbis for those who list this rabbi as teacher)
  for (const [hebrew, info] of Object.entries(allRabbis)) {
    if (info.teachers?.includes(rabbiName)) {
      relationships.students.push({
        hebrew,
        english: info.name,
        generation: info.generation
      });
    }
  }

  // Get chavruta
  if (rabbi.chavruta) {
    const chavrutaInfo = allRabbis[rabbi.chavruta];
    relationships.chavruta = {
      hebrew: rabbi.chavruta,
      english: chavrutaInfo?.name || rabbi.chavruta
    };
  }

  // Get dispute partners
  if (rabbi.disputesWith) {
    relationships.disputesWith = rabbi.disputesWith.map(d => {
      const disputeInfo = allRabbis[d];
      return {
        hebrew: d,
        english: disputeInfo?.name || d
      };
    });
  }

  return relationships;
}

/**
 * Get the transmission chain from a rabbi back to earliest teacher
 * @param {string} rabbiName - Hebrew name
 * @returns {Array}
 */
export function getTeacherChain(rabbiName) {
  const allRabbis = { ...RABBI_DATABASE.tannaim, ...RABBI_DATABASE.amoraim };
  const chain = [];
  let current = rabbiName;
  const visited = new Set();

  while (current && !visited.has(current)) {
    visited.add(current);
    const rabbi = allRabbis[current];

    if (rabbi) {
      chain.push({
        hebrew: current,
        english: rabbi.name,
        generation: rabbi.generation,
        period: rabbi.period
      });

      // Follow first teacher
      current = rabbi.teachers?.[0] || null;
    } else {
      break;
    }
  }

  return chain.reverse(); // Earliest first
}

