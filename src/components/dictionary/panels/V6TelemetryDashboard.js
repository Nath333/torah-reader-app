/**
 * V6TelemetryDashboard - PRO SCHOLAR V6 Performance Monitoring
 *
 * Developer dashboard showing V6 service telemetry:
 * - Lookup statistics
 * - Cache performance (hit rate, size)
 * - Dictionary validation stats
 * - Hypothesis generation metrics
 * - Service version info
 *
 * Intended for development and debugging purposes.
 *
 * @module V6TelemetryDashboard
 */

import React, { useEffect, useState, memo } from 'react';
import PropTypes from 'prop-types';
import { useProScholarTelemetry } from '../../../hooks/useProScholarV6';
// PRO SCHOLAR V6.2: Import CacheOrchestrator for global telemetry
import { getGlobalTelemetry, clearAllCaches, autoManageCaches } from '../../../services/cacheOrchestrator';
import './V6TelemetryDashboard.css';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Stat card with label and value
 */
const StatCard = memo(function StatCard({ label, value, icon, color, description }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color }}>
      <div className="stat-header">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {description && <div className="stat-desc">{description}</div>}
    </div>
  );
});

/**
 * Progress bar for percentages
 */
const ProgressBar = memo(function ProgressBar({ value, max = 100, color, label }) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="progress-container">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-value">{percentage}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
});

/**
 * Action button
 */
const ActionButton = memo(function ActionButton({ onClick, icon, label, variant = 'default' }) {
  return (
    <button className={`action-btn action-${variant}`} onClick={onClick}>
      <span className="action-icon">{icon}</span>
      <span className="action-label">{label}</span>
    </button>
  );
});

/**
 * PRO SCHOLAR V6.2: Global Cache Section - Shows CacheOrchestrator unified stats
 */
const GlobalCacheSection = memo(function GlobalCacheSection({ onClearAll, onAutoManage }) {
  const [globalStats, setGlobalStats] = useState(() => getGlobalTelemetry());
  const [expanded, setExpanded] = useState(false);

  // Refresh global stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalStats(getGlobalTelemetry());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { global, byCache } = globalStats;

  return (
    <div className="global-cache-section">
      <button
        className="section-header-btn"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <h3 className="section-title">
          <span className="section-icon">🗄️</span>
          Global Cache Orchestrator
        </h3>
        <span className="chevron">{expanded ? '▼' : '▶'}</span>
      </button>

      <div className="global-stats-row">
        <div className="global-stat">
          <span className="stat-label">Total Caches</span>
          <span className="stat-value">{global?.totalCaches || 0}</span>
        </div>
        <div className="global-stat">
          <span className="stat-label">Global Hit Rate</span>
          <span className="stat-value">{global?.hitRate || '0%'}</span>
        </div>
        <div className="global-stat">
          <span className="stat-label">Memory</span>
          <span className="stat-value">{global?.estimatedMemoryMB || '0'}MB</span>
        </div>
        <div className="global-stat">
          <span className="stat-label">Utilization</span>
          <span className="stat-value">{global?.utilization || '0%'}</span>
        </div>
      </div>

      {expanded && byCache && (
        <div className="cache-details">
          <table className="cache-table">
            <thead>
              <tr>
                <th>Cache</th>
                <th>Hits</th>
                <th>Misses</th>
                <th>Hit Rate</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byCache).map(([id, stats]) => (
                <tr key={id}>
                  <td className="cache-name">{stats.name || id}</td>
                  <td>{stats.hits}</td>
                  <td>{stats.misses}</td>
                  <td>{stats.hitRate}%</td>
                  <td>{stats.size}/{stats.maxSize}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="cache-actions">
            <button className="cache-action-btn" onClick={onClearAll}>
              Clear All Caches
            </button>
            <button className="cache-action-btn" onClick={onAutoManage}>
              Auto-Manage
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * V6TelemetryDashboard - Performance monitoring dashboard
 *
 * @param {Object} props
 * @param {boolean} [props.autoRefresh=true] - Auto-refresh telemetry data
 * @param {number} [props.refreshInterval=5000] - Refresh interval in ms
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {string} [props.className=''] - Additional CSS classes
 */
function V6TelemetryDashboard({
  autoRefresh = true,
  refreshInterval = 5000,
  compact = false,
  className = ''
}) {
  const {
    telemetry,
    cacheStats,
    refresh,
    reset,
    clearCache
  } = useProScholarTelemetry();

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Computed stats
  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)
    : 0;

  // Handle lookups being either a number or an object with a total property
  const totalLookups = typeof telemetry.lookups === 'object'
    ? (telemetry.lookups?.total || 0)
    : (telemetry.lookups || 0);
  const avgTime = telemetry.totalTime && totalLookups > 0
    ? Math.round(telemetry.totalTime / totalLookups)
    : 0;

  // Panel class names
  const panelClassName = `v6-telemetry-dashboard ${compact ? 'compact' : ''} ${className}`.trim();

  return (
    <div className={panelClassName}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="dashboard-header">
        <div className="header-title">
          <span className="header-icon">📊</span>
          <span className="header-text">PRO SCHOLAR V6 Telemetry</span>
        </div>
        <div className="header-meta">
          <span className="version-badge">v6.0.0</span>
          <span className="status-indicator active">● Live</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STATS GRID */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="stats-grid">
        <StatCard
          label="Total Lookups"
          value={totalLookups}
          icon="🔍"
          color="#3b82f6"
          description="Word analyses performed"
        />
        <StatCard
          label="Cache Hits"
          value={cacheStats.hits || 0}
          icon="⚡"
          color="#16a34a"
          description="Served from cache"
        />
        <StatCard
          label="Cache Misses"
          value={cacheStats.misses || 0}
          icon="🔄"
          color="#f59e0b"
          description="Computed fresh"
        />
        <StatCard
          label="Cache Size"
          value={cacheStats.size || 0}
          icon="💾"
          color="#8b5cf6"
          description="Entries stored"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PERFORMANCE METRICS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="performance-section">
        <h3 className="section-title">Performance</h3>

        <ProgressBar
          label="Cache Hit Rate"
          value={hitRate}
          color={hitRate >= 70 ? '#16a34a' : hitRate >= 40 ? '#f59e0b' : '#ef4444'}
        />

        <div className="metric-row">
          <div className="metric">
            <span className="metric-label">Avg. Response Time</span>
            <span className="metric-value">{avgTime}ms</span>
          </div>
          <div className="metric">
            <span className="metric-label">Dictionary Validations</span>
            <span className="metric-value">{telemetry.validations || 0}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Hypotheses Generated</span>
            <span className="metric-value">{telemetry.hypotheses || 0}</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DICTIONARY STATS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!compact && (
        <div className="dictionary-section">
          <h3 className="section-title">Dictionary Usage</h3>
          <div className="dictionary-stats">
            <div className="dict-stat">
              <span className="dict-name">Jastrow</span>
              <span className="dict-count">{telemetry.jastrowLookups || 0}</span>
            </div>
            <div className="dict-stat">
              <span className="dict-name">BDB</span>
              <span className="dict-count">{telemetry.bdbLookups || 0}</span>
            </div>
            <div className="dict-stat">
              <span className="dict-name">Strong's</span>
              <span className="dict-count">{telemetry.strongsLookups || 0}</span>
            </div>
            <div className="dict-stat">
              <span className="dict-name">CAL</span>
              <span className="dict-count">{telemetry.calLookups || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PRO SCHOLAR V6.2: GLOBAL CACHE ORCHESTRATOR STATS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!compact && (
        <GlobalCacheSection onClearAll={clearAllCaches} onAutoManage={autoManageCaches} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ACTIONS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="actions-section">
        <ActionButton
          onClick={refresh}
          icon="🔄"
          label="Refresh"
          variant="default"
        />
        <ActionButton
          onClick={clearCache}
          icon="🗑️"
          label="Clear Cache"
          variant="warning"
        />
        <ActionButton
          onClick={reset}
          icon="↺"
          label="Reset Stats"
          variant="danger"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="dashboard-footer">
        <span className="footer-note">
          Data refreshes every {refreshInterval / 1000}s
        </span>
        <span className="footer-time">
          Last updated: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

V6TelemetryDashboard.propTypes = {
  autoRefresh: PropTypes.bool,
  refreshInterval: PropTypes.number,
  compact: PropTypes.bool,
  className: PropTypes.string
};

// Note: Default values are set in function parameters (modern React pattern)

export default memo(V6TelemetryDashboard);
