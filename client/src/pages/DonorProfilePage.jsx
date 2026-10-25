import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { donorService } from '../services/donorService';
import { authService } from '../services/authService';
import { BloodGroupBadge } from '../components/BloodGroupBadge';
import { LeafletMap } from '../components/LeafletMap';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Navigation,
} from 'lucide-react';

export const DonorProfilePage = () => {
  const { user, donorProfile, refreshProfile, logout } = useAuth();

  const [bloodGroup, setBloodGroup] = useState('O+');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [coordinates, setCoordinates] = useState([77.5946, 12.9716]); // [lng, lat]
  const [preferredHours, setPreferredHours] = useState('Anytime');
  const [consentGiven, setConsentGiven] = useState(true);

  const [loading, setLoading] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Deactivation modal state
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (donorProfile) {
      setBloodGroup(donorProfile.bloodGroup || 'O+');
      setCity(donorProfile.address?.city || 'Bangalore');
      setState(donorProfile.address?.state || 'Karnataka');
      setFormattedAddress(donorProfile.address?.formattedAddress || 'Bangalore, Karnataka');
      if (donorProfile.location?.coordinates) {
        setCoordinates(donorProfile.location.coordinates);
      }
      setPreferredHours(donorProfile.contactPreferences?.preferredHours || 'Anytime');
      setConsentGiven(donorProfile.consentGiven ?? true);
    }
  }, [donorProfile]);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        setCoordinates([parseFloat(longitude.toFixed(5)), parseFloat(latitude.toFixed(5))]);
        setGeoLocating(false);
        setSuccessMsg('Coordinates updated from GPS!');
      },
      (err) => {
        console.warn(err);
        setErrorMsg('Could not detect location. Manual entry supported.');
        setGeoLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await donorService.updateMyProfile({
        bloodGroup,
        coordinates,
        address: {
          city,
          state,
          formattedAddress,
        },
        contactPreferences: {
          preferredHours,
        },
        consentGiven,
      });

      if (res.success) {
        setSuccessMsg('Donor profile settings successfully saved.');
        await refreshProfile();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setDeactivating(true);
      await authService.deactivateAccount(deactivateReason || 'Voluntary donor deactivation');
      alert('Your account and donor availability have been deactivated.');
      logout();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate account.');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Donor Profile & Settings</h1>
        <p className="text-xs text-slate-600">
          Manage your blood group, approximate proximity coordinates, and emergency contact preferences
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        {/* User Info Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Registered Name
            </label>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 font-semibold">
              {user?.name}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Email
            </label>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800">
              {user?.email}
            </div>
          </div>
        </div>

        {/* Blood Group Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Blood Group
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {bloodGroups.map((bg) => (
              <button
                type="button"
                key={bg}
                onClick={() => setBloodGroup(bg)}
                className={`py-2 rounded-xl text-xs font-mono font-bold border transition ${
                  bloodGroup === bg
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        {/* Location & Geospatial Settings */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Proximity Coordinates (GeoJSON Point)
            </label>
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={geoLocating}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5" />
              {geoLocating ? 'Detecting GPS...' : 'Auto-Detect via GPS'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-2xs text-slate-600 font-bold block mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="text-2xs text-slate-600 font-bold block mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="text-2xs text-slate-600 font-bold block mb-1">
                Longitude, Latitude
              </label>
              <input
                type="text"
                value={`${coordinates[0]}, ${coordinates[1]}`}
                onChange={(e) => {
                  const parts = e.target.value.split(',').map((p) => parseFloat(p.trim()));
                  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    setCoordinates(parts);
                  }
                }}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
              />
            </div>
          </div>

          {/* Leaflet Preview Map */}
          <div className="pt-2">
            <LeafletMap
              center={[coordinates[1], coordinates[0]]} // Leaflet uses [lat, lng]
              zoom={13}
              height="200px"
              donors={[
                {
                  coordinates,
                  bloodGroup,
                  name: 'Your Location Pin',
                },
              ]}
            />
          </div>
        </div>

        {/* Contact Preferences */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Preferred Contact Hours
          </label>
          <select
            value={preferredHours}
            onChange={(e) => setPreferredHours(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
          >
            <option value="Anytime">Anytime (Emergency Priority)</option>
            <option value="Morning (8 AM - 12 PM)">Morning (8 AM - 12 PM)</option>
            <option value="Afternoon (12 PM - 6 PM)">Afternoon (12 PM - 6 PM)</option>
            <option value="Evening (6 PM - 10 PM)">Evening (6 PM - 10 PM)</option>
          </select>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDeactivate(!showDeactivate)}
            className="text-xs font-bold text-rose-600 hover:text-rose-700"
          >
            Deactivate Account...
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            {loading ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      {/* Deactivate Box */}
      {showDeactivate && (
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 space-y-4">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            Deactivate Donor Account
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">
            Deactivating will set your availability to unavailable and exclude your profile from all emergency matching queries. You can reactivate by contacting an administrator.
          </p>
          <input
            type="text"
            placeholder="Reason for deactivation (optional)"
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-rose-300 bg-white text-xs"
          />
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={deactivating}
            className="px-4 py-2 bg-rose-700 text-white text-xs font-bold rounded-xl hover:bg-rose-800 transition"
          >
            {deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
          </button>
        </div>
      )}
    </div>
  );
};
