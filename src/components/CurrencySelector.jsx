// src/components/CurrencySelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useCurrencyStore } from '../stores/useCurrencyStore';
import { getSupportedCurrencies, getCurrencyName, getCurrencySymbol } from '../utils/currency';

export default function CurrencySelector() {
  const { currency, changeCurrency, loading } = useCurrencyStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currencies = getSupportedCurrencies();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-colors text-xs font-label-mono"
      >
        <span className="font-bold">{getCurrencySymbol(currency)}</span>
        <span className="text-on-surface-variant">{currency}</span>
        <span className={`material-symbols-outlined text-[14px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-outline-variant">
            <span className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider">Select Currency</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {currencies.map(curr => (
              <button
                key={curr}
                onClick={() => {
                  changeCurrency(curr);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-surface-container-low transition-colors ${
                  currency === curr ? 'bg-primary-container-light/30' : ''
                }`}
              >
                <span className={`w-8 text-center font-bold text-sm ${currency === curr ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {getCurrencySymbol(curr)}
                </span>
                <div className="text-left">
                  <div className={`text-sm font-medium ${currency === curr ? 'text-primary' : 'text-on-surface'}`}>{curr}</div>
                  <div className="text-[10px] text-on-surface-variant">{getCurrencyName(curr)}</div>
                </div>
                {currency === curr && (
                  <span className="ml-auto material-symbols-outlined text-[16px] text-primary">check</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
