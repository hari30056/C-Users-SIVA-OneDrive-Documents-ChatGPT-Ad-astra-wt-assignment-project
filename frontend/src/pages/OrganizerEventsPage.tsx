import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Event } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  PlusCircle,
  Calendar,
  MapPin,
  Edit,
  Trash2,
  BarChart2,
  Ticket,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const OrganizerEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await api.events.getOrganizerEvents();
      setEvents(res.data);
    } catch (err) {
      console.error('Error fetching organizer events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    setDeletingId(id);
    try {
      await api.events.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manage Events</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and maintain your organization's events and ticket inventory
          </p>
        </div>

        <Link
          to="/organizer/events/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Event</span>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">No Events Created Yet</p>
          <p className="text-xs text-slate-500">Launch your first event and start selling tickets.</p>
          <Link
            to="/organizer/events/new"
            className="inline-block px-4 py-2 mt-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
          >
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const totalTickets = event.ticketTiers.reduce((sum, t) => sum + t.totalQuantity, 0);
            const soldTickets = event.ticketTiers.reduce((sum, t) => sum + t.soldQuantity, 0);
            const reservedTickets = event.ticketTiers.reduce((sum, t) => sum + t.reservedQuantity, 0);
            const availableTickets = event.ticketTiers.reduce((sum, t) => sum + t.availableQuantity, 0);

            return (
              <div
                key={event.id}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
                      <StatusBadge status={event.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(event.eventDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {event.venue}, {event.location}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/events/${event.id}`}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View Public Page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/organizer/events/${event.id}/edit`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>
                    <button
                      onClick={() => handleDelete(event.id)}
                      disabled={deletingId === event.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Inventory Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 font-semibold block">Total Pool</span>
                    <span className="text-base font-bold text-slate-900">{totalTickets}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <span className="text-emerald-700 font-semibold block">Sold</span>
                    <span className="text-base font-bold text-emerald-900">{soldTickets}</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <span className="text-amber-700 font-semibold block">In 10-Min Hold</span>
                    <span className="text-base font-bold text-amber-900">{reservedTickets}</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <span className="text-indigo-700 font-semibold block">Available</span>
                    <span className="text-base font-bold text-indigo-900">{availableTickets}</span>
                  </div>
                </div>

                {/* Ticket Tiers list */}
                <div className="text-xs text-slate-500 space-y-1">
                  <span className="font-semibold text-slate-700">Configured Tiers: </span>
                  {event.ticketTiers.map((t) => (
                    <span key={t.id} className="inline-block mr-3">
                      {t.name} (${t.price.toFixed(2)}) — {t.availableQuantity}/{t.totalQuantity} avail
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
