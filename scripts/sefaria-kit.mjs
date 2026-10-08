#!/usr/bin/env node
/**
 * sefaria-kit.mjs — génère le kit hors-ligne Sefaria (format API par chapitre).
 *
 * Source : l'export officiel Sefaria (bucket GCS public, index books.json
 * régénéré le 2 de chaque mois). Les exports sont déjà au format
 * [chapitres][verses] — le même découpage que l'API /texts/{Book}.{chapter}
 * que consomme l'app : le kit se branche donc sans transformation lourde.
 *
 * Usage : node scripts/sefaria-kit.mjs [--out public/data/sefaria-kit-torah.json]
 * Kit Torah : les 5 livres (hébreu merged + EN merged) + Rashi (hébreu merged)
 * + Onkelos (hébreu) — découpé par chapitre.
 */
import fs from "node:fs";

const BOOKS_JSON = "https://api.github.com/repos/Sefaria/Sefaria-Export/contents/books.json";
const OUT = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : "public/data/sefaria-kit-torah.json";

// titre export -> clés API de l'app
const KIT = [
  { exportTitle: "Genesis", hebrew: true, apiBook: "Genesis" },
  { exportTitle: "Exodus", hebrew: true, apiBook: "Exodus" },
  { exportTitle: "Leviticus", hebrew: true, apiBook: "Leviticus" },
  { exportTitle: "Numbers", hebrew: true, apiBook: "Numbers" },
  { exportTitle: "Deuteronomy", hebrew: true, apiBook: "Deuteronomy" },
  { exportTitle: "Rashi on Genesis", hebrew: true, apiBook: "Rashi_on_Genesis", commentary: true },
  { exportTitle: "Rashi on Exodus", hebrew: true, apiBook: "Rashi_on_Exodus", commentary: true },
  { exportTitle: "Rashi on Leviticus", hebrew: true, apiBook: "Rashi_on_Leviticus", commentary: true },
  { exportTitle: "Rashi on Numbers", hebrew: true, apiBook: "Rashi_on_Numbers", commentary: true },
  { exportTitle: "Rashi on Deuteronomy", hebrew: true, apiBook: "Rashi_on_Deuteronomy", commentary: true },
  { exportTitle: "Onkelos Genesis", hebrew: true, apiBook: "Onkelos_Genesis" },
  { exportTitle: "Onkelos Exodus", hebrew: true, apiBook: "Onkelos_Exodus" },
  { exportTitle: "Onkelos Leviticus", hebrew: true, apiBook: "Onkelos_Leviticus" },
  { exportTitle: "Onkelos Numbers", hebrew: true, apiBook: "Onkelos_Numbers" },
  { exportTitle: "Onkelos Deuteronomy", hebrew: true, apiBook: "Onkelos_Deuteronomy" },
];

async function main() {
  console.log("Téléchargement de l'index books.json…");
  const res = await fetch(BOOKS_JSON, { headers: { Accept: "application/vnd.github.raw" } });
  if (!res.ok) throw new Error(`books.json : ${res.status}`);
  const index = await res.json();
  const byTitle = new Map();
  for (const b of index.books) {
    const list = byTitle.get(b.title) || [];
    list.push(b);
    byTitle.set(b.title, list);
  }

  const pickMerged = (title, lang) =>
    (byTitle.get(title) || []).find(
      (b) => b.language === lang && /merged/i.test(b.versionTitle)
    ) || (byTitle.get(title) || []).find((b) => b.language === lang);

  const kit = { generatedAt: new Date().toISOString(), source: "Sefaria-Export (public)", books: {} };
  let totalBytes = 0;

  for (const entry of KIT) {
    const versions = [];
    for (const lang of ["Hebrew", "English"]) {
      const b = pickMerged(entry.exportTitle, lang);
      if (!b) continue;
      process.stdout.write(`${entry.exportTitle} [${lang}] … `);
      const res = await fetch(b.json_url);
      if (!res.ok) { console.log(`ERREUR ${res.status}`); continue; }
      const data = await res.json();
      const chapters = data.text;
      if (!Array.isArray(chapters)) { console.log("format inattendu"); continue; }
      versions.push({ lang, sectionNames: data.sectionNames, chapters });
      const bytes = JSON.stringify(chapters).length;
      totalBytes += bytes;
      console.log(`${(bytes / 1024 / 1024).toFixed(2)} Mo`);
    }
    if (versions.length) {
      kit.books[entry.apiBook] = { commentary: !!entry.commentary, versions };
    }
  }

  fs.mkdirSync(OUT.split("/").slice(0, -1).join("/"), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(kit));
  console.log(`
Kit écrit : ${OUT} — ${(totalBytes / 1024 / 1024).toFixed(1)} Mo de contenu`);
}

main().catch((e) => { console.error(e); process.exit(1); });
