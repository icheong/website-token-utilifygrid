// src/components/LiveStats.jsx
import React, { useState, useEffect } from 'react';
import { fetchPricing } from '../utils/supabase';

export default function LiveStats() {
  const [stats, setStats] = useState({ modelCount: 0, avgTps: 0, providerCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricing()
      .then(data => {
        if (data && data.length > 0) {
          const uniqueModels = new Set(data.map(p => p.model_id)).size;
          const totalTps = data.reduce((sum, p) => sum + (p.latency_tps || 0), 0);
          const avgTps = data.length > 0 ? (totalTps / data.length).toFixed(1) : 0;
          const uniqueProviders = new Set(data.map(p => p.provider_id)).size;
          setStats({ modelCount: uniqueModels, avgTps, providerCount: uniqueProviders });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div class="grid grid-cols-3 gap-6 w-full">
        {[1, 2, 3].map(() => (
          <div class="p-5 bg-surface rounded-xl border border-outline-variant custom-shadow animate-pulse">
            <div class="h-9 bg-outline-variant rounded w-16 mb-3"></div>
            <div class="h-3 bg-outline-variant rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { value: stats.modelCount, label: 'Models', color: 'text-primary' },
    { value: `${stats.avgTps} TPS`, label: 'Avg Throughput', color: 'text-secondary' },
    { value: stats.providerCount, label: 'Providers', color: 'text-tertiary' },
  ];

  return (
    <div className="grid grid-cols-3 gap-6 w-full">
      {items.map((item) => (
        <div key={item.label} className="p-5 bg-surface rounded-xl border border-outline-variant custom-shadow text-center">
          <div className={`font-metric-display text-metric-display ${item.color} mb-1`}>{item.value}</div>
          <div className="font-label-mono text-label-mono text-outline uppercase tracking-widest">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
