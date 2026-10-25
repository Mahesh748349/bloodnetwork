import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { donorService } from '../services/donorService';
import { requestService } from '../services/requestService';
import { BloodGroupBadge } from '../components/BloodGroupBadge';
import { StatusBadge, UrgencyBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Activity,
  Heart,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const DonorDashboard = () => {
  const { user, donorProfile, updateDonorAvailability } = useAuth();

  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAllGroups, setFilterAllGroups] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Response modal state
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseStatus, setResponseStatus] = useState('accepted');
  const [donorNotes, setDonorNotes] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, histRes] = await Promise.all([
        donorService.getNearbyRequests(filterAllGroups),
        donorService.getDonationHistory(),
      ]);

      if (reqRes.success) setNearbyRequests(reqRes.requests || []);
      if (histRes.success) setDonationHistory(histRes.history || []);
    } catch (err) {
      console.error('Failed to load donor dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterAllGroups]);

  const handleToggleAvailability = async () => {
    if (!donorProfile || toggleLoading) return;
    try {
      setToggleLoading(true);
      await updateDonorAvailability(!donorProfile.availabilityStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setToggleLoading(false);
    }
  };

  const openRespondModal = (requestItem, defaultStatus = 'accepted') => {
    setSelectedRequest(requestItem);
    setResponseStatus(defaultStatus);
    setDonorNotes('');
    setResponseModalOpen(true);
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmittingResponse(true);

    try {
      const res = await requestService.respondToRequest(
        selectedRequest._id,
        responseStatus,
        donorNotes
      );
      if (res.success) {
        setActionSuccessMsg(`Response '${responseStatus.toUpperCase()}' successfully submitted!`);
        setResponseModalOpen(false);
        loadData();
        setTimeout(() => setActionSuccessMsg(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Profile Summary Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <BloodGroupBadge bloodGroup={donorProfile?.bloodGroup || 'O+'} size="xl" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{user?.name}</h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    donorProfile?.verificationStatus === 'verified'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {donorProfile?.verificationStatus === 'verified'
                    ? 'Verified Donor'
                    : 'Verification Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {donorProfile?.address?.formattedAddress || 'Bangalore, Karnataka'}
              </p>
            </div>
          </div>

          {/* Availability Toggle and Quick Metrics */}
          <div className="flex flex-wrap items-center gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
            {/* Live Availability Switch */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <div>
                <div className="text-2xs uppercase tracking-wider text-slate-600 font-bold">
                  Emergency Availability
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  {donorProfile?.availabilityStatus ? 'Ready to Donate' : 'Temporarily Unavailable'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAvailability}
                disabled={toggleLoading}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  donorProfile?.availabilityStatus ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    donorProfile?.availabilityStatus ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Total Donations Count */}
            <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/80 text-center">
              <div className="text-2xs uppercase tracking-wider text-slate-600 font-bold">
                Transfusions
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {donorProfile?.totalDonationsCompleted || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Eligibility Disclaimer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Self-reported availability does not guarantee clinical eligibility. Medical parameters, minimum hemoglobin levels, and cross-matching will be confirmed by hospital blood bank personnel prior to donation.
          </span>
        </div>
      </div>

      {/* Relevant Emergency Blood Requests */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-600" />
              Relevant Emergency Requests
            </h2>
            <p className="text-xs text-slate-600">
              Emergency requests near your vicinity sorted by distance and urgency
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterAllGroups(!filterAllGroups)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                filterAllGroups
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filterAllGroups ? 'Showing All Blood Groups' : `Filtered: ${donorProfile?.bloodGroup || 'My Group'}`}
            </button>
            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
              title="Refresh requests"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center bg-white rounded-3xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : nearbyRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nearbyRequests.map((req) => (
              <div
                key={req._id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <BloodGroupBadge bloodGroup={req.bloodGroup} size="md" />
                    <UrgencyBadge urgency={req.urgency} />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{req.hospital.name}</h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{req.hospital.address}</span>
                    </p>
                  </div>

                  {/* Distance and Required-by pill */}
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Proximity:</span>
                      <strong className="text-slate-900 font-mono">
                        {req.distanceKm !== null ? `${req.distanceKm} km away` : 'Within City'}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Units Needed:</span>
                      <strong className="text-slate-900">{req.unitsRequested} units</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Needed By:</span>
                      <strong className="text-rose-600 font-bold">
                        {new Date(req.requiredBy).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </strong>
                    </div>
                  </div>

                  {req.description && (
                    <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                      "{req.description}"
                    </p>
                  )}
                </div>

                {/* Response Action Buttons */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {req.myResponse ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-slate-600">Your Response:</span>
                      <span
                        className={`font-bold uppercase tracking-wider ${
                          req.myResponse.responseStatus === 'accepted'
                            ? 'text-emerald-700'
                            : req.myResponse.responseStatus === 'declined'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {req.myResponse.responseStatus}
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openRespondModal(req, 'accepted')}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 shadow-xs shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        I Can Donate
                      </button>
                      <button
                        onClick={() => openRespondModal(req, 'declined')}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-2">
            <Heart className="w-10 h-10 text-rose-300 mx-auto" />
            <h3 className="font-bold text-slate-900">No matching open requests at this moment</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Your registered availability ({donorProfile?.bloodGroup || 'Blood'}) is active. When hospitals log urgent requests matching your blood group, you will receive an emergency notification.
            </p>
          </div>
        )}
      </div>

      {/* Donation History Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Donation & Response History
        </h2>

        {donationHistory.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {donationHistory.map((item) => (
              <div key={item._id} className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {item.bloodRequest?.hospital?.name || 'Hospital Donation Center'}
                  </div>
                  <div className="text-xs text-slate-600">
                    Units: {item.bloodRequest?.unitsRequested || 1} • Status:{' '}
                    <span className="capitalize">{item.bloodRequest?.status || 'Completed'}</span>
                  </div>
                  {item.donorNotes && (
                    <div className="text-2xs text-slate-600 italic mt-0.5">"{item.donorNotes}"</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block">
                    Accepted & Verified
                  </div>
                  <div className="text-3xs text-slate-600 mt-1">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600 py-4">
            No past donation records logged yet. Verified donation records will appear here after hospital completion.
          </p>
        )}
      </div>

      {/* Donor Response Modal */}
      <Modal
        isOpen={responseModalOpen}
        onClose={() => setResponseModalOpen(false)}
        title={`Respond to Request: ${selectedRequest?.hospital?.name}`}
      >
        <form onSubmit={handleSubmitResponse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Your Response Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setResponseStatus('accepted')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  responseStatus === 'accepted'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Accept (Available)
              </button>
              <button
                type="button"
                onClick={() => setResponseStatus('declined')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  responseStatus === 'declined'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => setResponseStatus('unavailable')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  responseStatus === 'unavailable'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Unavailable
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Note for Requester / Medical Coordinator (Optional)
            </label>
            <textarea
              rows={3}
              value={donorNotes}
              onChange={(e) => setDonorNotes(e.target.value)}
              placeholder="e.g. Can arrive at the hospital within 40 minutes, feeling healthy."
              className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-2xs text-slate-600 leading-relaxed">
            By accepting, the emergency requester will be notified of your availability and contact coordination can proceed.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setResponseModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingResponse}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs"
            >
              {submittingResponse ? 'Submitting...' : 'Confirm Response'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
