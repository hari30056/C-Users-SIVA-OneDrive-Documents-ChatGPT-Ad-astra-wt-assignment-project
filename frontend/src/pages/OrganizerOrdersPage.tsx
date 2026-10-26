import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Order } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ShoppingBag, Search, Filter } from 'lucide-react';

export const OrganizerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.orders.getOrganizerOrders();
        setOrders(res.data);
      } catch (err) {
        console.error('Error fetching organizer orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(s) ||
      o.eventTitle?.toLowerCase().includes(s) ||
      (o as any).userName?.toLowerCase().includes(s) ||
      (o as any).userEmail?.toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tenant Orders & Transactions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete audit log of ticket purchases across your organization's events
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter orders by order #, attendee email, or event title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs font-medium bg-transparent focus:outline-hidden text-slate-900"
        />
      </div>

      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No Orders Found</p>
          <p className="text-xs text-slate-400">No transactions recorded for this criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Event</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Tickets</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const totalTickets = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{order.orderNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{order.eventTitle}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{(order as any).userName || 'Attendee'}</p>
                      <p className="text-[11px] text-slate-400">{(order as any).userEmail}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">{totalTickets} tix</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ${order.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
