/**
 * OllamaSettings Component
 * UI for configuring local Ollama AI provider
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  checkOllamaConnection,
  getAvailableModels,
  getOllamaSettings,
  setSelectedModel,
  setOllamaBaseUrl,
  pullModel,
  RECOMMENDED_MODELS
} from '../../services/providers/ollamaProvider';
import {
  AI_PROVIDERS,
  getSelectedProvider,
  setSelectedProvider,
  getAllProviderStatus
} from '../../services/providers/aiProviderFactory';
import './OllamaSettings.css';

const OllamaSettings = ({ onClose, onProviderChange }) => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModelName, setSelectedModelName] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(null);
  const [currentProvider, setCurrentProvider] = useState(getSelectedProvider());
  const [providerStatus, setProviderStatus] = useState(null);

  // Check connection and load models
  const checkConnection = useCallback(async () => {
    setLoading(true);
    const status = await checkOllamaConnection();
    setConnectionStatus(status);

    if (status.connected) {
      const models = await getAvailableModels();
      setAvailableModels(models);
    }

    const settings = getOllamaSettings();
    setSelectedModelName(settings.model);
    setBaseUrl(settings.baseUrl || 'http://localhost:11434');

    // Get overall provider status
    const allStatus = await getAllProviderStatus();
    setProviderStatus(allStatus);

    setLoading(false);
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Handle model selection
  const handleModelSelect = (modelName) => {
    setSelectedModel(modelName);
    setSelectedModelName(modelName);
  };

  // Handle URL change
  const handleUrlChange = (newUrl) => {
    setBaseUrl(newUrl);
    setOllamaBaseUrl(newUrl);
  };

  // Handle provider switch
  const handleProviderSwitch = (provider) => {
    setSelectedProvider(provider);
    setCurrentProvider(provider);
    if (onProviderChange) {
      onProviderChange(provider);
    }
  };

  // Pull/download a model
  const handlePullModel = async (modelName) => {
    setPulling(true);
    setPullProgress({ status: 'Starting download...', percent: 0 });

    const result = await pullModel(modelName, (progress) => {
      setPullProgress(progress);
    });

    if (result.success) {
      setPullProgress({ status: 'Complete!', percent: 100 });
      // Refresh model list
      const models = await getAvailableModels();
      setAvailableModels(models);
      setTimeout(() => {
        setPulling(false);
        setPullProgress(null);
      }, 1500);
    } else {
      setPullProgress({ status: `Error: ${result.error}`, percent: 0 });
      setTimeout(() => {
        setPulling(false);
        setPullProgress(null);
      }, 3000);
    }
  };

  const isModelInstalled = (modelName) => {
    return availableModels.some(m => m.name.startsWith(modelName.split(':')[0]));
  };

  return (
    <div className="ollama-settings">
      <div className="settings-header">
        <h2>AI Provider Settings</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {/* Provider Toggle */}
      <div className="provider-toggle-section">
        <h3>Select AI Provider</h3>
        <div className="provider-cards">
          {/* Groq Card */}
          <div
            className={`provider-card ${currentProvider === AI_PROVIDERS.GROQ ? 'active' : ''}`}
            onClick={() => handleProviderSwitch(AI_PROVIDERS.GROQ)}
          >
            <div className="provider-icon">☁️</div>
            <div className="provider-info">
              <h4>Groq Cloud</h4>
              <p>Fast cloud AI (requires API key)</p>
              <span className={`status-badge ${providerStatus?.groq?.available ? 'available' : 'unavailable'}`}>
                {providerStatus?.groq?.available ? '✓ Ready' : '○ Not configured'}
              </span>
            </div>
          </div>

          {/* Ollama Card */}
          <div
            className={`provider-card ${currentProvider === AI_PROVIDERS.OLLAMA ? 'active' : ''}`}
            onClick={() => handleProviderSwitch(AI_PROVIDERS.OLLAMA)}
          >
            <div className="provider-icon">💻</div>
            <div className="provider-info">
              <h4>Ollama Local</h4>
              <p>Offline AI on your computer</p>
              <span className={`status-badge ${connectionStatus?.connected ? 'available' : 'unavailable'}`}>
                {connectionStatus?.connected ? '✓ Running' : '○ Not running'}
              </span>
            </div>
          </div>

          {/* Auto Card */}
          <div
            className={`provider-card ${currentProvider === AI_PROVIDERS.AUTO ? 'active' : ''}`}
            onClick={() => handleProviderSwitch(AI_PROVIDERS.AUTO)}
          >
            <div className="provider-icon">⚡</div>
            <div className="provider-info">
              <h4>Auto</h4>
              <p>Use best available</p>
              <span className="status-badge available">Smart switching</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ollama Configuration */}
      {(currentProvider === AI_PROVIDERS.OLLAMA || currentProvider === AI_PROVIDERS.AUTO) && (
        <div className="ollama-config-section">
          <h3>Ollama Configuration</h3>

          {/* Connection Status */}
          <div className="connection-status">
            <div className={`status-indicator ${connectionStatus?.connected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {loading ? 'Checking...' : connectionStatus?.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <button className="refresh-btn" onClick={checkConnection} disabled={loading}>
              🔄 Refresh
            </button>
          </div>

          {!connectionStatus?.connected && !loading && (
            <div className="setup-instructions">
              <h4>Getting Started with Ollama</h4>
              <ol>
                <li>
                  <strong>Install Ollama:</strong>
                  <a href="https://ollama.ai/download" target="_blank" rel="noopener noreferrer">
                    Download from ollama.ai
                  </a>
                </li>
                <li>
                  <strong>Start Ollama:</strong>
                  <code>ollama serve</code>
                </li>
                <li>
                  <strong>Pull a model:</strong>
                  <code>ollama pull llama3.1:8b</code>
                </li>
              </ol>
            </div>
          )}

          {connectionStatus?.connected && (
            <>
              {/* Base URL */}
              <div className="config-field">
                <label>Ollama URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>

              {/* Model Selection */}
              <div className="model-section">
                <h4>Select Model</h4>

                {/* Installed Models */}
                {availableModels.length > 0 && (
                  <div className="installed-models">
                    <h5>Installed Models ({availableModels.length})</h5>
                    <div className="model-grid">
                      {availableModels.map((model) => (
                        <div
                          key={model.name}
                          className={`model-card ${selectedModelName === model.name ? 'selected' : ''}`}
                          onClick={() => handleModelSelect(model.name)}
                        >
                          <div className="model-name">{model.name}</div>
                          <div className="model-size">
                            {model.size ? `${(model.size / 1e9).toFixed(1)}GB` : ''}
                          </div>
                          {selectedModelName === model.name && (
                            <span className="selected-badge">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Models */}
                <div className="recommended-models">
                  <h5>Recommended for Torah Study</h5>
                  <div className="model-grid">
                    {RECOMMENDED_MODELS.map((model) => {
                      const installed = isModelInstalled(model.name);
                      return (
                        <div
                          key={model.name}
                          className={`model-card recommended ${installed ? 'installed' : ''}`}
                        >
                          <div className="model-name">{model.name}</div>
                          <div className="model-description">{model.description}</div>
                          <div className="model-meta">
                            <span className="model-size">{model.size}</span>
                            <span className={`hebrew-badge ${model.hebrewCapability}`}>
                              Hebrew: {model.hebrewCapability}
                            </span>
                          </div>
                          {installed ? (
                            <button
                              className="model-action select"
                              onClick={() => handleModelSelect(model.name)}
                            >
                              Use This Model
                            </button>
                          ) : (
                            <button
                              className="model-action download"
                              onClick={() => handlePullModel(model.name)}
                              disabled={pulling}
                            >
                              {pulling ? 'Downloading...' : '⬇️ Download'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pull Progress */}
                {pulling && pullProgress && (
                  <div className="pull-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${pullProgress.percent}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{pullProgress.status}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Current Selection Summary */}
      <div className="selection-summary">
        <span className="summary-label">Active:</span>
        <span className="summary-value">
          {currentProvider === AI_PROVIDERS.GROQ && '☁️ Groq Cloud'}
          {currentProvider === AI_PROVIDERS.OLLAMA && `💻 Ollama - ${selectedModelName}`}
          {currentProvider === AI_PROVIDERS.AUTO && '⚡ Auto (Best Available)'}
        </span>
      </div>
    </div>
  );
};

export default OllamaSettings;
