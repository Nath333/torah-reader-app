/**
 * ConnectivityIndicator - Shows current data mode
 * Displays online/offline status and available features
 */

import React, { useState } from 'react';
import { useConnectivity, useDataAvailability } from '../../hooks/useSmartData';
import './ConnectivityIndicator.css';

const ConnectivityIndicator = ({ compact = false, showDetails = false }) => {
  const connectivity = useConnectivity();
  const availability = useDataAvailability();
  const [expanded, setExpanded] = useState(false);

  const getModeInfo = () => {
    switch (connectivity.mode) {
      case 'full':
        return {
          icon: '🟢',
          label: 'Full Mode',
          description: 'All features available',
          color: 'var(--success-color, #22c55e)'
        };
      case 'lookup-only':
        return {
          icon: '🟡',
          label: 'Lookup Only',
          description: 'Word lookup available, AI offline',
          color: 'var(--warning-color, #eab308)'
        };
      case 'ai-only':
        return {
          icon: '🟡',
          label: 'AI Only',
          description: 'AI available, Sefaria offline',
          color: 'var(--warning-color, #eab308)'
        };
      case 'degraded':
        return {
          icon: '🟠',
          label: 'Degraded',
          description: 'Limited functionality',
          color: 'var(--warning-color, #f97316)'
        };
      case 'offline':
        return {
          icon: '🔴',
          label: 'Offline',
          description: 'Using local dictionaries only',
          color: 'var(--error-color, #ef4444)'
        };
      default:
        return {
          icon: '⚪',
          label: 'Checking...',
          description: 'Checking connectivity',
          color: 'var(--text-muted, #9ca3af)'
        };
    }
  };

  const modeInfo = getModeInfo();

  if (compact) {
    return (
      <span
        className="connectivity-compact"
        title={`${modeInfo.label}: ${modeInfo.description}`}
        style={{ color: modeInfo.color }}
      >
        {modeInfo.icon}
      </span>
    );
  }

  return (
    <div className="connectivity-indicator">
      <button
        className="connectivity-badge"
        onClick={() => setExpanded(!expanded)}
        style={{ borderColor: modeInfo.color }}
      >
        <span className="connectivity-icon">{modeInfo.icon}</span>
        <span className="connectivity-label">{modeInfo.label}</span>
        {showDetails && (
          <span className="connectivity-chevron">
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </button>

      {(showDetails && expanded) && (
        <div className="connectivity-details">
          <p className="connectivity-description">{modeInfo.description}</p>

          <div className="connectivity-features">
            <h4>Available Features</h4>
            <ul>
              <li className={availability.features.wordLookup ? 'available' : 'unavailable'}>
                {availability.features.wordLookup ? '✓' : '✗'} Word Lookup
              </li>
              <li className={availability.features.scholarlyLookup ? 'available' : 'unavailable'}>
                {availability.features.scholarlyLookup ? '✓' : '✗'} Scholarly Sources
              </li>
              <li className={availability.features.ragContext ? 'available' : 'unavailable'}>
                {availability.features.ragContext ? '✓' : '✗'} Commentary Context
              </li>
              <li className={availability.features.aiAnalysis ? 'available' : 'unavailable'}>
                {availability.features.aiAnalysis ? '✓' : '✗'} AI Analysis
              </li>
              <li className={availability.features.frenchTranslation ? 'available' : 'unavailable'}>
                {availability.features.frenchTranslation ? '✓' : '✗'} French Translation
              </li>
            </ul>
          </div>

          <div className="connectivity-cache">
            <h4>Cached Data</h4>
            <ul>
              <li>Words: {availability.cache.lookupMemory} memory / {availability.cache.lookupOffline} offline</li>
              <li>RAG: {availability.cache.ragMemory} memory / {availability.cache.ragOffline} offline</li>
            </ul>
          </div>

          <button
            className="connectivity-refresh"
            onClick={() => connectivity.refresh()}
          >
            Refresh Status
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectivityIndicator;
