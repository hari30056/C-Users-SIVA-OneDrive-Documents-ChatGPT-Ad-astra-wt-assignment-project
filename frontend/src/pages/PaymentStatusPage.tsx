import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Ticket,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertOctagon,
} from 'lucide-react';

export const PaymentStatusPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!transactionId) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await api.payments.getStatus(transactionId);
        if (!isMounted) return;

        setData(res.data);
        setLoading(false);

        // If still PENDING, poll again after 1.2 seconds
        if (res.data.status === 'PENDING') {
          setPollCount((prev) => prev + 1);
          timeoutId = setTimeout(checkStatus, 1200);
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
        setLoading(false);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [transactionId]);

  if (loading && !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Querying Transaction...</h2>
      </div>
    );
  }

  const isPending = data?.status === 'PENDING';
  const isSuccess = data?.status === 'SUCCESS';
  const isFailed = data?.status === 'FAILED';

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden p-8 sm:p-12 text-center space-y-8">
        {/* Processing / Spinner State */}
        {isPending && (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-indigo-50 border-4 border-indigo-200 flex items-center justify-center mx-auto relative">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-ping" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                Processing Asynchronously
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Authorizing Transaction...
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Our background queue worker is simulating asynchronous gateway authorization. This simulates true distributed asynchronous payment settlement.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left font-mono text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Transaction Ref:</span>
                <span className="text-slate-900 font-bold">{data?.transactionReference}</span>
              </div>
              <div className="flex justify-between">
                <span>Poll Cycle:</span>
                <span className="text-indigo-600 font-bold">#{pollCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Queue:</span>
                <span className="text-emerald-600 font-bold">BullMQ::payment-processing</span>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {isSuccess && (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Payment Authorized
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Order Confirmed!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Your reservation has been completed and inventory officially transferred to sold. Your unique ticket codes are generated below.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3">
              <div className="flex justify-between text-xs pb-3 border-b border-slate-200">
                <span className="text-slate-500">Order Number</span>
                <span className="font-mono font-bold text-slate-900">{data?.orderNumber}</span>
              </div>
              <div className="flex justify-between text-xs pb-3 border-b border-slate-200">
                <span className="text-slate-500">Total Charged</span>
                <span className="font-extrabold text-slate-900 text-sm">${data?.amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono text-slate-600 text-[11px]">{data?.transactionId}</span>
              </div>
            </div>

            {/* Issued Tickets */}
            {data?.tickets && data.tickets.length > 0 && (
              <div className="space-y-3 text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Issued Tickets ({data.tickets.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {data.tickets.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-indigo-600" />
                        <span className="font-mono text-xs font-bold text-slate-800">{t.ticketCode}</span>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                to="/my-tickets"
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <span>View My Tickets</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/my-orders"
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors text-center"
              >
                View Orders History
              </Link>
            </div>
          </div>
        )}

        {/* Failed State */}
        {isFailed && (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md shadow-rose-500/20">
              <XCircle className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                Payment Declined
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Payment Could Not Be Processed
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                The simulated payment gateway declined this transaction. Under our ACID reservation engine, all held tickets have been immediately released back into the pool.
              </p>
            </div>

            {data?.gatewayResponse?.declineReason && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-left text-xs text-rose-900 font-medium">
                Reason: {data.gatewayResponse.declineReason}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                to="/events"
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors text-center"
              >
                Browse Other Events
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
