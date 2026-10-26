import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Reservation, Order, Ticket } from '../types';
import { ReservationCountdown } from '../components/ReservationCountdown';
import { StatusBadge } from '../components/StatusBadge';
import {
  Clock,
  ShoppingBag,
  Ticket as TicketIcon,
  Calendar,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const AttendeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRes, orderRes, ticketRes] = await Promise.all([
          api.reservations.getMy(),
          api.orders.getMy(),
          api.tickets.getMy(),
        ]);
        setReservations(resRes.data);
        setOrders(orderRes.data);
        setTickets(ticketRes.data);
      } catch (err) {
        console.error('Error loading attendee dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeReservations = reservations.filter((r) => r.status === 'ACTIVE');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-300 backdrop-blur-md">
            Attendee Portal
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
            Manage your temporary reservations, view ticket purchases, and access your event passes with guaranteed inventory.
          </p>
        </div>
      </div>

      {/* Active Reservation Holds Warning Banner */}
      {activeReservations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Active Ticket Holds ({activeReservations.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeReservations.map((res) => (
              <div
                key={res.id || res.reservationId}
                className="bg-white p-6 rounded-2xl border-2 border-amber-300 shadow-md space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{res.eventTitle}</h3>
                  <StatusBadge status={res.status} />
                </div>

                <ReservationCountdown expiresAt={res.expiresAt} />

                <div className="pt-2 flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">
                    ${res.totalAmount.toFixed(2)}
                  </span>
                  <Link
                    to={`/checkout/${res.id || res.reservationId}`}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Proceed to Checkout
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Holds</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{activeReservations.length}</p>
          <span className="text-xs text-slate-500">10-minute hold active</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{orders.length}</p>
          <span className="text-xs text-slate-500">Purchase transactions</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Tickets</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TicketIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {tickets.filter((t) => t.status === 'ACTIVE').length}
          </p>
          <span className="text-xs text-slate-500">Ready for entry</span>
        </div>
      </div>

      {/* Quick Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Recent Orders</h3>
            <Link to="/my-orders" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              View All
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No recent orders placed.</p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 3).map((o) => (
                <div key={o.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-900">{o.orderNumber}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">{o.eventTitle}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">${o.totalAmount.toFixed(2)}</span>
                    <div className="mt-0.5"><StatusBadge status={o.status} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Recent Admission Tickets</h3>
            <Link to="/my-tickets" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              View All
            </Link>
          </div>
          {tickets.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No tickets issued yet.</p>
          ) : (
            <div className="space-y-3">
              {tickets.slice(0, 3).map((t) => (
                <div key={t.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-indigo-700">{t.ticketCode}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">{t.eventTitle} ({t.tierName})</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
