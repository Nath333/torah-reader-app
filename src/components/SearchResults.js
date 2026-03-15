import React, { useState, useMemo } from 'react';
import './SearchResults.css';

/**
 * SearchResults component with pagination support
 * @param {Object} props - Component props
 * @param {Array} props.results - Array of search results
 * @param {Function} props.onSelectResult - Callback when a result is selected
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message if any
 */
const SearchResults = ({ results, onSelectResult, loading, error }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(20);

  // Reset to page 1 when results change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [results]);

  // Calculate pagination
  const totalResults = results?.length || 0;
  const totalPages = Math.ceil(totalResults / resultsPerPage);

  // Get current page results
  const paginatedResults = useMemo(() => {
    if (!results) return [];
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    return results.slice(startIndex, endIndex);
  }, [results, currentPage, resultsPerPage]);

  // Group results by book and chapter for better organization
  const groupedResults = useMemo(() => {
    const grouped = {};
    paginatedResults.forEach(result => {
      const key = `${result.book}-${result.chapter}`;
      if (!grouped[key]) {
        grouped[key] = {
          book: result.book,
          chapter: result.chapter,
          results: []
        };
      }
      grouped[key].results.push(result);
    });
    return Object.values(grouped);
  }, [paginatedResults]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of results
    document.querySelector('.search-results')?.scrollTo(0, 0);
  };

  const handleResultsPerPageChange = (e) => {
    setResultsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="search-results">
        <div className="loading">Searching...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-results">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="search-results">
        <div className="no-results">No results found</div>
      </div>
    );
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of middle pages
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're near the beginning or end
      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }

      // Add ellipsis before middle pages if needed
      if (start > 2) {
        pages.push('...');
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis after middle pages if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="search-results">
      <div className="search-results-header">
        <h3>Search Results ({totalResults})</h3>
        <div className="pagination-controls">
          <label>
            Show:
            <select value={resultsPerPage} onChange={handleResultsPerPageChange}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      <div className="results-container">
        {groupedResults.map((group, groupIndex) => (
          <div key={groupIndex} className="result-group">
            <h4 className="group-heading">
              {group.book} Chapter {group.chapter}
            </h4>
            <div className="group-list">
              {group.results.map((result, resultIndex) => (
                <div
                  key={resultIndex}
                  className="result-item"
                  onClick={() => onSelectResult(result)}
                >
                  <div className="result-reference">
                    Verse {result.verse}
                  </div>
                  <div className="result-text">{result.text}</div>
                  {result.context && (
                    <div className="result-context">{result.context}</div>
                  )}
                  <div className="result-language">
                    {result.language}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <div className="pagination-pages">
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
              ) : (
                <button
                  key={page}
                  className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>

          <span className="pagination-info">
            {(currentPage - 1) * resultsPerPage + 1}-{Math.min(currentPage * resultsPerPage, totalResults)} of {totalResults}
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
