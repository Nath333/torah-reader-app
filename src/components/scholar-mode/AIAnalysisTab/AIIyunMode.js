/**
 * AIIyunMode - AI-Enhanced Deep Analysis (עיון)
 *
 * Parallel to TalmudToolsTab's Iyun mode, but with AI enhancement:
 * - AI explains the sevara (reasoning)
 * - AI generates conceptual diagrams
 * - AI provides historical context
 * - AI answers "why" questions
 */
import React from 'react';
import {
  ModeHeader,
  ModeError,
  ModeEmptyState,
  ModeResultText,
  AnalysisButton,
  ResultCard,
  useMultiAnalysis,
  modePropTypes,
  ANALYSIS_BUTTON_TYPES // Use shared constant (DRY)
} from './shared';

// =============================================================================
// PROMPTS - Iyun analysis prompts
// =============================================================================

const IYUN_PROMPTS = {
  structure: `Analyze the structure of this text. Identify:
1. Main argument/thesis
2. Supporting points
3. Questions raised (קושיות)
4. Answers/resolutions (תירוצים)
5. Key logical steps (סברות)
Format in Hebrew with clear sections.`,

  sevara: `Explain the underlying reasoning (סברא) in this text:
1. What is the core logic?
2. Why does this argument make sense?
3. What assumptions are being made?
4. How does each step follow from the previous?
Respond in Hebrew, be thorough but clear.`,

  context: `Provide historical and textual context:
1. Who are the main figures mentioned?
2. What is the historical setting?
3. How does this connect to other texts?
4. What practical implications exist?
Respond in Hebrew.`,

  diagram: `Create a Mermaid diagram showing the logical flow of this text.
Use graph TD format. Include:
- Main question/topic at top
- Arguments and counter-arguments
- Resolution/conclusion
Keep node labels short (Hebrew OK). Return ONLY the mermaid code.`
};

// =============================================================================
// BUTTON CONFIG - Use shared constant (DRY - single source of truth)
// =============================================================================

// Iyun mode uses these 4 analysis types from shared ANALYSIS_BUTTON_TYPES
const IYUN_BUTTON_TYPES = ['structure', 'sevara', 'context', 'diagram'];
const ANALYSIS_BUTTONS = IYUN_BUTTON_TYPES.map(type => ({
  type,
  ...ANALYSIS_BUTTON_TYPES[type]
}));

// =============================================================================
// COMPONENT
// =============================================================================

const AIIyunMode = ({ text, reference, onResult, loading, setLoading }) => {
  // Use shared hook for multi-analysis (DRY)
  const {
    results,
    activeAnalysis,
    error,
    runAnalysis,
    hasResult
  } = useMultiAnalysis({ text, reference, onResult, setLoading });

  // Handle analysis button click
  const handleAnalysis = (type) => {
    if (!text || loading) return;
    runAnalysis(type, IYUN_PROMPTS[type], 'iyun');
  };

  return (
    <div className="ai-iyun-mode">
      <ModeHeader mode="iyun" />

      {/* Analysis type buttons */}
      <div className="iyun-buttons">
        {ANALYSIS_BUTTONS.map(btn => (
          <AnalysisButton
            key={btn.type}
            type={btn.type}
            onClick={handleAnalysis}
            disabled={loading || !text}
            isLoading={activeAnalysis === btn.type}
            isCompleted={hasResult(btn.type)}
            customConfig={btn}
          />
        ))}
      </div>

      <ModeError error={error} className="iyun-error" />

      {/* Results display */}
      {Object.entries(results).map(([type, result]) => {
        const btnConfig = ANALYSIS_BUTTONS.find(b => b.type === type);
        return (
          <ResultCard
            key={type}
            type={type}
            icon={btnConfig?.icon}
            title={btnConfig?.label}
          >
            {type === 'diagram' ? (
              <pre className="mermaid-code">{result}</pre>
            ) : (
              <ModeResultText text={result} />
            )}
          </ResultCard>
        );
      })}

      {!text && <ModeEmptyState mode="iyun" />}
    </div>
  );
};

AIIyunMode.propTypes = modePropTypes;

export default AIIyunMode;
