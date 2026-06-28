import React, { useState } from 'react';

const MODEL_PRESETS = [
  { id: 'gpt-4o', name: 'GPT-4o', input: 2.50, output: 10.00 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', input: 0.15, output: 0.60 },
  { id: 'claude-sonnet', name: 'Claude Sonnet', input: 3.00, output: 15.00 },
  { id: 'claude-haiku', name: 'Claude Haiku', input: 0.25, output: 1.25 },
  { id: 'gemini-flash', name: 'Gemini Flash', input: 0.075, output: 0.30 },
  { id: 'gemini-pro', name: 'Gemini Pro', input: 1.25, output: 5.00 },
  { id: 'llama-3-70b', name: 'Llama 3 70B', input: 0.59, output: 0.79 },
  { id: 'custom', name: 'Custom', input: 0, output: 0 },
];

function analyzeTokens(text) {
  if (!text) return { total: 0, words: 0, chars: 0, lines: 0, numbers: 0, punctuation: 0, spaces: 0, avgWordLen: 0, longestWord: 0, uniqueWords: 0 };

  const words = text.split(/\s+/).filter(Boolean);
  const numbers = (text.match(/\d+\.?\d*/g) || []).length;
  const punctuation = (text.match(/[^\w\s]/g) || []).length;
  const spaces = (text.match(/\s/g) || []).length;
  const wordLens = words.map(w => w.length);
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

  return {
    total: Math.ceil(text.length / 4),
    words: words.length,
    chars: text.length,
    lines: text.split('\n').length,
    numbers,
    punctuation,
    spaces,
    avgWordLen: words.length > 0 ? (wordLens.reduce((a, b) => a + b, 0) / words.length).toFixed(1) : 0,
    longestWord: wordLens.length > 0 ? Math.max(...wordLens) : 0,
    uniqueWords,
  };
}

export default function PromptTokenizer({ prompt }) {
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [customInput, setCustomInput] = useState('0.40');
  const [customOutput, setCustomOutput] = useState('1.20');
  const [outputTokens, setOutputTokens] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const stats = analyzeTokens(prompt);
  const preset = MODEL_PRESETS.find(m => m.id === selectedModel);
  const inputPrice = selectedModel === 'custom' ? parseFloat(customInput) || 0 : preset.input;
  const outputPrice = selectedModel === 'custom' ? parseFloat(customOutput) || 0 : preset.output;
  const inputCost = (stats.total / 1_000_000) * inputPrice;
  const outputTokenCount = parseInt(outputTokens) || 0;
  const outputCost = (outputTokenCount / 1_000_000) * outputPrice;
  const totalCost = inputCost + outputCost;

  const charTypes = prompt ? [
    { label: 'Letters', count: (prompt.match(/[a-zA-Z]/g) || []).length, color: 'bg-blue-500' },
    { label: 'Numbers', count: stats.numbers, color: 'bg-green-500' },
    { label: 'Punctuation', count: stats.punctuation, color: 'bg-yellow-500' },
    { label: 'Spaces', count: stats.spaces, color: 'bg-purple-500' },
  ] : [];

  const maxCharCount = Math.max(...charTypes.map(c => c.count), 1);

  return (
    <div className="flex flex-col gap-6">
      {prompt && (
        <>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
              <h3 className="font-headline-md text-sm font-bold text-on-surface">Token Statistics</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: 'Est. Tokens', value: stats.total, primary: true },
                { label: 'Words', value: stats.words },
                { label: 'Chars', value: stats.chars },
                { label: 'Lines', value: stats.lines },
                { label: 'Unique', value: stats.uniqueWords },
                { label: 'Avg Len', value: stats.avgWordLen },
              ].map((stat, i) => (
                <div key={i} className={`p-3 rounded-lg text-center ${stat.primary ? 'bg-primary/10 border border-primary/20' : 'bg-surface'}`}>
                  <div className={`font-headline-md text-lg font-bold ${stat.primary ? 'text-primary' : 'text-on-surface'}`}>{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowBreakdown(!showBreakdown)}
              className="mt-3 text-[10px] text-primary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">{showBreakdown ? 'expand_less' : 'expand_more'}</span>
              {showBreakdown ? 'Hide' : 'Show'} character breakdown
            </button>

            {showBreakdown && (
              <div className="mt-3 space-y-2">
                {charTypes.map((ct, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-on-surface-variant w-16">{ct.label}</span>
                    <div className="flex-1 bg-surface-container h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${ct.color} rounded-full transition-all`} style={{ width: `${(ct.count / maxCharCount) * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] font-label-mono text-on-surface-variant w-12 text-right">{ct.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
              <h3 className="font-headline-md text-sm font-bold text-on-surface">Cost Calculator</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {MODEL_PRESETS.map(model => (
                <button key={model.id} onClick={() => setSelectedModel(model.id)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-medium transition-all border ${
                    selectedModel === model.id
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container'
                  }`}>
                  {model.name}
                  {model.id !== 'custom' && (
                    <span className="block text-[9px] opacity-60">${model.input}/${model.output}</span>
                  )}
                </button>
              ))}
            </div>

            {selectedModel === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-surface rounded-lg">
                <div>
                  <label className="text-[10px] text-on-surface-variant block mb-1">Input $/1M tokens</label>
                  <input type="number" step="0.01" value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[10px] text-on-surface-variant block mb-1">Output $/1M tokens</label>
                  <input type="number" step="0.01" value={customOutput} onChange={(e) => setCustomOutput(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-surface rounded-lg">
                <div className="text-[10px] text-on-surface-variant mb-1">Input Cost ({stats.total.toLocaleString()} tokens)</div>
                <div className="font-headline-md text-xl font-bold text-primary">${inputCost.toFixed(6)}</div>
                <div className="text-[10px] text-on-surface-variant mt-0.5">${inputPrice}/1M tokens</div>
              </div>
              <div className="p-3 bg-surface rounded-lg">
                <div className="text-[10px] text-on-surface-variant mb-1">Output Cost</div>
                <div className="flex items-center gap-2">
                  <input type="number" value={outputTokens} onChange={(e) => setOutputTokens(e.target.value)}
                    placeholder="Est. output tokens"
                    className="w-28 bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary" />
                  <span className="font-headline-md text-xl font-bold text-primary">${outputCost.toFixed(6)}</span>
                </div>
                <div className="text-[10px] text-on-surface-variant mt-0.5">${outputPrice}/1M tokens</div>
              </div>
            </div>

            <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-lg flex items-center justify-between">
              <span className="text-xs font-medium text-on-surface">Total Estimated Cost</span>
              <span className="font-headline-md text-lg font-bold text-primary">${totalCost.toFixed(6)}</span>
            </div>
          </div>
        </>
      )}

      {!prompt && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30">token</span>
          <p className="text-sm text-on-surface-variant mt-2">Enter a prompt above to count tokens</p>
        </div>
      )}
    </div>
  );
}
