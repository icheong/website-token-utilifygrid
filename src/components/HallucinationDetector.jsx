import React, { useState, useEffect } from 'react';

const HALLUCINATION_SIGNALS = [
  { id: 'hedging', label: 'Hedging Language', pattern: /\b(might|could|possibly|perhaps|maybe|it seems|appears to be|likely|unlikely|may have|might have|could have)\b/gi, weight: 0.3, description: 'Qualifiers suggest uncertainty' },
  { id: 'vague', label: 'Vague Attribution', pattern: /\b(studies show|experts say|research suggests|it is known|according to|sources indicate|some people say)\b/gi, weight: 0.4, description: 'Unverifiable claims' },
  { id: 'fabricated', label: 'Fabricated Citations', pattern: /\b(Journal of|Proceedings of|Vol\.\s*\d+|pp\.\s*\d+|doi:|ISBN)\b/gi, weight: 0.6, description: 'May contain fake references' },
  { id: 'superlative', label: 'Superlatives', pattern: /\b(best|worst|greatest|largest|smallest|only|first ever|always|never|impossible|guaranteed)\b/gi, weight: 0.2, description: 'Absolute claims need verification' },
  { id: 'statistic', label: 'Specific Statistics', pattern: /\b\d+(\.\d+)?%\s*(of|increase|decrease|more|less|fewer|greater|higher|lower)\b/gi, weight: 0.5, description: 'Numbers may be invented' },
  { id: 'temporal', label: 'Temporal Claims', pattern: /\b(since \d{4}|in \d{4}|before \d{4}|after \d{4}|recently|last year|this year)\b/gi, weight: 0.3, description: 'Time-based claims to verify' },
];

export default function HallucinationDetector({ prompt }) {
  const [analysis, setAnalysis] = useState(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    setAnalysis(null);
    setHasAnalyzed(false);
  }, [prompt]);

  const analyze = () => {
    if (!prompt.trim()) return;

    const signals = [];
    let totalScore = 0;

    HALLUCINATION_SIGNALS.forEach(signal => {
      const matches = prompt.match(signal.pattern);
      if (matches) {
        const score = Math.min(matches.length * signal.weight, 1);
        totalScore += score;
        signals.push({
          ...signal,
          matches,
          score,
          count: matches.length,
        });
      }
    });

    const riskLevel = totalScore > 2 ? 'high' : totalScore > 1 ? 'medium' : totalScore > 0 ? 'low' : 'minimal';

    setAnalysis({ signals, totalScore, riskLevel, wordCount: prompt.split(/\s+/).length });
    setHasAnalyzed(true);
  };

  const riskColors = {
    minimal: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-600', label: 'Minimal Risk' },
    low: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-600', label: 'Low Risk' },
    medium: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-600', label: 'Medium Risk' },
    high: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-600', label: 'High Risk' },
  };

  const risk = analysis ? riskColors[analysis.riskLevel] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-primary">fact_check</span>
          <h3 className="font-headline-md text-sm font-bold text-on-surface">Hallucination Detector</h3>
        </div>
        <p className="text-xs text-on-surface-variant mb-3">
          Analyze LLM-generated text for common hallucination patterns. This is a heuristic check — always verify important facts independently.
        </p>
        <div className="flex gap-2">
          <button onClick={analyze} disabled={!prompt.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            Analyze
          </button>
          {hasAnalyzed && (
            <span className="text-[10px] text-on-surface-variant self-center">Analyzing the prompt above</span>
          )}
        </div>
      </div>

      {analysis && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[18px] text-primary">assessment</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Analysis Results</h3>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-lg ${risk.bg} border ${risk.border} mb-4`}>
            <div className={`font-headline-md text-lg font-bold ${risk.text}`}>{risk.label}</div>
            <div className="text-[10px] text-on-surface-variant">({analysis.wordCount} words · {analysis.signals.length} signals)</div>
          </div>

          {analysis.signals.length > 0 ? (
            <div className="space-y-3">
              {analysis.signals.map(signal => (
                <div key={signal.id} className="p-3 bg-surface rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-on-surface">{signal.label}</span>
                    <span className="text-[10px] text-on-surface-variant">{signal.count} match{signal.count !== 1 ? 'es' : ''}</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mb-2">{signal.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {signal.matches.slice(0, 3).map((m, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded font-mono">"{m}"</span>
                    ))}
                    {signal.matches.length > 3 && (
                      <span className="text-[10px] text-on-surface-variant">+{signal.matches.length - 3} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-on-surface-variant">
              No common hallucination patterns detected. However, this does not guarantee accuracy.
            </div>
          )}

          <div className="mt-4 p-3 bg-surface rounded-lg text-[10px] text-on-surface-variant">
            <strong>Disclaimer:</strong> This tool uses pattern matching to flag potential issues. It cannot determine if content is factually correct. Always cross-reference important information with authoritative sources.
          </div>
        </div>
      )}

      {!hasAnalyzed && !prompt && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30">fact_check</span>
          <p className="text-sm text-on-surface-variant mt-2">Enter a prompt above, then click "Analyze"</p>
        </div>
      )}
    </div>
  );
}
