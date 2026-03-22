/**
 * ScrollToTopButton - Floating button to scroll back to top
 */
const ScrollToTopButton = ({ visible, onClick, darkMode }) => {
  if (!visible) return null;

  return (
    <button
      className={`scroll-to-top visible ${darkMode ? 'dark-mode' : ''}`}
      onClick={onClick}
      aria-label="Scroll to top"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
};

export default ScrollToTopButton;
