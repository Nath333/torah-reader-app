/**
 * Shared Components for AI Analysis Renderers
 * Extracted from AIResultRenderers.js
 */
import React from 'react';

// Result Section Component - Reusable section wrapper
export const ResultSection = ({ title, icon, children, color }) => (
  <div className="result-section" style={{ '--section-color': color || '#6366f1' }}>
    <div className="section-header">
      <span className="section-icon">{icon}</span>
      <h4>{title}</h4>
    </div>
    <div className="section-content">
      {children}
    </div>
  </div>
);

// Key Points List Component
export const KeyPointsList = ({ points }) => (
  <div className="key-points">
    {points?.map((point, i) => (
      <div key={i} className="key-point">
        <span className="point-num">{i + 1}</span>
        <span className="point-text">{point}</span>
      </div>
    ))}
  </div>
);

// Loading Skeleton Component with status indicator
export const LoadingSkeleton = ({ message }) => (
  <div className="loading-skeleton">
    <div className="loading-status">
      <div className="loading-spinner-small" />
      <span className="loading-message">{message || 'Analyzing with AI...'}</span>
    </div>
    <div className="loading-steps">
      <div className="loading-step active">
        <span className="step-icon">📚</span>
        <span>Fetching sources from Sefaria</span>
      </div>
      <div className="loading-step">
        <span className="step-icon">🧠</span>
        <span>AI processing with RAG context</span>
      </div>
      <div className="loading-step">
        <span className="step-icon">✨</span>
        <span>Generating scholarly analysis</span>
      </div>
    </div>
    <div className="skeleton-content">
      <div className="skeleton-line skeleton-header"></div>
      <div className="skeleton-line full"></div>
      <div className="skeleton-line full"></div>
      <div className="skeleton-line medium"></div>
      <div className="skeleton-line short"></div>
      <div className="skeleton-line full"></div>
      <div className="skeleton-line medium"></div>
    </div>
  </div>
);

// RAG Enhancement Indicator - Simple, user-friendly
export const RAGIndicator = ({ ragMetadata }) => {
  if (!ragMetadata) return null;

  const { sourcesCount, fromCache } = ragMetadata;

  return (
    <div className="rag-indicator compact">
      <span className="rag-icon">✓</span>
      <span className="rag-text">
        Verified with {sourcesCount} real source{sourcesCount !== 1 ? 's' : ''}
      </span>
      {fromCache && <span className="rag-cache">⚡</span>}
    </div>
  );
};

const SharedComponents = { ResultSection, KeyPointsList, LoadingSkeleton, RAGIndicator };
export default SharedComponents;
