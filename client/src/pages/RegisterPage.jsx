import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Droplet,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Navigation,
} from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('donor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [city, setCity] = useState('Bangalore');
  const [state, setState] = useState('Karnataka');
  const [formattedAddress, setFormattedAddress] = useState('Bangalore, Karnataka');
  const [coordinates, setCoordinates] = useState([77.5946, 12.9716]); // [lng, lat]
  const [geoLocating, setGeoLocating] = useState(false);
  const [consentGiven, setConsentGiven] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Browser geolocation is not supported on this device.');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        setCoordinates([
          parseFloat(longitude.toFixed(5)),
          parseFloat(latitude.toFixed(5)),
        ]);
        setGeoLocating(false);
      },
      (err) => {
        console.warn('Geolocation denied or unavailable', err);
        setError('Location access denied or unavailable. Manual coordinates will be used.');
        setGeoLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (role === 'donor' && !consentGiven) {
      setError('You must consent to emergency matching contact notifications to register.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        phone,
        role,
        ...(role === 'donor' && {
          bloodGroup,
          coordinates,
          address: {
            city,
            state,
            formattedAddress,
          },
          consentGiven,
        }),
      };

      const res = await register(payload);
      if (res.success) {
        if (role === 'requester') {
          navigate('/requester');
        } else {
          navigate('/donor');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-rose-600/30">
            <Droplet className="w-7 h-7 text-white fill-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Create an Account
          </h2>
          <p className="text-xs text-slate-600">
            Join as a voluntary blood donor or authorized medical requester
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('donor')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              role === 'donor'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            I am a Potential Donor
          </button>
          <button
            type="button"
            onClick={() => setRole('requester')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              role === 'requester'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            I am a Hospital Requester
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh or Rahul"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 12345"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Donor-Specific Fields */}
          {role === 'donor' && (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Your Blood Group
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
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Coordinates & Vicinity */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    Approximate Location (for Geospatial Radius Matching)
                  </div>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={geoLocating}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    {geoLocating ? 'Detecting...' : 'Detect GPS'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 block mb-1">City / Vicinity</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Indiranagar, Bangalore"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Coordinates [Lng, Lat]</label>
                    <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 font-mono text-3xs text-slate-700 truncate">
                      {coordinates[0]}, {coordinates[1]}
                    </div>
                  </div>
                </div>

                <p className="text-3xs text-slate-600">
                  Exact street coordinates remain private; coordinators only see your approximate distance in kilometers.
                </p>
              </div>

              {/* Consent Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>
                  I consent to being indexed for emergency blood requests and receiving critical email / SMS notifications when eligible patients in my area need blood.
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/30 transition flex items-center justify-center gap-2 text-sm disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Complete Registration'
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-rose-600 hover:text-rose-700">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
