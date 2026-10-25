import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestService } from '../services/requestService';
import { BloodGroupBadge } from '../components/BloodGroupBadge';
import { StatusBadge, UrgencyBadge } from '../components/StatusBadge';
import {
  PlusCircle,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  Compass,
  ArrowRight,
  Filter,
  RefreshCw,
  Activity,
} from 'lucide-react';

export const RequesterDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = { myRequestsOnly: 'true' };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await requestService.getRequests(params);
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const activeCount = requests.filter((r) =>
    ['open', 'donors_contacted', 'awaiting_responses', 'coordination_in_progress'].includes(r.status)
  ).length;

  const fulfilledCount = requests.filter((r) => r.status === 'fulfilled').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with Title and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Hospital Request Management</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Track emergency requests, discover matched donors, and manage contact coordination
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/donors/discover"
            className="px-4 py-2 bg-white border border-slate-300 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs"
          >
            <Compass className="w-4 h-4 text-blue-600" />
            Discover Donors
          </Link>

          <Link
            to="/requests/new"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/25"
          >
            <PlusCircle className="w-4 h-4" />
            New Emergency Request
          </Link>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xs uppercase tracking-wider text-slate-600 font-bold">
              Total Requests Logged
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{requests.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xs uppercase tracking-wider text-rose-700 font-bold">
              Active In-Coordination
            </div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xs uppercase tracking-wider text-teal-700 font-bold">
              Fulfilled & Transfused
            </div>
            <div className="text-2xl font-extrabold text-teal-700 mt-1">{fulfilledCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Request Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
          {['all', 'open', 'donors_contacted', 'coordination_in_progress', 'fulfilled', 'cancelled'].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize transition ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            )
          )}
        </div>

        <button
          onClick={fetchRequests}
          className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
          title="Refresh table"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requests.map((req) => (
            <div
              key={req._id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <BloodGroupBadge bloodGroup={req.bloodGroup} size="md" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {req.unitsRequested} {req.unitsRequested === 1 ? 'Unit' : 'Units'} Needed
                      </span>
                      <span className="text-3xs text-slate-600 uppercase tracking-wider">
                        Patient: {req.patientName}
                      </span>
                    </div>
                  </div>
                  <UrgencyBadge urgency={req.urgency} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{req.hospital.name}</h3>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{req.hospital.address}</span>
                  </p>
                </div>

                {/* Coordination Funnel Progress */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl text-center text-xs">
                  <div>
                    <div className="text-3xs uppercase font-bold text-slate-600">Matched</div>
                    <div className="text-sm font-extrabold text-slate-900">{req.matchedDonorsCount}</div>
                  </div>
                  <div className="border-x border-slate-200">
                    <div className="text-3xs uppercase font-bold text-blue-700">Contacted</div>
                    <div className="text-sm font-extrabold text-blue-800">{req.contactedDonorsCount}</div>
                  </div>
                  <div>
                    <div className="text-3xs uppercase font-bold text-emerald-700">Accepted</div>
                    <div className="text-sm font-extrabold text-emerald-800">{req.acceptedDonorsCount}</div>
                  </div>
                </div>

                {/* Required By Time */}
                <div className="text-xs text-slate-600 flex items-center justify-between">
                  <span>Required By:</span>
                  <span className="font-semibold text-rose-600">
                    {new Date(req.requiredBy).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Bottom Card Controls */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <StatusBadge status={req.status} />

                <Link
                  to={`/requests/${req._id}`}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  Manage & Match
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-900">No requests found in this category</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            You can create a new emergency blood request whenever blood units are required for patient treatment.
          </p>
          <Link
            to="/requests/new"
            className="inline-block mt-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
          >
            Create New Request
          </Link>
        </div>
      )}
    </div>
  );
};
