// src/components/CurrencyContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchExchangeRates, convertPrice, formatPrice, getCurrencySymbol } from '../utils/currency';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved currency preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedCurrency');
      if (saved) setCurrency(saved);
    }

    fetchExchangeRates()
      .then(data => {
        setRates(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load rates:', err);
        setLoading(false);
      });
  }, []);

  const changeCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCurrency', newCurrency);
    }
  };

  const convert = (amount, fromCurrency = 'USD') => {
    if (!rates) return amount;
    return convertPrice(amount, fromCurrency, currency, rates);
  };

  const format = (amount, showSymbol = true) => {
    return formatPrice(amount, currency, showSymbol);
  };

  const getSymbol = () => {
    return getCurrencySymbol(currency);
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      rates, 
      loading, 
      changeCurrency, 
      convert, 
      format, 
      getSymbol 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    return {
      currency: 'USD',
      rates: null,
      loading: false,
      changeCurrency: () => {},
      convert: (amount) => amount,
      format: (amount) => `$${amount.toFixed(2)}`,
      getSymbol: () => '$'
    };
  }
  return context;
}
