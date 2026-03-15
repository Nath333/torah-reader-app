/**
 * Export data utilities for bookmarks and notes
 */

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Export bookmarks as JSON
 */
export const exportBookmarksJSON = (bookmarks) => {
  const data = {
    exportDate: new Date().toISOString(),
    type: 'sefarim-reader-bookmarks',
    version: 1,
    bookmarks
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `bookmarks-${formatDateForFile()}.json`);
};

/**
 * Export bookmarks as formatted text
 */
export const exportBookmarksText = (bookmarks) => {
  let text = `Sefarim Reader Bookmarks\nExported: ${formatDate(new Date())}\n\n`;

  bookmarks.forEach((b, i) => {
    text += `${i + 1}. ${b.book} ${b.chapter}:${b.verse}\n`;
    text += `   Hebrew: ${b.hebrewText}\n`;
    if (b.englishText) {
      text += `   English: ${b.englishText}\n`;
    }
    text += `   Saved: ${formatDate(b.timestamp)}\n\n`;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `bookmarks-${formatDateForFile()}.txt`);
};

/**
 * Export notes as JSON
 */
export const exportNotesJSON = (notes) => {
  const data = {
    exportDate: new Date().toISOString(),
    type: 'sefarim-reader-notes',
    version: 1,
    notes
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `notes-${formatDateForFile()}.json`);
};

/**
 * Export notes as formatted text
 */
export const exportNotesText = (notes) => {
  let text = `Sefarim Reader Notes\nExported: ${formatDate(new Date())}\n\n`;

  Object.entries(notes).forEach(([key, note]) => {
    const [book, chapter, verse] = key.split(':');
    text += `${book} ${chapter}:${verse}\n`;
    text += `${note}\n\n`;
    text += `---\n\n`;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `notes-${formatDateForFile()}.txt`);
};

/**
 * Import bookmarks from JSON file
 */
export const importBookmarks = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.type !== 'sefarim-reader-bookmarks') {
          throw new Error('Invalid bookmark file format');
        }
        resolve(data.bookmarks);
      } catch (err) {
        reject(new Error('Failed to parse bookmarks file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Import notes from JSON file
 */
export const importNotes = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.type !== 'sefarim-reader-notes') {
          throw new Error('Invalid notes file format');
        }
        resolve(data.notes);
      } catch (err) {
        reject(new Error('Failed to parse notes file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// Helper functions
const formatDateForFile = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportUtils = {
  exportBookmarksJSON,
  exportBookmarksText,
  exportNotesJSON,
  exportNotesText,
  importBookmarks,
  importNotes
};

export default exportUtils;
