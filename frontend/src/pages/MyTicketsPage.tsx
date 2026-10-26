import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Ticket as TicketType } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Ticket, Calendar, MapPin, CheckCircle, QrCode, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      const res = await api.tickets.getMy();
      setTickets(res.data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSimulateCheckIn = async (ticketId: string) => {
    setVerifyingId(ticketId);
    try {
      await api.tickets.verify(ticketId);
      await fetchTickets();
    } catch (err) {
      console.error('Check-in error:', err);
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Ticket Wallet</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your official digital admission passes with verifiable secure ticket codes
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">No Tickets Issued</p>
          <p className="text-xs text-slate-500">You don't have any confirmed event tickets right now.</p>
          <Link
            to="/events"
            className="inline-block px-4 py-2 mt-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
          >
            Explore Events
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col md:flex-row relative group hover:border-indigo-300 transition-all"
            >
              {/* Ticket Left Section */}
              <div className="p-6 sm:p-8 flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {ticket.tierName || 'Admission Pass'}
                  </span>
                  <StatusBadge status={ticket.status} />
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    {ticket.eventTitle}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-slate-500 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        {ticket.eventDate
                          ? new Date(ticket.eventDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'TBA'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{ticket.eventVenue}, {ticket.eventLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Order: <strong className="text-slate-700 font-mono">{ticket.orderNumber}</strong></span>
                  <span>Issued: {new Date(ticket.issuedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Ticket Stub / QR Code Section */}
              <div className="md:w-64 bg-slate-50 p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l-2 md:border-dashed border-slate-200 text-center space-y-3">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <QrCode className="w-20 h-20 text-slate-800" />
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Unique Ticket Code
                  </span>
                  <span className="font-mono text-xs font-black text-slate-900 tracking-wider">
                    {ticket.ticketCode}
                  </span>
                </div>

                {ticket.status === 'ACTIVE' ? (
                  <button
                    type="button"
                    onClick={() => handleSimulateCheckIn(ticket.id)}
                    disabled={verifyingId === ticket.id}
                    className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {verifyingId === ticket.id ? 'Verifying...' : 'Simulate Venue Scan'}
                  </button>
                ) : (
                  <span className="text-xs font-bold text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
                    Scanned & Used
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
