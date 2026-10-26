import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface ReservationCountdownProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
  compact?: boolean;
}

export const ReservationCountdown: React.FC<ReservationCountdownProps> = ({
  expiresAt,
  onExpire,
  className = '',
  compact = false,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateSeconds = () => {
      const target = new Date(expiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      return diff;
    };

    setSecondsRemaining(calculateSeconds());

    const interval = setInterval(() => {
      const remaining = calculateSeconds();
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onExpire) {
          onExpire();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isUrgent = secondsRemaining < 120 && secondsRemaining > 0;
  const isExpired = secondsRemaining <= 0;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-colors ${
          isExpired
            ? 'bg-rose-100 text-rose-800 border border-rose-300'
            : isUrgent
            ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
        } ${className}`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>{isExpired ? 'Expired' : formattedTime}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 transition-all ${
        isExpired
          ? 'bg-rose-50 border-2 border-rose-200 text-rose-900'
          : isUrgent
          ? 'bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm animate-pulse'
          : 'bg-indigo-50/80 border border-indigo-200 text-indigo-950 shadow-sm'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg ${
              isExpired
                ? 'bg-rose-200 text-rose-800'
                : isUrgent
                ? 'bg-amber-200 text-amber-800'
                : 'bg-indigo-600 text-white'
            }`}
          >
            {isExpired || isUrgent ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Temporary Ticket Hold
            </p>
            <p className="text-sm font-medium">
              {isExpired ? (
                <span className="font-bold text-rose-600">Your reservation has expired</span>
              ) : (
                <>
                  Reservation expires in{' '}
                  <span className="font-mono font-extrabold text-indigo-700">{formattedTime}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-mono font-black tracking-tight text-slate-900">
            {formattedTime}
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            {isExpired ? 'Hold released' : 'Guaranteed 10-min hold'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isExpired ? 'bg-rose-500' : isUrgent ? 'bg-amber-500' : 'bg-indigo-600'
          }`}
          style={{ width: `${Math.min(100, (secondsRemaining / 600) * 100)}%` }}
        />
      </div>
    </div>
  );
};
