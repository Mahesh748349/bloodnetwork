import React from 'react';
import { Droplet } from 'lucide-react';

export const BloodGroupBadge = ({ bloodGroup, size = 'md', className = '' }) => {
  const isNegative = bloodGroup?.includes('-');
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-lg px-4 py-1.5 font-bold',
    xl: 'text-2xl px-5 py-2.5 font-extrabold',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-bold rounded-lg border shadow-xs ${
        isNegative
          ? 'bg-rose-900 text-rose-50 border-rose-700'
          : 'bg-rose-600 text-white border-rose-500'
      } ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title={`Blood Group: ${bloodGroup}`}
    >
      <Droplet className={`${size === 'xl' ? 'w-6 h-6' : size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} mr-1 fill-current`} />
      {bloodGroup}
    </span>
  );
};
