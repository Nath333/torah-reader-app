/**
 * APIKeySetup - Groq API key configuration component
 * Beautiful card for setting up AI-powered Torah study features
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { setGroqApiKey, clearGroqApiKey, checkGroqConnection } from '../../services/groqService';

// AI Features that will be unlocked
const AI_FEATURES = [
  { icon: '📖', name: 'PaRDeS Analysis', desc: 'Four levels of interpretation' },
  { icon: '💎', name: 'Mussar Insights', desc: 'Ethical teachings' },
  { icon: '🔢', name: 'Gematria', desc: 'Numerical analysis' },
  { icon: '❓', name: 'Chavruta Questions', desc: 'Study questions' },
];

const APIKeySetup = ({ onKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  const handleKeyChange = useCallback((e) => {
    setApiKey(e.target.value);
    setError(''); // Clear error on input change
  }, []);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    // Basic validation for Groq key format
    if (!apiKey.trim().startsWith('gsk_')) {
      setError('Invalid key format. Groq keys start with "gsk_"');
      return;
    }

    setTesting(true);
    setError('');

    // Temporarily set the key
    setGroqApiKey(apiKey.trim());

    try {
      const result = await checkGroqConnection();
      if (result.connected) {
        setSuccess(true);
        setTimeout(() => onKeySet(apiKey.trim()), 1200);
      } else {
        setError(result.error || 'Connection failed. Please check your key.');
      }
    } catch (err) {
      setError(err.message || 'Connection failed. Please try again.');
    }

    setTesting(false);
  };

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && apiKey.trim()) {
      handleTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  return (
    <div className={`ai-key-setup ${success ? 'success-state' : ''}`}>
      {/* Header with animated icon */}
      <div className="setup-header">
        <div className="setup-icon-wrapper">
          <span className="setup-icon">{success ? '✨' : '🧠'}</span>
        </div>
        <div className="setup-title-group">
          <h3>AI Study Assistant</h3>
          <span className="setup-subtitle">Powered by Groq</span>
        </div>
      </div>

      <p className="setup-desc">
        Unlock advanced AI-powered Torah study with 25+ analysis modes including
        PaRDeS interpretation, Mussar insights, Gematria, and more.
      </p>

      {/* Feature preview toggle */}
      <button
        className="features-toggle"
        onClick={() => setShowFeatures(!showFeatures)}
        type="button"
      >
        <span>{showFeatures ? '▼' : '▶'}</span>
        <span>See what you'll unlock</span>
      </button>

      {showFeatures && (
        <div className="features-preview">
          {AI_FEATURES.map((feature, i) => (
            <div key={i} className="feature-item">
              <span className="feature-icon">{feature.icon}</span>
              <div className="feature-info">
                <span className="feature-name">{feature.name}</span>
                <span className="feature-desc">{feature.desc}</span>
              </div>
            </div>
          ))}
          <div className="features-more">+ 20 more analysis modes</div>
        </div>
      )}

      {/* Setup steps */}
      <div className="setup-steps">
        <div className="step">
          <span className="step-num">1</span>
          <div className="step-content">
            <span className="step-text">
              Visit <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com</a>
            </span>
            <span className="step-hint">Free account, no credit card needed</span>
          </div>
        </div>
        <div className="step">
          <span className="step-num">2</span>
          <div className="step-content">
            <span className="step-text">Create an API key</span>
            <span className="step-hint">Click "Create API Key" button</span>
          </div>
        </div>
        <div className="step">
          <span className="step-num">3</span>
          <div className="step-content">
            <span className="step-text">Paste your key below</span>
            <span className="step-hint">Starts with gsk_...</span>
          </div>
        </div>
      </div>

      {/* Input group */}
      <div className={`key-input-group ${error ? 'has-error' : ''} ${success ? 'has-success' : ''}`}>
        <div className="input-wrapper">
          <span className="input-prefix">🔑</span>
          <input
            type="password"
            value={apiKey}
            onChange={handleKeyChange}
            onKeyPress={handleKeyPress}
            placeholder="gsk_xxxxxxxxxxxx..."
            disabled={testing || success}
            autoComplete="off"
            spellCheck="false"
          />
          {apiKey && !testing && !success && (
            <button
              className="clear-btn"
              onClick={() => setApiKey('')}
              type="button"
              title="Clear"
            >
              ×
            </button>
          )}
        </div>
        <button
          onClick={handleTest}
          disabled={testing || !apiKey.trim() || success}
          className={`connect-btn ${testing ? 'testing' : ''} ${success ? 'success' : ''}`}
        >
          {testing ? (
            <>
              <span className="btn-spinner"></span>
              <span>Testing...</span>
            </>
          ) : success ? (
            <>
              <span className="btn-check">✓</span>
              <span>Connected!</span>
            </>
          ) : (
            <>
              <span>Connect</span>
              <span className="btn-arrow">→</span>
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="setup-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button
            className="error-dismiss"
            onClick={() => setError('')}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="setup-success">
          <span className="success-icon">🎉</span>
          <div className="success-content">
            <span className="success-title">You're all set!</span>
            <span className="success-text">AI study features are now enabled.</span>
          </div>
        </div>
      )}

      {/* Privacy note */}
      <div className="setup-note">
        <span className="note-icon">🔒</span>
        <span className="note-text">
          Your API key is stored <strong>locally</strong> in your browser and never sent to our servers.
        </span>
      </div>
    </div>
  );
};

export default APIKeySetup;
