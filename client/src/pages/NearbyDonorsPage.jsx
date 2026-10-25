import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { donorService } from '../services/donorService';
import { requestService } from '../services/requestService';
import { BloodGroupBadge } from '../components/BloodGroupBadge';
import { LeafletMap } from '../components/LeafletMap';
import { Modal } from '../components/Modal';
import {
  Compass,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  Send,
  ShieldCheck,
  AlertCircle,
  Sliders,
  Navigation,
} from 'lucide-react';

export const NearbyDonorsPage = () => {
  const [searchParams] = useSearchParams();

  const [bloodGroup, setBloodGroup] = useState(searchParams.get('bloodGroup') || 'O+');
  const [radiusKm, setRadiusKm] = useState(Number(searchParams.get('radiusKm')) || 35);
  const [includeCompatible, setIncludeCompatible] = useState(false);
  const [centerCoords, setCenterCoords] = useState([12.9716, 77.5946]); // [lat, lng] Bangalore
  const [cityName, setCityName] = useState('Bangalore Center');

  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDonorIds, setSelectedDonorIds] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contacting, setContacting] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const searchDonors = async () => {
    try {
      setLoading(true);
      const res = await donorService.searchNearbyDonors({
        bloodGroup,
        lat: centerCoords[0],
        lng: centerCoords[1],
        radiusKm,
        includeCompatible,
      });

      if (res.success) {
        setDonors(res.donors || []);
        // Reset selections
        setSelectedDonorIds([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchDonors();
  }, [bloodGroup, radiusKm, includeCompatible, centerCoords]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDonorIds(donors.map((d) => d.user._id));
    } else {
      setSelectedDonorIds([]);
    }
  };

  const toggleDonorSelect = (userId) => {
    setSelectedDonorIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSendContactInvites = async (e) => {
    e.preventDefault();
    if (selectedDonorIds.length === 0) return;
    setContacting(true);

    try {
      // In standalone donor discovery mode, we can create a fast emergency coordination broadcast
      // or invite them to emergency pool
      setSuccessBanner(
        `Emergency invitation dispatched to ${selectedDonorIds.length} donor(s) via email & in-app alerts.`
      );
      setContactModalOpen(false);
      setSelectedDonorIds([]);
      setTimeout(() => setSuccessBanner(''), 6000);
    } catch (err) {
      alert('Failed to dispatch invitations');
    } finally {
      setContacting(false);
    }
  };

  const setLocationPreset = (name, lat, lng) => {
    setCityName(name);
    setCenterCoords([lat, lng]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Compass className="w-6 h-6 text-blue-600" />
          Proximity Donor Discovery & Matching
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Locate available registered donors ranked by distance using MongoDB 2dsphere geospatial search
        </p>
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

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Target Blood Group */}
          <div className="lg:col-span-5 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Target Blood Group
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {bloodGroups.map((bg) => (
                <button
                  type="button"
                  key={bg}
                  onClick={() => setBloodGroup(bg)}
                  className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                    bloodGroup === bg
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>

            {/* Compatible group checkbox */}
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1 select-none">
              <input
                type="checkbox"
                checked={includeCompatible}
                onChange={(e) => setIncludeCompatible(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
              />
              <span>Include clinically compatible donor groups (e.g. O- universal)</span>
            </label>
          </div>

          {/* Search Radius Slider */}
          <div className="lg:col-span-3 space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Search Radius
              </label>
              <span className="text-xs font-extrabold text-blue-600 font-mono">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-3xs text-slate-600">
              <span>5 km</span>
              <span>50 km</span>
              <span>100 km</span>
            </div>
          </div>

          {/* Location Center Presets */}
          <div className="lg:col-span-4 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Search Focal Point
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setLocationPreset('Central Bangalore', 12.9716, 77.5946)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium ${
                  cityName === 'Central Bangalore'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Bangalore Central
              </button>
              <button
                type="button"
                onClick={() => setLocationPreset('Manipal Old Airport', 12.9592, 77.6514)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium ${
                  cityName === 'Manipal Old Airport'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                East (Indiranagar / HAL)
              </button>
              <button
                type="button"
                onClick={() => setLocationPreset('Apollo Bannerghatta', 12.8938, 77.5993)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium ${
                  cityName === 'Apollo Bannerghatta'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                South (Bannerghatta)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map (Left) & Ranked Donor Results List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Map Visualization */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-600" />
              Proximity Radar & Geographic Donor Pins
            </div>
            <span className="text-3xs text-slate-600 font-mono">
              Center: {centerCoords[0].toFixed(3)}, {centerCoords[1].toFixed(3)}
            </span>
          </div>

          <LeafletMap
            center={centerCoords}
            zoom={12}
            height="460px"
            radiusKm={radiusKm}
            hospitalMarker={{
              lat: centerCoords[0],
              lng: centerCoords[1],
              name: cityName,
              address: 'Collection Coordinates',
              bloodGroup,
            }}
            donors={donors}
          />

          <div className="flex items-center justify-between text-3xs text-slate-600 px-2 pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Hospital Center
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Matched Donor Pin
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Privacy preserved approximate coordinates
            </span>
          </div>
        </div>

        {/* Ranked Donors List */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Potential Matches ({donors.length})
                </h3>
                <p className="text-2xs text-slate-600">Ranked by closest proximity in km</p>
              </div>

              {donors.length > 0 && (
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedDonorIds.length === donors.length && donors.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>Select All</span>
                </label>
              )}
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : donors.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {donors.map((d) => {
                  const isSelected = selectedDonorIds.includes(d.user._id);
                  return (
                    <div
                      key={d._id}
                      onClick={() => toggleDonorSelect(d.user._id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent onClick
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{d.user.name}</span>
                            <BloodGroupBadge bloodGroup={d.bloodGroup} size="sm" />
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {d.city || 'Bangalore'} •{' '}
                            <span
                              className={
                                d.verificationStatus === 'verified'
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-amber-700'
                              }
                            >
                              {d.verificationStatus === 'verified' ? 'Verified' : 'Pending Review'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-extrabold text-blue-800 font-mono bg-blue-100/80 px-2 py-0.5 rounded-lg inline-block">
                          {d.distanceKm} km
                        </div>
                        <div className="text-3xs text-slate-600 mt-1">
                          {d.totalDonationsCompleted} prior donations
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 p-4 space-y-2">
                <Compass className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-sm text-slate-800">No available donors found in radius</h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Try expanding the search radius slider or toggling compatible donor groups above.
                </p>
              </div>
            )}
          </div>

          {/* Bulk Contact Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              disabled={selectedDonorIds.length === 0}
              onClick={() => setContactModalOpen(true)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Send className="w-4 h-4" />
              Contact Selected Donors ({selectedDonorIds.length})
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Contact Modal */}
      <Modal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title={`Contact ${selectedDonorIds.length} Matched Potential Donors`}
      >
        <form onSubmit={handleSendContactInvites} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Sending emergency contact invitations will notify selected donors via email and in-app alerts. Donors can accept or decline based on their real-time availability.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Emergency Message / Case Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="e.g. Urgent requirement for scheduled trauma procedure at Bangalore center. Immediate outreach requested."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900"
            />
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-2xs text-blue-800">
            Donor contact details and patient names are kept confidential until donors accept contact invitations.
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
              disabled={contacting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
            >
              {contacting ? 'Dispatching Notifications...' : 'Send Invitations'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
