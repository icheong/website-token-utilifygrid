import React, { useState } from 'react';
import ToolsSidebar from './ToolsSidebar';
import PromptInput from './PromptInput';
import CostArchitect from './CostArchitect';
import PromptTokenizer from './PromptTokenizer';
import PiiRedactor from './PiiRedactor';
import HallucinationDetector from './HallucinationDetector';
import PromptOptimizer from './PromptOptimizer';
import ModelBenchmark from './ModelBenchmark';

const TOOL_COMPONENTS = {
  'cost-architect': CostArchitect,
  'prompt-tokenizer': PromptTokenizer,
  'pii-redactor': PiiRedactor,
  'hallucination-detector': HallucinationDetector,
  'prompt-optimizer': PromptOptimizer,
  'model-benchmark': ModelBenchmark,
};

const TOOL_DESCRIPTIONS = {
  'cost-architect': 'Design your LLM infrastructure and estimate monthly costs. Select models, configure usage patterns, and compare pricing across providers.',
  'prompt-tokenizer': 'Count tokens in your prompts and get cost estimates at common API price points.',
  'pii-redactor': 'Scan text for personally identifiable information and generate redacted versions. All processing happens client-side.',
  'hallucination-detector': 'Analyze LLM-generated text for common hallucination patterns including hedging language, vague attributions, and fabricated citations.',
  'prompt-optimizer': 'Improve your prompts with optimization suggestions for better clarity and effectiveness.',
  'model-benchmark': 'Compare models side-by-side on pricing, speed, and context window.',
};

const PROMPT_TOOLS = ['cost-architect', 'prompt-tokenizer', 'pii-redactor', 'hallucination-detector', 'prompt-optimizer'];

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState('cost-architect');
  const [prompt, setPrompt] = useState('');

  const ActiveComponent = TOOL_COMPONENTS[activeTool] || CostArchitect;
  const showPrompt = PROMPT_TOOLS.includes(activeTool);
  const tokenEstimate = prompt ? Math.ceil(prompt.length / 4) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-6">
        <h1 className="font-headline-lg text-2xl font-bold text-on-surface">LLM Power Tools</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <ToolsSidebar activeTool={activeTool} onToolChange={setActiveTool} />

        <div className="flex-1 min-w-0">
          <div className="mb-4 p-3 bg-surface-container-low border border-outline-variant rounded-lg">
            <p className="text-xs text-on-surface-variant">{TOOL_DESCRIPTIONS[activeTool]}</p>
          </div>

          {showPrompt && (
            <div className="mb-6">
              <PromptInput prompt={prompt} setPrompt={setPrompt} tokenEstimate={tokenEstimate} />
            </div>
          )}

          <ActiveComponent prompt={prompt} setPrompt={setPrompt} tokenEstimate={tokenEstimate} />
        </div>
      </div>
    </div>
  );
}
