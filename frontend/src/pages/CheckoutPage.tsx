import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Reservation } from '../types';
import { ReservationCountdown } from '../components/ReservationCountdown';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Lock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const { user, setActiveReservation } = useAuth();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mock payment options
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card_visa');

  useEffect(() => {
    const fetchReservation = async () => {
      if (!reservationId) return;
      try {
        const res = await api.reservations.getById(reservationId);
        setReservation(res.data);
        setActiveReservation(res.data);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load reservation hold.');
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId]);

  const handleExpire = () => {
    setErrorMessage('Your 10-minute hold has expired. The tickets have been returned to the available pool.');
    setActiveReservation(null);
  };

  const handleProcessCheckout = async () => {
    if (!reservationId) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      // Step 1: Create Order from active reservation
      const orderRes = await api.orders.checkout(reservationId);
      const order = orderRes.data;

      // Step 2: Initiate Mock Asynchronous Payment
      const paymentRes = await api.payments.process({
        orderId: order.id,
        simulateFailure,
        paymentMethod,
      });

      const { transactionId } = paymentRes.data;
      setActiveReservation(null);

      // Navigate to Payment Processing & Status page
      navigate(`/payment-status/${transactionId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Checkout failed. Please try again or reserve new tickets.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="h-96 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Reservation Not Found</h2>
        <p className="text-sm text-slate-500">{errorMessage || 'Reservation does not exist or has expired.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Transactional Checkout</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your reservation items and complete payment before the hold expires
        </p>
      </div>

      {/* Prominent 10-Minute Hold Countdown Banner */}
      <ReservationCountdown
        expiresAt={reservation.expiresAt}
        onExpire={handleExpire}
      />

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-sm text-rose-800">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Checkout Notice</p>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Mock Payment Gateway Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Mock Payment Gateway</h3>
                  <p className="text-xs text-slate-500">Asynchronous transaction processing simulation</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Sandbox Mode
              </span>
            </div>

            {/* Test Simulation Mode Toggle */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Deterministic Payment Outcome Simulation
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSimulateFailure(false)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    !simulateFailure
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2 className={`w-5 h-5 shrink-0 ${!simulateFailure ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Simulate SUCCESS</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Authorizes charge & issues tickets</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSimulateFailure(true)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    simulateFailure
                      ? 'border-rose-600 bg-rose-50/50 ring-1 ring-rose-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <XCircle className={`w-5 h-5 shrink-0 ${simulateFailure ? 'text-rose-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Simulate FAILURE</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Declines payment & releases hold</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Simulated Card Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  readOnly
                  value={user?.name || 'Attendee'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Simulated Card Number</label>
                <input
                  type="text"
                  readOnly
                  value={simulateFailure ? '4000 0000 0000 9999 (Will Decline)' : '4242 •••• •••• 4242 (Test Visa)'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry</label>
                  <input
                    type="text"
                    readOnly
                    value="12 / 28"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CVC</label>
                  <input
                    type="text"
                    readOnly
                    value="888"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Payments are processed asynchronously via BullMQ background workers.</span>
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Order Summary
            </h3>

            {/* Reserved Items */}
            <div className="space-y-3">
              {reservation.items.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{item.tierName || 'Ticket'}</p>
                    <p className="text-slate-400 text-[11px]">Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}</p>
                  </div>
                  <span className="font-extrabold text-slate-900">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-medium text-slate-700">${reservation.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Processing Fee</span>
                <span className="font-medium text-emerald-600">$0.00 (Waived)</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-base font-black text-slate-900">
                <span>Total Due</span>
                <span>${reservation.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleProcessCheckout}
              disabled={submitting || reservation.status !== 'ACTIVE'}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Order...</span>
                </>
              ) : (
                <>
                  <span>Pay ${reservation.totalAmount.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
