// src/stores/useCurrencyStore.js
// React hook that subscribes to the shared currency store.
// Safe to use in any React island in Astro.

import { useState, useEffect, useCallback } from 'react';
import { subscribeCurrency, getCurrency, getRates, changeCurrency as storeChangeCurrency, convert as storeConvert, format as storeFormat, getSymbol as storeGetSymbol } from './currencyStore';

export function useCurrencyStore() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = subscribeCurrency(() => forceUpdate(n => n + 1));
    return unsub;
  }, []);

  return {
    currency: getCurrency(),
    rates: getRates(),
    changeCurrency: useCallback((c) => storeChangeCurrency(c), []),
    convert: useCallback((amount, from) => storeConvert(amount, from), []),
    format: useCallback((amount) => storeFormat(amount), []),
    getSymbol: useCallback(() => storeGetSymbol(), []),
    loading: getRates() === null,
  };
}
