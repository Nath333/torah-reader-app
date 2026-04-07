// =============================================================================
// TalmudBrowsers.js - RealiaBrowser & RabbiBrowser components
// Extracted from TalmudToolsTab.js for modular organization
// =============================================================================

import React, { useState, useMemo, lazy, Suspense } from 'react';
import { stripNikud as stripNikudLocal } from '../../constants/talmudStudy';
import { detectRabbis, RABBI_DATABASE } from '../../services/scholarly/namedEntityService';
import { LazyLoadFallback } from './TalmudSharedUI';

const RabbiInfoPanel = lazy(() => import('./RabbiInfoPanel'));
const RealiaPanel = lazy(() => import('./RealiaPanel'));

// =============================================================================
// Realia Browser - Detects and displays measures/currency from text
// =============================================================================

const RealiaBrowser = React.memo(function RealiaBrowser({ text }) {
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Import detectRealiaInText from RealiaPanel
  const detectedTerms = useMemo(() => {
    if (!text) return [];
    // Common Talmudic measures to search for
    const commonTerms = [
      'אמה', 'טפח', 'זרת', 'מיל', 'פרסה', 'ריס',
      'סאה', 'קב', 'לוג', 'רביעית', 'כור', 'איפה',
      'ככר', 'מנה', 'שקל', 'דינר', 'פרוטה', 'זוז', 'מעה',
      'ליטרא', 'סלע'
    ];
    const found = [];
    for (const term of commonTerms) {
      if (text.includes(term)) {
        found.push(term);
      }
    }
    return [...new Set(found)];
  }, [text]);

  if (!text) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">📏</div>
        <div className="empty-title">מידות ומטבעות</div>
        <p className="empty-text">נווט לטקסט תלמודי לזיהוי מידות, משקלות ומטבעות.</p>
      </div>
    );
  }

  return (
    <div className="realia-browser" dir="rtl">
      <div className="browser-header">
        <span className="header-icon">📏</span>
        <span className="header-title">מידות ומטבעות</span>
        {detectedTerms.length > 0 && (
          <span className="header-count">נמצאו {detectedTerms.length}</span>
        )}
      </div>

      {/* Search input */}
      <div className="browser-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חפש מידה או מטבע..."
          className="search-input"
          dir="rtl"
        />
      </div>

      {/* Detected terms from text */}
      {detectedTerms.length > 0 && (
        <div className="detected-section">
          <div className="section-title">נמצא בטקסט:</div>
          <div className="term-chips">
            {detectedTerms.map((term, i) => (
              <button
                key={i}
                className={`term-chip ${selectedTerm === term ? 'active' : ''}`}
                onClick={() => setSelectedTerm(selectedTerm === term ? null : term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected term panel */}
      {selectedTerm && (
        <Suspense fallback={<LazyLoadFallback />}>
          <RealiaPanel
            term={selectedTerm}
            onClose={() => setSelectedTerm(null)}
            onTermClick={(term) => setSelectedTerm(term)}
            compact={false}
          />
        </Suspense>
      )}

      {/* Quick reference if no selection */}
      {!selectedTerm && (
        <div className="quick-reference">
          <div className="ref-section">
            <div className="ref-title">💰 מטבעות</div>
            <div className="ref-list">
              {['פרוטה', 'מעה', 'איסר', 'דינר', 'שקל', 'מנה', 'ככר'].map(term => (
                <button key={term} className="ref-btn" onClick={() => setSelectedTerm(term)}>{term}</button>
              ))}
            </div>
          </div>
          <div className="ref-section">
            <div className="ref-title">📏 אורך</div>
            <div className="ref-list">
              {['אצבע', 'טפח', 'זרת', 'אמה', 'מיל', 'פרסה'].map(term => (
                <button key={term} className="ref-btn" onClick={() => setSelectedTerm(term)}>{term}</button>
              ))}
            </div>
          </div>
          <div className="ref-section">
            <div className="ref-title">🫗 נפח</div>
            <div className="ref-list">
              {['רביעית', 'לוג', 'קב', 'סאה', 'כור'].map(term => (
                <button key={term} className="ref-btn" onClick={() => setSelectedTerm(term)}>{term}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Rabbi Browser - Detects and displays sage biographies from text
// =============================================================================

const RabbiBrowser = React.memo(function RabbiBrowser({ text }) {
  const [selectedRabbi, setSelectedRabbi] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

// Enhanced rabbi detection using namedEntityService
  const detectedRabbis = useMemo(() => {
    if (!text) return [];

    // Strip nikud for better matching (use imported stripNikudLocal from talmudStudy)
    const cleanText = stripNikudLocal(text);

    // Use the proper detectRabbis function from namedEntityService
    const detected = detectRabbis(cleanText);

    // Also do fallback pattern matching for names not in database
    const fallbackPatterns = [
      // Multi-word rabbi names: רבי X בן/בר Y
      /(?:רבי|רב|ר'|ר׳|רבן)\s+[\u0590-\u05FF]+(?:\s+(?:בן|בר|ב"ר|ב״ר)\s+[\u0590-\u05FF]+)?/g,
      // Famous Amoraim without title
      /\b(?:אביי|רבא|רבינא|אמימר|מר זוטרא|רבה|רב אשי|רב פפא|רב הונא|רב נחמן|רב יהודה|רב חסדא|רב ששת|שמואל)\b/g,
      // Schools
      /בית (?:הלל|שמאי)/g,
      // Tannaim
      /\b(?:הלל|שמאי|עקיבא|ישמעאל|טרפון|מאיר|יהודה|יוסי|שמעון)\b/g
    ];

    const foundNames = new Map(); // Use Map to dedupe and keep metadata

    // Add results from detectRabbis (has full metadata)
    detected.forEach(r => {
      const key = r.hebrew || r.english;
      if (key && !foundNames.has(key)) {
        foundNames.set(key, {
          name: key,
          english: r.english,
          period: r.period,
          generation: r.generation,
          location: r.location,
          note: r.note
        });
      }
    });

    // Add fallback pattern matches
    for (const pattern of fallbackPatterns) {
      const matches = cleanText.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const trimmed = m.trim();
          if (trimmed && !foundNames.has(trimmed)) {
            // Check if this name is in RABBI_DATABASE for metadata
            const allRabbis = { ...RABBI_DATABASE.tannaim, ...RABBI_DATABASE.amoraim };
            const dbEntry = allRabbis[trimmed];
            foundNames.set(trimmed, {
              name: trimmed,
              english: dbEntry?.name || null,
              period: dbEntry?.period || null,
              generation: dbEntry?.generation || null,
              location: dbEntry?.location || null,
              note: dbEntry?.note || null
            });
          }
        });
      }
    }

    // Convert to array and sort by period (Tannaim first, then Amoraim)
    return [...foundNames.values()]
      .sort((a, b) => {
        const periodOrder = { tanna: 0, amora: 1 };
        const aOrder = periodOrder[a.period] ?? 2;
        const bOrder = periodOrder[b.period] ?? 2;
        return aOrder - bOrder;
      })
      .slice(0, 15); // Limit to 15 sages
  }, [text]);

  if (!text) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">👤</div>
        <div className="empty-title">חכמי התלמוד</div>
        <p className="empty-text">נווט לטקסט תלמודי לזיהוי שמות חכמים ותולדותיהם.</p>
      </div>
    );
  }

  return (
    <div className="rabbi-browser" dir="rtl">
      <div className="browser-header">
        <span className="header-icon">👤</span>
        <span className="header-title">חכמי התלמוד</span>
        {detectedRabbis.length > 0 && (
          <span className="header-count">נמצאו {detectedRabbis.length}</span>
        )}
      </div>

      {/* Search input */}
      <div className="browser-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              setSelectedRabbi(searchQuery.trim());
            }
          }}
          placeholder="חפש חכם..."
          className="search-input"
          dir="rtl"
        />
        <button
          className="search-btn"
          onClick={() => searchQuery.trim() && setSelectedRabbi(searchQuery.trim())}
        >
          🔍
        </button>
      </div>

      {/* Detected rabbis from text */}
      {detectedRabbis.length > 0 && (
        <div className="detected-section">
          <div className="section-title">נמצא בטקסט ({detectedRabbis.length}):</div>
          <div className="rabbi-chips">
            {detectedRabbis.map((rabbi, i) => {
              const rabbiName = typeof rabbi === 'string' ? rabbi : rabbi.name;
              const isSelected = selectedRabbi &&
                (typeof selectedRabbi === 'string' ? selectedRabbi === rabbiName : selectedRabbi.name === rabbiName);
              const period = typeof rabbi === 'object' ? rabbi.period : null;
              return (
                <button
                  key={rabbiName || i}
                  className={`rabbi-chip ${isSelected ? 'active' : ''} ${period ? `period-${period}` : ''}`}
                  onClick={() => setSelectedRabbi(isSelected ? null : rabbi)}
                  title={typeof rabbi === 'object' && rabbi.english ? rabbi.english : ''}
                >
                  {rabbiName}
                  {period && <span className="period-badge">{period === 'tanna' ? 'ת' : 'א'}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected rabbi panel */}
      {selectedRabbi && (
        <Suspense fallback={<LazyLoadFallback />}>
          <RabbiInfoPanel
            rabbiName={typeof selectedRabbi === 'string' ? selectedRabbi : selectedRabbi.name}
            onClose={() => setSelectedRabbi(null)}
            onNavigate={(name) => setSelectedRabbi(name)}
            compact={false}
          />
        </Suspense>
      )}

      {/* Quick reference if no selection */}
      {!selectedRabbi && detectedRabbis.length === 0 && (
        <div className="quick-reference">
          <div className="ref-section">
            <div className="ref-title">📜 תנאים</div>
            <div className="ref-list">
              {['הלל', 'שמאי', 'רבי עקיבא', 'רבי מאיר', 'רבי יהודה'].map(name => (
                <button key={name} className="ref-btn" onClick={() => setSelectedRabbi(name)}>{name}</button>
              ))}
            </div>
          </div>
          <div className="ref-section">
            <div className="ref-title">📖 אמוראים</div>
            <div className="ref-list">
              {['אביי', 'רבא', 'רב', 'שמואל', 'רבינא', 'רב אשי'].map(name => (
                <button key={name} className="ref-btn" onClick={() => setSelectedRabbi(name)}>{name}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export { RealiaBrowser, RabbiBrowser };
