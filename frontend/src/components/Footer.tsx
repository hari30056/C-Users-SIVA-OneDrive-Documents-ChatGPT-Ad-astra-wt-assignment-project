import React from 'react';
import { Ticket, Shield, Cpu, Zap, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Ticket className="w-4 h-4 -rotate-12" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">EventPass</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              High-concurrency, multi-tenant event management and transactional ticket reservation system with guaranteed inventory isolation.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Architectural Pillars</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" /> PostgreSQL SELECT FOR UPDATE</li>
              <li className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> 10-Min Reservation Hold</li>
              <li className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-indigo-400" /> BullMQ Delayed Expiration</li>
              <li className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-400" /> Multi-Tenant RBAC Isolation</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Roles & Personas</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-indigo-400 font-semibold">Attendee:</span> High-speed checkout & reservations</li>
              <li><span className="text-indigo-400 font-semibold">Organizer:</span> Tenant event & inventory control</li>
              <li><span className="text-indigo-400 font-semibold">Admin:</span> Platform monitoring & analytics</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Quick Credentials</h4>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 font-mono text-[11px] space-y-1">
              <p className="text-slate-300">Admin: <span className="text-indigo-300">admin@example.com</span></p>
              <p className="text-slate-300">Org 1: <span className="text-indigo-300">organizer1@example.com</span></p>
              <p className="text-slate-300">Org 2: <span className="text-indigo-300">organizer2@example.com</span></p>
              <p className="text-slate-400 text-[10px] mt-1 pt-1 border-t border-slate-700">Password: Password123!</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 EventPass Multi-Tenant Reservation Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>PostgreSQL 16</span>
            <span>Redis 7</span>
            <span>BullMQ</span>
            <span>React + TypeScript</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
