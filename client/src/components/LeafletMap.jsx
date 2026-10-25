import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom sharp DivIcons for Hospital and Donor markers
const createHospitalIcon = () => {
  return L.divIcon({
    className: 'custom-hospital-marker',
    html: `
      <div style="background-color: #dc2626; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.4); border: 2px solid #ffffff;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 6v12m-6-6h12"/>
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
};

const createDonorIcon = (bloodGroup) => {
  return L.divIcon({
    className: 'custom-donor-marker',
    html: `
      <div style="background-color: #2563eb; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(37, 99, 235, 0.35); border: 2px solid #ffffff; color: #ffffff; font-size: 11px; font-weight: 800; font-family: sans-serif;">
        ${bloodGroup || 'D'}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
};

// Component to adjust map view when center or markers change
const RecenterView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 12);
    }
  }, [center, zoom, map]);
  return null;
};

export const LeafletMap = ({
  center = [12.9716, 77.5946], // default Bangalore [lat, lng]
  zoom = 12,
  hospitalMarker = null, // { lat, lng, name, address, bloodGroup, units }
  donors = [], // Array of { coordinates: [lng, lat] (or lat/lng), name, bloodGroup, distanceKm }
  radiusKm = null,
  height = '360px',
  onMapClick = null,
}) => {
  // Leaflet expects [lat, lng]
  const validCenter =
    Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])
      ? center
      : [12.9716, 77.5946];

  return (
    <div style={{ height }} className="w-full relative rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer
        center={validCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <RecenterView center={validCenter} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Search radius visualization */}
        {radiusKm && validCenter && (
          <Circle
            center={validCenter}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '5, 8',
            }}
          />
        )}

        {/* Hospital collection center marker */}
        {hospitalMarker && hospitalMarker.lat && hospitalMarker.lng && (
          <Marker
            position={[hospitalMarker.lat, hospitalMarker.lng]}
            icon={createHospitalIcon()}
          >
            <Popup>
              <div className="p-1">
                <span className="inline-block bg-red-100 text-red-800 text-2xs uppercase px-1.5 py-0.5 rounded font-bold mb-1">
                  Collection Center
                </span>
                <h4 className="font-bold text-sm text-slate-900">{hospitalMarker.name}</h4>
                <p className="text-xs text-slate-600 mb-1">{hospitalMarker.address}</p>
                {hospitalMarker.bloodGroup && (
                  <div className="text-xs font-semibold text-rose-700">
                    Needs: {hospitalMarker.units || 1} units of {hospitalMarker.bloodGroup}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Potential Donors approximate markers (Preserving exact home privacy) */}
        {donors.map((d, idx) => {
          // If coordinates are [lng, lat] GeoJSON format
          let lat = d.lat;
          let lng = d.lng;
          if (d.coordinates && Array.isArray(d.coordinates)) {
            lng = d.coordinates[0];
            lat = d.coordinates[1];
          }

          if (!lat || !lng) return null;

          return (
            <Marker
              key={d._id || idx}
              position={[lat, lng]}
              icon={createDonorIcon(d.bloodGroup)}
            >
              <Popup>
                <div className="p-1">
                  <span className="inline-block bg-blue-100 text-blue-800 text-2xs uppercase px-1.5 py-0.5 rounded font-bold mb-1">
                    Potential Donor
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">{d.name || d.user?.name || 'Verified Donor'}</h4>
                  <div className="text-xs text-slate-600 mt-1">
                    Blood Group: <strong className="text-rose-600">{d.bloodGroup}</strong>
                  </div>
                  {d.distanceKm !== undefined && (
                    <div className="text-xs text-slate-600">
                      Approx. Distance: <strong>{d.distanceKm} km</strong>
                    </div>
                  )}
                  {d.city && <div className="text-xs text-slate-500">Vicinity: {d.city}</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
