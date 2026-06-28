import React, { useState } from 'react';

export default function PromptTokenizer() {
  const [prompt, setPrompt] = useState('');

  const countTokens = (text) => {
    if (!text) return { total: 0, words: 0, chars: 0, lines: 0, estCost4k: 0, estCost8k: 0 };
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const lines = text.split('\n').length;
    const total = Math.ceil(text.length / 4);
    return { total, words, chars, lines, estCost4k: (total / 1_000_000) * 0.40, estCost8k: (total / 1_000_000) * 0.80 };
  };

  const stats = countTokens(prompt);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-primary">token</span>
          <h3 className="font-headline-md text-sm font-bold text-on-surface">Prompt Tokenizer</h3>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste your prompt here to count tokens..."
          className="w-full h-40 bg-surface border border-outline-variant rounded-lg p-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:outline-none focus:border-primary transition-colors font-mono"
        />
      </div>

      {prompt && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Token Statistics</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-surface rounded-lg text-center">
              <div className="font-headline-md text-2xl font-bold text-primary">{stats.total.toLocaleString()}</div>
              <div className="text-[10px] text-on-surface-variant mt-1">Est. Tokens</div>
            </div>
            <div className="p-3 bg-surface rounded-lg text-center">
              <div className="font-headline-md text-2xl font-bold text-on-surface">{stats.words.toLocaleString()}</div>
              <div className="text-[10px] text-on-surface-variant mt-1">Words</div>
            </div>
            <div className="p-3 bg-surface rounded-lg text-center">
              <div className="font-headline-md text-2xl font-bold text-on-surface">{stats.chars.toLocaleString()}</div>
              <div className="text-[10px] text-on-surface-variant mt-1">Characters</div>
            </div>
            <div className="p-3 bg-surface rounded-lg text-center">
              <div className="font-headline-md text-2xl font-bold text-on-surface">{stats.lines}</div>
              <div className="text-[10px] text-on-surface-variant mt-1">Lines</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-surface rounded-lg">
            <div className="text-[10px] text-on-surface-variant mb-2 uppercase tracking-wider">Estimated Costs at Common Pricing</div>
            <div className="flex gap-6 text-xs">
              <span className="text-on-surface-variant">$0.40/1M (GPT-4o-mini): <span className="text-primary font-medium">${stats.estCost4k.toFixed(6)}</span></span>
              <span className="text-on-surface-variant">$0.80/1M (Claude Haiku): <span className="text-primary font-medium">${stats.estCost8k.toFixed(6)}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
