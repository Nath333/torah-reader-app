/**
 * ReadingProgressIndicator - Shows reading progress at top of page
 */
const ReadingProgressIndicator = ({ progress }) => (
  <div className="reading-progress-container">
    <div
      className="reading-progress-bar"
      style={{ width: `${progress}%` }}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin="0"
      aria-valuemax="100"
    />
  </div>
);

export default ReadingProgressIndicator;
