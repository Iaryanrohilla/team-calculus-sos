import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AlertCircle, Clock, MapPin, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function EmergencyFeed() {
  const [emergencies, setEmergencies] = useState([]);

  useEffect(() => {
    // Connect to backend Socket.io
    const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });

    socket.on('new_emergency', (data) => {
      setEmergencies(prev => [data, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (emergencies.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
        <AlertCircle className="w-12 h-12 mb-3 opacity-20 text-white" />
        <p className="text-sm font-medium text-slate-400">No active emergencies</p>
        <p className="text-xs text-slate-500 mt-1">Monitoring network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
      {emergencies.map((em) => (
        <div key={em.id} className="bg-slate-800 rounded-lg border border-red-900 overflow-hidden shadow-lg shadow-black/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-red-900/40 px-3 py-2 border-b border-red-900/50 flex justify-between items-center">
            <span className="text-xs font-bold text-red-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              {em.tag}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(em.timestamp), { addSuffix: true })}
            </span>
          </div>
          
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            {em.watermarkedUrl && (
              <div className="sm:w-1/3 shrink-0">
                <img 
                  src={em.watermarkedUrl} 
                  alt="Verified ID" 
                  className="w-full h-auto rounded border border-slate-700 bg-black/50"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">{em.profileData.fullName || 'Unknown Name'}</h3>
                <p className="text-sm text-slate-300">
                  {em.profileData.age ? `${em.profileData.age} yrs` : 'Unknown age'} &bull; {em.profileData.gender || 'Unknown gender'}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span><strong className="text-slate-400 text-xs uppercase block">Last Seen</strong> {em.profileData.lastSeenLocation || 'Not provided'}</span>
                </div>
                
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <User className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-400 text-xs uppercase block">Appearance</strong>
                    {em.profileData.clothingColor && `${em.profileData.clothingColor}`}
                    {em.profileData.clothingColor && em.profileData.height && ' | '}
                    {em.profileData.height && `${em.profileData.height}`}
                    {!em.profileData.clothingColor && !em.profileData.height && 'Not provided'}
                  </span>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center">
                 <span className="text-xs text-slate-400 font-mono">Contact: {em.profileData.contact || 'N/A'}</span>
                 <button className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors font-medium">
                   View Details
                 </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
