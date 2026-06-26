// src/stores/currencyStore.js
// Module-level shared store for currency state.
// Works across isolated React islands in Astro.

import { fetchExchangeRates, convertPrice, formatPrice, getCurrencySymbol, getSupportedCurrencies, getCurrencyName } from '../utils/currency';

let currency = 'USD';
let rates = null;
let loaded = false;
const listeners = new Set();

function notify() {
  listeners.forEach(fn => fn());
}

function init() {
  if (loaded) return;
  loaded = true;

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('selectedCurrency');
    if (saved) {
      currency = saved;
    }
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
