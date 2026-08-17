import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color, html) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
        ${html}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const policeIcon = createCustomIcon('#3b82f6', 'P'); // Blue
const metroIcon = createCustomIcon('#10b981', 'M'); // Green
const incidentIcon = createCustomIcon('#ef4444', '!'); // Red

const RAJIV_CHOWK_COORDS = [28.6328, 77.2197];

const policeBooths = [
  { id: 1, pos: [28.6335, 77.2205], name: 'Connaught Place Police Booth 1' },
  { id: 2, pos: [28.6315, 77.2185], name: 'Palika Bazaar Security Post' },
];

const metroGates = [
  { id: 1, pos: [28.6322, 77.2190], name: 'Gate 1 - Radial Road' },
  { id: 2, pos: [28.6332, 77.2200], name: 'Gate 2 - PVR Rivoli' },
  { id: 3, pos: [28.6329, 77.2185], name: 'Gate 3 - Palika Bazaar' },
];

export default function IncidentMap({ activeIncident }) {
  // If we have an active incident, plot it slightly randomly near Rajiv Chowk for demo purposes
  // In a real app, we'd use geocoding for the "lastSeenLocation"
  const incidentMarker = activeIncident ? [
    RAJIV_CHOWK_COORDS[0] + (Math.random() - 0.5) * 0.005,
    RAJIV_CHOWK_COORDS[1] + (Math.random() - 0.5) * 0.005
  ] : null;

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-slate-700 bg-slate-900 relative">
      {/* Top Overlay for Map */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-slate-900/90 border border-slate-700 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        Rajiv Chowk Metro Sector
      </div>

      <MapContainer 
        center={RAJIV_CHOWK_COORDS} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark theme map
        />

        {/* Police Booths */}
        {policeBooths.map(booth => (
          <Marker key={`p-${booth.id}`} position={booth.pos} icon={policeIcon}>
            <Popup className="custom-popup">
              <strong>{booth.name}</strong><br/>Status: ACTIVE
            </Popup>
          </Marker>
        ))}

        {/* Metro Gates */}
        {metroGates.map(gate => (
          <Marker key={`m-${gate.id}`} position={gate.pos} icon={metroIcon}>
            <Popup className="custom-popup">
              <strong>{gate.name}</strong><br/>Status: OPEN
            </Popup>
          </Marker>
        ))}

        {/* Active Incident */}
        {incidentMarker && (
          <Marker position={incidentMarker} icon={incidentIcon}>
            <Popup className="custom-popup">
              <strong>EMERGENCY TARGET</strong><br/>
              {activeIncident.profileData?.fullName || 'Unknown'}<br/>
              Last Seen: {activeIncident.profileData?.lastSeenLocation || 'N/A'}
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      <style>{`
        .leaflet-container {
          background-color: #0f172a !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: white;
          border: 1px solid #334155;
          border-radius: 6px;
        }
        .custom-popup .leaflet-popup-tip {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
}
