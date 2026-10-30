import React, { useState, useEffect } from 'react';
import { campService } from '../services/campService';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Plus,
  Clock,
  Building2,
  X,
  Sparkles,
} from 'lucide-react';

export const DonationCampsPage = () => {
  const { user } = useAuth();
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [formData, setFormData] = useState({
    campName: '',
    description: '',
    address: '',
    city: 'Bangalore',
    state: 'Karnataka',
    scheduledDate: '',
    targetUnits: 50,
    organizerContact: '',
  });

  const isHospitalStaffOrAdmin =
    user?.role === 'hospital_admin' ||
    user?.role === 'hospital_staff' ||
    user?.role === 'admin' ||
    user?.role === 'platform_admin';

  const loadCamps = async () => {
    try {
      setLoading(true);
      const res = await campService.getCamps({ status: 'upcoming' });
      if (res.success) {
        setCamps(res.camps || []);
      }
    } catch (err) {
      console.error('Error fetching donation camps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCamps();
  }, []);

  const handleRegister = async (campId) => {
    try {
      setActionLoading(campId);
      const res = await campService.registerForCamp(campId);
      if (res.success) {
        loadCamps();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnregister = async (campId) => {
    try {
      setActionLoading(campId);
      const res = await campService.unregisterFromCamp(campId);
      if (res.success) {
        loadCamps();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await campService.createCamp(formData);
      if (res.success) {
        setShowCreateModal(false);
        loadCamps();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" /> Community Outreach
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Upcoming Blood Donation Camps
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign up to donate at mobile blood donation drives or university campus camps organized
            by accredited network hospitals.
          </p>
        </div>

        {isHospitalStaffOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-2 transition shrink-0"
          >
            <Plus className="w-4 h-4" /> Schedule New Camp
          </button>
        )}
      </div>

      {/* Camp Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading upcoming donation camps...
        </div>
      ) : camps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Upcoming Camps Scheduled</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hospitals will publish community mobile donation camps here as they are organized.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {camps.map((camp) => {
            const dateObj = new Date(camp.scheduledDate);
            const isRegistered = camp.isRegistered;
            const progress = Math.min(
              100,
              Math.round((camp.registeredCount / (camp.targetUnits || 50)) * 100)
            );

            return (
              <div
                key={camp._id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        {camp.status}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2 line-clamp-1">
                        {camp.campName}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {camp.description || 'Community blood drive organized by hospital network.'}
                  </p>

                  <div className="space-y-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {dateObj.toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        • {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {camp.location.address}, {camp.location.city}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{camp.organizationId?.name || 'Hospital'}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                      <span>Donors Registered</span>
                      <span className="font-bold text-slate-900">
                        {camp.registeredCount} / {camp.targetUnits} units
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-rose-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Contact: {camp.organizerContact || 'Blood Bank Desk'}
                  </div>

                  {user?.role === 'donor' && (
                    <div>
                      {isRegistered ? (
                        <button
                          onClick={() => handleUnregister(camp._id)}
                          disabled={actionLoading === camp._id}
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Registered
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRegister(camp._id)}
                          disabled={actionLoading === camp._id}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                        >
                          {actionLoading === camp._id ? 'Saving...' : 'Sign Up'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Camp Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Schedule Blood Donation Camp</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Camp Title*</label>
                <input
                  type="text"
                  value={formData.campName}
                  onChange={(e) => setFormData({ ...formData, campName: e.target.value })}
                  placeholder="e.g. City Tech Park Mega Donation Drive"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief details or parking/venue instructions..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Venue Address*</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Auditorium Hall, Whitefield"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date & Time*</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Units</label>
                  <input
                    type="number"
                    value={formData.targetUnits}
                    onChange={(e) =>
                      setFormData({ ...formData, targetUnits: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Organizer Phone</label>
                  <input
                    type="text"
                    value={formData.organizerContact}
                    onChange={(e) => setFormData({ ...formData, organizerContact: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-md hover:bg-rose-700"
                >
                  Publish Camp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

