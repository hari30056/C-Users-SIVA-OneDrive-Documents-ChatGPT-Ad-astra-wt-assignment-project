import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'ACTIVE':
      case 'CONFIRMED':
      case 'SUCCESS':
      case 'PUBLISHED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10';
      case 'PENDING':
      case 'DRAFT':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10';
      case 'EXPIRED':
      case 'CANCELLED':
      case 'FAILED':
      case 'SUSPENDED':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/10';
      case 'COMPLETED':
      case 'USED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/10';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStyle()} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          normalized === 'ACTIVE' || normalized === 'SUCCESS' || normalized === 'CONFIRMED'
            ? 'bg-emerald-500 animate-pulse'
            : normalized === 'PENDING'
            ? 'bg-amber-500 animate-pulse'
            : 'bg-current'
        }`}
      />
      {status}
    </span>
  );
};
