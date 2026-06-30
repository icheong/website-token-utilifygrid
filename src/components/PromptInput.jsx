import React from 'react';

export default function PromptInput({ prompt, setPrompt, tokenEstimate }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[18px] text-primary">edit_note</span>
        <h3 className="font-headline-md text-sm font-bold text-on-surface">Prompt Input</h3>
        <div className="ml-auto flex items-center gap-3">
          {tokenEstimate > 0 && (
            <span className="text-[10px] font-label-mono px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              ~{tokenEstimate} tokens
            </span>
          )}
          {prompt.length > 0 && (
            <button 
              onClick={() => setPrompt('')} 
              className="text-[10px] text-on-surface-variant hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[12px]">delete</span>
              Clear all
            </button>
          )}
        </div>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here — switch tools to analyze it differently..."
        className="w-full h-56 bg-surface border border-outline-variant rounded-lg p-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:outline-none focus:border-primary transition-colors font-mono"
      />
    </div>
  );
}
