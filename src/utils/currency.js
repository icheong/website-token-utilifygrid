// src/utils/currency.js
const EXCHANGE_RATE_API = 'https://open.er-api.com/v6/latest/USD';

const defaultRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83.12,
  BRL: 4.97,
};

const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
};

const currencyNames = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  BRL: 'Brazilian Real',
};

let cachedRates = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function fetchExchangeRates() {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (cachedRates && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const response = await fetch(EXCHANGE_RATE_API);
    if (!response.ok) throw new Error('Failed to fetch rates');
    const data = await response.json();
    
    if (data.rates) {
      cachedRates = data.rates;
      lastFetchTime = now;
      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('exchangeRates', JSON.stringify({ rates: data.rates, time: now }));
      }
      return data.rates;
    }
  } catch (err) {
    console.error('Exchange rate fetch failed:', err);
  }

  // Try to load from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('exchangeRates');
    if (stored) {
      const { rates, time } = JSON.parse(stored);
      if (rates && (now - time) < CACHE_DURATION * 2) {
        cachedRates = rates;
        return rates;
      }
    }
  }

  // Fallback to default rates
  return defaultRates;
}

export function convertPrice(amount, fromCurrency = 'USD', toCurrency = 'USD', rates = defaultRates) {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to USD first, then to target currency
  const inUSD = amount / (rates[fromCurrency] || 1);
  const converted = inUSD * (rates[toCurrency] || 1);
  
  return converted;
}

export function formatPrice(amount, currency = 'USD', showSymbol = true) {
  const symbol = currencySymbols[currency] || currency;
  const decimals = currency === 'JPY' ? 0 : 2;
  
  if (showSymbol) {
    return `${symbol}${amount.toFixed(decimals)}`;
  }
  return amount.toFixed(decimals);
}

export function getCurrencySymbol(currency) {
  return currencySymbols[currency] || currency;
}

export function getCurrencyName(currency) {
  return currencyNames[currency] || currency;
}

export function getSupportedCurrencies() {
  return Object.keys(currencySymbols);
}
