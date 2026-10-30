import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestService } from '../services/requestService';
import { BloodGroupBadge } from '../components/BloodGroupBadge';
import { StatusBadge, UrgencyBadge } from '../components/StatusBadge';
import { LeafletMap } from '../components/LeafletMap';
import { Modal } from '../components/Modal';
import {
  MapPin,
  Clock,
  Phone,
  User,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  ArrowLeft,
  Activity,
  ShieldCheck,
  RefreshCw,
  Radio,
  Zap,
} from 'lucide-react';

export const RequestDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [request, setRequest] = useState(null);
  const [responses, setResponses] = useState([]);
  const [matchedDonors, setMatchedDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status transition state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Contact donors state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedDonorsToContact, setSelectedDonorsToContact] = useState([]);
  const [contactCustomMsg, setContactCustomMsg] = useState('');
  const [contactingDonors, setContactingDonors] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [escalateLoading, setEscalateLoading] = useState(false);

  const [successBanner, setSuccessBanner] = useState('');

  const handleSosBroadcast = async () => {
    if (!window.confirm('Trigger immediate SOS broadcast across 100km radius to all compatible donors?')) {
      return;
    }
    try {
      setSosLoading(true);
      const res = await requestService.sosBroadcast(id);
      if (res.success) {
        setSuccessBanner(res.message);
        fetchRequestDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to trigger SOS broadcast');
    } finally {
      setSosLoading(false);
    }
  };

  const handleEscalate = async () => {
    try {
      setEscalateLoading(true);
      const res = await requestService.escalateRequest(id, 'Responses delayed - expanding radius');
      if (res.success) {
        setSuccessBanner(res.message);
        fetchRequestDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to escalate request');
    } finally {
      setEscalateLoading(false);
    }
  };

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      const res = await requestService.getRequestById(id);
      if (res.success) {
        setRequest(res.bloodRequest);
        setResponses(res.responses || []);

        // Load nearby matched donors for this request
        try {
          const matchRes = await requestService.getMatchedDonorsForRequest(id, { radiusKm: 40 });
          if (matchRes.success) {
            setMatchedDonors(matchRes.donors || []);
          }
        } catch (e) {
          console.warn('Could not load matched donors', e);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return;
    setUpdatingStatus(true);

    try {
      const res = await requestService.updateRequestStatus(id, selectedStatus, closureNotes);
      if (res.success) {
        setSuccessBanner(`Request status transitioned to '${selectedStatus}'!`);
        setStatusModalOpen(false);
        fetchRequestDetails();
        setTimeout(() => setSuccessBanner(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendContact = async (e) => {
    e.preventDefault();
    if (selectedDonorsToContact.length === 0) return;
    setContactingDonors(true);

    try {
      const res = await requestService.contactMatchedDonors(
        id,
        selectedDonorsToContact,
        contactCustomMsg
      );
      if (res.success) {
        setSuccessBanner(res.message);
        setContactModalOpen(false);
        setSelectedDonorsToContact([]);
        fetchRequestDetails();
        setTimeout(() => setSuccessBanner(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to contact donors');
    } finally {
      setContactingDonors(false);
    }
  };

  const isOwnerOrAdmin =
    request && (isAdmin || request.requester?._id?.toString() === user?._id?.toString());

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Request Not Found</h2>
        <p className="text-xs text-slate-600">{error || 'This blood request could not be located.'}</p>
        <Link
          to="/requester"
          className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const hospitalCoords = request.hospital?.location?.coordinates || [77.6514, 12.9592];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back and Refresh Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </button>

        <button
          onClick={fetchRequestDetails}
          className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
          title="Refresh"
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

      {/* Main Request Information Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <BloodGroupBadge bloodGroup={request.bloodGroup} size="xl" />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {request.unitsRequested} {request.unitsRequested === 1 ? 'Unit' : 'Units'} Needed
                </h1>
                <UrgencyBadge urgency={request.urgency} />
                <StatusBadge status={request.status} />
              </div>
              <p className="text-sm font-bold text-slate-700">{request.hospital?.name}</p>
              <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {request.hospital?.address}
              </p>
            </div>
          </div>

          {/* Lifecycle State Machine Actions for Owner/Admin */}
          {isOwnerOrAdmin && !['fulfilled', 'cancelled'].includes(request.status) && (
            <div className="flex flex-wrap items-center gap-2">
              {/* SOS Emergency Broadcast */}
              <button
                onClick={handleSosBroadcast}
                disabled={sosLoading}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-red-600/30 animate-pulse"
              >
                <Radio className="w-3.5 h-3.5" />
                {sosLoading ? 'Broadcasting...' : 'Emergency SOS Broadcast'}
              </button>

              {/* Urgency Escalation */}
              <button
                onClick={handleEscalate}
                disabled={escalateLoading}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                {escalateLoading ? 'Escalating...' : 'Escalate Radius (+25km)'}
              </button>

              <button
                onClick={() => {
                  setSelectedStatus('coordination_in_progress');
                  setStatusModalOpen(true);
                }}
                className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Activity className="w-3.5 h-3.5" />
                Coordination In Progress
              </button>

              <button
                onClick={() => {
                  setSelectedStatus('fulfilled');
                  setStatusModalOpen(true);
                }}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Fulfilled & Transfused
              </button>

              <button
                onClick={() => {
                  setSelectedStatus('cancelled');
                  setStatusModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition"
              >
                Cancel Request
              </button>
            </div>
          )}
        </div>

        {/* Request Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-slate-600 font-bold block mb-1">Patient Alias / Diagnosis</span>
            <span className="text-slate-900 font-extrabold text-sm">{request.patientName}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-slate-600 font-bold block mb-1">Required By</span>
            <span className="text-rose-600 font-bold text-sm">
              {new Date(request.requiredBy).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-slate-600 font-bold block mb-1">Hospital Contact Phone</span>
            <span className="text-slate-900 font-bold text-sm">
              {request.hospital?.contactPhone || 'Available upon contact'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-slate-600 font-bold block mb-1">Request Coordinator</span>
            <span className="text-slate-900 font-bold text-sm">
              {request.requester?.name || 'Hospital Staff'}
            </span>
          </div>
        </div>

        {request.description && (
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900 block mb-1">Clinical Context:</strong>
            {request.description}
          </div>
        )}
      </div>

      {/* Hospital Map & Matched Donors Discovery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-600" />
              Hospital Location & Vicinity Donors
            </h3>
            <span className="text-2xs text-slate-600 font-mono">
              35 km Proximity Radius
            </span>
          </div>

          <LeafletMap
            center={[hospitalCoords[1], hospitalCoords[0]]}
            zoom={12}
            height="340px"
            radiusKm={35}
            hospitalMarker={{
              lat: hospitalCoords[1],
              lng: hospitalCoords[0],
              name: request.hospital?.name,
              address: request.hospital?.address,
              bloodGroup: request.bloodGroup,
              units: request.unitsRequested,
            }}
            donors={matchedDonors}
          />
        </div>

        {/* Matched Donors Quick Outreach Panel */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Matched Donors ({matchedDonors.length})</h3>
                <p className="text-2xs text-slate-600">Available donors sorted by distance</p>
              </div>

              {matchedDonors.length > 0 && isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDonorsToContact(matchedDonors.map((d) => d.user._id));
                    setContactModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  Contact All
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {matchedDonors.map((d) => (
                <div
                  key={d._id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      {d.user.name}
                      <span className="text-2xs font-mono font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                        {d.bloodGroup}
                      </span>
                    </div>
                    <div className="text-2xs text-slate-600">{d.city || 'Bangalore'}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {d.distanceKm} km
                    </span>
                    <div className="text-3xs text-slate-600 mt-0.5">
                      {d.responseStatus === 'not_contacted' ? 'Not contacted' : d.responseStatus}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-3xs text-slate-600 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Donor phone/address disclosed only after acceptance.</span>
          </div>
        </div>
      </div>

      {/* Feature 6: Donor Responses Tracking Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Donor Responses & Coordination Roster ({responses.length})
            </h2>
            <p className="text-xs text-slate-600">
              Real-time response audit trail showing contacted donors, acceptance notes, and verified status
            </p>
          </div>
        </div>

        {responses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Donor Name</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Response Status</th>
                  <th className="py-3 px-4">Donor Notes</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {responses.map((resp) => {
                  const isAccepted = resp.responseStatus === 'accepted';
                  return (
                    <tr key={resp._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{resp.donor?.name}</td>
                      <td className="py-3 px-4">
                        <BloodGroupBadge
                          bloodGroup={resp.donorProfile?.bloodGroup || request.bloodGroup}
                          size="sm"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                            resp.responseStatus === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : resp.responseStatus === 'declined'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {resp.responseStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {resp.donorNotes || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {isAccepted && isOwnerOrAdmin ? (
                          <div className="space-y-0.5 text-2xs">
                            <div className="font-bold text-slate-900">{resp.donor?.phone || 'Phone verified'}</div>
                            <div className="text-slate-600">{resp.donor?.email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Disclosed on accept</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-3xs text-slate-600">
                        {resp.respondedAt
                          ? new Date(resp.respondedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Pending response'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-600 py-6 text-center">
            No donors contacted yet. Use the "Contact All" or discovery tools to invite matching donors.
          </p>
        )}
      </div>

      {/* Lifecycle Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Update Request Lifecycle: ${selectedStatus.replace('_', ' ').toUpperCase()}`}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <p className="text-xs text-slate-600">
            Confirming this status transition will record an administrative audit log and update donor visibility.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Closure / Transition Notes
            </label>
            <textarea
              rows={3}
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              placeholder="e.g. Donor arrived at blood bank, compatibility cross-match confirmed, transfusion successful."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingStatus}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition"
            >
              {updatingStatus ? 'Updating...' : 'Confirm Status Change'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Contact Donors Modal */}
      <Modal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title={`Contact ${selectedDonorsToContact.length} Potential Donors`}
      >
        <form onSubmit={handleSendContact} className="space-y-4">
          <p className="text-xs text-slate-600">
            Send an urgent notification and email invitation to {selectedDonorsToContact.length} nearby donors for{' '}
            <strong>{request.hospital?.name}</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Custom Message (Optional)
            </label>
            <textarea
              rows={3}
              value={contactCustomMsg}
              onChange={(e) => setContactCustomMsg(e.target.value)}
              placeholder="e.g. Patient is in pre-op at Trauma ICU. Please respond if you are available to donate."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setContactModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={contactingDonors}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs"
            >
              {contactingDonors ? 'Sending...' : 'Dispatch Emergency Invitations'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
