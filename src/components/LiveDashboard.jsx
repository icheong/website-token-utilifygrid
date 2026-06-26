// src/components/LiveDashboard.jsx
import React, { useState, useEffect } from 'react';
import { fetchPricing } from '../utils/supabase';
import { useCurrencyStore } from '../stores/useCurrencyStore';

export default function LiveDashboard() {
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const { convert, format } = useCurrencyStore();

  useEffect(() => {
    fetchPricing()
      .then(data => {
        // Group by model and keep only the cheapest price per model
        const modelMap = {};
        data
          .filter(p => p.models && p.providers)
          .forEach(p => {
            const modelId = p.models.id;
            if (!modelMap[modelId] || p.input_price_per_m < modelMap[modelId].input_price_per_m) {
              modelMap[modelId] = {
                id: modelId,
                name: p.models.name,
                input_price_per_m: p.input_price_per_m,
                provider: p.providers.name
              };
            }
          });
        const sorted = Object.values(modelMap)
          .sort((a, b) => a.input_price_per_m - b.input_price_per_m)
          .slice(0, 3);
        setPricing(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch pricing:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between p-3 bg-surface-container rounded-lg animate-pulse">
            <div className="h-4 bg-outline-variant rounded w-24"></div>
            <div className="h-4 bg-outline-variant rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pricing.map((item) => (
        <div key={item.id} className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
          <div className="flex flex-col">
            <span className="text-body-md text-on-surface-variant">{item.name}</span>
            <span className="text-xs text-outline">{item.provider}</span>
          </div>
          <span className="font-metric-display text-metric-display text-primary">
            {format(convert(item.input_price_per_m))}
          </span>
        </div>
      ))}
      {pricing.length === 0 && (
        <div className="text-center py-4 text-on-surface-variant text-body-md">
          No pricing data available
        </div>
      )}
    </div>
  );
}
