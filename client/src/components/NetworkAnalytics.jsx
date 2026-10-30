import React, { useEffect, useState } from 'react';
import { analyticsService } from '../services/analyticsService';
import {
  Activity,
  Users,
  Building2,
  AlertTriangle,
  Heart,
  Droplet,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { BloodGroupBadge } from './BloodGroupBadge';

export const NetworkAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [netRes, alertRes] = await Promise.all([
          analyticsService.getNetworkStats(),
          analyticsService.getShortageAlerts(10),
        ]);
        if (netRes.success) setStats(netRes.stats);
        if (alertRes.success) setShortages(alertRes.alerts);
      } catch (err) {
        console.warn('Analytics load error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Shortage Alert Banner if any */}
      {shortages.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold text-amber-900">Network Blood Shortage Notice: </span>
            <span className="text-amber-800">
              Low eligible donor count detected for blood groups:{' '}
              {shortages.map((s) => `${s.bloodGroup} (${s.eligibleDonors} available)`).join(', ')}.
            </span>
          </div>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Hospitals / Centers</span>
            <Building2 className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalOrganizations}</div>
          <div className="text-xs text-slate-500 mt-1">Active connected networks</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Donors</span>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalDonors}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            {stats.deferredDonors} safely deferred
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Donations This Week</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.donationsThisWeek}</div>
          <div className="text-xs text-slate-500 mt-1">{stats.donationsToday} verified today</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Requests</span>
            <Activity className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.activeRequests}</div>
          <div className="text-xs text-slate-500 mt-1">In coordination pipeline</div>
        </div>
      </div>

      {/* Blood Group Matrix Summary */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Droplet className="w-4 h-4 text-rose-600" />
          Network Blood Group Availability Matrix
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {Object.entries(stats.bloodGroupStats || {}).map(([bg, count]) => {
            const inventoryUnits = stats.inventoryStats?.[bg] || 0;
            const isLow = count < 5;
            return (
              <div
                key={bg}
                className={`p-3 rounded-xl border text-center transition ${
                  isLow
                    ? 'border-red-200 bg-red-50/50'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60'
                }`}
              >
                <BloodGroupBadge bloodGroup={bg} size="sm" />
                <div className="mt-2 text-lg font-bold text-slate-800">{count}</div>
                <div className="text-[10px] text-slate-500 font-medium">Eligible Donors</div>
                <div className="mt-1 pt-1 border-t border-slate-200/80 text-[10px] font-semibold text-rose-700">
                  {inventoryUnits} units banked
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

