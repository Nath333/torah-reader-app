/**
 * APIKeySetup - Groq API key configuration component
 * Beautiful card for setting up AI-powered Torah study features
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { setGroqApiKey, removeGroqApiKey, checkGroqConnection } from '../../services/groqService';

const SUCCESS_REDIRECT_DELAY = 1200;

// AI Features that will be unlocked
const AI_FEATURES = [
  { icon: '📖', name: 'PaRDeS Analysis', desc: 'Four levels of interpretation' },
  { icon: '💎', name: 'Mussar Insights', desc: 'Ethical teachings' },
  { icon: '🔢', name: 'Gematria', desc: 'Numerical analysis' },
  { icon: '❓', name: 'Chavruta Questions', desc: 'Study questions' },
];

// Setup steps data
const SETUP_STEPS = [
  { num: 1, text: 'Visit', link: 'https://console.groq.com/keys', linkText: 'console.groq.com', hint: 'Free account, no credit card needed' },
  { num: 2, text: 'Create an API key', hint: 'Click "Create API Key" button' },
  { num: 3, text: 'Paste your key below', hint: 'Starts with gsk_...' },
];

const APIKeySetup = ({ onKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const timeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleKeyChange = useCallback((e) => {
    setApiKey(e.target.value);
    setError('');
  }, []);

  const handleTest = useCallback(async () => {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setError('Please enter an API key');
      return;
    }

    if (!trimmedKey.startsWith('gsk_')) {
      setError('Invalid key format. Groq keys start with "gsk_"');
      return;
    }

    setTesting(true);
    setError('');
    setGroqApiKey(trimmedKey);

    try {
      const result = await checkGroqConnection();
      if (result.connected) {
        setSuccess(true);
        timeoutRef.current = setTimeout(() => onKeySet(trimmedKey), SUCCESS_REDIRECT_DELAY);
      } else {
        removeGroqApiKey(); // Clear key on failure
        setError(result.error || 'Connection failed. Please check your key.');
      }
    } catch (err) {
      removeGroqApiKey(); // Clear key on error
      setError(err.message || 'Connection failed. Please try again.');
    } finally {
      setTesting(false);
    }
  }, [apiKey, onKeySet]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleTest();
    }
  }, [handleTest]);

  const toggleFeatures = useCallback(() => {
    setShowFeatures(prev => !prev);
  }, []);

  const clearApiKey = useCallback(() => {
    setApiKey('');
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

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
        onClick={toggleFeatures}
        type="button"
      >
        <span>{showFeatures ? '▼' : '▶'}</span>
        <span>See what you'll unlock</span>
      </button>

      {showFeatures && (
        <div className="features-preview">
          {AI_FEATURES.map((feature) => (
            <div key={feature.name} className="feature-item">
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
        {SETUP_STEPS.map((step) => (
          <div key={step.num} className="step">
            <span className="step-num">{step.num}</span>
            <div className="step-content">
              <span className="step-text">
                {step.link ? (
                  <>{step.text} <a href={step.link} target="_blank" rel="noopener noreferrer">{step.linkText}</a></>
                ) : step.text}
              </span>
              <span className="step-hint">{step.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Input group */}
      <div className={`key-input-group ${error ? 'has-error' : ''} ${success ? 'has-success' : ''}`}>
        <div className="input-wrapper">
          <span className="input-prefix" aria-hidden="true">🔑</span>
          <input
            id="groq-api-key"
            type="password"
            value={apiKey}
            onChange={handleKeyChange}
            onKeyDown={handleKeyDown}
            placeholder="gsk_xxxxxxxxxxxx..."
            disabled={testing || success}
            autoComplete="off"
            spellCheck="false"
            aria-label="Groq API key"
            aria-describedby={error ? 'api-key-error' : undefined}
          />
          {apiKey && !testing && !success && (
            <button
              className="clear-btn"
              onClick={clearApiKey}
              type="button"
              aria-label="Clear API key"
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
        <div id="api-key-error" className="setup-error" role="alert">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <span className="error-text">{error}</span>
          <button
            className="error-dismiss"
            onClick={clearError}
            type="button"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="setup-success" role="status">
          <span className="success-icon" aria-hidden="true">🎉</span>
          <div className="success-content">
            <span className="success-title">You're all set!</span>
            <span className="success-text">AI study features are now enabled.</span>
          </div>
        </div>
      )}

      {/* Privacy note */}
      <div className="setup-note">
        <span className="note-icon" aria-hidden="true">🔒</span>
        <span className="note-text">
          Your API key is stored <strong>locally</strong> in your browser and never sent to our servers.
        </span>
      </div>
    </div>
  );
};

APIKeySetup.propTypes = {
  onKeySet: PropTypes.func.isRequired,
};

export default APIKeySetup;
