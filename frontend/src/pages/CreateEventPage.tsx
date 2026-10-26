import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, Trash2, Calendar, MapPin, DollarSign, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TierInput {
  name: string;
  description: string;
  price: number;
  quantity: number;
}

export const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Technology');
  const [imageUrl, setImageUrl] = useState('');

  // Default dates
  const now = new Date();
  const defaultEventDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const defaultSalesStart = now.toISOString().slice(0, 16);
  const defaultSalesCutoff = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [eventDate, setEventDate] = useState(defaultEventDate);
  const [salesStartDate, setSalesStartDate] = useState(defaultSalesStart);
  const [salesCutoffDate, setSalesCutoffDate] = useState(defaultSalesCutoff);

  const [ticketTiers, setTicketTiers] = useState<TierInput[]>([
    { name: 'General Admission', description: 'Standard admission pass', price: 99.00, quantity: 100 },
    { name: 'VIP Pass', description: 'VIP seating and backstage entry', price: 249.00, quantity: 25 },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addTier = () => {
    setTicketTiers((prev) => [
      ...prev,
      { name: `Tier ${prev.length + 1}`, description: '', price: 49.00, quantity: 50 },
    ]);
  };

  const removeTier = (index: number) => {
    if (ticketTiers.length <= 1) return;
    setTicketTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof TierInput, value: any) => {
    setTicketTiers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Section 16 validations:
    // 1. Sales cutoff cannot be after event date
    const eDate = new Date(eventDate);
    const sStart = new Date(salesStartDate);
    const sCutoff = new Date(salesCutoffDate);

    if (isNaN(eDate.getTime()) || isNaN(sStart.getTime()) || isNaN(sCutoff.getTime())) {
      setErrorMessage('Please provide valid dates and times.');
      return;
    }
    if (sCutoff > eDate) {
      setErrorMessage('Validation Error: Sales cutoff date cannot be after the event date.');
      return;
    }
    if (sStart >= sCutoff) {
      setErrorMessage('Validation Error: Sales start date must be strictly before sales cutoff date.');
      return;
    }

    // 2. Validate ticket tiers
    if (ticketTiers.length === 0) {
      setErrorMessage('Please add at least one ticket tier.');
      return;
    }

    for (const t of ticketTiers) {
      if (!t.name.trim()) {
        setErrorMessage('All ticket tiers must have a name.');
        return;
      }
      if (t.quantity <= 0 || !Number.isInteger(Number(t.quantity))) {
        setErrorMessage(`Quantity for tier "${t.name}" must be a positive integer.`);
        return;
      }
      if (t.price < 0) {
        setErrorMessage(`Price for tier "${t.name}" cannot be negative.`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        title,
        description,
        venue,
        location,
        category,
        imageUrl: imageUrl || undefined,
        eventDate: eDate.toISOString(),
        salesStartDate: sStart.toISOString(),
        salesCutoffDate: sCutoff.toISOString(),
        ticketTiers: ticketTiers.map((t) => ({
          name: t.name,
          description: t.description || undefined,
          price: Number(t.price),
          quantity: parseInt(String(t.quantity), 10),
        })),
      };

      await api.events.create(payload);
      navigate('/organizer/events');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create event.');
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create New Event</h1>
        <p className="text-sm text-slate-500 mt-1">
          Publish a new multi-tenant event with customized ticket tiers and inventory controls
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Cannot Create Event</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Event Information */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Event Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. NextGen Web & Cloud Summit 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
              <textarea
                required
                rows={4}
                placeholder="Detailed event agenda, guest speakers, highlights..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Venue *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Convention Center"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City / Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden"
                >
                  <option value="Technology">Technology</option>
                  <option value="Business">Business</option>
                  <option value="Music">Music</option>
                  <option value="Festival">Festival</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Image Banner URL (Optional)</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Schedule & Sales Cutoff Dates */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Schedule & Sales Lifecycle
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Start Date *</label>
              <input
                type="datetime-local"
                required
                value={salesStartDate}
                onChange={(e) => setSalesStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Cutoff Date *</label>
              <input
                type="datetime-local"
                required
                value={salesCutoffDate}
                onChange={(e) => setSalesCutoffDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Must be before the event date</span>
            </div>
          </div>
        </div>

        {/* Ticket Tiers Configuration */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Ticket Tiers</h2>
              <p className="text-xs text-slate-500">Define pricing and inventory allocations</p>
            </div>
            <button
              type="button"
              onClick={addTier}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tier</span>
            </button>
          </div>

          <div className="space-y-4">
            {ticketTiers.map((tier, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tier #{idx + 1}
                  </span>
                  {ticketTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tier Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VIP All-Access"
                      value={tier.name}
                      onChange={(e) => updateTier(idx, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Price ($) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={tier.price}
                      onChange={(e) => updateTier(idx, 'price', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Inventory Quantity *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={tier.quantity}
                      onChange={(e) => updateTier(idx, 'quantity', parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tier Benefits Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Includes exclusive lounge pass, swag bag"
                    value={tier.description}
                    onChange={(e) => updateTier(idx, 'description', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/organizer/events"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating Event...' : 'Publish Event'}
          </button>
        </div>
      </form>
    </div>
  );
};
