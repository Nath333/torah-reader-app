import React, { useState, useEffect, useMemo } from 'react';
import './ChapterHeader.css';
import { getBookIndex, getTopicsForRef, getRelatedTexts } from '../services/sefariaApi';

// Book category icons
const categoryIcons = {
  'Torah': { icon: '📜', color: '#d97706' },
  'Prophets': { icon: '📖', color: '#7c3aed' },
  'Writings': { icon: '📚', color: '#0d9488' },
  'Talmud': { icon: '📜', color: '#8b5cf6' },
  'Mishnah': { icon: '📗', color: '#059669' },
  'Midrash': { icon: '💬', color: '#e11d48' },
  'Halakhah': { icon: '⚖️', color: '#0ea5e9' },
  'default': { icon: '📖', color: '#5b4cdb' }
};

// Hebrew book names
const hebrewBookNames = {
  'Genesis': 'בראשית',
  'Exodus': 'שמות',
  'Leviticus': 'ויקרא',
  'Numbers': 'במדבר',
  'Deuteronomy': 'דברים',
  'Joshua': 'יהושע',
  'Judges': 'שופטים',
  'Samuel': 'שמואל',
  'Kings': 'מלכים',
  'Isaiah': 'ישעיהו',
  'Jeremiah': 'ירמיהו',
  'Ezekiel': 'יחזקאל',
  'Psalms': 'תהלים',
  'Proverbs': 'משלי',
  'Job': 'איוב',
  'Song of Songs': 'שיר השירים',
  'Ruth': 'רות',
  'Lamentations': 'איכה',
  'Ecclesiastes': 'קהלת',
  'Esther': 'אסתר',
  'Daniel': 'דניאל',
  'Ezra': 'עזרא',
  'Nehemiah': 'נחמיה',
  'Chronicles': 'דברי הימים'
};

const ChapterHeader = ({
  book,
  chapter,
  totalChapters,
  verseCount,
  onPrevChapter,
  onNextChapter,
  onTopicClick,
  onNavigateToRef
}) => {
  const [bookMeta, setBookMeta] = useState(null);
  const [topics, setTopics] = useState([]);
  const [relatedTexts, setRelatedTexts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [showRelated, setShowRelated] = useState(false);

  // Get category info
  const categoryInfo = useMemo(() => {
    if (!bookMeta?.categories?.length) return categoryIcons.default;
    const mainCategory = bookMeta.categories[0];
    return categoryIcons[mainCategory] || categoryIcons.default;
  }, [bookMeta]);

  // Fetch book metadata, topics, and related texts
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (!book || !chapter) return;

      setLoading(true);
      try {
        // Fetch book metadata, topics, and related texts in parallel
        const [meta, topicsData, related] = await Promise.all([
          getBookIndex(book),
          getTopicsForRef(`${book}.${chapter}`),
          getRelatedTexts(`${book}.${chapter}`)
        ]);

        if (mounted) {
          setBookMeta(meta);
          setTopics(topicsData || []);
          setRelatedTexts(related);
        }
      } catch (error) {
        console.error('Error fetching chapter data:', error);
      }
      if (mounted) setLoading(false);
    };

    fetchData();
    return () => { mounted = false; };
  }, [book, chapter]);

  // Hebrew chapter name
  const hebrewChapter = useMemo(() => {
    const hebrewNumerals = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
      'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ',
      'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל',
      'לא', 'לב', 'לג', 'לד', 'לה', 'לו', 'לז', 'לח', 'לט', 'מ',
      'מא', 'מב', 'מג', 'מד', 'מה', 'מו', 'מז', 'מח', 'מט', 'נ'];
    const num = parseInt(chapter);
    return hebrewNumerals[num] || chapter;
  }, [chapter]);

  const hebrewBookName = hebrewBookNames[book] || bookMeta?.heTitle || book;

  const displayedTopics = showAllTopics ? topics : topics.slice(0, 5);

  // Count total related items
  const totalRelated = relatedTexts
    ? (relatedTexts.parallels?.length || 0) +
      (relatedTexts.midrash?.length || 0) +
      (relatedTexts.connections?.length || 0)
    : 0;

  // Get top related items to display
  const displayedRelated = useMemo(() => {
    if (!relatedTexts) return [];
    const items = [
      ...(relatedTexts.parallels || []).map(r => ({ ...r, type: 'parallel' })),
      ...(relatedTexts.midrash || []).slice(0, 3).map(r => ({ ...r, type: 'midrash' })),
      ...(relatedTexts.connections || []).slice(0, 3).map(r => ({ ...r, type: 'connection' }))
    ];
    return showRelated ? items : items.slice(0, 4);
  }, [relatedTexts, showRelated]);

  // Handle navigation to a related text
  const handleRelatedClick = (item) => {
    if (onNavigateToRef && item.ref) {
      // Parse the ref to extract book and chapter
      const parts = item.ref.replace(/_/g, ' ').split(/[.\s]/);
      if (parts.length >= 2) {
        const bookName = parts.slice(0, -1).join(' ');
        const chapterNum = parts[parts.length - 1].replace(/[^\d]/g, '');
        onNavigateToRef(bookName, chapterNum);
      }
    }
  };

  return (
    <div className="chapter-header">
      {/* Main Info Row */}
      <div className="chapter-main">
        <div className="chapter-nav-group">
          <button
            className="chapter-nav-btn"
            onClick={onPrevChapter}
            disabled={parseInt(chapter) <= 1}
            aria-label="Previous chapter"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div className="chapter-info">
          <div className="chapter-category" style={{ background: `${categoryInfo.color}15`, color: categoryInfo.color }}>
            <span className="category-icon">{categoryInfo.icon}</span>
            <span className="category-name">{bookMeta?.categories?.[0] || 'Torah'}</span>
          </div>

          <h2 className="chapter-title">
            <span className="book-name">{book}</span>
            <span className="chapter-divider">·</span>
            <span className="chapter-number">Chapter {chapter}</span>
          </h2>

          <div className="chapter-hebrew" dir="rtl">
            <span className="he-book">{hebrewBookName}</span>
            <span className="he-chapter">פרק {hebrewChapter}</span>
          </div>

          {/* Quick Stats */}
          <div className="chapter-stats">
            {verseCount > 0 && (
              <span className="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                {verseCount} verses
              </span>
            )}
            {totalChapters && (
              <span className="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {chapter} of {totalChapters}
              </span>
            )}
          </div>
        </div>

        <div className="chapter-nav-group">
          <button
            className="chapter-nav-btn"
            onClick={onNextChapter}
            disabled={totalChapters && parseInt(chapter) >= totalChapters}
            aria-label="Next chapter"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Topics Section */}
      {topics.length > 0 && (
        <div className="chapter-topics">
          <div className="topics-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>Topics in this chapter</span>
          </div>
          <div className="topics-list">
            {displayedTopics.map((topic, index) => (
              <button
                key={topic.slug || index}
                className="topic-chip"
                onClick={() => onTopicClick?.(topic)}
                title={topic.description || topic.title?.en}
              >
                {topic.title?.en || topic.slug}
              </button>
            ))}
            {topics.length > 5 && (
              <button
                className="topic-more"
                onClick={() => setShowAllTopics(!showAllTopics)}
              >
                {showAllTopics ? 'Show less' : `+${topics.length - 5} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Related Texts Section */}
      {totalRelated > 0 && (
        <div className="chapter-related">
          <div className="related-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span>Related Texts</span>
            <span className="related-count">{totalRelated}</span>
          </div>
          <div className="related-list">
            {displayedRelated.map((item, index) => (
              <button
                key={item.ref || index}
                className={`related-chip related-${item.type}`}
                onClick={() => handleRelatedClick(item)}
                title={item.text || item.he || item.ref}
              >
                <span className="related-type-icon">
                  {item.type === 'parallel' ? '⚡' : item.type === 'midrash' ? '📖' : '🔗'}
                </span>
                <span className="related-ref" dir="rtl">{item.heRef || item.ref}</span>
              </button>
            ))}
            {totalRelated > 4 && (
              <button
                className="related-more"
                onClick={() => setShowRelated(!showRelated)}
              >
                {showRelated ? 'Show less' : `+${totalRelated - 4} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Book Description (if available) */}
      {bookMeta?.enDesc && (
        <div className="chapter-description">
          <p>{bookMeta.enDesc.length > 200 ? bookMeta.enDesc.substring(0, 200) + '...' : bookMeta.enDesc}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="chapter-loading">
          <div className="loading-shimmer" />
        </div>
      )}
    </div>
  );
};

export default React.memo(ChapterHeader);
