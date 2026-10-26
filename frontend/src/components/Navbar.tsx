import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReservationCountdown } from './ReservationCountdown';
import {
  Ticket,
  Calendar,
  Layers,
  PlusCircle,
  BarChart3,
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
  ShoppingBag,
  Clock,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, activeReservation, quickSwitchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitch = async (email: string) => {
    setDemoDropdownOpen(false);
    await quickSwitchUser(email);
    if (email.includes('admin')) {
      navigate('/admin');
    } else if (email.includes('organizer')) {
      navigate('/organizer');
    } else {
      navigate('/attendee');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Ticket className="w-5 h-5 -rotate-12" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  EventPass
                </span>
                <span className="hidden sm:inline-block ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Multi-Tenant
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/events"
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive('/events')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                Explore Events
              </Link>

              {user?.role === 'ATTENDEE' && (
                <>
                  <Link
                    to="/attendee"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/attendee')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/my-reservations"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/my-reservations')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Reservations
                  </Link>
                  <Link
                    to="/my-tickets"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/my-tickets')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    My Tickets
                  </Link>
                  <Link
                    to="/my-orders"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/my-orders')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Orders
                  </Link>
                </>
              )}

              {user?.role === 'ORGANIZER' && (
                <>
                  <Link
                    to="/organizer"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/organizer')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Organizer Hub
                  </Link>
                  <Link
                    to="/organizer/events"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/organizer/events')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    My Events
                  </Link>
                  <Link
                    to="/organizer/events/new"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/organizer/events/new')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    + Create Event
                  </Link>
                  <Link
                    to="/organizer/orders"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/organizer/orders')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Sales & Orders
                  </Link>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <>
                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/admin')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Admin Console
                  </Link>
                  <Link
                    to="/admin/organizers"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/admin/organizers')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Tenants
                  </Link>
                  <Link
                    to="/admin/users"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/admin/users')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    Users
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-3">
            {/* Active Hold Banner in Navbar */}
            {activeReservation && activeReservation.status === 'ACTIVE' && (
              <div className="hidden lg:flex items-center gap-2 pl-3 pr-2 py-1 bg-amber-50 border border-amber-200 rounded-full shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-semibold text-amber-900">Hold Active:</span>
                <ReservationCountdown expiresAt={activeReservation.expiresAt} compact />
                <Link
                  to={`/checkout/${activeReservation.reservationId}`}
                  className="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-full transition-colors"
                >
                  Checkout
                </Link>
              </div>
            )}

            {/* Quick Demo Role Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDemoDropdownOpen(!demoDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Role Switcher</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {demoDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      1-Click Persona Testing
                    </p>
                  </div>
                  <button
                    onClick={() => handleSwitch('admin@example.com')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">Platform Admin</p>
                      <p className="text-slate-500 text-[11px]">admin@example.com</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold">
                      ADMIN
                    </span>
                  </button>
                  <button
                    onClick={() => handleSwitch('organizer1@example.com')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">Apex Events (Tenant 1)</p>
                      <p className="text-slate-500 text-[11px]">organizer1@example.com</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">
                      ORG 1
                    </span>
                  </button>
                  <button
                    onClick={() => handleSwitch('organizer2@example.com')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">Pulse Live (Tenant 2)</p>
                      <p className="text-slate-500 text-[11px]">organizer2@example.com</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-100 text-cyan-700 font-bold">
                      ORG 2
                    </span>
                  </button>
                  <button
                    onClick={() => handleSwitch('attendee1@example.com')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">Alice (Attendee A)</p>
                      <p className="text-slate-500 text-[11px]">attendee1@example.com</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-bold">
                      USER
                    </span>
                  </button>
                  <button
                    onClick={() => handleSwitch('attendee2@example.com')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">Bob (Attendee B)</p>
                      <p className="text-slate-500 text-[11px]">attendee2@example.com</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-bold">
                      USER
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Auth / Profile */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
                  <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-600/20 transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <Link
            to="/events"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Explore Events
          </Link>
          {user?.role === 'ATTENDEE' && (
            <>
              <Link
                to="/attendee"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Attendee Dashboard
              </Link>
              <Link
                to="/my-reservations"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                My Reservations
              </Link>
              <Link
                to="/my-tickets"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                My Tickets
              </Link>
            </>
          )}
          {user?.role === 'ORGANIZER' && (
            <>
              <Link
                to="/organizer"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Organizer Hub
              </Link>
              <Link
                to="/organizer/events"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                My Events
              </Link>
              <Link
                to="/organizer/events/new"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Create Event
              </Link>
            </>
          )}
          {user?.role === 'ADMIN' && (
            <>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Admin Console
              </Link>
              <Link
                to="/admin/organizers"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Organizers
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};
