import { useState, useMemo, useCallback, Component } from 'react';
import PropTypes from 'prop-types';
import './Sidebar.css';
import StudyDashboard from '../study/StudyDashboard';
import StreakBadge from '../study/StreakBadge';
import HebrewCalendarWidget from '../settings/HebrewCalendarWidget';
import { PARSHIOT, GEMARA_SEDARIM, MISHNAH_SEDARIM } from '../../constants/bookConstants';

// Error boundary for graceful degradation of badge components
class BadgeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Badge component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="badge-error-fallback" style={{
          padding: '8px 12px',
          background: 'var(--surface-secondary, #f3f4f6)',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: 'var(--text-secondary, #6b7280)',
          textAlign: 'center'
        }}>
          <span>📚 Keep studying!</span>
        </div>
      );
    }
    return this.props.children;
  }
}

BadgeErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

// Category display config with themes
const CATEGORIES = {
  torah: {
    name: 'Torah',
    hebrew: 'תורה',
    icon: '📜',
    theme: 'torah-theme',
    description: 'Five Books of Moses'
  },
  neviim: {
    name: "Nevi'im",
    hebrew: 'נביאים',
    icon: '📖',
    theme: 'tanach-theme',
    description: 'Prophets'
  },
  ketuvim: {
    name: 'Ketuvim',
    hebrew: 'כתובים',
    icon: '📚',
    theme: 'tanach-theme',
    description: 'Writings'
  },
  mishnah: {
    name: 'Mishnah',
    hebrew: 'משנה',
    icon: '📗',
    theme: 'mishnah-theme',
    description: 'Oral Law'
  },
  gemara: {
    name: 'Gemara',
    hebrew: 'גמרא',
    icon: '📕',
    theme: 'gemara-theme',
    description: 'Talmud Bavli'
  }
};

// Core book icons - Mishnah tractates inherit from their Gemara counterparts
const BOOK_ICONS = {
  // Torah
  'Genesis': '🌍', 'Exodus': '🔥', 'Leviticus': '⛪', 'Numbers': '🏜️', 'Deuteronomy': '📜',
  // Neviim
  'Joshua': '⚔️', 'Judges': '⚖️', 'I Samuel': '👑', 'II Samuel': '👑', 'I Kings': '🏛️', 'II Kings': '🏛️',
  'Isaiah': '🕊️', 'Jeremiah': '😢', 'Ezekiel': '👁️', 'Hosea': '💔', 'Joel': '🦗', 'Amos': '🐑',
  'Obadiah': '🏔️', 'Jonah': '🐋', 'Micah': '⚖️', 'Nahum': '🦁', 'Habakkuk': '🙏', 'Zephaniah': '🌑',
  'Haggai': '🏗️', 'Zechariah': '🌿', 'Malachi': '✉️',
  // Ketuvim
  'Psalms': '🎵', 'Proverbs': '💡', 'Job': '🎭', 'Song of Songs': '❤️', 'Ruth': '🌾',
  'Lamentations': '😭', 'Ecclesiastes': '⏳', 'Esther': '👸', 'Daniel': '🦁', 'Ezra': '📖',
  'Nehemiah': '🧱', 'I Chronicles': '📝', 'II Chronicles': '📝',
  // Talmud tractates (shared by Mishnah)
  'Berakhot': '🙏', 'Shabbat': '🕯️', 'Eruvin': '🏘️', 'Pesachim': '🍷', 'Shekalim': '💰',
  'Yoma': '⛪', 'Sukkah': '🌿', 'Beitzah': '🥚', 'Rosh Hashanah': '📯', 'Taanit': '🌧️',
  'Megillah': '📜', 'Moed Katan': '📅', 'Chagigah': '🎉', 'Yevamot': '💍', 'Ketubot': '📃',
  'Nedarim': '🤝', 'Nazir': '✂️', 'Sotah': '💔', 'Gittin': '📄', 'Kiddushin': '💒',
  'Bava Kamma': '⚖️', 'Bava Metzia': '🔍', 'Bava Batra': '🏠', 'Sanhedrin': '👨‍⚖️',
  'Makkot': '⚡', 'Shevuot': '✋', 'Avodah Zarah': '🚫', 'Horayot': '📋', 'Zevachim': '🐑',
  'Menachot': '🌾', 'Chullin': '🍖', 'Bekhorot': '🐄', 'Arakhin': '💎', 'Temurah': '🔄',
  'Keritot': '✂️', 'Meilah': '⛪', 'Tamid': '🔥', 'Niddah': '💧',
  // Additional Mishnah-only tractates
  'Peah': '🌾', 'Demai': '❓', 'Kilayim': '🌱', 'Sheviit': '7️⃣', 'Terumot': '🎁',
  'Maasrot': '📊', 'Maaser Sheni': '💰', 'Challah': '🍞', 'Orlah': '🍎', 'Bikkurim': '🧺',
  'Eduyot': '📜', 'Avot': '📖', 'Middot': '📐', 'Kinnim': '🐦', 'Kelim': '🏺',
  'Oholot': '⛺', 'Negaim': '🔬', 'Parah': '🐂', 'Tahorot': '✨', 'Mikvaot': '🌊',
  'Makhshirin': '💦', 'Zavim': '🩺', 'Tevul Yom': '🌅', 'Yadayim': '🤲', 'Oktzin': '🍃'
};

// Get icon for any book (handles "Mishnah X" prefix)
const getBookIcon = (bookName) => {
  // Direct match
  if (BOOK_ICONS[bookName]) return BOOK_ICONS[bookName];
  // Strip "Mishnah " prefix
  const baseName = bookName.replace(/^Mishnah\s+/, '');
  return BOOK_ICONS[baseName] || '📖';
};

function Sidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedBook,
  onBookChange,
  chapters,
  selectedChapter,
  onChapterChange,
  isCollapsed,
  onToggleCollapse,
  bookmarks = [],
  history = [],
  onNavigate,
  onOpenVocabulary
}) {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'saved' | 'progress'
  const [expandedCategory, setExpandedCategory] = useState(selectedCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageRangeFilter, setPageRangeFilter] = useState('all');
  const [expandedSeder, setExpandedSeder] = useState(null); // For Gemara/Mishnah seder accordion
  const [viewMode, setViewMode] = useState('parsha'); // 'parsha' | 'chapters' for Torah
  const [expandedParsha, setExpandedParsha] = useState(null); // For Torah parsha accordion

  // Check if current chapters are Talmud-style (2a, 2b format)
  const isTalmudStyle = useMemo(() => {
    return chapters.length > 0 && /^\d+[ab]$/.test(chapters[0]);
  }, [chapters]);

  // Generate page ranges for Talmud
  const pageRanges = useMemo(() => {
    if (!isTalmudStyle || chapters.length <= 30) return null;
    const ranges = [];
    const chapterCount = chapters.length;
    const rangeSize = 50;
    for (let i = 0; i < chapterCount; i += rangeSize) {
      const start = chapters[i];
      const end = chapters[Math.min(i + rangeSize - 1, chapterCount - 1)];
      ranges.push({ label: `${start}-${end}`, start: i, end: Math.min(i + rangeSize, chapterCount) });
    }
    return ranges;
  }, [chapters, isTalmudStyle]);

  // Filter chapters based on selected range
  const filteredChapters = useMemo(() => {
    if (!pageRanges || pageRangeFilter === 'all') return chapters;
    const range = pageRanges.find(r => r.label === pageRangeFilter);
    return range ? chapters.slice(range.start, range.end) : chapters;
  }, [chapters, pageRanges, pageRangeFilter]);

  // Filter books based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    const filtered = {};
    Object.entries(categories).forEach(([catKey, catData]) => {
      const matchingBooks = catData.books.filter(book =>
        book.toLowerCase().includes(query)
      );
      if (matchingBooks.length > 0) {
        filtered[catKey] = { ...catData, books: matchingBooks };
      }
    });
    return filtered;
  }, [categories, searchQuery]);

  const handleBookSelect = useCallback((book) => {
    for (const cat of Object.keys(categories)) {
      if (categories[cat].books.includes(book)) {
        if (cat !== selectedCategory) onCategoryChange(cat);
        break;
      }
    }
    onBookChange(book);
  }, [categories, selectedCategory, onCategoryChange, onBookChange]);

  // Combined saved items (bookmarks + history)
  const savedCount = (bookmarks?.length || 0) + (history?.length || 0);

  // Collapsed view
  if (isCollapsed) {
    return (
      <aside className="sidebar collapsed" role="navigation">
        <button className="sidebar-toggle" onClick={onToggleCollapse} title="Expand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <nav className="collapsed-nav">
          <button onClick={() => { setActiveTab('browse'); onToggleCollapse(); }} title="Browse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </button>
          <button onClick={() => { setActiveTab('saved'); onToggleCollapse(); }} title="Saved">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
            {savedCount > 0 && <span className="badge">{savedCount}</span>}
          </button>
          <button onClick={() => { setActiveTab('progress'); onToggleCollapse(); }} title="Progress">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sidebar" role="navigation">
      {/* Header */}
      <header className="sidebar-header">
        <h2>📚 Library</h2>
        <button className="sidebar-toggle" onClick={onToggleCollapse} title="Collapse">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </header>

      {/* Tabs - simplified to 3 */}
      <nav className="sidebar-tabs">
        <button
          className={activeTab === 'browse' ? 'active' : ''}
          onClick={() => setActiveTab('browse')}
        >
          📖 Browse
        </button>
        <button
          className={activeTab === 'saved' ? 'active' : ''}
          onClick={() => setActiveTab('saved')}
        >
          🔖 Saved
          {savedCount > 0 && <span className="count">{savedCount}</span>}
        </button>
        <button
          className={activeTab === 'progress' ? 'active' : ''}
          onClick={() => setActiveTab('progress')}
        >
          📊 Progress
        </button>
      </nav>

      {/* Content */}
      <div className="sidebar-content">
        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="browse-panel">
            {/* Search */}
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="search"
                placeholder="Search books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>

            {/* Category accordion */}
            <div className="categories">
              {Object.entries(filteredCategories).map(([catKey, catData]) => {
                const cat = CATEGORIES[catKey] || { name: catKey, icon: '📖' };
                const isExpanded = expandedCategory === catKey;
                const theme = cat.theme || '';

                return (
                  <div key={catKey} className={`category ${theme} ${isExpanded ? 'expanded' : ''}`}>
                    <button
                      className="category-header"
                      onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
                    >
                      <span className="cat-icon">{cat.icon}</span>
                      <span className="cat-name">{cat.name}</span>
                      <span className="cat-hebrew">{cat.hebrew}</span>
                      <span className={`arrow ${isExpanded ? 'up' : ''}`}>▼</span>
                    </button>

                    {isExpanded && (
                      <div className="book-list">
                        {/* ========== TORAH - Parsha-based Navigation ========== */}
                        {catKey === 'torah' && (
                          <>
                            {/* View mode toggle */}
                            <div className="view-mode-toggle">
                              <button
                                className={viewMode === 'parsha' ? 'active' : ''}
                                onClick={() => setViewMode('parsha')}
                              >
                                📜 By Parsha
                              </button>
                              <button
                                className={viewMode === 'chapters' ? 'active' : ''}
                                onClick={() => setViewMode('chapters')}
                              >
                                📖 By Chapter
                              </button>
                            </div>

                            {viewMode === 'parsha' ? (
                              // Parsha-based view
                              <div className="parsha-list">
                                {catData.books.map(book => (
                                  <div key={book} className="torah-book-section">
                                    <div className="torah-book-header">
                                      <span className="book-icon">{getBookIcon(book)}</span>
                                      <span className="book-name">{book}</span>
                                    </div>
                                    <div className="parsha-grid">
                                      {(PARSHIOT[book] || []).map(parsha => (
                                        <button
                                          key={parsha.name}
                                          className={`parsha-btn ${selectedBook === book && expandedParsha === parsha.name ? 'active' : ''}`}
                                          onClick={() => {
                                            handleBookSelect(book);
                                            setExpandedParsha(parsha.name);
                                            onChapterChange(String(parsha.chapters[0]));
                                          }}
                                          title={`${parsha.hebrew} (Ch. ${parsha.chapters[0]}-${parsha.chapters[1]})`}
                                        >
                                          <span className="parsha-icon">{parsha.icon}</span>
                                          <span className="parsha-name">{parsha.hebrew}</span>
                                          <span className="parsha-english">{parsha.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                    {/* Show chapters for selected parsha */}
                                    {selectedBook === book && expandedParsha && (
                                      <div className="parsha-chapters">
                                        {(() => {
                                          const parsha = PARSHIOT[book]?.find(p => p.name === expandedParsha);
                                          if (!parsha) return null;
                                          const chapterRange = [];
                                          for (let i = parsha.chapters[0]; i <= parsha.chapters[1]; i++) {
                                            chapterRange.push(i);
                                          }
                                          return chapterRange.map(ch => (
                                            <button
                                              key={ch}
                                              className={`ch-btn ${selectedChapter === String(ch) ? 'active' : ''}`}
                                              onClick={() => onChapterChange(String(ch))}
                                            >
                                              {ch}
                                            </button>
                                          ));
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              // Classic chapter view
                              catData.books.map(book => (
                                <div key={book} className={`book ${selectedBook === book ? 'selected' : ''}`}>
                                  <button className="book-btn" onClick={() => handleBookSelect(book)}>
                                    <span className="book-icon">{getBookIcon(book)}</span>
                                    <span className="book-name">{book}</span>
                                  </button>
                                  {selectedBook === book && chapters.length > 0 && (
                                    <div className="chapter-grid">
                                      {chapters.map(ch => (
                                        <button
                                          key={ch}
                                          className={`ch-btn ${selectedChapter === ch ? 'active' : ''}`}
                                          onClick={() => onChapterChange(ch)}
                                        >
                                          {ch}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </>
                        )}

                        {/* ========== GEMARA - Seder-based Navigation ========== */}
                        {catKey === 'gemara' && (
                          <div className="seder-list gemara">
                            {Object.entries(GEMARA_SEDARIM).map(([sederKey, seder]) => (
                              <div key={sederKey} className={`seder-section ${expandedSeder === sederKey ? 'expanded' : ''}`}>
                                <button
                                  className="seder-header"
                                  onClick={() => setExpandedSeder(expandedSeder === sederKey ? null : sederKey)}
                                >
                                  <span className="seder-icon">{seder.icon}</span>
                                  <span className="seder-name">{seder.name}</span>
                                  <span className="seder-hebrew">{seder.hebrew}</span>
                                  <span className="seder-count">{seder.tractates.length}</span>
                                  <span className={`arrow ${expandedSeder === sederKey ? 'up' : ''}`}>▼</span>
                                </button>
                                {expandedSeder === sederKey && (
                                  <div className="tractate-list">
                                    {seder.tractates.map(tractate => (
                                      <div key={tractate} className={`tractate ${selectedBook === tractate ? 'selected' : ''}`}>
                                        <button className="tractate-btn" onClick={() => handleBookSelect(tractate)}>
                                          <span className="tractate-icon">{getBookIcon(tractate)}</span>
                                          <span className="tractate-name">{tractate}</span>
                                        </button>
                                        {selectedBook === tractate && chapters.length > 0 && (
                                          <>
                                            {pageRanges && (
                                              <div className="daf-range-header">
                                                <span className="daf-count">{chapters.length} דפים</span>
                                                <div className="page-range-selector">
                                                  <button
                                                    className={`page-range-btn ${pageRangeFilter === 'all' ? 'active' : ''}`}
                                                    onClick={() => setPageRangeFilter('all')}
                                                  >
                                                    All
                                                  </button>
                                                  {pageRanges.map(range => (
                                                    <button
                                                      key={range.label}
                                                      className={`page-range-btn ${pageRangeFilter === range.label ? 'active' : ''}`}
                                                      onClick={() => setPageRangeFilter(range.label)}
                                                    >
                                                      {range.label}
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            <div className="daf-grid">
                                              {filteredChapters.map(daf => (
                                                <button
                                                  key={daf}
                                                  className={`daf-btn ${selectedChapter === daf ? 'active' : ''} ${daf.endsWith('a') ? 'amud-a' : 'amud-b'}`}
                                                  onClick={() => onChapterChange(daf)}
                                                >
                                                  {daf}
                                                </button>
                                              ))}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ========== MISHNAH - Seder-based Navigation ========== */}
                        {catKey === 'mishnah' && (
                          <div className="seder-list mishnah">
                            {Object.entries(MISHNAH_SEDARIM).map(([sederKey, seder]) => (
                              <div key={sederKey} className={`seder-section ${expandedSeder === sederKey ? 'expanded' : ''}`}>
                                <button
                                  className="seder-header"
                                  onClick={() => setExpandedSeder(expandedSeder === sederKey ? null : sederKey)}
                                >
                                  <span className="seder-icon">{seder.icon}</span>
                                  <span className="seder-name">{seder.name}</span>
                                  <span className="seder-hebrew">{seder.hebrew}</span>
                                  <span className="seder-count">{seder.tractates.length}</span>
                                  <span className={`arrow ${expandedSeder === sederKey ? 'up' : ''}`}>▼</span>
                                </button>
                                {expandedSeder === sederKey && (
                                  <div className="tractate-list">
                                    {seder.tractates.map(tractate => {
                                      const displayName = tractate.replace(/^Mishnah\s+/, '');
                                      return (
                                        <div key={tractate} className={`tractate ${selectedBook === tractate ? 'selected' : ''}`}>
                                          <button className="tractate-btn" onClick={() => handleBookSelect(tractate)}>
                                            <span className="tractate-icon">{getBookIcon(tractate)}</span>
                                            <span className="tractate-name">{displayName}</span>
                                          </button>
                                          {selectedBook === tractate && chapters.length > 0 && (
                                            <div className="perek-grid">
                                              {chapters.map(perek => (
                                                <button
                                                  key={perek}
                                                  className={`perek-btn ${selectedChapter === perek ? 'active' : ''}`}
                                                  onClick={() => onChapterChange(perek)}
                                                >
                                                  פרק {perek}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ========== TANACH (Nevi'im/Ketuvim) - Book-based Navigation ========== */}
                        {(catKey === 'neviim' || catKey === 'ketuvim') && (
                          catData.books.map(book => (
                            <div key={book} className={`book ${selectedBook === book ? 'selected' : ''}`}>
                              <button className="book-btn" onClick={() => handleBookSelect(book)}>
                                <span className="book-icon">{getBookIcon(book)}</span>
                                <span className="book-name">{book}</span>
                              </button>
                              {selectedBook === book && chapters.length > 0 && (
                                <div className="chapter-grid">
                                  {chapters.map(ch => (
                                    <button
                                      key={ch}
                                      className={`ch-btn ${selectedChapter === ch ? 'active' : ''}`}
                                      onClick={() => onChapterChange(ch)}
                                    >
                                      {ch}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved Tab (Bookmarks + History combined) */}
        {activeTab === 'saved' && (
          <div className="saved-panel">
            {/* Bookmarks Section */}
            {bookmarks?.length > 0 && (
              <section className="saved-section">
                <h3>🔖 Bookmarks</h3>
                <ul>
                  {bookmarks.map((bm, i) => (
                    <li key={i}>
                      <button onClick={() => onNavigate(bm.book, bm.chapter)}>
                        <strong>{bm.book} {bm.chapter}:{bm.verse}</strong>
                        {bm.hebrew && <span className="preview" dir="rtl">{bm.hebrew.slice(0, 40)}...</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* History Section */}
            {history?.length > 0 && (
              <section className="saved-section">
                <h3>🕐 Recent</h3>
                <ul>
                  {history.slice(0, 10).map((item, i) => (
                    <li key={i}>
                      <button onClick={() => onNavigate(item.book, item.chapter)}>
                        <strong>{item.book} {item.chapter}</strong>
                        <span className="time">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Empty state */}
            {(!bookmarks?.length && !history?.length) && (
              <div className="empty-state">
                <span className="icon">🔖</span>
                <p>No saved items yet</p>
                <small>Bookmark verses or read chapters to see them here</small>
              </div>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="progress-panel">
            <HebrewCalendarWidget
              compact={false}
              showZmanim={true}
              onNavigateToParsha={(parsha) => {
                if (parsha?.name) {
                  onNavigate(parsha.name.includes('Genesis') ? 'Genesis' : 'Genesis', 1);
                }
              }}
            />
            <BadgeErrorBoundary>
              <StreakBadge />
            </BadgeErrorBoundary>
            <StudyDashboard
              compact={true}
              onNavigateToText={(ref) => {
                const parts = ref.split(' ');
                const book = parts.slice(0, -1).join(' ');
                const chapter = parts[parts.length - 1];
                onNavigate(book, parseInt(chapter) || chapter);
              }}
              onOpenVocabulary={onOpenVocabulary}
              onOpenBookmarks={() => setActiveTab('saved')}
              onOpenNotes={() => {}}
            />
          </div>
        )}
      </div>

      {/* Footer - current location */}
      <footer className="sidebar-footer">
        <span className="reading">📍 {selectedBook} {selectedChapter}</span>
      </footer>
    </aside>
  );
}

Sidebar.propTypes = {
  categories: PropTypes.object.isRequired,
  selectedCategory: PropTypes.string.isRequired,
  onCategoryChange: PropTypes.func.isRequired,
  selectedBook: PropTypes.string.isRequired,
  onBookChange: PropTypes.func.isRequired,
  chapters: PropTypes.array.isRequired,
  selectedChapter: PropTypes.string.isRequired,
  onChapterChange: PropTypes.func.isRequired,
  isCollapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func.isRequired,
  bookmarks: PropTypes.array,
  history: PropTypes.array,
  onNavigate: PropTypes.func.isRequired,
  onOpenVocabulary: PropTypes.func
};

Sidebar.defaultProps = {
  isCollapsed: false,
  bookmarks: [],
  history: [],
  onOpenVocabulary: () => {}
};

export default Sidebar;
