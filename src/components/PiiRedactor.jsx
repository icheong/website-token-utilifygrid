import React, { useState } from 'react';

const PII_PATTERNS = [
  { id: 'email', label: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, icon: 'email' },
  { id: 'phone', label: 'Phone', regex: /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, icon: 'phone' },
  { id: 'ssn', label: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g, icon: 'badge' },
  { id: 'creditCard', label: 'Credit Card', regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, icon: 'credit_card' },
  { id: 'ip', label: 'IP Address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, icon: 'lan' },
  { id: 'name', label: 'Proper Names', regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, icon: 'person' },
];

export default function PiiRedactor() {
  const [input, setInput] = useState('');
  const [detected, setDetected] = useState([]);
  const [redactedText, setRedactedText] = useState('');

  const scan = () => {
    if (!input.trim()) return;
    let result = input;
    const found = [];

    PII_PATTERNS.forEach(p => {
      const matches = result.match(p.regex);
      if (matches) {
        matches.forEach(match => {
          found.push({ type: p.label, value: match, icon: p.icon });
        });
        result = result.replace(p.regex, `[REDACTED-${p.label.toUpperCase()}]`);
      }
    });

    setDetected(found);
    setRedactedText(result);
  };

  const clear = () => {
    setInput('');
    setDetected([]);
    setRedactedText('');
  };

  const copyRedacted = () => {
    navigator.clipboard.writeText(redactedText);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-primary">shield</span>
          <h3 className="font-headline-md text-sm font-bold text-on-surface">PII Redactor</h3>
          <span className="ml-auto text-[10px] text-on-surface-variant">Client-side only — nothing leaves your browser</span>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste text containing PII (emails, phone numbers, names, SSNs, credit cards, IPs)..."
          className="w-full h-40 bg-surface border border-outline-variant rounded-lg p-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:outline-none focus:border-primary transition-colors font-mono"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={scan} disabled={!input.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            Scan for PII
          </button>
          <button onClick={clear}
            className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-lg text-xs font-medium hover:bg-surface-container-high transition-all">
            Clear
          </button>
        </div>
      </div>

      {detected.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[18px] text-red-500">warning</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Detected PII</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full">{detected.length} items found</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {detected.map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-red-500/5 border border-red-500/10 rounded-lg">
                <span className="material-symbols-outlined text-[14px] text-red-500">{item.icon}</span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-label-mono">{item.type}</span>
                <span className="text-xs text-on-surface font-mono truncate">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {redactedText && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[18px] text-green-600">check_circle</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Redacted Output</h3>
            <button onClick={copyRedacted} className="ml-auto text-[10px] text-primary hover:underline">Copy</button>
          </div>
          <pre className="p-3 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto custom-scrollbar">{redactedText}</pre>
        </div>
      )}
    </div>
  );
}
