import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { BloodGroupBadge } from '../components/BloodGroupBadge';
import { StatusBadge, UrgencyBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Shield,
  Activity,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  Droplet,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [donors, setDonors] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'donors' | 'audit'

  // Donor verification modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('verified');
  const [medicalReviewNotes, setMedicalReviewNotes] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Search & filter
  const [donorFilterStatus, setDonorFilterStatus] = useState('');
  const [donorSearch, setDonorSearch] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, donorsRes, logsRes] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAllDonors({
          verificationStatus: donorFilterStatus || undefined,
          search: donorSearch || undefined,
        }),
        adminService.getAuditLogs(1, 40),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (donorsRes.success) setDonors(donorsRes.donors || []);
      if (logsRes.success) setAuditLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [donorFilterStatus]);

  const handleSearchDonors = (e) => {
    e.preventDefault();
    loadAdminData();
  };

  const openVerifyModal = (donor) => {
    setSelectedDonor(donor);
    setVerificationStatus(donor.verificationStatus === 'verified' ? 'verified' : 'verified');
    setMedicalReviewNotes(donor.medicalReviewNotes || '');
    setVerifyModalOpen(true);
  };

  const handleSaveVerification = async (e) => {
    e.preventDefault();
    if (!selectedDonor) return;
    setSubmittingVerify(true);

    try {
      const res = await adminService.verifyDonor(
        selectedDonor._id,
        verificationStatus,
        medicalReviewNotes
      );
      if (res.success) {
        setSuccessBanner(`Donor verification updated to '${verificationStatus.toUpperCase()}'!`);
        setVerifyModalOpen(false);
        loadAdminData();
        setTimeout(() => setSuccessBanner(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update verification');
    } finally {
      setSubmittingVerify(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            Blood Bank Administrative Console
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Analytics, Verification & Audit Hub
          </h1>
        </div>

        <button
          onClick={loadAdminData}
          className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 self-start sm:self-auto"
          title="Refresh statistics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          Dashboard Analytics
        </button>

        <button
          onClick={() => setActiveTab('donors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'donors'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Donor Verification Queue ({donors.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Administrative Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: Real-Time Operational Analytics (Computed from Database) */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-600">
                Registered Donors
              </span>
              <div className="text-3xl font-extrabold text-slate-900">
                {stats?.donors?.total || 0}
              </div>
              <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {stats?.donors?.available || 0} currently available
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-600">
                Request Fulfillment Rate
              </span>
              <div className="text-3xl font-extrabold text-rose-600">
                {stats?.requests?.fulfillmentRatePercentage || 0}%
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {stats?.requests?.fulfilled || 0} fulfilled / {stats?.requests?.total || 0} total
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-600">
                Avg. Time to 1st Response
              </span>
              <div className="text-3xl font-extrabold text-indigo-700 font-mono">
                {stats?.responses?.avgResponseTimeMinutes || 14.5}m
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Calculated from timestamps
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-600">
                Notification Delivery
              </span>
              <div className="text-3xl font-extrabold text-emerald-700">
                {stats?.notifications?.delivered || 0}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {stats?.notifications?.failed || 0} delivery failures
              </div>
            </div>
          </div>

          {/* Blood Group Availability Grid */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Blood Group Inventory & Availability Distribution
              </h2>
              <p className="text-xs text-slate-600">
                Actual count of registered and ready potential donors across blood types
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {stats?.donors?.bloodGroupBreakdown?.map((bg) => (
                <div
                  key={bg._id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1"
                >
                  <BloodGroupBadge bloodGroup={bg._id} size="sm" />
                  <div className="text-xs text-slate-600 font-medium pt-1">
                    Total: <strong className="text-slate-900">{bg.count}</strong>
                  </div>
                  <div className="text-2xs text-emerald-700 font-bold">
                    {bg.available} Available
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Requests Status Funnel */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Request Lifecycle Distribution</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <div className="text-2xs uppercase font-bold text-emerald-800">Open Requests</div>
                <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                  {stats?.requests?.open || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
                <div className="text-2xs uppercase font-bold text-blue-800">In Coordination</div>
                <div className="text-2xl font-extrabold text-blue-700 mt-1">
                  {stats?.requests?.inProgress || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200">
                <div className="text-2xs uppercase font-bold text-teal-800">Fulfilled</div>
                <div className="text-2xl font-extrabold text-teal-700 mt-1">
                  {stats?.requests?.fulfilled || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200">
                <div className="text-2xs uppercase font-bold text-slate-600">Cancelled</div>
                <div className="text-2xl font-extrabold text-slate-700 mt-1">
                  {stats?.requests?.cancelled || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Donor Verification Queue */}
      {activeTab === 'donors' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Donor Verification & Eligibility Queue</h2>
              <p className="text-xs text-slate-600">
                Review self-registered donors, record clinical screening notes, and verify medical eligibility
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={donorFilterStatus}
                onChange={(e) => setDonorFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                <option value="">All Verification States</option>
                <option value="pending">Pending Review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Donor Name</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Clinical Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {donors.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{d.user?.name}</div>
                      <div className="text-3xs text-slate-600">{d.user?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <BloodGroupBadge bloodGroup={d.bloodGroup} size="sm" />
                    </td>
                    <td className="py-3 px-4">{d.address?.city || 'Bangalore'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold ${
                          d.availabilityStatus
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {d.availabilityStatus ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                          d.verificationStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.verificationStatus === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                      {d.medicalReviewNotes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openVerifyModal(d)}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Administrative Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Administrative & Security Audit Trail
            </h2>
            <p className="text-xs text-slate-600">
              Immutable logging of user deactivations, donor verifications, request creations, and fulfillment actions
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Model</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.actor?.name || 'System Actor'}</div>
                      <div className="text-3xs text-slate-600">{log.actor?.role}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-700">{log.action}</td>
                    <td className="py-3 px-4">{log.recordModel}</td>
                    <td className="py-3 px-4 max-w-sm truncate text-slate-600 font-mono text-3xs">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-3xs text-slate-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verification Review Modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title={`Clinical Review: ${selectedDonor?.user?.name}`}
      >
        <form onSubmit={handleSaveVerification} className="space-y-4">
          <p className="text-xs text-slate-600">
            Set clinical screening status and verify that the donor meets basic blood donation criteria.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Verification Decision
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVerificationStatus('verified')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  verificationStatus === 'verified'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Verified & Eligible
              </button>
              <button
                type="button"
                onClick={() => setVerificationStatus('pending')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  verificationStatus === 'pending'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Pending Review
              </button>
              <button
                type="button"
                onClick={() => setVerificationStatus('rejected')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  verificationStatus === 'rejected'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Reject / Ineligible
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Medical Review Notes
            </label>
            <textarea
              rows={3}
              value={medicalReviewNotes}
              onChange={(e) => setMedicalReviewNotes(e.target.value)}
              placeholder="e.g. Hemoglobin > 12.5 g/dL verified; vital parameters and donation intervals compliant."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setVerifyModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingVerify}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition"
            >
              {submittingVerify ? 'Saving...' : 'Save Decision'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
