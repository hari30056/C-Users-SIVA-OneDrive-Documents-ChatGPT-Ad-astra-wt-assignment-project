import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Order } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ShoppingBag, Calendar, MapPin, Ticket, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.orders.getMy();
        setOrders(res.data);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Orders</h1>
        <p className="text-sm text-slate-500 mt-1">Review your purchase history and order receipts</p>
      </div>

      {orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">No Orders Found</p>
          <p className="text-xs text-slate-500">You haven't purchased any event tickets yet.</p>
          <Link
            to="/events"
            className="inline-block px-4 py-2 mt-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-black text-slate-900">
                      {order.orderNumber}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-slate-400">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] uppercase font-bold text-slate-400">Total Charged</span>
                  <div className="text-lg font-black text-slate-900">${order.totalAmount.toFixed(2)}</div>
                </div>
              </div>

              {/* Event details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{order.eventTitle}</h4>
                  <div className="flex items-center gap-2 text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{order.eventVenue}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Purchased Items:</span>
                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-600">
                        <span>{item.quantity}× {item.tierName || 'Ticket'}</span>
                        <span className="font-mono font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Issued Tickets count / CTA */}
              {order.status === 'CONFIRMED' && order.tickets && order.tickets.length > 0 && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                    <Ticket className="w-4 h-4" />
                    <span>{order.tickets.length} tickets ready in your ticket wallet</span>
                  </div>
                  <Link
                    to="/my-tickets"
                    className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <span>View Tickets</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
