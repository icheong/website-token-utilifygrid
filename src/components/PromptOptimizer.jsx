import React, { useState, useEffect } from 'react';

const TARGET_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', tip: 'Responds well to structured input with clear sections', cotStyle: 'structured' },
  { id: 'claude', name: 'Claude', tip: 'Prefers detailed context and nuanced instructions', cotStyle: 'nuanced' },
  { id: 'gemini', name: 'Gemini', tip: 'Works best with concise, direct prompts', cotStyle: 'concise' },
  { id: 'llama', name: 'Llama', tip: 'Benefits from explicit step-by-step instructions', cotStyle: 'explicit' },
  { id: 'any', name: 'Any Model', tip: 'General optimization for universal compatibility', cotStyle: 'balanced' },
];

const OPTIMIZATION_STRATEGIES = [
  { id: 'balanced', label: 'Balanced', icon: 'balance', description: 'General improvements for clarity and effectiveness' },
  { id: 'concise', label: 'Concise', icon: 'compress', description: 'Minimize tokens while preserving intent' },
  { id: 'detailed', label: 'Detailed', icon: 'subject', description: 'Add context and specifics for better results' },
  { id: 'structured', label: 'Structured', icon: 'format_list_numbered', description: 'Organize with clear sections and formatting' },
  { id: 'creative', label: 'Creative', icon: 'palette', description: 'Enhance for imaginative and diverse outputs' },
];

const BUILTIN_RULES = [
  { id: 'specificity', label: 'Be Specific', pattern: /\b(do something|handle it|process|manage|deal with)\b/gi, suggestion: 'Replace vague verbs with specific actions' },
  { id: 'structure', label: 'Add Structure', pattern: /^.{200,}/m, suggestion: 'Use numbered lists or headers for clarity' },
  { id: 'examples', label: 'Include Examples', pattern: null, suggestion: 'Add concrete examples to ground your request' },
  { id: 'constraints', label: 'Define Constraints', pattern: /\b(should|must|need to|want|prefer)\b/gi, suggestion: 'Add specific constraints (length, format, style)' },
  { id: 'role', label: 'Define Role', pattern: /^(?!you are|act as|as a|imagine you)/i, suggestion: 'Start with a role definition' },
  { id: 'output', label: 'Specify Output', pattern: null, suggestion: 'End with clear output format instructions' },
];

const COT_TEMPLATES = {
  structured: {
    prefix: 'Let me break this down systematically:',
    steps: ['First, I\'ll identify the key components of this problem.', 'Next, I\'ll analyze each component and its relationships.', 'Then, I\'ll work through the solution step by step.', 'Finally, I\'ll verify my answer and provide the result.'],
    suffix: 'Now, let me apply this structured approach:',
  },
  nuanced: {
    prefix: 'Let me think about this carefully and consider multiple angles:',
    steps: ['I need to understand the underlying context and intent.', 'Let me consider the different perspectives and implications.', 'I\'ll weigh the various factors before reaching a conclusion.', 'Based on this analysis, I can provide a thoughtful response.'],
    suffix: 'Taking all of this into consideration:',
  },
  concise: {
    prefix: 'Analyzing this efficiently:',
    steps: ['Identify the core request.', 'Determine the optimal approach.', 'Execute with precision.'],
    suffix: 'Direct approach:',
  },
  explicit: {
    prefix: 'I will solve this step by step:',
    steps: ['Step 1: Understand what is being asked.', 'Step 2: Gather relevant information.', 'Step 3: Apply the appropriate method.', 'Step 4: Verify the result.'],
    suffix: 'Following these steps:',
  },
  balanced: {
    prefix: 'Let me work through this:',
    steps: ['I\'ll start by understanding the problem.', 'Then I\'ll consider the best approach.', 'Finally, I\'ll provide my answer.'],
    suffix: 'Here\'s my analysis:',
  },
};

export default function PromptOptimizer({ prompt }) {
  const [targetModel, setTargetModel] = useState('any');
  const [strategy, setStrategy] = useState('balanced');
  const [customRules, setCustomRules] = useState([]);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleSuggestion, setNewRuleSuggestion] = useState('');
  const [optimized, setOptimized] = useState('');
  const [tips, setTips] = useState([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [fewShotExample1, setFewShotExample1] = useState('');
  const [fewShotResult1, setFewShotResult1] = useState('');
  const [fewShotExample2, setFewShotExample2] = useState('');
  const [fewShotResult2, setFewShotResult2] = useState('');
  const [fewShotExample3, setFewShotExample3] = useState('');
  const [fewShotResult3, setFewShotResult3] = useState('');
  const [fewShotMode, setFewShotMode] = useState('system-user');

  const [cotSteps, setCotSteps] = useState([]);
  const [cotCustomStep, setCotCustomStep] = useState('');
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    setOptimized('');
    setTips([]);
    setHasAnalyzed(false);
  }, [prompt]);

  useEffect(() => {
    const model = TARGET_MODELS.find(m => m.id === targetModel);
    const template = COT_TEMPLATES[model?.cotStyle || 'balanced'];
    setCotSteps(template.steps.map((s, i) => ({ id: i, text: s })));
  }, [targetModel]);

  const addCustomRule = () => {
    if (!newRuleName.trim() || !newRuleSuggestion.trim()) return;
    const rule = {
      id: `custom-${Date.now()}`,
      label: newRuleName,
      pattern: newRulePattern ? new RegExp(newRulePattern, 'gi') : null,
      suggestion: newRuleSuggestion,
      isCustom: true,
    };
    setCustomRules(prev => [...prev, rule]);
    setNewRuleName('');
    setNewRulePattern('');
    setNewRuleSuggestion('');
  };

  const removeCustomRule = (id) => {
    setCustomRules(prev => prev.filter(r => r.id !== id));
  };

  const analyze = () => {
    if (!prompt.trim()) return;

    const allRules = [...BUILTIN_RULES, ...customRules];
    const foundTips = [];

    allRules.forEach(rule => {
      if (rule.pattern) {
        const matches = prompt.match(rule.pattern);
        if (matches) foundTips.push({ ...rule, matches, count: matches.length });
      } else {
        foundTips.push({ ...rule, matches: [], count: 0 });
      }
    });

    setTips(foundTips);
    generateOptimized(prompt);
    setHasAnalyzed(true);
  };

  const generateOptimized = (original) => {
    let result = original;

    switch (strategy) {
      case 'concise':
        result = result.replace(/\s+/g, ' ').trim();
        result = result.replace(/\b(please|kindly|could you|would you|I want you to|I need you to)\b/gi, '').trim();
        break;
      case 'detailed':
        if (!/context|background|scenario/i.test(result)) {
          result = `Context: [Add relevant background]\n\n${result}`;
        }
        if (!/constraint|requirement|limitation/i.test(result)) {
          result = `${result}\n\nConstraints: [Add specific requirements]`;
        }
        break;
      case 'structured':
        if (!result.includes('\n')) {
          const sentences = result.split(/(?<=[.!?])\s+/);
          result = sentences.map((s, i) => `${i + 1}. ${s}`).join('\n');
        }
        break;
      case 'creative':
        if (!/variation|alternative|different|creative/i.test(result)) {
          result = `${result}\n\nProvide multiple creative approaches or variations.`;
        }
        break;
      default:
        break;
    }

    if (targetModel !== 'any') {
      const model = TARGET_MODELS.find(m => m.id === targetModel);
      if (model && !/^you are|^act as|^as a|^imagine/i.test(result)) {
        const roleMap = {
          'gpt-4o': 'an expert assistant',
          'claude': 'a knowledgeable and thoughtful assistant',
          'gemini': 'a helpful assistant',
          'llama': 'a precise and methodical assistant',
        };
        result = `You are ${roleMap[targetModel] || 'a helpful assistant'}.\n\n${result}`;
      }
    }

    if (!/output format|respond in|return as|format:/i.test(result)) {
      const formatMap = {
        'concise': 'Respond in 2-3 sentences.',
        'detailed': 'Provide a comprehensive, well-organized response.',
        'structured': 'Use markdown formatting with headers and bullet points.',
        'creative': 'Be creative and provide diverse perspectives.',
        'balanced': 'Provide a clear, concise response.',
      };
      result = `${result}\n\n${formatMap[strategy]}`;
    }

    setOptimized(result);
  };

  const generateFewShot = () => {
    if (!prompt.trim()) return;

    const examples = [
      { input: fewShotExample1, output: fewShotResult1 },
      { input: fewShotExample2, output: fewShotResult2 },
      { input: fewShotExample3, output: fewShotResult3 },
    ].filter(ex => ex.input.trim() && ex.output.trim());

    if (examples.length === 0) return;

    let result = '';

    if (fewShotMode === 'system-user') {
      result = `<system>\nYou are a helpful assistant that follows the patterns shown in the examples below.\n\nTask: ${prompt}\n</system>\n\n`;
      examples.forEach((ex, i) => {
        result += `<user>\n${ex.input}\n</user>\n\n<assistant>\n${ex.output}\n</assistant>\n\n`;
      });
      result += `<user>\n[Your input here]\n</user>\n\n<assistant>\n`;
    } else {
      result = `Task: ${prompt}\n\nExamples:\n\n`;
      examples.forEach((ex, i) => {
        result += `--- Example ${i + 1} ---\nInput: ${ex.input}\nOutput: ${ex.output}\n\n`;
      });
      result += `--- Your Turn ---\nInput: [Your input here]\nOutput: `;
    }

    setOptimized(result);
    setHasAnalyzed(true);
  };

  const injectCoT = () => {
    if (!prompt.trim() || cotSteps.length === 0) return;

    const model = TARGET_MODELS.find(m => m.id === targetModel);
    const template = COT_TEMPLATES[model?.cotStyle || 'balanced'];

    let result = `${prompt}\n\n${template.prefix}\n\n`;
    cotSteps.forEach((step, i) => {
      result += `${i + 1}. ${step.text}\n`;
    });
    result += `\n${template.suffix}`;

    setOptimized(result);
    setHasAnalyzed(true);
  };

  const addCustomCoTStep = () => {
    if (!cotCustomStep.trim()) return;
    setCotSteps(prev => [...prev, { id: Date.now(), text: cotCustomStep }]);
    setCotCustomStep('');
  };

  const removeCoTStep = (id) => {
    setCotSteps(prev => prev.filter(s => s.id !== id));
  };

  const updateCoTStep = (id, newText) => {
    setCotSteps(prev => prev.map(s => s.id === id ? { ...s, text: newText } : s));
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...cotSteps];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setCotSteps(reordered);
    setDragIndex(null);
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

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={analyze} disabled={!prompt.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            Analyze & Optimize
          </button>
          <button onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 bg-surface-container text-on-surface-variant rounded-lg text-xs font-medium hover:bg-surface-container-high transition-all flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">tune</span>
            Settings
          </button>
        </div>

        {showSettings && (
          <div className="mt-4 p-4 bg-surface border border-outline-variant rounded-lg space-y-4">
            <div>
              <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider mb-2">Target Model</div>
              <div className="flex flex-wrap gap-2">
                {TARGET_MODELS.map(model => (
                  <button key={model.id} onClick={() => setTargetModel(model.id)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all border ${
                      targetModel === model.id
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-surface-container border-outline-variant text-on-surface-variant'
                    }`}>
                    {model.name}
                  </button>
                ))}
              </div>
              {targetModel !== 'any' && (
                <p className="text-[10px] text-on-surface-variant mt-1">{TARGET_MODELS.find(m => m.id === targetModel)?.tip}</p>
              )}
            </div>

            <div>
              <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider mb-2">Optimization Strategy</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {OPTIMIZATION_STRATEGIES.map(s => (
                  <button key={s.id} onClick={() => setStrategy(s.id)}
                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium transition-all border ${
                      strategy === s.id
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                    }`}>
                    <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider mb-2">Custom Rules</div>
              <div className="flex gap-2 mb-2">
                <input type="text" value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="Rule name" className="w-28 bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary" />
                <input type="text" value={newRulePattern} onChange={(e) => setNewRulePattern(e.target.value)}
                  placeholder="Regex (optional)" className="flex-1 bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary" />
                <input type="text" value={newRuleSuggestion} onChange={(e) => setNewRuleSuggestion(e.target.value)}
                  placeholder="Suggestion" className="flex-1 bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary" />
                <button onClick={addCustomRule}
                  className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant rounded text-xs font-medium hover:bg-surface-container-low transition-all">
                  Add
                </button>
              </div>
              {customRules.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {customRules.map(rule => (
                    <span key={rule.id} className="flex items-center gap-1 px-2 py-1 bg-surface-container-high rounded-full text-[10px]">
                      {rule.label}
                      <button onClick={() => removeCustomRule(rule.id)} className="text-on-surface-variant hover:text-red-500">
                        <span className="material-symbols-outlined text-[10px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-outline-variant pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[14px] text-primary">format_list_numbered</span>
                <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider">Few-Shot Generator</div>
                <span className="relative group ml-1">
                  <span className="material-symbols-outlined text-[12px] text-on-surface-variant/50 cursor-help">info</span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 p-2 bg-surface-container-high border border-outline-variant rounded-lg text-[10px] text-on-surface-variant leading-tight opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">Provide example input/output pairs so the model learns the exact pattern and style you want it to replicate.</span>
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant mb-3">Add up to 3 input/output pairs. The model will learn from these examples and follow the same format.</p>

              <div className="flex gap-2 mb-3">
                {['system-user', 'delimited'].map(mode => (
                  <button key={mode} onClick={() => setFewShotMode(mode)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all border ${
                      fewShotMode === mode
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-surface-container border-outline-variant text-on-surface-variant'
                    }`}>
                    {mode === 'system-user' ? 'System/User Tags' : 'Delimited'}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {[1, 2, 3].map(n => (
                  <div key={n} className="grid grid-cols-2 gap-2">
                    <textarea value={n === 1 ? fewShotExample1 : n === 2 ? fewShotExample2 : fewShotExample3}
                      onChange={(e) => n === 1 ? setFewShotExample1(e.target.value) : n === 2 ? setFewShotExample2(e.target.value) : setFewShotExample3(e.target.value)}
                      placeholder={`Example ${n} input...`}
                      className="w-full h-14 bg-surface-container border border-outline-variant rounded-lg p-2 text-[11px] text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:outline-none focus:border-primary font-mono" />
                    <textarea value={n === 1 ? fewShotResult1 : n === 2 ? fewShotResult2 : fewShotResult3}
                      onChange={(e) => n === 1 ? setFewShotResult1(e.target.value) : n === 2 ? setFewShotResult2(e.target.value) : setFewShotResult3(e.target.value)}
                      placeholder={`Example ${n} output...`}
                      className="w-full h-14 bg-surface-container border border-outline-variant rounded-lg p-2 text-[11px] text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:outline-none focus:border-primary font-mono" />
                  </div>
                ))}
              </div>

              <button onClick={generateFewShot} disabled={!prompt.trim()}
                className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                Generate Few-Shot Block
              </button>
            </div>

            <div className="border-t border-outline-variant pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[14px] text-purple-600">psychology</span>
                <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider">Chain-of-Thought Steps</div>
                <span className="relative group ml-1">
                  <span className="material-symbols-outlined text-[12px] text-on-surface-variant/50 cursor-help">info</span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 p-2 bg-surface-container-high border border-outline-variant rounded-lg text-[10px] text-on-surface-variant leading-tight opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">Guides the model to reason step-by-step before answering, improving accuracy on complex or multi-step problems.</span>
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant mb-3">Edit, reorder, or remove steps. The model will follow this reasoning chain before producing its answer.</p>

              <div className="space-y-2 mb-3">
                {cotSteps.map((step, i) => (
                  <div
                    key={step.id}
                    draggable={true}
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(i)}
                    className={`flex items-start gap-2 p-2 rounded-lg cursor-grab bg-purple-500/5 border border-purple-500/10 ${dragIndex === i ? 'opacity-50' : ''}`}
                  >
                    <span className="material-symbols-outlined text-[12px] text-purple-600/50 mt-1 shrink-0">drag_indicator</span>
                    <span className="text-[10px] font-label-mono text-purple-600 mt-0.5 shrink-0">{i + 1}.</span>
                    <input
                      type="text"
                      value={step.text}
                      onChange={(e) => updateCoTStep(step.id, e.target.value)}
                      className="flex-1 bg-transparent text-xs text-on-surface focus:outline-none focus:border-b focus:border-purple-600/30"
                    />
                    <button onClick={() => removeCoTStep(step.id)} className="text-on-surface-variant hover:text-red-500 shrink-0">
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                <input type="text" value={cotCustomStep} onChange={(e) => setCotCustomStep(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomCoTStep()}
                  placeholder="Add custom reasoning step..."
                  className="flex-1 bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary" />
                <button onClick={addCustomCoTStep}
                  className="px-3 py-2 bg-surface-container text-on-surface-variant rounded-lg text-xs font-medium hover:bg-surface-container-high transition-all">
                  Add Step
                </button>
              </div>

              <button onClick={injectCoT} disabled={!prompt.trim() || cotSteps.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">psychology</span>
                Inject CoT
              </button>
            </div>
          </div>
        )}
      </div>

      {tips.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[18px] text-primary">tips_and_updates</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Analysis ({tips.length} rules checked)</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {tips.filter(t => t.matches.length > 0 || t.isCustom).map(tip => (
              <div key={tip.id} className={`p-3 rounded-lg ${tip.matches.length > 0 ? 'bg-yellow-500/5 border border-yellow-500/10' : 'bg-surface'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-on-surface">{tip.label}</span>
                  {tip.matches.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 rounded-full">{tip.matches.length} match{tip.matches.length !== 1 ? 'es' : ''}</span>
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant">{tip.suggestion}</p>
                {tip.matches.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tip.matches.slice(0, 3).map((m, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded font-mono">"{m}"</span>
                    ))}
                  </div>
                )}
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
            <div className="ml-auto flex items-center gap-3">
              <span className="text-[10px] text-on-surface-variant">
                {prompt.length} → {optimized.length} chars ({optimized.length > prompt.length ? '+' : ''}{((optimized.length - prompt.length) / prompt.length * 100).toFixed(0)}%)
              </span>
              <button onClick={copyOptimized} className="text-[10px] text-primary hover:underline">Copy</button>
            </div>
          </div>
          <pre className="p-3 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface whitespace-pre-wrap break-words max-h-64 overflow-y-auto custom-scrollbar font-mono">{optimized}</pre>
        </div>
      )}

      {!hasAnalyzed && !prompt && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30">auto_fix_high</span>
          <p className="text-sm text-on-surface-variant mt-2">Enter a prompt above, then use the tools to optimize</p>
        </div>
      )}
    </div>
  );
}
