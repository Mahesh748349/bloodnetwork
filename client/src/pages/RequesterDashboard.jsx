import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestService } from '../services/requestService';
import { donationService } from '../services/donationService';
import { BloodGroupBadge } from '../components/BloodGroupBadge';
import { StatusBadge, UrgencyBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
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
  Building2,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

export const RequesterDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'donations'

  // Donation Recording Modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [donorUserId, setDonorUserId] = useState('');
  const [donationType, setDonationType] = useState('whole_blood');
  const [unitsCollected, setUnitsCollected] = useState(1);
  const [verifyDirectly, setVerifyDirectly] = useState(true);
  const [customDeferralDays, setCustomDeferralDays] = useState('');
  const [donationNotes, setDonationNotes] = useState('');
  const [recordingSubmitting, setRecordingSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = { myRequestsOnly: 'true' };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const [reqRes, donRes] = await Promise.all([
        requestService.getRequests(params),
        donationService.getOrganizationDonations().catch(() => ({ success: false })),
      ]);

      if (reqRes.success) setRequests(reqRes.requests || []);
      if (donRes.success) setDonations(donRes.donations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [statusFilter]);

  const handleRecordDonation = async (e) => {
    e.preventDefault();
    if (!donorUserId) {
      alert('Please provide donor user ID');
      return;
    }
    setRecordingSubmitting(true);
    try {
      const payload = {
        donorId: donorUserId.trim(),
        donationType,
        unitsCollected: Number(unitsCollected) || 1,
        status: verifyDirectly ? 'verified' : 'completed',
        notes: donationNotes,
      };
      if (customDeferralDays) {
        payload.customDeferralDays = Number(customDeferralDays);
      }

      const res = await donationService.recordDonation(payload);
      if (res.success) {
        setSuccessBanner(
          verifyDirectly
            ? 'Donation verified successfully! Donor is now temporarily deferred across all participating hospitals in the network.'
            : 'Donation event recorded in completed status.'
        );
        setRecordModalOpen(false);
        setDonorUserId('');
        setDonationNotes('');
        setCustomDeferralDays('');
        fetchDashboardData();
        setTimeout(() => setSuccessBanner(''), 8000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record donation event');
    } finally {
      setRecordingSubmitting(false);
    }
  };

  const activeCount = requests.filter((r) =>
    ['open', 'donors_contacted', 'awaiting_responses', 'coordination_in_progress'].includes(r.status)
  ).length;

  const fulfilledCount = requests.filter((r) => r.status === 'fulfilled').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner('')} className="text-emerald-700 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Hospital Identity & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-2xs font-extrabold uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" />
            {user?.organization?.name || 'Hospital Blood Bank Node'}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Multi-Hospital Coordination Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Cross-hospital blood requests, donor verification, and centralized deferral management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setRecordModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <FileCheck className="w-4 h-4" />
            Record Verified Donation
          </button>

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

      {/* Multi-hospital Deferral Enforcement Alert */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>Centralized Deferral Protection Active:</strong> Donors who recently donated at any participating hospital in the network are automatically excluded from search results until their deferral period ends.
          </span>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xs uppercase tracking-wider text-slate-600 font-bold">
              Hospital Requests
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
              Fulfilled Requests
            </div>
            <div className="text-2xl font-extrabold text-teal-700 mt-1">{fulfilledCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xs uppercase tracking-wider text-indigo-700 font-bold">
              Verified Donations
            </div>
            <div className="text-2xl font-extrabold text-indigo-700 mt-1">{donations.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'requests'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Hospital Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('donations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'donations'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Recorded Donations & Events ({donations.length})
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-6">
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
              onClick={fetchDashboardData}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
              title="Refresh data"
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
      ) : (
        /* Donations List */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hospital Donation Records</h2>
              <p className="text-xs text-slate-600">
                Audit trail of completed and verified donation events that trigger centralized deferrals
              </p>
            </div>
            <button
              onClick={() => setRecordModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
            >
              + Record Donation
            </button>
          </div>

          {donations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Donor</th>
                    <th className="py-3 px-4">Donation Type</th>
                    <th className="py-3 px-4">Units</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Deferral Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {donations.map((d) => (
                    <tr key={d._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.eventId}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{d.donorId?.name || 'Registered Donor'}</div>
                        <div className="text-3xs text-slate-600">{d.donorId?.email}</div>
                      </td>
                      <td className="py-3 px-4 capitalize">{d.donationType?.replace('_', ' ')}</td>
                      <td className="py-3 px-4 font-mono">{d.unitsCollected}</td>
                      <td className="py-3 px-4">{new Date(d.donationDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                            d.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-3xs text-slate-600 font-mono">
                        {d.deferralRuleVersion ? `v${d.deferralRuleVersion}` : 'Standard'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-600 py-6 text-center">
              No donation events recorded yet for this hospital. Click "Record Verified Donation" to log completed collections.
            </p>
          )}
        </div>
      )}

      {/* Record Verified Donation Modal */}
      <Modal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        title="Record & Verify Blood Donation Event"
      >
        <form onSubmit={handleRecordDonation} className="space-y-4">
          <p className="text-xs text-slate-600">
            Confirming that a donation has actually occurred will automatically calculate and enforce the post-donation deferral across all participating hospitals.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Donor User ID or Object ID *
            </label>
            <input
              type="text"
              required
              value={donorUserId}
              onChange={(e) => setDonorUserId(e.target.value)}
              placeholder="e.g. 64b8f... (Donor user ID from response)"
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Donation Type
              </label>
              <select
                value={donationType}
                onChange={(e) => setDonationType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                <option value="whole_blood">Whole Blood (56-Day Deferral)</option>
                <option value="platelets">Platelets / Apheresis (7-Day)</option>
                <option value="plasma">Plasma (28-Day)</option>
                <option value="double_red_cells">Double Red Cells (112-Day)</option>
                <option value="other">Other Clinical Procedure</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Units Collected
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={unitsCollected}
                onChange={(e) => setUnitsCollected(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={verifyDirectly}
                onChange={(e) => setVerifyDirectly(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-900">
                Verify immediately & apply cross-hospital deferral
              </span>
            </label>
            <p className="text-3xs text-slate-600 pl-6">
              Only a verified event triggers the post-donation deferral workflow. Merely scheduling or contacting does not defer the donor.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Custom Deferral Days (Optional Clinical Override)
            </label>
            <input
              type="number"
              min="0"
              value={customDeferralDays}
              onChange={(e) => setCustomDeferralDays(e.target.value)}
              placeholder="Leave blank to use approved medical rule"
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Verification Notes / Screened Parameters
            </label>
            <textarea
              rows={2}
              value={donationNotes}
              onChange={(e) => setDonationNotes(e.target.value)}
              placeholder="e.g. Donation completed without adverse events. Hb 13.5 g/dL."
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRecordModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordingSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs"
            >
              {recordingSubmitting ? 'Recording...' : 'Confirm & Save Event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
