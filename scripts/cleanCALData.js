/**
 * Clean CAL Aramaic Data - Remove HTML tags and clean up definitions
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'public/data';
const calPath = path.join(DATA_DIR, 'cal_aramaic.json');

console.log('Cleaning CAL Aramaic data...');

// Load data
const calData = JSON.parse(fs.readFileSync(calPath, 'utf8'));
const originalCount = Object.keys(calData).length;

// Helper to clean HTML
function cleanHtml(text) {
  if (!text) return text;

  return text
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    // Clean up leading/trailing punctuation issues
    .replace(/^\s*[,;:]\s*/, '')
    .replace(/\s*[,;:]\s*$/, '')
    // Remove "v." references at start
    .replace(/^\s*v\.\s*/i, '')
    // Trim
    .trim();
}

// Clean each entry
let cleaned = 0;
for (const [word, entry] of Object.entries(calData)) {
  if (entry.definition) {
    const original = entry.definition;
    entry.definition = cleanHtml(entry.definition);

    // If definition is empty or too short after cleaning, try to fix
    if (!entry.definition || entry.definition.length < 3) {
      // Keep the entry but mark it
      entry.definition = `[Aramaic: ${word}]`;
    }

    if (original !== entry.definition) {
      cleaned++;
    }
  }

  // Clean other fields
  if (entry.notes) {
    entry.notes = cleanHtml(entry.notes);
  }

  // Remove internal tracking field
  delete entry._fetchedAt;
}

// Save cleaned data
fs.writeFileSync(calPath, JSON.stringify(calData, null, 2));

console.log(`Cleaned ${cleaned} entries`);
console.log(`Total entries: ${Object.keys(calData).length}`);

// Show sample cleaned entries
console.log('\nSample entries:');
const samples = Object.entries(calData).slice(0, 8);
for (const [word, entry] of samples) {
  console.log(`  ${word}: ${(entry.definition || '').substring(0, 70)}...`);
}
