import React, { useState } from 'react';

const TOOLS = [
  { id: 'cost-architect', name: 'LLM Cost Architect', icon: 'calculate', description: 'Design & estimate model costs' },
  { id: 'prompt-tokenizer', name: 'Prompt Tokenizer', icon: 'token', description: 'Count tokens & estimate costs' },
  { id: 'pii-redactor', name: 'PII Redactor', icon: 'shield', description: 'Detect & redact sensitive data' },
  { id: 'hallucination-detector', name: 'Hallucination Detector', icon: 'fact_check', description: 'Verify model claims' },
  { id: 'prompt-optimizer', name: 'Prompt Optimizer', icon: 'auto_fix_high', description: 'Improve prompt efficiency' },
  { id: 'model-benchmark', name: 'Model Benchmark', icon: 'speed', description: 'Compare model performance' },
];

export default function ToolsSidebar({ activeTool, onToolChange }) {
  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 flex flex-col gap-1">
        <div className="px-3 py-2 mb-1">
          <h2 className="font-headline-md text-sm font-bold text-on-surface">LLM Tools</h2>
          <p className="text-[10px] text-on-surface-variant mt-0.5">Developer utilities</p>
        </div>
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              activeTool === tool.id
                ? 'bg-primary/10 border border-primary/20 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-transparent'
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] shrink-0 ${
              activeTool === tool.id ? 'text-primary' : 'text-on-surface-variant'
            }`}>{tool.icon}</span>
            <div className="min-w-0">
              <div className={`text-xs font-medium truncate ${activeTool === tool.id ? 'text-primary' : ''}`}>
                {tool.name}
              </div>
              <div className="text-[10px] text-on-surface-variant truncate">{tool.description}</div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
