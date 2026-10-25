import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  Droplet,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Compass,
  PlusCircle,
  Shield,
  Activity,
  HeartHandshake,
} from 'lucide-react';

export const Navbar = () => {
  const { user, donorProfile, logout, updateDonorAvailability, isDonor, isRequester, isAdmin } =
    useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const handleAvailabilityToggle = async () => {
    if (!donorProfile || toggleLoading) return;
    try {
      setToggleLoading(true);
      await updateDonorAvailability(!donorProfile.availabilityStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:scale-105 transition">
                <Droplet className="w-6 h-6 text-white fill-white" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-rose-600 transition">
                  Life<span className="text-rose-600">Flow</span>
                </span>
                <span className="hidden sm:block text-2xs text-slate-600 font-medium tracking-wider uppercase -mt-1">
                  Emergency Blood Network
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                Overview
              </Link>

              {user && (
                <>
                  {isDonor && (
                    <Link
                      to="/donor"
                      className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5"
                    >
                      <Activity className="w-4 h-4 text-rose-500" />
                      Donor Dashboard
                    </Link>
                  )}

                  {(isRequester || isAdmin) && (
                    <>
                      <Link
                        to="/requester"
                        className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5"
                      >
                        <HeartHandshake className="w-4 h-4 text-rose-500" />
                        My Requests
                      </Link>
                      <Link
                        to="/donors/discover"
                        className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5"
                      >
                        <Compass className="w-4 h-4 text-blue-500" />
                        Match Donors
                      </Link>
                      <Link
                        to="/requests/new"
                        className="px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-4 h-4" />
                        New Emergency Request
                      </Link>
                    </>
                  )}

                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="px-3 py-2 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 transition flex items-center gap-1.5"
                    >
                      <Shield className="w-4 h-4 text-indigo-600" />
                      Admin Control
                    </Link>
                  )}
                </>
              )}
            </nav>
          </div>

          {/* Right Section: Donor Availability Switch, Notifications & User Info */}
          <div className="flex items-center gap-3">
            {/* Live Availability Switch for Registered Donors */}
            {isDonor && donorProfile && (
              <button
                type="button"
                onClick={handleAvailabilityToggle}
                disabled={toggleLoading}
                className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition shadow-2xs ${
                  donorProfile.availabilityStatus
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                }`}
                title="Click to toggle your live donation availability"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    donorProfile.availabilityStatus ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                  }`}
                />
                <span>{donorProfile.availabilityStatus ? 'Available to Donate' : 'Unavailable'}</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-3xs font-extrabold flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* User Profile / Logout Dropdown */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="hidden lg:block text-right">
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {user.name.split(' ')[0]}
                    </div>
                    <div className="text-3xs uppercase tracking-wider text-slate-600 font-semibold">
                      {user.role}
                    </div>
                  </div>

                  {isDonor && (
                    <Link
                      to="/donor/profile"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                      title="Donor Settings"
                    >
                      <User className="w-5 h-5" />
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs shadow-rose-600/30 transition"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Home
            </Link>

            {user ? (
              <>
                {isDonor && (
                  <>
                    <Link
                      to="/donor"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Donor Dashboard
                    </Link>
                    <Link
                      to="/donor/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Profile & Availability
                    </Link>
                  </>
                )}

                {(isRequester || isAdmin) && (
                  <>
                    <Link
                      to="/requester"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      My Requests
                    </Link>
                    <Link
                      to="/donors/discover"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Find Nearby Donors
                    </Link>
                    <Link
                      to="/requests/new"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
                    >
                      + Create Emergency Request
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    Admin Dashboard & Audit Logs
                  </Link>
                )}

                <Link
                  to="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Notifications ({unreadCount})
                </Link>

                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2 text-sm font-semibold text-white bg-rose-600 rounded-xl"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
