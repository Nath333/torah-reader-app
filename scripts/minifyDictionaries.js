#!/usr/bin/env node
/**
 * Minify public/data/*.json dictionaries.
 *
 * Why: the raw files are pretty-printed (~78 MB total). GitHub Pages auto-gzips
 * JSON responses, but a smaller source means a smaller gzipped payload AND
 * faster JSON.parse on the client. Typical shrink: 20-40% uncompressed,
 * 5-15% gzipped. Parsed output is identical — only whitespace is removed.
 *
 * Default mode is a dry run that prints predicted savings. Pass --write to
 * overwrite the files in place.
 *
 *   node scripts/minifyDictionaries.js            # dry run
 *   node scripts/minifyDictionaries.js --write    # rewrite files
 *   node scripts/minifyDictionaries.js --write --only bdbComplete.json
 *
 * The script is safe to re-run: minifying already-minified JSON is a no-op.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function pct(before, after) {
  if (before === 0) return '0%';
  return `${(((before - after) / before) * 100).toFixed(1)}%`;
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath);
  const originalBytes = raw.length;
  const originalGz = zlib.gzipSync(raw, { level: 9 }).length;

  let parsed;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch (err) {
    return { skipped: true, reason: `invalid JSON: ${err.message}` };
  }

  const minified = JSON.stringify(parsed);
  const minifiedBuf = Buffer.from(minified, 'utf8');
  const minifiedBytes = minifiedBuf.length;
  const minifiedGz = zlib.gzipSync(minifiedBuf, { level: 9 }).length;

  if (WRITE && minifiedBytes < originalBytes) {
    fs.writeFileSync(filePath, minifiedBuf);
  }

  return {
    originalBytes,
    minifiedBytes,
    originalGz,
    minifiedGz,
    wrote: WRITE && minifiedBytes < originalBytes
  };
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Data directory not found: ${DATA_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const targets = ONLY ? files.filter(f => f === ONLY) : files;

  if (targets.length === 0) {
    console.error(ONLY ? `No match for --only ${ONLY}` : 'No .json files in public/data/');
    process.exit(1);
  }

  console.log(WRITE ? 'Minifying (writing files):' : 'Dry run (pass --write to apply):');
  console.log('');
  console.log(
    'file'.padEnd(40) +
    'raw'.padStart(11) +
    'min'.padStart(11) +
    'save'.padStart(8) +
    'raw.gz'.padStart(11) +
    'min.gz'.padStart(11) +
    'save'.padStart(8)
  );
  console.log('-'.repeat(100));

  let totalOrig = 0;
  let totalMin = 0;
  let totalOrigGz = 0;
  let totalMinGz = 0;

  for (const name of targets) {
    const result = processFile(path.join(DATA_DIR, name));
    if (result.skipped) {
      console.log(`${name.padEnd(40)}  SKIPPED: ${result.reason}`);
      continue;
    }
    totalOrig += result.originalBytes;
    totalMin += result.minifiedBytes;
    totalOrigGz += result.originalGz;
    totalMinGz += result.minifiedGz;

    console.log(
      name.padEnd(40) +
      fmtBytes(result.originalBytes).padStart(11) +
      fmtBytes(result.minifiedBytes).padStart(11) +
      pct(result.originalBytes, result.minifiedBytes).padStart(8) +
      fmtBytes(result.originalGz).padStart(11) +
      fmtBytes(result.minifiedGz).padStart(11) +
      pct(result.originalGz, result.minifiedGz).padStart(8) +
      (result.wrote ? '  [written]' : '')
    );
  }

  console.log('-'.repeat(100));
  console.log(
    'TOTAL'.padEnd(40) +
    fmtBytes(totalOrig).padStart(11) +
    fmtBytes(totalMin).padStart(11) +
    pct(totalOrig, totalMin).padStart(8) +
    fmtBytes(totalOrigGz).padStart(11) +
    fmtBytes(totalMinGz).padStart(11) +
    pct(totalOrigGz, totalMinGz).padStart(8)
  );
  console.log('');
  if (!WRITE) {
    console.log('Re-run with --write to apply changes. Gzipped column simulates GitHub Pages delivery.');
  }
}

main();
