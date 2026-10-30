import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestService } from '../services/requestService';
import { organizationService } from '../services/organizationService';
import { useAuth } from '../context/AuthContext';
import { LeafletMap } from '../components/LeafletMap';
import {
  Hospital,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Droplet,
  Building2,
  Lock,
} from 'lucide-react';

export const CreateRequestPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patientName, setPatientName] = useState('Emergency Trauma Patient');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [unitsRequested, setUnitsRequested] = useState(2);
  const [hospitalName, setHospitalName] = useState('Manipal Hospital');
  const [hospitalAddress, setHospitalAddress] = useState('98 HAL Old Airport Rd, Kodihalli, Bangalore');
  const [hospitalPhone, setHospitalPhone] = useState('+91 80 2502 4444');
  const [coordinates, setCoordinates] = useState([77.6514, 12.9592]); // [lng, lat]
  const [urgency, setUrgency] = useState('critical');
  const [requiredBy, setRequiredBy] = useState(
    new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [description, setDescription] = useState(
    'Urgent emergency surgery scheduled. Whole blood or packed red cells required immediately.'
  );

  const [affiliatedOrg, setAffiliatedOrg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await organizationService.getMyOrganization();
        if (res.success && res.organization) {
          const org = res.organization;
          setAffiliatedOrg(org);
          setHospitalName(org.name);
          setHospitalAddress(
            org.address?.formattedAddress ||
              `${org.name}, ${org.address?.city || 'Bangalore'}, ${org.address?.state || 'Karnataka'}`
          );
          setHospitalPhone(org.contactInformation?.phone || '+91 80 2502 4444');
          if (org.location?.coordinates && org.location.coordinates.length === 2) {
            setCoordinates(org.location.coordinates);
          }
        }
      } catch (err) {
        // Fallback for non-affiliated
      }
    };
    fetchOrg();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (unitsRequested < 1) {
      setError('Units requested must be at least 1.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        patientName,
        bloodGroup,
        unitsRequested: Number(unitsRequested),
        hospitalName,
        hospitalAddress,
        hospitalPhone,
        coordinates,
        urgency,
        requiredBy: new Date(requiredBy).toISOString(),
        description,
        organizationId: affiliatedOrg?._id || user?.organizationId || undefined,
      };

      const res = await requestService.createRequest(payload);
      if (res.success) {
        navigate(`/requests/${res.bloodRequest._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit blood request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-rose-600" />
          Create Emergency Blood Request
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Initiate an urgent hospital blood request to discover and notify available donors in the vicinity
        </p>
      </div>

      {affiliatedOrg && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-400">
                Official Requesting Facility
              </div>
              <div className="text-sm font-bold text-white">{affiliatedOrg.name}</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200">
            <Lock className="w-3.5 h-3.5 text-rose-400" /> Organization Verified
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        {/* Blood Group and Units */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Required Blood Group
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {bloodGroups.map((bg) => (
              <button
                type="button"
                key={bg}
                onClick={() => setBloodGroup(bg)}
                className={`py-2 rounded-xl text-xs font-mono font-bold border transition ${
                  bloodGroup === bg
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        {/* Units & Urgency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Units Needed
            </label>
            <input
              type="number"
              min="1"
              max="20"
              required
              value={unitsRequested}
              onChange={(e) => setUnitsRequested(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Urgency Tier
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 capitalize font-medium"
            >
              <option value="low">Low (Next 48 hrs)</option>
              <option value="medium">Medium (Next 24 hrs)</option>
              <option value="high">High (Next 12 hrs)</option>
              <option value="critical">Critical / Surgery (Immediate)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Required By
            </label>
            <input
              type="datetime-local"
              required
              value={requiredBy}
              onChange={(e) => setRequiredBy(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium text-slate-900"
            />
          </div>
        </div>

        {/* Hospital Details (Locked to Organization) */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Hospital & Collection Location
            </label>
            {affiliatedOrg && (
              <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Bound to {affiliatedOrg.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-2xs text-slate-600 font-bold block mb-1">Hospital Name</label>
              <input
                type="text"
                required
                disabled={!!affiliatedOrg}
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="e.g. Apollo Hospital"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  affiliatedOrg ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="text-2xs text-slate-600 font-bold block mb-1">
                Hospital Contact Phone
              </label>
              <input
                type="text"
                disabled={!!affiliatedOrg}
                value={hospitalPhone}
                onChange={(e) => setHospitalPhone(e.target.value)}
                placeholder="+91 80 1234 5678"
                className={`w-full px-3 py-2 text-xs rounded-xl border ${
                  affiliatedOrg ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'border-slate-300'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="text-2xs text-slate-600 font-bold block mb-1">
              Hospital Full Street Address
            </label>
            <input
              type="text"
              required
              disabled={!!affiliatedOrg}
              value={hospitalAddress}
              onChange={(e) => setHospitalAddress(e.target.value)}
              placeholder="e.g. Bannerghatta Main Road, Bangalore"
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                affiliatedOrg ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'border-slate-300'
              }`}
            />
          </div>

          {/* Interactive Map of Collection Hospital */}
          <div className="pt-2">
            <div className="text-2xs text-slate-600 font-semibold mb-1">
              Hospital Geocoded Location on OpenStreetMap:
            </div>
            <LeafletMap
              center={[coordinates[1], coordinates[0]]}
              zoom={13}
              height="220px"
              hospitalMarker={{
                lat: coordinates[1],
                lng: coordinates[0],
                name: hospitalName,
                address: hospitalAddress,
                bloodGroup,
                units: unitsRequested,
              }}
            />
          </div>
        </div>

        {/* Clinical Case Description */}
        <div className="pt-4 border-t border-slate-100 space-y-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Clinical Notes / Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context regarding urgency, surgical unit, or contact person at reception."
            className="w-full p-3 rounded-xl border border-slate-300 text-xs"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/30 transition flex items-center gap-2"
          >
            {loading ? 'Creating Request...' : 'Publish Emergency Request & Discover Donors'}
          </button>
        </div>
      </form>
    </div>
  );
};
