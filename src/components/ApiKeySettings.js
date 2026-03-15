import React, { useState, useEffect } from 'react';
import { setGroqApiKey, getStoredApiKey, removeGroqApiKey, checkGroqConnection } from '../services/groqService';
import './ApiKeySettings.css';

/**
 * Component for managing Groq API key settings
 */
const ApiKeySettings = ({ onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedKey = getStoredApiKey();
    if (storedKey) {
      setApiKey(storedKey);
      setSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      setGroqApiKey(apiKey.trim());
      setSaved(true);
      setTestResult(null);
      if (onSave) onSave(apiKey.trim());
    }
  };

  const handleRemove = () => {
    removeGroqApiKey();
    setApiKey('');
    setSaved(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Temporarily save the key for testing
    setGroqApiKey(apiKey.trim());

    const result = await checkGroqConnection();

    if (result.connected) {
      setTestResult({ success: true, message: 'Connection successful! API key is valid.' });
      setSaved(true);
    } else {
      setTestResult({ success: false, message: result.error || 'Connection failed' });
    }

    setTesting(false);
  };

  return (
    <div className="api-key-settings">
      <div className="settings-header">
        <h3>🔑 AI Summary Settings</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      <div className="settings-content">
        <div className="info-box">
          <p>
            <strong>Get your free Groq API key:</strong>
          </p>
          <ol>
            <li>Visit <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com/keys</a></li>
            <li>Sign up for a free account</li>
            <li>Create a new API key</li>
            <li>Paste it below</li>
          </ol>
          <p className="free-note">
            ✨ Groq offers generous free tier: ~30 requests/minute
          </p>
        </div>

        <div className="input-group">
          <label htmlFor="groq-api-key">Groq API Key</label>
          <div className="input-wrapper">
            <input
              id="groq-api-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSaved(false);
                setTestResult(null);
              }}
              placeholder="gsk_..."
              className={saved ? 'saved' : ''}
              autoComplete="off"
            />
            <button
              className="toggle-visibility"
              onClick={() => setShowKey(!showKey)}
              type="button"
            >
              {showKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </div>
        )}

        <div className="button-group">
          <button
            className="test-btn"
            onClick={handleTest}
            disabled={testing || !apiKey.trim()}
          >
            {testing ? '🔄 Testing...' : '🧪 Test Connection'}
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={!apiKey.trim() || saved}
          >
            {saved ? '✓ Saved' : '💾 Save Key'}
          </button>
          {saved && (
            <button className="remove-btn" onClick={handleRemove}>
              🗑️ Remove
            </button>
          )}
        </div>
      </div>

      <div className="settings-footer">
        <p>Your API key is stored locally in your browser and never sent to our servers.</p>
      </div>
    </div>
  );
};

export default ApiKeySettings;
