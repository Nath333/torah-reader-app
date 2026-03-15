import React, { useState, useMemo } from 'react';
import './Sidebar.css';
import StudyDashboard from './StudyDashboard';

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
  bookmarks,
  history,
  onNavigate,
  onOpenVocabulary
}) {
  const [activeTab, setActiveTab] = useState('books'); // 'books', 'bookmarks', 'history', 'study'
  const [expandedCategory, setExpandedCategory] = useState(selectedCategory);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter books based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const filtered = {};
    Object.entries(categories).forEach(([catKey, catData]) => {
      const matchingBooks = catData.books.filter(book =>
        book.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matchingBooks.length > 0) {
        filtered[catKey] = { ...catData, books: matchingBooks };
      }
    });
    return filtered;
  }, [categories, searchQuery]);

  // Category display names
  const categoryNames = {
    torah: { name: 'Torah', hebrew: 'תורה', icon: '📜' },
    neviim: { name: "Nevi'im", hebrew: 'נביאים', icon: '📖' },
    ketuvim: { name: 'Ketuvim', hebrew: 'כתובים', icon: '📚' },
    mishnah: { name: 'Mishnah', hebrew: 'משנה', icon: '📗' },
    gemara: { name: 'Gemara', hebrew: 'גמרא', icon: '📕' }
  };

  // Book icons - visual icons for each book
  const bookIcons = {
    // Torah
    'Genesis': { icon: '🌍', color: '#10b981' },
    'Exodus': { icon: '🔥', color: '#ef4444' },
    'Leviticus': { icon: '⛪', color: '#8b5cf6' },
    'Numbers': { icon: '🏜️', color: '#f59e0b' },
    'Deuteronomy': { icon: '📜', color: '#3b82f6' },
    // Neviim
    'Joshua': { icon: '⚔️', color: '#dc2626' },
    'Judges': { icon: '⚖️', color: '#7c3aed' },
    'I Samuel': { icon: '👑', color: '#f59e0b' },
    'II Samuel': { icon: '👑', color: '#d97706' },
    'I Kings': { icon: '🏛️', color: '#0ea5e9' },
    'II Kings': { icon: '🏛️', color: '#0284c7' },
    'Isaiah': { icon: '🕊️', color: '#8b5cf6' },
    'Jeremiah': { icon: '😢', color: '#6366f1' },
    'Ezekiel': { icon: '👁️', color: '#a855f7' },
    'Hosea': { icon: '💔', color: '#ec4899' },
    'Joel': { icon: '🦗', color: '#84cc16' },
    'Amos': { icon: '🐑', color: '#22c55e' },
    'Obadiah': { icon: '🏔️', color: '#78716c' },
    'Jonah': { icon: '🐋', color: '#06b6d4' },
    'Micah': { icon: '⚖️', color: '#f97316' },
    'Nahum': { icon: '🦁', color: '#eab308' },
    'Habakkuk': { icon: '🙏', color: '#14b8a6' },
    'Zephaniah': { icon: '🌑', color: '#64748b' },
    'Haggai': { icon: '🏗️', color: '#f59e0b' },
    'Zechariah': { icon: '🌿', color: '#22c55e' },
    'Malachi': { icon: '✉️', color: '#6366f1' },
    // Ketuvim
    'Psalms': { icon: '🎵', color: '#8b5cf6' },
    'Proverbs': { icon: '💡', color: '#f59e0b' },
    'Job': { icon: '🎭', color: '#64748b' },
    'Song of Songs': { icon: '❤️', color: '#ec4899' },
    'Ruth': { icon: '🌾', color: '#84cc16' },
    'Lamentations': { icon: '😭', color: '#6b7280' },
    'Ecclesiastes': { icon: '⏳', color: '#78716c' },
    'Esther': { icon: '👸', color: '#a855f7' },
    'Daniel': { icon: '🦁', color: '#f97316' },
    'Ezra': { icon: '📖', color: '#3b82f6' },
    'Nehemiah': { icon: '🧱', color: '#78716c' },
    'I Chronicles': { icon: '📝', color: '#6366f1' },
    'II Chronicles': { icon: '📝', color: '#4f46e5' },
    // Talmud / Gemara tractates
    'Berakhot': { icon: '🙏', color: '#8b5cf6' },
    'Shabbat': { icon: '🕯️', color: '#f59e0b' },
    'Eruvin': { icon: '🏘️', color: '#10b981' },
    'Pesachim': { icon: '🍷', color: '#dc2626' },
    'Shekalim': { icon: '💰', color: '#eab308' },
    'Yoma': { icon: '⛪', color: '#f97316' },
    'Sukkah': { icon: '🌿', color: '#22c55e' },
    'Beitzah': { icon: '🥚', color: '#fbbf24' },
    'Rosh Hashanah': { icon: '📯', color: '#7c3aed' },
    'Taanit': { icon: '🌧️', color: '#6b7280' },
    'Megillah': { icon: '📜', color: '#ec4899' },
    'Moed Katan': { icon: '📅', color: '#14b8a6' },
    'Chagigah': { icon: '🎉', color: '#a855f7' },
    'Yevamot': { icon: '💍', color: '#f472b6' },
    'Ketubot': { icon: '📃', color: '#fb923c' },
    'Nedarim': { icon: '🤝', color: '#84cc16' },
    'Nazir': { icon: '✂️', color: '#78716c' },
    'Sotah': { icon: '💔', color: '#f43f5e' },
    'Gittin': { icon: '📄', color: '#64748b' },
    'Kiddushin': { icon: '💒', color: '#e879f9' },
    'Bava Kamma': { icon: '⚖️', color: '#ef4444' },
    'Bava Metzia': { icon: '🔍', color: '#3b82f6' },
    'Bava Batra': { icon: '🏠', color: '#0ea5e9' },
    'Sanhedrin': { icon: '👨‍⚖️', color: '#7c3aed' },
    'Makkot': { icon: '⚡', color: '#dc2626' },
    'Shevuot': { icon: '✋', color: '#6366f1' },
    'Avodah Zarah': { icon: '🚫', color: '#78716c' },
    'Horayot': { icon: '📋', color: '#14b8a6' },
    'Zevachim': { icon: '🐑', color: '#f59e0b' },
    'Menachot': { icon: '🌾', color: '#84cc16' },
    'Chullin': { icon: '🍖', color: '#ef4444' },
    'Bekhorot': { icon: '🐄', color: '#a3a3a3' },
    'Arakhin': { icon: '💎', color: '#8b5cf6' },
    'Temurah': { icon: '🔄', color: '#06b6d4' },
    'Keritot': { icon: '✂️', color: '#f97316' },
    'Meilah': { icon: '⛪', color: '#ec4899' },
    'Tamid': { icon: '🔥', color: '#f59e0b' },
    'Niddah': { icon: '💧', color: '#0ea5e9' },
    // Mishnah tractates (same names with "Mishnah " prefix)
    'Mishnah Berakhot': { icon: '🙏', color: '#8b5cf6' },
    'Mishnah Shabbat': { icon: '🕯️', color: '#f59e0b' },
    'Mishnah Eruvin': { icon: '🏘️', color: '#10b981' },
    'Mishnah Pesachim': { icon: '🍷', color: '#dc2626' },
    'Mishnah Shekalim': { icon: '💰', color: '#eab308' },
    'Mishnah Yoma': { icon: '⛪', color: '#f97316' },
    'Mishnah Sukkah': { icon: '🌿', color: '#22c55e' },
    'Mishnah Beitzah': { icon: '🥚', color: '#fbbf24' },
    'Mishnah Rosh Hashanah': { icon: '📯', color: '#7c3aed' },
    'Mishnah Taanit': { icon: '🌧️', color: '#6b7280' },
    'Mishnah Megillah': { icon: '📜', color: '#ec4899' },
    'Mishnah Moed Katan': { icon: '📅', color: '#14b8a6' },
    'Mishnah Chagigah': { icon: '🎉', color: '#a855f7' },
    'Mishnah Yevamot': { icon: '💍', color: '#f472b6' },
    'Mishnah Ketubot': { icon: '📃', color: '#fb923c' },
    'Mishnah Nedarim': { icon: '🤝', color: '#84cc16' },
    'Mishnah Nazir': { icon: '✂️', color: '#78716c' },
    'Mishnah Sotah': { icon: '💔', color: '#f43f5e' },
    'Mishnah Gittin': { icon: '📄', color: '#64748b' },
    'Mishnah Kiddushin': { icon: '💒', color: '#e879f9' },
    'Mishnah Bava Kamma': { icon: '⚖️', color: '#ef4444' },
    'Mishnah Bava Metzia': { icon: '🔍', color: '#3b82f6' },
    'Mishnah Bava Batra': { icon: '🏠', color: '#0ea5e9' },
    'Mishnah Sanhedrin': { icon: '👨‍⚖️', color: '#7c3aed' },
    'Mishnah Makkot': { icon: '⚡', color: '#dc2626' },
    'Mishnah Shevuot': { icon: '✋', color: '#6366f1' },
    'Mishnah Avodah Zarah': { icon: '🚫', color: '#78716c' },
    'Mishnah Horayot': { icon: '📋', color: '#14b8a6' },
    'Mishnah Zevachim': { icon: '🐑', color: '#f59e0b' },
    'Mishnah Menachot': { icon: '🌾', color: '#84cc16' },
    'Mishnah Chullin': { icon: '🍖', color: '#ef4444' },
    'Mishnah Bekhorot': { icon: '🐄', color: '#a3a3a3' },
    'Mishnah Arakhin': { icon: '💎', color: '#8b5cf6' },
    'Mishnah Temurah': { icon: '🔄', color: '#06b6d4' },
    'Mishnah Keritot': { icon: '✂️', color: '#f97316' },
    'Mishnah Meilah': { icon: '⛪', color: '#ec4899' },
    'Mishnah Tamid': { icon: '🔥', color: '#f59e0b' },
    'Mishnah Niddah': { icon: '💧', color: '#0ea5e9' },
    'Mishnah Peah': { icon: '🌾', color: '#22c55e' },
    'Mishnah Demai': { icon: '❓', color: '#6b7280' },
    'Mishnah Kilayim': { icon: '🌱', color: '#84cc16' },
    'Mishnah Sheviit': { icon: '7️⃣', color: '#10b981' },
    'Mishnah Terumot': { icon: '🎁', color: '#f59e0b' },
    'Mishnah Maasrot': { icon: '📊', color: '#3b82f6' },
    'Mishnah Maaser Sheni': { icon: '💰', color: '#eab308' },
    'Mishnah Challah': { icon: '🍞', color: '#d97706' },
    'Mishnah Orlah': { icon: '🍎', color: '#ef4444' },
    'Mishnah Bikkurim': { icon: '🧺', color: '#22c55e' },
    'Mishnah Eduyot': { icon: '📜', color: '#6366f1' },
    'Mishnah Avot': { icon: '📖', color: '#8b5cf6' },
    'Mishnah Middot': { icon: '📐', color: '#78716c' },
    'Mishnah Kinnim': { icon: '🐦', color: '#06b6d4' },
    'Mishnah Kelim': { icon: '🏺', color: '#a3a3a3' },
    'Mishnah Oholot': { icon: '⛺', color: '#64748b' },
    'Mishnah Negaim': { icon: '🔬', color: '#f43f5e' },
    'Mishnah Parah': { icon: '🐂', color: '#dc2626' },
    'Mishnah Tahorot': { icon: '✨', color: '#14b8a6' },
    'Mishnah Mikvaot': { icon: '🌊', color: '#0ea5e9' },
    'Mishnah Makhshirin': { icon: '💦', color: '#06b6d4' },
    'Mishnah Zavim': { icon: '🩺', color: '#78716c' },
    'Mishnah Tevul Yom': { icon: '🌅', color: '#f97316' },
    'Mishnah Yadayim': { icon: '🤲', color: '#8b5cf6' },
    'Mishnah Oktzin': { icon: '🍃', color: '#22c55e' },
    // Default
    'default': { icon: '📖', color: '#5b4cdb' }
  };

  const getBookIcon = (bookName) => {
    return bookIcons[bookName] || bookIcons['default'];
  };

  const handleBookSelect = (book) => {
    // Find category for the book
    for (const [cat] of Object.entries(categories)) {
      if (categories[cat].books.includes(book)) {
        if (cat !== selectedCategory) {
          onCategoryChange(cat);
        }
        break;
      }
    }
    onBookChange(book);
  };

  const handleChapterSelect = (chapter) => {
    onChapterChange(chapter);
  };

  if (isCollapsed) {
    return (
      <aside className="sidebar collapsed">
        <button className="sidebar-toggle" onClick={onToggleCollapse} title="Expand sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <div className="sidebar-collapsed-icons">
          <button
            className={activeTab === 'books' ? 'active' : ''}
            onClick={() => { setActiveTab('books'); onToggleCollapse(); }}
            title="Browse Books"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </button>
          <button
            className={activeTab === 'bookmarks' ? 'active' : ''}
            onClick={() => { setActiveTab('bookmarks'); onToggleCollapse(); }}
            title="Bookmarks"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
            {bookmarks?.length > 0 && <span className="mini-badge">{bookmarks.length}</span>}
          </button>
          <button
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => { setActiveTab('history'); onToggleCollapse(); }}
            title="History"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button
            className={activeTab === 'study' ? 'active' : ''}
            onClick={() => { setActiveTab('study'); onToggleCollapse(); }}
            title="Study Dashboard"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Navigation</h2>
        <button className="sidebar-toggle" onClick={onToggleCollapse} title="Collapse sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Tab buttons */}
      <div className="sidebar-tabs">
        <button
          className={activeTab === 'books' ? 'active' : ''}
          onClick={() => setActiveTab('books')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          Books
        </button>
        <button
          className={activeTab === 'bookmarks' ? 'active' : ''}
          onClick={() => setActiveTab('bookmarks')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          Bookmarks
          {bookmarks?.length > 0 && <span className="tab-badge">{bookmarks.length}</span>}
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          History
        </button>
        <button
          className={activeTab === 'study' ? 'active' : ''}
          onClick={() => setActiveTab('study')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Study
        </button>
      </div>

      {/* Tab content */}
      <div className="sidebar-content">
        {activeTab === 'books' && (
          <div className="books-browser">
            {/* Search */}
            <div className="sidebar-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Category list */}
            <div className="category-list">
              {Object.entries(filteredCategories).map(([catKey, catData]) => (
                <div key={catKey} className="category-section">
                  <button
                    className={`category-header ${expandedCategory === catKey ? 'expanded' : ''}`}
                    onClick={() => {
                      setExpandedCategory(expandedCategory === catKey ? null : catKey);
                    }}
                  >
                    <span className="category-icon">{categoryNames[catKey]?.icon || '📖'}</span>
                    <span className="category-name">{categoryNames[catKey]?.name || catKey}</span>
                    <span className="category-hebrew">{categoryNames[catKey]?.hebrew || ''}</span>
                    <svg className="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {expandedCategory === catKey && (
                    <div className="book-list">
                      {catData.books.map(book => {
                        const bookIcon = getBookIcon(book);
                        return (
                        <div key={book} className={`book-item ${selectedBook === book ? 'selected' : ''}`}>
                          <button
                            className="book-name"
                            onClick={() => handleBookSelect(book)}
                          >
                            <span
                              className="book-icon"
                              style={{ background: `${bookIcon.color}20`, color: bookIcon.color }}
                            >
                              {bookIcon.icon}
                            </span>
                            <span className="book-title">{book}</span>
                          </button>

                          {/* Show chapters if this book is selected */}
                          {selectedBook === book && chapters.length > 0 && (
                            <div className="chapter-grid">
                              {chapters.map(ch => (
                                <button
                                  key={ch}
                                  className={`chapter-btn ${selectedChapter === ch ? 'selected' : ''}`}
                                  onClick={() => handleChapterSelect(ch)}
                                >
                                  {ch}
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
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="bookmarks-list">
            {bookmarks?.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                <p>No bookmarks yet</p>
                <span>Click the bookmark icon on any verse to save it here</span>
              </div>
            ) : (
              bookmarks.map((bookmark, index) => (
                <button
                  key={index}
                  className="bookmark-item"
                  onClick={() => onNavigate(bookmark.book, bookmark.chapter)}
                >
                  <div className="bookmark-ref">
                    {bookmark.book} {bookmark.chapter}:{bookmark.verse}
                  </div>
                  <div className="bookmark-preview" dir="rtl">
                    {bookmark.hebrew?.substring(0, 50)}...
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-list">
            {history?.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <p>No reading history</p>
                <span>Your recently read chapters will appear here</span>
              </div>
            ) : (
              history.map((item, index) => (
                <button
                  key={index}
                  className="history-item"
                  onClick={() => onNavigate(item.book, item.chapter)}
                >
                  <div className="history-ref">
                    {item.book} {item.chapter}
                  </div>
                  <div className="history-time">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'study' && (
          <div className="study-tab-content">
            <StudyDashboard
              compact={true}
              onNavigateToText={(ref) => {
                const parts = ref.split(' ');
                const book = parts.slice(0, -1).join(' ');
                const chapter = parts[parts.length - 1];
                onNavigate(book, parseInt(chapter) || chapter);
              }}
              onOpenVocabulary={onOpenVocabulary}
              onOpenBookmarks={() => setActiveTab('bookmarks')}
              onOpenNotes={() => {}}
            />
          </div>
        )}
      </div>

      {/* Current location */}
      <div className="sidebar-footer">
        <div className="current-location">
          <span className="location-label">Reading:</span>
          <span className="location-value">{selectedBook} {selectedChapter}</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
