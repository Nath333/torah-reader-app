/**
 * HalachaView Component
 * Practical Law Derivation analysis view
 */

import React, { memo } from 'react';
import { InfoCard, SefariaLink, KeywordChips } from '../SharedComponents';

/**
 * Halacha View - Practical Law Derivation
 */
function HalachaView({
  data,
  onSourceClick,
  onWordLookup
}) {
  return (
    <div className="halacha-view">
      {/* Summary */}
      {data.summary && (
        <div className="context-banner halacha-banner">
          <span className="halacha-title">⚖️ הֲלָכָה - Practical Law</span>
          <p>{data.summary}</p>
        </div>
      )}

      {/* Key Halachic Terms - clickable for word lookup */}
      {data.keyTerms && data.keyTerms.length > 0 && (
        <InfoCard icon="🔤" title="Key Halachic Terms">
          <KeywordChips keywords={data.keyTerms} onWordLookup={onWordLookup} />
        </InfoCard>
      )}

      {/* Mitzvot Section */}
      {data.mitzvot && data.mitzvot.length > 0 && (
        <div className="mitzvot-section">
          <h4>📜 Mitzvot Derived</h4>
          <div className="mitzvot-grid">
            {data.mitzvot.map((m, i) => (
              <div key={i} className={`mitzvah-card ${m.type?.includes('Positive') ? 'aseh' : 'lo-taaseh'}`}>
                <div className="mitzvah-header">
                  <span className="mitzvah-type">{m.type?.includes('Positive') ? '✓' : '✗'}</span>
                  <span className="mitzvah-name">{m.mitzvah || m.name}</span>
                </div>
                {m.source && (
                  <p className="mitzvah-source">
                    <strong>Source:</strong>{' '}
                    <SefariaLink reference={m.source} className="inline-source-link">
                      {m.source}
                    </SefariaLink>
                  </p>
                )}
                {m.rambamReference && (
                  <p className="mitzvah-rambam">
                    <strong>Rambam:</strong>{' '}
                    <SefariaLink reference={`Mishneh Torah, ${m.rambamReference}`} className="inline-source-link">
                      {m.rambamReference}
                    </SefariaLink>
                  </p>
                )}
                {m.category && <span className="mitzvah-category">{m.category}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Talmud Sources */}
      {data.talmudSources && data.talmudSources.length > 0 && (
        <InfoCard icon="📚" title="Talmudic Sources">
          <div className="talmud-sources">
            {data.talmudSources.map((s, i) => (
              <div key={i} className="talmud-source-item">
                <SefariaLink reference={s.reference} className="source-ref clickable">
                  {s.reference}
                </SefariaLink>
                <span className="source-topic">{s.topic}</span>
                {s.relevance && <p className="source-relevance">{s.relevance}</p>}
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Halachic Principles */}
      {data.halachicPrinciples && data.halachicPrinciples.length > 0 && (
        <InfoCard icon="📋" title="Halachic Principles">
          <ul className="principles-list">
            {data.halachicPrinciples.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </InfoCard>
      )}

      {/* Modern Application */}
      {data.modernApplication && (
        <InfoCard icon="🏠" title="Modern Application" className="modern-app-card">
          <p>{data.modernApplication}</p>
        </InfoCard>
      )}

      {/* Practical Guidance */}
      {data.practicalGuidance && (
        <div className="practical-guidance">
          <h4>✅ Practical Guidance</h4>
          <p>{data.practicalGuidance}</p>
        </div>
      )}

      {/* Machloket (Disputes) */}
      {data.machloket && (
        <InfoCard icon="⚔️" title="Disputes" className="machloket-card">
          <p>{data.machloket}</p>
        </InfoCard>
      )}
    </div>
  );
}

export default memo(HalachaView);
