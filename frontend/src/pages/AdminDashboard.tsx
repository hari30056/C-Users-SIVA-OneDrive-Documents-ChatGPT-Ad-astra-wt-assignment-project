import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { PlatformAnalytics } from '../types';
import {
  ShieldAlert,
  Building,
  Users,
  Calendar,
  DollarSign,
  Activity,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, healthRes] = await Promise.all([
        api.analytics.getPlatform(),
        api.admin.getHealth(),
      ]);
      setAnalytics(analyticsRes.data);
      setHealth(healthRes);
    } catch (err) {
      console.error('Error fetching admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading && !analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-4">
        <div className="h-64 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            Global Administrator Console
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Platform System Overview
          </h1>
          <p className="text-sm text-slate-500">
            Cross-tenant governance, system health diagnostics, and platform metrics
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* System Health Diagnostics Card */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold tracking-wider uppercase text-slate-300">
              System Health & High-Availability Engine
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            ONLINE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
            <span className="text-slate-400 block mb-1">PostgreSQL Database</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{health?.database || 'Active'}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">ACID transactions & row-locking active</p>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
            <span className="text-slate-400 block mb-1">Redis & BullMQ Queues</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{health?.redis || 'Active'}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">10-min delayed expiration & async payments</p>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
            <span className="text-slate-400 block mb-1">API Node Uptime</span>
            <span className="text-slate-200 font-mono font-bold text-sm">
              {Math.floor((health?.uptime || 0) / 60)}m {Math.floor((health?.uptime || 0) % 60)}s
            </span>
            <p className="text-[10px] text-slate-500 mt-1">Node v24.12.0</p>
          </div>
        </div>
      </div>

      {/* High-Level Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Organizers</span>
          <p className="text-3xl font-black text-slate-900">{analytics?.totalOrganizers}</p>
          <span className="text-xs text-indigo-600 font-medium">
            {analytics?.activeOrganizers} active tenants
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Events</span>
          <p className="text-3xl font-black text-slate-900">{analytics?.totalEvents}</p>
          <span className="text-xs text-slate-500">Across all platform tenants</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gross Platform Volume</span>
          <p className="text-3xl font-black text-slate-900">
            ${analytics?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-emerald-600 font-medium">From confirmed orders</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Users</span>
          <p className="text-3xl font-black text-slate-900">{analytics?.totalUsers}</p>
          <span className="text-xs text-slate-500">Attendees & Organizers</span>
        </div>
      </div>

      {/* Admin Action Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link
          to="/admin/organizers"
          className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform">
            <Building className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Tenant Governance</h3>
          <p className="text-xs text-slate-500 mt-1">Activate, inspect, or suspend organizer tenants</p>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-600">
            <span>Manage Organizers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">User Directory</h3>
          <p className="text-xs text-slate-500 mt-1">Audit attendee, organizer, and administrator accounts</p>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-purple-600">
            <span>Manage Users</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/events"
          className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-3 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Global Event Catalog</h3>
          <p className="text-xs text-slate-500 mt-1">Inspect and moderate public events across all organizers</p>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600">
            <span>Explore Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
};
