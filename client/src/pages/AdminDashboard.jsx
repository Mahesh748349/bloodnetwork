import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { organizationService } from '../services/organizationService';
import { deferralService } from '../services/deferralService';
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
  Building2,
  Lock,
  PlusCircle,
  Settings,
  HeartPulse,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [donors, setDonors] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [deferralRules, setDeferralRules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'organizations' | 'rules' | 'donors' | 'audit'

  // Donor verification modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('verified');
  const [medicalReviewNotes, setMedicalReviewNotes] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // New Organization Modal state
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('hospital');
  const [orgRegId, setOrgRegId] = useState('');
  const [orgCity, setOrgCity] = useState('Bangalore');
  const [submittingOrg, setSubmittingOrg] = useState(false);

  // New Deferral Rule Modal state
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleDonationType, setRuleDonationType] = useState('whole_blood');
  const [ruleDays, setRuleDays] = useState(56);
  const [ruleVersion, setRuleVersion] = useState('1.1.0');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleRequiresReview, setRuleRequiresReview] = useState(false);
  const [submittingRule, setSubmittingRule] = useState(false);

  // Search & filter
  const [donorFilterStatus, setDonorFilterStatus] = useState('');
  const [donorSearch, setDonorSearch] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, donorsRes, logsRes, orgsRes, rulesRes] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAllDonors({
          verificationStatus: donorFilterStatus || undefined,
          search: donorSearch || undefined,
        }),
        adminService.getAuditLogs(1, 40),
        organizationService.getAllOrganizations().catch(() => ({ success: false })),
        deferralService.getDeferralRules().catch(() => ({ success: false })),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (donorsRes.success) setDonors(donorsRes.donors || []);
      if (logsRes.success) setAuditLogs(logsRes.logs || []);
      if (orgsRes.success) setOrganizations(orgsRes.organizations || []);
      if (rulesRes.success) setDeferralRules(rulesRes.rules || []);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [donorFilterStatus]);

  const handleUpdateOrgStatus = async (id, status) => {
    try {
      const res = await organizationService.updateOrganizationStatus(id, status);
      if (res.success) {
        setSuccessBanner(`Organization status updated to '${status.toUpperCase()}'!`);
        loadAdminData();
        setTimeout(() => setSuccessBanner(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update organization status');
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgName) return;
    setSubmittingOrg(true);
    try {
      const res = await organizationService.createOrganization({
        name: orgName,
        organizationType: orgType,
        registrationIdentifier: orgRegId,
        address: { city: orgCity, state: 'Karnataka', formattedAddress: `${orgCity}, Karnataka` },
      });
      if (res.success) {
        setSuccessBanner('New participating organization registered and activated successfully!');
        setOrgModalOpen(false);
        setOrgName('');
        setOrgRegId('');
        loadAdminData();
        setTimeout(() => setSuccessBanner(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create organization');
    } finally {
      setSubmittingOrg(false);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    setSubmittingRule(true);
    try {
      const res = await deferralService.createRule({
        donationType: ruleDonationType,
        deferralDays: Number(ruleDays),
        version: ruleVersion,
        description: ruleDescription,
        requiresMedicalReviewOnExpiry: ruleRequiresReview,
      });
      if (res.success) {
        setSuccessBanner(`Medical deferral rule version '${ruleVersion}' approved and activated!`);
        setRuleModalOpen(false);
        loadAdminData();
        setTimeout(() => setSuccessBanner(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create deferral rule');
    } finally {
      setSubmittingRule(false);
    }
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
            Platform Multi-Hospital Governance Console
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Network Operations, Organizations & Deferrals
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
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
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
          onClick={() => setActiveTab('organizations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'organizations'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Hospitals & Blood Banks ({organizations.length})
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'rules'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4" />
          Medical Deferral Rules ({deferralRules.length})
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
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: Real-Time Operational Analytics */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-600">
                Participating Hospitals
              </span>
              <div className="text-3xl font-extrabold text-slate-900">
                {organizations.length || 2}
              </div>
              <div className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Multi-tenant network active
              </div>
            </div>

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
                Active Deferral Rules
              </span>
              <div className="text-3xl font-extrabold text-amber-700">
                {deferralRules.length || 5}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Medical governance compliant
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
        </div>
      )}

      {/* TAB 2: Organizations (Hospitals & Blood Banks) */}
      {activeTab === 'organizations' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Participating Hospital Organizations</h2>
              <p className="text-xs text-slate-600">
                Onboard hospitals, manage approval status, and enforce multi-tenant isolation
              </p>
            </div>
            <button
              onClick={() => setOrgModalOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Onboard Organization
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Organization Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Identifier</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {organizations.map((org) => (
                  <tr key={org._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{org.name}</div>
                      <div className="text-3xs text-slate-600 font-mono">{org._id}</div>
                    </td>
                    <td className="py-3 px-4 capitalize">{org.organizationType?.replace('_', ' ')}</td>
                    <td className="py-3 px-4 font-mono">{org.registrationIdentifier || '—'}</td>
                    <td className="py-3 px-4">{org.address?.city || 'Bangalore'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                          org.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : org.status === 'pending_approval'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {org.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {org.status !== 'active' ? (
                        <button
                          onClick={() => handleUpdateOrgStatus(org._id, 'active')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-2xs font-bold"
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateOrgStatus(org._id, 'suspended')}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-2xs font-bold"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Medical Deferral Rules */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Configurable Medical Deferral Rules</h2>
              <p className="text-xs text-slate-600">
                Versioned clinical intervals approved by designated medical authorities. Enforced across all participating hospitals.
              </p>
            </div>
            <button
              onClick={() => setRuleModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              New Rule Version
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Donation Type</th>
                  <th className="py-3 px-4">Deferral Period</th>
                  <th className="py-3 px-4">Rule Version</th>
                  <th className="py-3 px-4">Expiry Condition</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {deferralRules.map((r) => (
                  <tr key={r._id || r.version} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold capitalize text-slate-900">
                      {r.donationType?.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-700">
                      {r.deferralDays} days
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">v{r.version}</td>
                    <td className="py-3 px-4">
                      {r.requiresMedicalReviewOnExpiry ? (
                        <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-3xs">
                          Requires Medical Review
                        </span>
                      ) : (
                        <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-3xs">
                          Automatic Return
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-600 text-2xs">
                      {r.description || 'Standard approved clinical rule'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-3xs uppercase">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Donor Verification Queue */}
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
                  <th className="py-3 px-4">Deferral State</th>
                  <th className="py-3 px-4">Verification</th>
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
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                          d.currentDeferralStatus === 'temporarily_deferred'
                            ? 'bg-amber-100 text-amber-800'
                            : d.currentDeferralStatus === 'requires_medical_review'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {d.currentDeferralStatus || 'Available'}
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

      {/* TAB 5: Administrative Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Administrative, Cross-Hospital & Deferral Audit Trail
            </h2>
            <p className="text-xs text-slate-600">
              Immutable logging of user deactivations, donor verifications, donation events, deferral creations, and clinical overrides
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
              placeholder="e.g. Hemoglobin > 12.5 g/dL verified; vital parameters compliant."
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

      {/* Onboard Organization Modal */}
      <Modal
        isOpen={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        title="Onboard Participating Hospital or Blood Bank"
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hospital / Organization Name *
            </label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. St. Jude Memorial Hospital"
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Organization Type
              </label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                <option value="hospital">Hospital</option>
                <option value="blood_bank">Blood Bank</option>
                <option value="clinic">Clinic</option>
                <option value="red_cross_chapter">Red Cross Chapter</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                License / Registration ID
              </label>
              <input
                type="text"
                value={orgRegId}
                onChange={(e) => setOrgRegId(e.target.value)}
                placeholder="e.g. HOSP-BLR-2026-99"
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              City / Location
            </label>
            <input
              type="text"
              value={orgCity}
              onChange={(e) => setOrgCity(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOrgModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingOrg}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
            >
              {submittingOrg ? 'Onboarding...' : 'Onboard Hospital'}
            </button>
          </div>
        </form>
      </Modal>

      {/* New Deferral Rule Modal */}
      <Modal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title="Create & Approve Medical Deferral Rule"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <p className="text-xs text-slate-600">
            Rules must be approved by designated medical authorities to ensure clinical compliance across the network.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Donation Type
              </label>
              <select
                value={ruleDonationType}
                onChange={(e) => setRuleDonationType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                <option value="whole_blood">Whole Blood</option>
                <option value="platelets">Platelets</option>
                <option value="plasma">Plasma</option>
                <option value="double_red_cells">Double Red Cells</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Deferral Days
              </label>
              <input
                type="number"
                min="1"
                required
                value={ruleDays}
                onChange={(e) => setRuleDays(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Version Identifier *
            </label>
            <input
              type="text"
              required
              value={ruleVersion}
              onChange={(e) => setRuleVersion(e.target.value)}
              placeholder="e.g. 1.2.0"
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Rule Description / Clinical Justification
            </label>
            <textarea
              rows={2}
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="e.g. Standard 56-day red blood cell restoration interval"
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl">
            <input
              type="checkbox"
              checked={ruleRequiresReview}
              onChange={(e) => setRuleRequiresReview(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="text-xs font-semibold text-slate-800">
              Require authorized medical review on deferral expiry before reinstatement
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRuleModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingRule}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              {submittingRule ? 'Saving...' : 'Approve & Activate Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
