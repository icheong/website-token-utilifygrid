// src/components/CurrencySelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { getSupportedCurrencies, getCurrencySymbol } from '../utils/currency';
import {
  getCurrency, getUnit, subscribeCurrency,
  changeCurrency as storeChangeCurrency, changeUnit as storeChangeUnit,
} from '../stores/currencyStore';

const UNITS = {
  monthly: { label: 'Monthly Spend', short: 'Monthly' },
  perRequest: { label: 'Per Request', short: 'Per Req' },
  blended: { label: 'Blended / 1M Tokens', short: 'Blended' },
  per1mRuns: { label: 'Per 1M Runs', short: '/1M Runs' },
};

export default function CurrencySelector() {
  const [, forceUpdate] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const currencies = getSupportedCurrencies();
  const currency = getCurrency();
  const unit = getUnit();

  useEffect(() => {
    const unsub = subscribeCurrency(() => forceUpdate(n => n + 1));
    return unsub;
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-colors text-xs font-label-mono"
      >
        <span className="font-bold">{getCurrencySymbol(currency || 'USD')}</span>
        <span className="text-on-surface-variant">{currency || 'USD'}</span>
        <span className="text-outline-variant">·</span>
        <span className="text-on-surface-variant">{UNITS[unit]?.short || 'Monthly'}</span>
        <span className="material-symbols-outlined text-[14px]">settings</span>
      </button>

      <div
        className={`absolute right-0 top-full mt-2 w-80 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl z-50 overflow-hidden transition-all duration-150 origin-top-right ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Currency */}
        <div className="p-4 border-b border-outline-variant">
          <h4 className="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">Currency</h4>
          <div className="grid grid-cols-5 gap-1.5">
            {currencies.map(curr => (
              <button
                key={curr}
                onClick={() => storeChangeCurrency(curr)}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-center transition-all ${
                  currency === curr
                    ? 'bg-primary-container-light/30 border border-primary'
                    : 'border border-transparent hover:bg-surface-container'
                }`}
              >
                <span className={`text-sm font-bold ${currency === curr ? 'text-primary' : 'text-on-surface'}`}>
                  {getCurrencySymbol(curr)}
                </span>
                <span className={`text-[9px] font-label-mono ${currency === curr ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {curr}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Unit */}
        <div className="p-4">
          <h4 className="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">Display Unit</h4>
          <div className="space-y-1">
            {Object.entries(UNITS).map(([key, info]) => (
              <button
                key={key}
                onClick={() => { storeChangeUnit(key); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  unit === key
                    ? 'bg-primary-container-light/30 text-primary font-medium'
                    : 'hover:bg-surface-container text-on-surface'
                }`}
              >
                {info.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
