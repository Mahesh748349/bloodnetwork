import React from 'react';
import { AlertCircle, CheckCircle2, Clock, XCircle, Activity } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'open':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <Activity className="w-3.5 h-3.5 mr-1" />,
          label: 'Open Request',
        };
      case 'donors_contacted':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Clock className="w-3.5 h-3.5 mr-1" />,
          label: 'Donors Contacted',
        };
      case 'awaiting_responses':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Clock className="w-3.5 h-3.5 mr-1" />,
          label: 'Awaiting Responses',
        };
      case 'coordination_in_progress':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: <Activity className="w-3.5 h-3.5 mr-1" />,
          label: 'Coordination In Progress',
        };
      case 'fulfilled':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1" />,
          label: 'Fulfilled & Transfused',
        };
      case 'cancelled':
        return {
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
          icon: <XCircle className="w-3.5 h-3.5 mr-1" />,
          label: 'Cancelled',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: null,
          label: status,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export const UrgencyBadge = ({ urgency }) => {
  const getUrgencyConfig = () => {
    switch (urgency) {
      case 'critical':
        return {
          bg: 'bg-red-100 text-red-800 border-red-300 ring-2 ring-red-400/20 animate-pulse',
          label: 'CRITICAL EMERGENCY',
        };
      case 'high':
        return {
          bg: 'bg-orange-100 text-orange-800 border-orange-200',
          label: 'High Urgency',
        };
      case 'medium':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          label: 'Medium Urgency',
        };
      case 'low':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: 'Standard',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: urgency,
        };
    }
  };

  const config = getUrgencyConfig();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border tracking-wide uppercase ${config.bg}`}
    >
      <AlertCircle className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
};
