import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Building, ShieldCheck, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminOrganizersPage: React.FC = () => {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrganizers = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getOrganizers();
      setOrganizers(res.data);
    } catch (err) {
      console.error('Error fetching organizers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const handleToggleStatus = async (orgId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUpdatingId(orgId);
    try {
      await api.admin.updateOrganizerStatus(orgId, nextStatus);
      await fetchOrganizers();
    } catch (err: any) {
      alert(err.message || 'Failed to update organizer status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && organizers.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-4">
        <div className="h-48 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Admin Console</span>
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tenant Governance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Inspect registered organizer tenants and toggle operational status
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">Organization Name</th>
              <th className="py-3.5 px-4">Owner Name</th>
              <th className="py-3.5 px-4">Owner Email</th>
              <th className="py-3.5 px-4">Tenant ID</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {organizers.map((org) => (
              <tr key={org.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>{org.organizationName}</span>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-800">{org.ownerName || 'Organizer'}</td>
                <td className="py-3.5 px-4 font-mono text-slate-500">{org.ownerEmail}</td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{org.id.slice(0, 8)}...</td>
                <td className="py-3.5 px-4">
                  <StatusBadge status={org.status} />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => handleToggleStatus(org.id, org.status)}
                    disabled={updatingId === org.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      org.status === 'ACTIVE'
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {updatingId === org.id
                      ? 'Updating...'
                      : org.status === 'ACTIVE'
                      ? 'Suspend Tenant'
                      : 'Activate Tenant'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
