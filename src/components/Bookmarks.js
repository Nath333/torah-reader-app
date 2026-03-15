import React, { useRef, useState } from 'react';
import './Bookmarks.css';
import { exportBookmarksJSON, exportBookmarksText, importBookmarks } from '../utils/exportData';

const Bookmarks = ({ bookmarks, onRemoveBookmark, onSelectBookmark, onImportBookmarks }) => {
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const handleExportJSON = () => {
    exportBookmarksJSON(bookmarks);
  };

  const handleExportText = () => {
    exportBookmarksText(bookmarks);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);

    try {
      const imported = await importBookmarks(file);
      if (onImportBookmarks) {
        onImportBookmarks(imported);
      }
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div className="bookmarks">
        <div className="bookmarks-header">
          <h3>Saved Bookmarks</h3>
          <div className="bookmarks-actions">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".json"
              style={{ display: 'none' }}
            />
            <button
              className="import-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
        {importError && <div className="import-error">{importError}</div>}
        <div className="no-bookmarks">No bookmarks saved yet</div>
      </div>
    );
  }

  return (
    <div className="bookmarks">
      <div className="bookmarks-header">
        <h3>Saved Bookmarks ({bookmarks.length})</h3>
        <div className="bookmarks-actions">
          <button className="export-btn" onClick={handleExportJSON} title="Export as JSON">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            JSON
          </button>
          <button className="export-btn" onClick={handleExportText} title="Export as Text">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            TXT
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            style={{ display: 'none' }}
          />
          <button
            className="import-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? '...' : 'Import'}
          </button>
        </div>
      </div>

      {importError && <div className="import-error">{importError}</div>}

      <div className="bookmarks-list">
        {bookmarks.map((bookmark, index) => (
          <div key={index} className="bookmark-item">
            <div
              className="bookmark-content"
              onClick={() => onSelectBookmark(bookmark)}
            >
              <div className="bookmark-reference">
                {bookmark.book} {bookmark.chapter}:{bookmark.verse}
              </div>
              <div className="bookmark-text">
                {bookmark.hebrewText}
              </div>
              <div className="bookmark-translation">
                {bookmark.englishText}
              </div>
            </div>
            <button
              className="remove-bookmark"
              onClick={() => onRemoveBookmark(index)}
              aria-label="Remove bookmark"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Bookmarks;
