import React, { useState } from 'react';

const OPTIMIZATION_TIPS = [
  { id: 'specificity', label: 'Be More Specific', pattern: /\b(do something|handle it|process|manage|deal with)\b/gi, suggestion: 'Replace vague verbs with specific actions (e.g., "parse JSON", "validate input", "format output")' },
  { id: 'structure', label: 'Add Structure', pattern: /^.{200,}/m, suggestion: 'Consider using numbered lists, headers, or bullet points for clarity' },
  { id: 'examples', label: 'Include Examples', suggestion: 'Add "For example:" or "such as:" to ground your request' },
  { id: 'constraints', label: 'Define Constraints', pattern: /\b(should|must|need to|want|prefer)\b/gi, suggestion: 'Add specific constraints (length, format, language, style)' },
  { id: 'role', label: 'Define Role', pattern: /^(?!you are|act as|as a|imagine you)/i, suggestion: 'Start with "You are a [role]" to set context' },
  { id: 'output', label: 'Specify Output', suggestion: 'End with "Output format: [format]" to avoid ambiguity' },
];

export default function PromptOptimizer() {
  const [prompt, setPrompt] = useState('');
  const [optimized, setOptimized] = useState('');
  const [tips, setTips] = useState([]);

  const analyze = () => {
    if (!prompt.trim()) return;

    const foundTips = [];
    OPTIMIZATION_TIPS.forEach(tip => {
      if (tip.pattern) {
        const matches = prompt.match(tip.pattern);
        if (matches) foundTips.push({ ...tip, matches });
      } else {
        foundTips.push(tip);
      }
    });

    setTips(foundTips);
    generateOptimized(prompt, foundTips);
  };

  const generateOptimized = (original, foundTips) => {
    let result = original;

    if (!/^you are|^act as|^as a|^imagine/i.test(result)) {
      result = `You are a helpful assistant.\n\n${result}`;
    }

    if (!/output format|respond in|return as/i.test(result)) {
      result = `${result}\n\nPlease provide a clear, concise response.`;
    }

    setOptimized(result);
  };

  const clear = () => {
    setPrompt('');
    setOptimized('');
    setTips([]);
  };

  const copyOptimized = () => {
    navigator.clipboard.writeText(optimized);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-primary">auto_fix_high</span>
          <h3 className="font-headline-md text-sm font-bold text-on-surface">Prompt Optimizer</h3>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste your prompt to analyze and optimize..."
          className="w-full h-40 bg-surface border border-outline-variant rounded-lg p-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:outline-none focus:border-primary transition-colors"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={analyze} disabled={!prompt.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            Analyze & Optimize
          </button>
          <button onClick={clear}
            className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-lg text-xs font-medium hover:bg-surface-container-high transition-all">
            Clear
          </button>
        </div>
      </div>

      {tips.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[18px] text-primary">tips_and_updates</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Optimization Suggestions</h3>
          </div>
          <div className="space-y-2">
            {tips.map(tip => (
              <div key={tip.id} className="p-3 bg-surface rounded-lg">
                <div className="text-xs font-medium text-on-surface mb-1">{tip.label}</div>
                <p className="text-[10px] text-on-surface-variant">{tip.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {optimized && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[18px] text-green-600">check_circle</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Optimized Prompt</h3>
            <button onClick={copyOptimized} className="ml-auto text-[10px] text-primary hover:underline">Copy</button>
          </div>
          <pre className="p-3 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface whitespace-pre-wrap break-words max-h-48 overflow-y-auto custom-scrollbar">{optimized}</pre>
        </div>
      )}
    </div>
  );
}
