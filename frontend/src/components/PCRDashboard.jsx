import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { ShieldAlert, AlertTriangle, Radio, PhoneCall, Lock, FileText, Printer, CheckCircle, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import IncidentMap from './IncidentMap';
import { format } from 'date-fns';

export default function PCRDashboard() {
  const [dashboardActive, setDashboardActive] = useState(false); // To ensure audio context can start
  const [activeIncident, setActiveIncident] = useState(null);
  const [incomingAlert, setIncomingAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const intervalRef = useRef(null);

  const playSiren = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    gain.gain.value = 0.1; // Keep it slightly quiet for comfort
    
    let high = true;
    intervalRef.current = setInterval(() => {
      if (oscillatorRef.current) {
        osc.frequency.setValueAtTime(high ? 800 : 600, ctx.currentTime);
        high = !high;
      }
    }, 400);
    
    osc.start();
    oscillatorRef.current = osc;
  };

  const stopSiren = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!dashboardActive) return;

    const socket = io('http://localhost:3000');
    
    socket.on('new_emergency', (data) => {
      setIncomingAlert(data);
      setShowModal(true);
      playSiren();
    });

    return () => {
      socket.disconnect();
      stopSiren();
    };
  }, [dashboardActive]);

  const handleAcknowledge = () => {
    stopSiren();
    setShowModal(false);
    setActiveIncident(incomingAlert);
    setIncomingAlert(null);
  };

  const handlePrintFIR = () => {
    window.print();
  };

  const handleCommandAction = (actionName) => {
    alert(`COMMAND SENT: ${actionName}`);
  };

  if (!dashboardActive) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <ShieldAlert className="w-20 h-20 text-blue-500 mb-6 animate-bounce" />
        <h1 className="text-3xl font-bold mb-2 tracking-widest text-center">PCR COMMAND CENTER</h1>
        <p className="text-slate-400 mb-8 text-center max-w-md">Initialize the dashboard to connect to the emergency network and enable audio alarms.</p>
        <button 
          onClick={() => setDashboardActive(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg shadow-blue-900/50 flex items-center gap-2 border border-blue-400"
        >
          <Radio className="w-6 h-6 animate-pulse" />
          INITIALIZE DASHBOARD
        </button>
        <Link to="/" className="mt-8 text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to Citizen Portal
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-300 flex flex-col font-mono overflow-hidden">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-3 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-900/50 p-2 rounded border border-blue-700">
            <ShieldAlert className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight tracking-wider">TEAM CALCULUS</h1>
            <p className="text-xs text-blue-400">POLICE CONTROL ROOM &bull; TERMINAL 04</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            NETWORK ONLINE
          </div>
          <div className="text-right">
            <div className="text-white font-bold">{format(new Date(), 'HH:mm:ss')}</div>
            <div className="text-xs text-slate-500">{format(new Date(), 'dd MMM yyyy')}</div>
          </div>
          <div className="flex gap-2">
            <Link to="/surveillance" className="text-xs bg-orange-900 hover:bg-orange-800 border border-orange-700 px-3 py-1.5 rounded transition-colors text-white font-bold">
              AI SURVEILLANCE
            </Link>
            <Link to="/" className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded transition-colors text-white">
              EXIT PCR
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-1 p-1 overflow-hidden">
        
        {/* Map Section (Spans 2 columns on large screens) */}
        <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded relative overflow-hidden flex flex-col min-h-[400px]">
           <div className="bg-slate-800/80 backdrop-blur text-xs font-bold px-3 py-2 border-b border-slate-700 flex justify-between items-center absolute top-0 w-full z-[1000] text-slate-200">
             <span>TACTICAL MAP</span>
             <span>SECTOR: RAJIV CHOWK</span>
           </div>
           <div className="flex-1">
             <IncidentMap activeIncident={activeIncident} />
           </div>
        </section>

        {/* Dossier & Actions Panel */}
        <section className="bg-slate-900 border border-slate-800 rounded flex flex-col overflow-hidden">
           <div className="bg-slate-800 text-xs font-bold px-3 py-2 border-b border-slate-700 text-white flex justify-between items-center shrink-0">
             <span>INCIDENT DOSSIER</span>
             {activeIncident && <span className="bg-red-900/50 text-red-400 px-2 py-0.5 rounded border border-red-800/50">ACTIVE</span>}
           </div>

           <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
             {!activeIncident ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3">
                 <Radio className="w-12 h-12 opacity-20" />
                 <p className="text-sm">STANDING BY FOR INCIDENTS...</p>
               </div>
             ) : (
               <div className="space-y-6">
                 {/* ID Photo / Watermark */}
                 {activeIncident.watermarkedUrl && (
                   <div className="border border-slate-700 p-2 rounded bg-slate-950">
                     <p className="text-[10px] text-slate-500 mb-2 font-bold uppercase">ATTACHED DOCUMENT (VERIFIED)</p>
                     <img src={activeIncident.watermarkedUrl} alt="ID Document" className="w-full h-auto rounded opacity-90" />
                   </div>
                 )}

                 {/* Profile Data */}
                 <div className="space-y-3">
                   <div>
                     <p className="text-[10px] text-slate-500 font-bold uppercase">SUBJECT NAME</p>
                     <p className="text-lg text-white font-bold">{activeIncident.profileData.fullName || 'UNKNOWN'}</p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <p className="text-[10px] text-slate-500 font-bold uppercase">AGE</p>
                       <p className="text-white">{activeIncident.profileData.age || 'N/A'}</p>
                     </div>
                     <div>
                       <p className="text-[10px] text-slate-500 font-bold uppercase">GENDER</p>
                       <p className="text-white">{activeIncident.profileData.gender || 'N/A'}</p>
                     </div>
                     <div className="col-span-2">
                       <p className="text-[10px] text-slate-500 font-bold uppercase">CONTACT</p>
                       <p className="text-white">{activeIncident.profileData.contact || 'N/A'}</p>
                     </div>
                     <div className="col-span-2">
                       <p className="text-[10px] text-slate-500 font-bold uppercase">LAST SEEN LOCATION</p>
                       <p className="text-white text-sm bg-slate-800 p-2 rounded border border-slate-700">{activeIncident.profileData.lastSeenLocation || 'N/A'}</p>
                     </div>
                     <div className="col-span-2">
                       <p className="text-[10px] text-slate-500 font-bold uppercase">PHYSICAL DESCRIPTION</p>
                       <p className="text-white text-sm">
                         Clothing: {activeIncident.profileData.clothingColor || 'N/A'} <br/>
                         Height: {activeIncident.profileData.height || 'N/A'}
                       </p>
                     </div>
                   </div>
                 </div>

                 <hr className="border-slate-800" />

                 {/* Command Actions */}
                 <div className="space-y-2">
                   <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">COMMAND PROTOCOLS</p>
                   
                   <button onClick={handlePrintFIR} className="w-full flex items-center justify-between p-3 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm text-white text-left">
                     <span className="flex items-center gap-2"><Printer className="w-4 h-4 text-blue-400" /> GENERATE DIGITAL FIR</span>
                   </button>
                   
                   <button onClick={() => handleCommandAction('BROADCAST_PCR')} className="w-full flex items-center justify-between p-3 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm text-white text-left">
                     <span className="flex items-center gap-2"><PhoneCall className="w-4 h-4 text-orange-400" /> BROADCAST TO PCR VANS</span>
                   </button>

                   <button onClick={() => handleCommandAction('PA_ANNOUNCEMENT')} className="w-full flex items-center justify-between p-3 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm text-white text-left">
                     <span className="flex items-center gap-2"><Radio className="w-4 h-4 text-yellow-400" /> TRIGGER STATION PA</span>
                   </button>

                   <button onClick={() => handleCommandAction('LOCK_AFC_GATES')} className="w-full flex items-center justify-between p-3 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-900 transition-colors text-sm text-red-200 text-left group">
                     <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-red-500 group-hover:animate-pulse" /> LOCK METRO AFC GATES</span>
                   </button>
                 </div>

               </div>
             )}
           </div>
        </section>

      </main>

      {/* EMERGENCY INCOMING MODAL */}
      {showModal && incomingAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-4 border-red-600 rounded-xl max-w-2xl w-full shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-[pulse_1s_infinite] overflow-hidden flex flex-col">
            
            <div className="bg-red-600 text-white p-6 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="w-16 h-16 mb-4 animate-bounce" />
              <h2 className="text-3xl font-black tracking-widest">EMERGENCY ALERT</h2>
              <p className="text-red-100 font-bold tracking-widest mt-2">{incomingAlert.tag}</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <p className="text-slate-400 uppercase text-xs font-bold tracking-wider">New Missing Person Case Received at</p>
                <p className="text-2xl text-white font-bold">{format(new Date(incomingAlert.timestamp), 'HH:mm:ss')}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded text-center">
                 <p className="text-slate-500 uppercase text-[10px] font-bold mb-1">Last Seen Location</p>
                 <p className="text-white text-lg">{incomingAlert.profileData.lastSeenLocation || 'Location not specified'}</p>
              </div>

              <button 
                onClick={handleAcknowledge}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-black text-xl py-6 rounded-lg transition-all shadow-[0_0_20px_rgba(22,163,74,0.4)] flex items-center justify-center gap-3 border border-green-400"
              >
                <CheckCircle className="w-8 h-8" />
                ACKNOWLEDGE & ACCEPT
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Print Styles for Digital FIR */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          section:nth-child(2), section:nth-child(2) * {
            visibility: visible;
          }
          section:nth-child(2) {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            border: none;
            background: white;
            color: black;
          }
          .bg-slate-900, .bg-slate-800, .bg-slate-950 {
            background-color: white !important;
            color: black !important;
          }
          button {
            display: none !important;
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
      `}</style>

    </div>
  );
}
