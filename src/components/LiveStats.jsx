// src/components/LiveStats.jsx
import React, { useState, useEffect } from 'react';
import { fetchPricing, fetchLastSynced } from '../utils/supabase';

export default function LiveStats() {
  const [stats, setStats] = useState({ modelCount: 0, avgPrice: '0', providerCount: 0 });
  const [lastSynced, setLastSynced] = useState(null);
  const [loading, setLoading] = useState(true);

  function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  useEffect(() => {
    Promise.all([fetchPricing(), fetchLastSynced()])
      .then(([data, synced]) => {
        if (data && data.length > 0) {
          const uniqueModels = new Set(data.map(p => p.model_id)).size;
          const prices = data.filter(p => p.input_price_per_m > 0).map(p => p.input_price_per_m);
          const avgPrice = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : '0';
          const uniqueProviders = new Set(data.map(p => p.provider_id)).size;
          setStats({ modelCount: uniqueModels, avgPrice, providerCount: uniqueProviders });
        }
        setLastSynced(synced);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-6 w-full">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 bg-surface rounded-xl border border-outline-variant custom-shadow animate-pulse">
            <div className="h-9 bg-outline-variant rounded w-16 mb-3"></div>
            <div className="h-3 bg-outline-variant rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { value: stats.modelCount, label: 'Models', color: 'text-primary' },
    { value: `$${stats.avgPrice}`, label: 'Avg Input / 1M', color: 'text-secondary' },
    { value: stats.providerCount, label: 'Providers', color: 'text-tertiary' },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-6 w-full">
        {items.map((item) => (
          <div key={item.label} className="p-5 bg-surface rounded-xl border border-outline-variant custom-shadow text-center">
            <div className={`font-metric-display text-metric-display ${item.color} mb-1`}>{item.value}</div>
            <div className="font-label-mono text-label-mono text-outline uppercase tracking-widest">{item.label}</div>
          </div>
        ))}
      </div>
      {lastSynced && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[12px]">schedule</span>
          <span>Data refreshed {timeAgo(lastSynced)}</span>
        </div>
      )}
    </div>
  );
}
