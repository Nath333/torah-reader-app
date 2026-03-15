import React, { useState, useEffect, useCallback } from 'react';
import { getTextVersions, getTextWithVersion } from '../services/sefariaApi';
import './TextVersions.css';

function TextVersions({ book, chapter, verse, onClose }) {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionText, setVersionText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [textLoading, setTextLoading] = useState(false);
  const [error, setError] = useState(null);

  // Build reference string
  const ref = verse
    ? `${book}.${chapter}.${verse}`
    : `${book}.${chapter}`;

  // Fetch available versions
  useEffect(() => {
    const fetchVersions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTextVersions(book);
        // Group versions by language
        const grouped = data.reduce((acc, v) => {
          const lang = v.language || 'other';
          if (!acc[lang]) acc[lang] = [];
          acc[lang].push(v);
          return acc;
        }, {});
        setVersions(grouped);
      } catch (err) {
        setError('Failed to load versions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (book) {
      fetchVersions();
    }
  }, [book]);

  // Fetch text for selected version
  const handleVersionSelect = useCallback(async (version) => {
    setSelectedVersion(version);
    setTextLoading(true);
    try {
      const text = await getTextWithVersion(ref, version.versionTitle);
      setVersionText(text);
    } catch (err) {
      console.error('Failed to load version text:', err);
    } finally {
      setTextLoading(false);
    }
  }, [ref]);

  // Get total version count
  const getTotalVersions = () => {
    return Object.values(versions).reduce((sum, arr) => sum + arr.length, 0);
  };

  if (loading) {
    return (
      <div className="text-versions">
        <div className="versions-header">
          <h3>Text Versions</h3>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="versions-loading">
          <div className="loading-spinner" />
          <p>Loading versions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-versions">
        <div className="versions-header">
          <h3>Text Versions</h3>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="versions-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-versions">
      <div className="versions-header">
        <div className="header-info">
          <h3>Text Versions</h3>
          <span className="version-count">{getTotalVersions()} available</span>
        </div>
        <span className="versions-ref">{book}</span>
        {onClose && (
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="versions-content">
        {getTotalVersions() === 0 ? (
          <div className="versions-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No versions found for this text</p>
          </div>
        ) : (
          <div className="versions-grid">
            {/* Hebrew Versions */}
            {versions.he && versions.he.length > 0 && (
              <div className="version-group">
                <h4 className="group-label">
                  <span className="label-icon he">עב</span>
                  Hebrew Versions
                </h4>
                <div className="version-list">
                  {versions.he.map((v, idx) => (
                    <button
                      key={idx}
                      className={`version-item ${selectedVersion?.versionTitle === v.versionTitle ? 'active' : ''}`}
                      onClick={() => handleVersionSelect(v)}
                    >
                      <span className="version-title">{v.versionTitle}</span>
                      {v.versionSource && (
                        <span className="version-source">{extractDomain(v.versionSource)}</span>
                      )}
                      {v.status && (
                        <span className={`version-status ${v.status.toLowerCase()}`}>{v.status}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* English Versions */}
            {versions.en && versions.en.length > 0 && (
              <div className="version-group">
                <h4 className="group-label">
                  <span className="label-icon en">EN</span>
                  English Translations
                </h4>
                <div className="version-list">
                  {versions.en.map((v, idx) => (
                    <button
                      key={idx}
                      className={`version-item ${selectedVersion?.versionTitle === v.versionTitle ? 'active' : ''}`}
                      onClick={() => handleVersionSelect(v)}
                    >
                      <span className="version-title">{v.versionTitle}</span>
                      {v.versionSource && (
                        <span className="version-source">{extractDomain(v.versionSource)}</span>
                      )}
                      {v.status && (
                        <span className={`version-status ${v.status.toLowerCase()}`}>{v.status}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Other Languages */}
            {Object.entries(versions)
              .filter(([lang]) => !['he', 'en'].includes(lang))
              .map(([lang, versionList]) => (
                <div className="version-group" key={lang}>
                  <h4 className="group-label">
                    <span className="label-icon other">{lang.toUpperCase().slice(0, 2)}</span>
                    {getLanguageName(lang)}
                  </h4>
                  <div className="version-list">
                    {versionList.map((v, idx) => (
                      <button
                        key={idx}
                        className={`version-item ${selectedVersion?.versionTitle === v.versionTitle ? 'active' : ''}`}
                        onClick={() => handleVersionSelect(v)}
                      >
                        <span className="version-title">{v.versionTitle}</span>
                        {v.versionSource && (
                          <span className="version-source">{extractDomain(v.versionSource)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Selected Version Text Preview */}
        {selectedVersion && (
          <div className="version-preview">
            <div className="preview-header">
              <h4>{selectedVersion.versionTitle}</h4>
              {selectedVersion.versionNotes && (
                <p className="version-notes">{selectedVersion.versionNotes}</p>
              )}
            </div>

            {textLoading ? (
              <div className="preview-loading">
                <div className="loading-spinner small" />
              </div>
            ) : versionText ? (
              <div className="preview-text">
                {versionText.he && Array.isArray(versionText.he) && versionText.he.length > 0 && (
                  <p className="text-he" dir="rtl">
                    {versionText.he.slice(0, 3).map(stripHtml).join(' ')}
                    {versionText.he.length > 3 && '...'}
                  </p>
                )}
                {versionText.text && Array.isArray(versionText.text) && versionText.text.length > 0 && (
                  <p className="text-en">
                    {versionText.text.slice(0, 3).map(stripHtml).join(' ')}
                    {versionText.text.length > 3 && '...'}
                  </p>
                )}
              </div>
            ) : null}

            {selectedVersion.versionSource && (
              <a
                href={selectedVersion.versionSource}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link"
              >
                View Source
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to extract domain from URL
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// Helper to get language name
function getLanguageName(code) {
  const names = {
    fr: 'French',
    de: 'German',
    ru: 'Russian',
    es: 'Spanish',
    ar: 'Arabic',
    yi: 'Yiddish',
    la: 'Latin',
    it: 'Italian',
    pt: 'Portuguese'
  };
  return names[code] || code.charAt(0).toUpperCase() + code.slice(1);
}

// Helper to strip HTML
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export default TextVersions;
