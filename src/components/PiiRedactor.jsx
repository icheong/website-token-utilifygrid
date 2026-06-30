import React, { useState, useEffect } from 'react';

const PII_TYPES = [
  { id: 'email', label: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, icon: 'email' },
  { id: 'phone', label: 'Phone', regex: /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, icon: 'phone' },
  { id: 'ssn', label: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g, icon: 'badge' },
  { id: 'creditCard', label: 'Credit Card', regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, icon: 'credit_card' },
  { id: 'ip', label: 'IP Address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, icon: 'lan' },
  { id: 'name', label: 'Proper Names', regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, icon: 'person' },
];

const REPLACEMENT_MODES = [
  { id: 'tag', label: 'Tag', example: '[EMAIL]' },
  { id: 'mask', label: 'Mask', example: 'j***@***.com' },
  { id: 'mock', label: 'Mock', example: 'john.doe@example.com' },
  { id: 'hash', label: 'Hash', example: '[a3f8b2c1]' },
  { id: 'custom', label: 'Custom', example: 'REDACTED' },
];

const MOCK_DATA = {
  name: {
    first: ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'],
  },
  email: {
    domains: ['example.com', 'test.org', 'sample.net', 'demo.co', 'mock.io'],
    prefixes: ['john.doe', 'jane.smith', 'bob.wilson', 'alice.brown', 'charlie.davis', 'emma.johnson', 'michael.white', 'sarah.green', 'david.clark', 'lisa.hall'],
  },
  phone: { areaCodes: ['202', '212', '310', '415', '512', '617', '713', '808', '917', '305'] },
  ssn: { prefixes: ['123', '456', '789', '234', '567', '890', '345', '678', '901', '147'] },
  creditCard: { prefixes: ['4111', '5500', '3700', '6011', '3566', '4916', '5424', '6759', '4000', '5100'] },
  ip: { ranges: ['192.168', '10.0', '172.16', '192.0', '10.1', '172.20', '192.168', '10.5', '172.31', '192.0'] },
};

let mockCounters = {};
function resetMockCounters() { mockCounters = {}; }
function getNextMockIndex(type) {
  if (!mockCounters[type]) mockCounters[type] = 0;
  const idx = mockCounters[type] % MOCK_DATA[type].length;
  mockCounters[type]++;
  return idx;
}

function generateMockData(typeId) {
  const idx = getNextMockIndex(typeId);
  if (typeId === 'name') return `${MOCK_DATA.name.first[idx]} ${MOCK_DATA.name.last[idx]}`;
  if (typeId === 'email') return `${MOCK_DATA.email.prefixes[idx]}@${MOCK_DATA.email.domains[idx % MOCK_DATA.email.domains.length]}`;
  if (typeId === 'phone') return `(${MOCK_DATA.phone.areaCodes[idx % 10]}) 555-${String(1000 + idx).padStart(4, '0')}`;
  if (typeId === 'ssn') return `${MOCK_DATA.ssn.prefixes[idx % 10]}-01-${String(1000 + idx).padStart(4, '0')}`;
  if (typeId === 'creditCard') return `${MOCK_DATA.creditCard.prefixes[idx % 10]}-0000-${String(1000 + idx).padStart(4, '0')}`;
  if (typeId === 'ip') { const r = MOCK_DATA.ip.ranges[idx % 10]; return `${r}.${idx + 1}.${(idx * 7 + 3) % 255}`; }
  return `[MOCK-${typeId.toUpperCase()}]`;
}

function maskValue(value, type) {
  if (type === 'email') {
    const [user, domain] = value.split('@');
    return `${user[0]}***@***.${domain.split('.').pop()}`;
  }
  if (type === 'phone') {
    return value.replace(/\d(?=\d{4})/g, '*');
  }
  if (type === 'ssn') {
    return '***-**-' + value.slice(-4);
  }
  if (type === 'creditCard') {
    return '****-****-****-' + value.replace(/\D/g, '').slice(-4);
  }
  if (type === 'ip') {
    return value.replace(/\d+$/g, 'xxx');
  }
  return '***';
}

function hashValue(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `[${Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8)}]`;
}

export default function PiiRedactor({ prompt }) {
  const [enabledTypes, setEnabledTypes] = useState(PII_TYPES.map(t => t.id));
  const [replacementMode, setReplacementMode] = useState('tag');
  const [customReplacement, setCustomReplacement] = useState('REDACTED');
  const [customPatterns, setCustomPatterns] = useState([]);
  const [newPatternName, setNewPatternName] = useState('');
  const [newPatternRegex, setNewPatternRegex] = useState('');
  const [detected, setDetected] = useState([]);
  const [redactedText, setRedactedText] = useState('');
  const [hasScanned, setHasScanned] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setDetected([]);
    setRedactedText('');
    setHasScanned(false);
    resetMockCounters();
  }, [prompt]);

  const toggleType = (id) => {
    setEnabledTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const addCustomPattern = () => {
    if (!newPatternName.trim() || !newPatternRegex.trim()) return;
    try {
      new RegExp(newPatternRegex);
      setCustomPatterns(prev => [...prev, {
        id: `custom-${Date.now()}`,
        label: newPatternName,
        regex: new RegExp(newPatternRegex, 'g'),
        icon: 'pattern',
        isCustom: true,
      }]);
      setNewPatternName('');
      setNewPatternRegex('');
    } catch (e) {
      alert('Invalid regex pattern');
    }
  };

  const removeCustomPattern = (id) => {
    setCustomPatterns(prev => prev.filter(p => p.id !== id));
  };

  const getReplacement = (value, typeId) => {
    if (replacementMode === 'tag') return `[${typeId.toUpperCase()}]`;
    if (replacementMode === 'mask') return maskValue(value, typeId);
    if (replacementMode === 'mock') return generateMockData(typeId);
    if (replacementMode === 'hash') return hashValue(value);
    return `[${customReplacement}]`;
  };

  const scan = () => {
    if (!prompt.trim()) return;
    resetMockCounters();
    let result = prompt;
    const found = [];
    const allPatterns = PII_TYPES.filter(p => enabledTypes.includes(p.id)).concat(customPatterns);

    allPatterns.forEach(p => {
      const matches = result.match(p.regex);
      if (matches) {
        const unique = [...new Set(matches)];
        unique.forEach(match => {
          found.push({ type: p.label, typeId: p.id, value: match, icon: p.icon, isCustom: p.isCustom });
        });
        result = result.replace(new RegExp(p.regex.source, 'g'), getReplacement(matches[0], p.id));
      }
    });

    setDetected(found);
    setRedactedText(result);
    setHasScanned(true);
  };

  const copyRedacted = () => {
    navigator.clipboard.writeText(redactedText);
  };

  const copyRedactedMarkdown = () => {
    navigator.clipboard.writeText(`\`\`\`markdown\n${redactedText}\n\`\`\``);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-primary">shield</span>
          <h3 className="font-headline-md text-sm font-bold text-on-surface">PII Redactor</h3>
          <span className="ml-auto text-[10px] text-on-surface-variant">Client-side only</span>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={scan} disabled={!prompt.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            Scan for PII
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
              <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider mb-2">PII Types to Detect</div>
              <div className="flex flex-wrap gap-2">
                {PII_TYPES.map(type => (
                  <button key={type.id} onClick={() => toggleType(type.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all border ${
                      enabledTypes.includes(type.id)
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-surface-container border-outline-variant text-on-surface-variant'
                    }`}>
                    <span className="material-symbols-outlined text-[12px]">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider mb-2">Replacement Mode</div>
              <div className="flex flex-wrap gap-2">
                {REPLACEMENT_MODES.map(mode => (
                  <button key={mode.id} onClick={() => setReplacementMode(mode.id)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all border ${
                      replacementMode === mode.id
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-surface-container border-outline-variant text-on-surface-variant'
                    }`}>
                    {mode.label}
                    <span className="ml-1 text-on-surface-variant/60">{mode.example}</span>
                  </button>
                ))}
              </div>
              {replacementMode === 'mock' && (
                <p className="mt-2 text-[10px] text-on-surface-variant">
                  Replaces PII with realistic fake data. Safe for testing prompts without leaking real information to models.
                </p>
              )}
              {replacementMode === 'custom' && (
                <input type="text" value={customReplacement} onChange={(e) => setCustomReplacement(e.target.value)}
                  placeholder="Custom replacement text"
                  className="mt-2 w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary" />
              )}
            </div>

            <div>
              <div className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider mb-2">Custom Patterns</div>
              <div className="flex gap-2">
                <input type="text" value={newPatternName} onChange={(e) => setNewPatternName(e.target.value)}
                  placeholder="Name" className="w-24 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary" />
                <input type="text" value={newPatternRegex} onChange={(e) => setNewPatternRegex(e.target.value)}
                  placeholder="Regex pattern" className="flex-1 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary" />
                <button onClick={addCustomPattern}
                  className="px-3 py-2 bg-surface-container text-on-surface-variant rounded-lg text-xs font-medium hover:bg-surface-container-high transition-all">
                  Add
                </button>
              </div>
              {customPatterns.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {customPatterns.map(p => (
                    <span key={p.id} className="flex items-center gap-1 px-2 py-1 bg-surface-container-high rounded-full text-[10px]">
                      <span className="font-mono">{p.label}</span>
                      <button onClick={() => removeCustomPattern(p.id)} className="text-on-surface-variant hover:text-red-500">
                        <span className="material-symbols-outlined text-[10px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {detected.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[18px] text-red-500">warning</span>
            <h3 className="font-headline-md text-sm font-bold text-on-surface">Detected PII</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full">{detected.length} items found</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {detected.map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-red-500/5 border border-red-500/10 rounded-lg">
                <span className="material-symbols-outlined text-[14px] text-red-500">{item.icon}</span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-label-mono min-w-[60px]">{item.type}</span>
                <span className="text-xs text-on-surface font-mono truncate flex-1">{item.value}</span>
                <span className="text-[10px] text-on-surface-variant">→</span>
                <span className="text-xs text-green-600 font-mono truncate max-w-[120px]">{getReplacement(item.value, item.typeId)}</span>
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
            <div className="ml-auto flex items-center gap-2">
              <button onClick={copyRedacted} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">content_copy</span>
                Copy Text
              </button>
              <button onClick={copyRedactedMarkdown} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">markdown</span>
                Copy as Markdown
              </button>
            </div>
          </div>
          <pre className="p-3 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto custom-scrollbar">{redactedText}</pre>
        </div>
      )}

      {hasScanned && detected.length === 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-[32px] text-green-600">check_circle</span>
          <p className="text-sm text-on-surface mt-2">No PII detected in prompt</p>
        </div>
      )}

      {!hasScanned && !prompt && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30">shield</span>
          <p className="text-sm text-on-surface-variant mt-2">Enter a prompt above, then click "Scan for PII"</p>
        </div>
      )}
    </div>
  );
}
