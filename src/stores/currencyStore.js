// src/stores/currencyStore.js
// Module-level shared store for currency + unit state.
// Works across isolated React islands in Astro.

import { fetchExchangeRates, convertPrice, formatPrice, getCurrencySymbol, getSupportedCurrencies, getCurrencyName } from '../utils/currency';

let currency = 'USD';
let unit = 'monthly';
let rates = null;
let loaded = false;
const listeners = new Set();

export const UNITS = {
  monthly: { label: 'Monthly Spend', description: 'Bottom-line budget number' },
  perRequest: { label: 'Per Request', description: 'Conversational cost per API call' },
  blended: { label: 'Blended / 1M Tokens', description: 'Combined wholesale rate based on your slider ratio' },
  per1mRuns: { label: 'Per 1M Runs', description: 'Enterprise-scale projection for procurement' },
};

function notify() {
  listeners.forEach(fn => fn());
}

function init() {
  if (loaded) return;
  loaded = true;

  if (typeof window !== 'undefined') {
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) currency = savedCurrency;
    const savedUnit = localStorage.getItem('selectedUnit');
    if (savedUnit && UNITS[savedUnit]) unit = savedUnit;
  }

  fetchExchangeRates()
    .then(data => {
      rates = data;
      notify();
    })
    .catch(err => {
      console.error('Failed to load exchange rates:', err);
    });
}

export function getCurrency() {
  return currency;
}

export function getUnit() {
  return unit;
}

export function getRates() {
  return rates;
}

export function changeCurrency(newCurrency) {
  if (currency === newCurrency) return;
  currency = newCurrency;
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedCurrency', newCurrency);
  }
  notify();
}

export function changeUnit(newUnit) {
  if (unit === newUnit) return;
  unit = newUnit;
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedUnit', newUnit);
  }
  notify();
}

export function convert(amount, fromCurrency = 'USD') {
  if (!rates) return amount;
  return convertPrice(amount, fromCurrency, currency, rates);
}

export function format(amount) {
  return formatPrice(amount, currency);
}

export function getSymbol() {
  return getCurrencySymbol(currency);
}

export function subscribeCurrency(fn) {
  listeners.add(fn);
  init();
  return () => listeners.delete(fn);
}

export { getSupportedCurrencies, getCurrencyName, getCurrencySymbol };
