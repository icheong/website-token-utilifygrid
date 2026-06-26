// src/components/LiveStats.jsx
import React, { useState, useEffect } from 'react';
import { fetchPricing } from '../utils/supabase';

export default function LiveStats() {
  const [stats, setStats] = useState({ avgLatency: 0, providerCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricing()
      .then(data => {
        if (data && data.length > 0) {
          const totalLatency = data.reduce((sum, p) => sum + (p.latency_tps || 0), 0);
          const avgLatency = (totalLatency / data.length).toFixed(1);
          const uniqueProviders = new Set(data.map(p => p.provider_id)).size;
          setStats({ avgLatency, providerCount: uniqueProviders });
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
      <div class="grid grid-cols-2 gap-6">
        <div class="p-6 bg-surface rounded-xl border border-outline-variant custom-shadow animate-pulse">
          <div class="h-8 bg-outline-variant rounded w-20 mb-2"></div>
          <div class="h-4 bg-outline-variant rounded w-24"></div>
        </div>
        <div class="p-6 bg-surface rounded-xl border border-outline-variant custom-shadow animate-pulse">
          <div class="h-8 bg-outline-variant rounded w-20 mb-2"></div>
          <div class="h-4 bg-outline-variant rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="p-6 bg-surface rounded-xl border border-outline-variant custom-shadow">
        <div className="font-metric-display text-metric-display text-primary mb-1">{stats.avgLatency} TPS</div>
        <div className="font-label-mono text-label-mono text-outline uppercase tracking-widest">Avg Throughput</div>
      </div>
      <div className="p-6 bg-surface rounded-xl border border-outline-variant custom-shadow">
        <div className="font-metric-display text-metric-display text-success mb-1">{stats.providerCount}</div>
        <div className="font-label-mono text-label-mono text-outline uppercase tracking-widest">Providers</div>
      </div>
    </div>
  );
}
