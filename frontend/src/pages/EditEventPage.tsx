import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Event } from '../types';
import { ArrowLeft, Plus, AlertCircle, Save } from 'lucide-react';

export const EditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('PUBLISHED');
  const [eventDate, setEventDate] = useState('');
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesCutoffDate, setSalesCutoffDate] = useState('');

  // Add new tier modal state
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState(50);
  const [newTierQuantity, setNewTierQuantity] = useState(25);
  const [newTierDescription, setNewTierDescription] = useState('');
  const [showAddTierModal, setShowAddTierModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [eventData, setEventData] = useState<Event | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const res = await api.events.getById(id);
        const ev: Event = res.data;
        setEventData(ev);
        setTitle(ev.title);
        setDescription(ev.description);
        setVenue(ev.venue);
        setLocation(ev.location);
        setCategory(ev.category);
        setStatus(ev.status);
        setEventDate(new Date(ev.eventDate).toISOString().slice(0, 16));
        setSalesStartDate(new Date(ev.salesStartDate).toISOString().slice(0, 16));
        setSalesCutoffDate(new Date(ev.salesCutoffDate).toISOString().slice(0, 16));
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load event for editing');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      await api.events.update(id, {
        title,
        description,
        venue,
        location,
        category,
        status,
        eventDate: new Date(eventDate).toISOString(),
        salesStartDate: new Date(salesStartDate).toISOString(),
        salesCutoffDate: new Date(salesCutoffDate).toISOString(),
      });
      navigate('/organizer/events');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update event.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.events.addTier(id, {
        name: newTierName,
        price: Number(newTierPrice),
        quantity: parseInt(String(newTierQuantity), 10),
        description: newTierDescription || undefined,
      });
      // Refresh event
      const res = await api.events.getById(id);
      setEventData(res.data);
      setShowAddTierModal(false);
      setNewTierName('');
      setNewTierPrice(50);
      setNewTierQuantity(25);
    } catch (err: any) {
      alert(err.message || 'Failed to add tier');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-4">
        <div className="h-64 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          to="/organizer/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Events</span>
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Edit Event</h1>
        <p className="text-sm text-slate-500 mt-1">
          Update event details, manage status, and expand ticket tier allocations
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Event Details</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Venue</label>
                <input
                  type="text"
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Date</label>
                <input
                  type="datetime-local"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Start</label>
                <input
                  type="datetime-local"
                  required
                  value={salesStartDate}
                  onChange={(e) => setSalesStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Cutoff</label>
                <input
                  type="datetime-local"
                  required
                  value={salesCutoffDate}
                  onChange={(e) => setSalesCutoffDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Existing Ticket Tiers Section */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Current Ticket Tiers</h2>
              <p className="text-xs text-slate-500">Live inventory and allocations</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddTierModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Tier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {eventData?.ticketTiers.map((tier) => (
              <div key={tier.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{tier.name}</h4>
                    <span className="font-mono text-xs font-extrabold text-indigo-600">${tier.price.toFixed(2)}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                    {tier.availableQuantity} available
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-2 border-t border-slate-200">
                  <span>Sold: {tier.soldQuantity}</span>
                  <span>In Hold: {tier.reservedQuantity}</span>
                  <span>Total: {tier.totalQuantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            to="/organizer/events"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Add Tier Modal */}
      {showAddTierModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add New Ticket Tier</h3>
            <form onSubmit={handleAddTier} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Late Bird Pass"
                  value={newTierName}
                  onChange={(e) => setNewTierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newTierPrice}
                    onChange={(e) => setNewTierPrice(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newTierQuantity}
                    onChange={(e) => setNewTierQuantity(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Benefits description"
                  value={newTierDescription}
                  onChange={(e) => setNewTierDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTierModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-xs"
                >
                  Add Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
