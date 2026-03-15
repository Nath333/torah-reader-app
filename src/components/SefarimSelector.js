import React from 'react';
import './SefarimSelector.css';

const SefarimSelector = ({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedBook,
  onBookChange,
  chapters,
  selectedChapter,
  onChapterChange
}) => {
  const categoryKeys = Object.keys(categories);
  const currentCategory = categories[selectedCategory];
  const books = currentCategory?.books || [];
  const isGemara = selectedCategory === 'gemara';
  const isMishnah = selectedCategory === 'mishnah';

  // Get labels based on category type
  const getBookLabel = () => {
    if (isGemara || isMishnah) return { hebrew: 'מסכת', english: 'Tractate' };
    return { hebrew: 'ספר', english: 'Book' };
  };

  const getChapterLabel = () => {
    if (isGemara) return { hebrew: 'דף', english: 'Daf' };
    if (isMishnah) return { hebrew: 'פרק', english: 'Perek' };
    return { hebrew: 'פרק', english: 'Chapter' };
  };

  const bookLabel = getBookLabel();
  const chapterLabel = getChapterLabel();

  return (
    <div className="sefarim-selector">
      {/* Category Tabs */}
      <div className="category-tabs">
        {categoryKeys.map((key) => (
          <button
            key={key}
            className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
            onClick={() => onCategoryChange(key)}
          >
            <span className="category-hebrew">{categories[key].hebrewName}</span>
            <span className="category-english">{categories[key].name}</span>
          </button>
        ))}
      </div>

      {/* Book and Chapter Selection */}
      <div className="selection-row">
        <div className="book-selector">
          <label htmlFor="book-select">
            <span className="label-hebrew">{bookLabel.hebrew}</span>
            <span className="label-english">{bookLabel.english}</span>
          </label>
          <select
            id="book-select"
            value={selectedBook}
            onChange={(e) => onBookChange(e.target.value)}
          >
            {books.map((book) => (
              <option key={book} value={book}>
                {isMishnah ? book.replace('Mishnah ', '') : book}
              </option>
            ))}
          </select>
        </div>

        <div className="chapter-selector">
          <label htmlFor="chapter-select">
            <span className="label-hebrew">{chapterLabel.hebrew}</span>
            <span className="label-english">{chapterLabel.english}</span>
          </label>
          <select
            id="chapter-select"
            value={selectedChapter}
            onChange={(e) => onChapterChange(e.target.value)}
          >
            {chapters.map((chapter) => (
              <option key={chapter} value={chapter}>
                {chapter}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default SefarimSelector;
