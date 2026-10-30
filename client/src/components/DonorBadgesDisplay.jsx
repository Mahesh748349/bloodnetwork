import React from 'react';
import { Award, Shield, Star, Heart, Flame, Calendar, Globe, Sparkles } from 'lucide-react';

const BADGE_MAP = {
  first_donation: {
    label: 'First Donation',
    desc: 'Completed your first verified donation',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50 text-emerald-800',
    icon: Heart,
  },
  five_donations: {
    label: '5 Donations Milestone',
    desc: 'Saved up to 15 lives',
    color: 'from-blue-500 to-cyan-600',
    border: 'border-blue-300',
    bg: 'bg-blue-50 text-blue-800',
    icon: Star,
  },
  ten_donations: {
    label: 'Bronze Centurion (10)',
    desc: 'Outstanding dedication',
    color: 'from-amber-500 to-orange-600',
    border: 'border-amber-300',
    bg: 'bg-amber-50 text-amber-800',
    icon: Award,
  },
  twenty_five_donations: {
    label: 'Silver Champion (25)',
    desc: 'Elite blood donor',
    color: 'from-indigo-500 to-purple-600',
    border: 'border-indigo-300',
    bg: 'bg-indigo-50 text-indigo-800',
    icon: Shield,
  },
  veteran_donor: {
    label: 'Gold Veteran (50+)',
    desc: 'LifeFlow Legend',
    color: 'from-yellow-500 to-amber-600',
    border: 'border-yellow-300',
    bg: 'bg-yellow-50 text-yellow-900',
    icon: Flame,
  },
  rare_blood_group: {
    label: 'Rare Blood Champion',
    desc: 'Universal / Rare Antigen Type',
    color: 'from-rose-500 to-red-600',
    border: 'border-rose-300',
    bg: 'bg-rose-50 text-rose-800',
    icon: Sparkles,
  },
  cross_hospital: {
    label: 'Multi-Hospital Hero',
    desc: 'Donated across multiple medical centers',
    color: 'from-sky-500 to-blue-600',
    border: 'border-sky-300',
    bg: 'bg-sky-50 text-sky-800',
    icon: Globe,
  },
  regular_donor: {
    label: 'Consistent Lifesaver',
    desc: 'Active periodic donations',
    color: 'from-teal-500 to-emerald-600',
    border: 'border-teal-300',
    bg: 'bg-teal-50 text-teal-800',
    icon: Calendar,
  },
  emergency_hero: {
    label: 'Emergency Hero',
    desc: 'Responded to critical emergency SOS',
    color: 'from-red-600 to-rose-700',
    border: 'border-red-300',
    bg: 'bg-red-50 text-red-800',
    icon: Flame,
  },
};

export const DonorBadgesDisplay = ({ badges = [] }) => {
  if (!badges || badges.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
        <Award className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
        <p className="text-sm font-semibold text-slate-700">No Badges Unlocked Yet</p>
        <p className="text-xs text-slate-500 mt-1">
          Complete verified blood donations at any network hospital to earn milestone badges!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {badges.map((b) => {
        const meta = BADGE_MAP[b.badgeType] || {
          label: b.badgeType.replace('_', ' ').toUpperCase(),
          desc: b.description || 'Verified achievement',
          bg: 'bg-slate-100 text-slate-800',
          border: 'border-slate-300',
          icon: Award,
        };
        const Icon = meta.icon;

        return (
          <div
            key={b._id || b.badgeType}
            className={`flex items-center gap-3 p-3.5 rounded-xl border ${meta.border} ${meta.bg} shadow-sm transition hover:shadow-md`}
          >
            <div className="p-2.5 rounded-lg bg-white/80 shadow-xs text-rose-600 shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs uppercase tracking-wide truncate">
                {meta.label}
              </div>
              <div className="text-[11px] opacity-80 line-clamp-1">{meta.desc}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Unlocked: {new Date(b.awardedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

