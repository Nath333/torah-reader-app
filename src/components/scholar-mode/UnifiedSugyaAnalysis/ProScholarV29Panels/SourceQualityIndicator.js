import React, { memo, useMemo } from 'react';

export const SourceQualityIndicator = memo(({ analysis, text }) => {
  const quality = useMemo(() => {
    let score = 0;
    const factors = [];

    // V29: Enhanced quality scoring with smarter detection

    // Check Mishna analysis (up to 30 points)
    const mishnaElements = analysis?.mishnaAnalysis?.elements?.length || 0;
    if (mishnaElements > 0) {
      const mishnaScore = Math.min(30, 15 + mishnaElements);
      score += mishnaScore;
      factors.push({ name: 'משנה', status: 'good', detail: `${mishnaElements} רכיבים` });
    } else {
      factors.push({ name: 'משנה', status: 'missing', detail: 'לא זוהה' });
    }

    // Check patterns (up to 25 points)
    const patternCount = analysis?.patterns?.length || 0;
    if (patternCount > 0) {
      const patternScore = Math.min(25, 10 + patternCount * 2);
      score += patternScore;
      factors.push({ name: 'דפוסים', status: 'good', detail: `${patternCount} זוהו` });
    } else {
      factors.push({ name: 'דפוסים', status: 'partial', detail: 'חלקי' });
    }

    // Check rabbis - don't penalize for סתם משנה (anonymous Mishna)
    const rabbiCount = analysis?.rabbis?.length || 0;
    const isAnonymousMishna = !rabbiCount && (analysis?.patterns?.some(p => p.type === 'mishna'));
    if (rabbiCount > 0) {
      score += 20;
      factors.push({ name: 'חכמים', status: 'good', detail: `${rabbiCount} זוהו` });
    } else if (isAnonymousMishna) {
      // סתם משנה is valid - give partial credit
      score += 10;
      factors.push({ name: 'חכמים', status: 'partial', detail: 'סתם משנה' });
    } else {
      factors.push({ name: 'חכמים', status: 'missing', detail: 'לא זוהו' });
    }

    // Check Q&A flow - handle both object and array formats
    const qaFlowLength = analysis?.qaFlow?.flow?.length || analysis?.qaFlow?.length || 0;
    const hasQuestions = analysis?.patterns?.some(p => p.type === 'question' || p.type === 'objection');
    if (qaFlowLength > 0) {
      score += 25;
      factors.push({ name: 'שקו"ט', status: 'good', detail: `${qaFlowLength} יחידות` });
    } else if (hasQuestions) {
      score += 15;
      factors.push({ name: 'שקו"ט', status: 'partial', detail: 'זוהו שאלות' });
    } else {
      factors.push({ name: 'שקו"ט', status: 'partial', detail: 'חלקי' });
    }

    // Bonus points for rich content
    const hasLegalRulings = analysis?.patterns?.some(p => p.type === 'legal_ruling');
    if (hasLegalRulings) {
      score = Math.min(100, score + 5);
    }

    return { score: Math.min(100, score), factors };
  }, [analysis]);

  const getQualityLabel = (score) => {
    if (score >= 75) return { text: 'מצוין', color: '#10b981' };
    if (score >= 50) return { text: 'טוב', color: '#3b82f6' };
    if (score >= 25) return { text: 'בסיסי', color: '#f59e0b' };
    return { text: 'חלקי', color: '#ef4444' };
  };

  const qualityLabel = getQualityLabel(quality.score);

  return (
    <div className="v29-quality-indicator" dir="rtl">
      <div className="quality-header">
        <span className="quality-icon">📊</span>
        <span className="quality-title">איכות הניתוח</span>
        <span className="quality-score" style={{ color: qualityLabel.color }}>
          {qualityLabel.text} ({quality.score}%)
        </span>
      </div>

      <div className="quality-bar">
        <div className="bar-fill" style={{ width: `${quality.score}%`, background: qualityLabel.color }} />
      </div>

      <div className="quality-factors">
        {quality.factors.map((f, i) => (
          <div key={i} className={`factor-item ${f.status}`}>
            <span className="factor-status">
              {f.status === 'good' ? '✓' : f.status === 'partial' ? '◐' : '○'}
            </span>
            <span className="factor-name">{f.name}</span>
            <span className="factor-detail">{f.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

SourceQualityIndicator.displayName = 'SourceQualityIndicator';

// =============================================================================
// PRO SCHOLAR V30: CROSS-REFERENCES PANEL
// Displays cross-references to other Talmudic sources
// =============================================================================
