import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Event, TicketTier } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Calendar,
  MapPin,
  Building,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Ticket,
  Minus,
  Plus,
  ArrowRight,
} from 'lucide-react';

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, setActiveReservation } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const res = await api.events.getById(id);
        setEvent(res.data);
        // Initialize quantities to 0
        const initialQty: Record<string, number> = {};
        res.data.ticketTiers.forEach((tier: TicketTier) => {
          initialQty[tier.id] = 0;
        });
        setQuantities(initialQty);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const updateQuantity = (tierId: string, delta: number, maxAvailable: number) => {
    setQuantities((prev) => {
      const current = prev[tierId] || 0;
      const next = Math.max(0, Math.min(maxAvailable, Math.min(10, current + delta)));
      return { ...prev, [tierId]: next };
    });
  };

  const totalSelectedTickets = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  const totalEstimatedAmount = event
    ? event.ticketTiers.reduce((sum, tier) => sum + tier.price * (quantities[tier.id] || 0), 0)
    : 0;

  const handleReserve = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!id || !event) return;

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([tierId, qty]) => ({ ticketTierId: tierId, quantity: qty }));

    if (items.length === 0) {
      setErrorMessage('Please select at least 1 ticket to reserve.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.reservations.createHold(id, items);
      const reservation = res.data;
      setActiveReservation(reservation);
      // Navigate to checkout
      navigate(`/checkout/${reservation.reservationId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reserve tickets. They may have just sold out.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="h-96 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Event Not Found</h2>
        <p className="text-sm text-slate-500">{errorMessage || 'The requested event does not exist.'}</p>
        <Link to="/events" className="inline-block px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg">
          Back to Events
        </Link>
      </div>
    );
  }

  const eventDateObj = new Date(event.eventDate);
  const cutoffDateObj = new Date(event.salesCutoffDate);
  const isSalesClosed = cutoffDateObj < new Date();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="absolute inset-0 z-0 opacity-30">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover filter blur-xs" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-900 to-slate-900" />
          )}
        </div>

        <div className="relative z-10 p-6 sm:p-10 space-y-4 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white backdrop-blur-md border border-white/20">
              {event.category}
            </span>
            <StatusBadge status={event.status} />
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {event.title}
          </h1>

          <div className="flex items-center gap-2 text-indigo-300 text-sm font-semibold">
            <Building className="w-4 h-4" />
            <span>Organized by {event.organizerName || 'Verified Organizer'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 text-sm text-slate-300">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                {eventDateObj.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{event.venue}, {event.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Description & Ticket Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: About & Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-xl font-bold text-slate-900">About this Event</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Concurrency Guarantees Callout */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 flex items-start gap-4">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Guaranteed 10-Minute Hold Engine</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                When you click "Reserve Tickets", inventory is locked directly in PostgreSQL via atomic row-level locks. Your selected tickets are 100% held for 10 minutes, protecting against race conditions and concurrent bookings.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Ticket Tiers & Booking Widget */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg sticky top-24 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Select Tickets</h3>
              <p className="text-xs text-slate-500 mt-0.5">Choose your desired ticket tiers</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Ticket Tier Cards */}
            <div className="space-y-3">
              {event.ticketTiers.map((tier) => {
                const qty = quantities[tier.id] || 0;
                const isSoldOut = tier.availableQuantity <= 0;

                return (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-xl border transition-all ${
                      qty > 0
                        ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-500/10'
                        : isSoldOut
                        ? 'border-slate-200 bg-slate-50 opacity-60'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{tier.name}</h4>
                        {tier.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{tier.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-base font-extrabold text-slate-900">
                            ${tier.price.toFixed(2)}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">/ ticket</span>
                        </div>
                      </div>

                      {/* Stepper Controls */}
                      <div className="flex flex-col items-end gap-1">
                        {isSoldOut ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            Sold Out
                          </span>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                              <button
                                type="button"
                                onClick={() => updateQuantity(tier.id, -1, tier.availableQuantity)}
                                disabled={qty === 0}
                                className="w-7 h-7 rounded-md bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center font-bold text-sm text-slate-900 font-mono">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(tier.id, 1, tier.availableQuantity)}
                                disabled={qty >= tier.availableQuantity || qty >= 10}
                                className="w-7 h-7 rounded-md bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">
                              {tier.availableQuantity} available
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Summary */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span>Selected Tickets</span>
                <span className="font-bold text-slate-900">{totalSelectedTickets}</span>
              </div>
              <div className="flex items-center justify-between text-base font-extrabold text-slate-900">
                <span>Total Amount</span>
                <span>${totalEstimatedAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Reserve CTA */}
            <button
              type="button"
              onClick={handleReserve}
              disabled={totalSelectedTickets === 0 || submitting || isSalesClosed}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Acquiring Lock...</span>
                </>
              ) : isSalesClosed ? (
                <span>Sales Closed</span>
              ) : (
                <>
                  <span>Reserve Tickets (10-Min Hold)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-slate-400">
              🔒 Guaranteed reservation held for 10 minutes upon selection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
