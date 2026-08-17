import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { io } from 'socket.io-client';
import { Video, ShieldAlert, Target, Image as ImageIcon, AlertOctagon, CheckCircle2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function SurveillanceDashboard() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [referenceDescriptor, setReferenceDescriptor] = useState(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState(null);
  const [matchStatus, setMatchStatus] = useState('SCANNING'); // SCANNING, MATCH_FOUND
  const [gateStatus, setGateStatus] = useState('GREEN'); // GREEN, RED

  const videoRef = useRef();
  const canvasRef = useRef();
  const fileInputRef = useRef();
  const socketRef = useRef();
  const detectionIntervalRef = useRef();

  // Load FaceAPI Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setIsModelLoaded(true);
      } catch (err) {
        console.error("Error loading models", err);
      }
    };
    loadModels();
  }, []);

  // Setup Socket
  useEffect(() => {
    socketRef.current = io(BACKEND_URL);
    
    socketRef.current.on('MATCH_CONFIRMED', (data) => {
      if (data.cameraId !== 'CAM-METRO-03') return; // In case we want to filter
      
      setGateStatus('RED');
      // Play distress chime
      playChime();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, []);

  const playChime = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  // Start Webcam
  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Error accessing webcam", err));
  };

  // Handle Target Image Upload
  const handleTargetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imgUrl = URL.createObjectURL(file);
    setReferenceImageUrl(imgUrl);

    // Extract face descriptor
    const imgElement = document.createElement('img');
    imgElement.src = imgUrl;
    imgElement.onload = async () => {
      const detection = await faceapi.detectSingleFace(imgElement).withFaceLandmarks().withFaceDescriptor();
      if (detection) {
        setReferenceDescriptor(detection.descriptor);
      } else {
        alert("No face detected in the reference image. Please try another photo.");
        setReferenceDescriptor(null);
      }
    };
  };

  // Handle Video Playing & Detection Loop
  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current.paused || videoRef.current.ended || !isModelLoaded) return;

      const detections = await faceapi.detectAllFaces(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (referenceDescriptor) {
        // Create FaceMatcher with 0.45 threshold (approx >85% confidence in Euclidean distance)
        const faceMatcher = new faceapi.FaceMatcher(referenceDescriptor, 0.45);

        resizedDetections.forEach(detection => {
          const match = faceMatcher.findBestMatch(detection.descriptor);
          
          const box = detection.detection.box;
          const isMatch = match.label !== 'unknown';

          // Draw Bounding Box
          ctx.beginPath();
          ctx.lineWidth = 4;
          ctx.strokeStyle = isMatch ? '#ef4444' : '#3b82f6'; // Red for match, Blue for unknown
          ctx.rect(box.x, box.y, box.width, box.height);
          ctx.stroke();

          // Draw Label
          ctx.fillStyle = isMatch ? '#ef4444' : '#3b82f6';
          ctx.fillRect(box.x, box.y - 30, box.width, 30);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px monospace';
          ctx.fontWeight = 'bold';
          ctx.fillText(
            isMatch ? `MATCH DETECTED (>85%)` : `UNKNOWN (Dist: ${match.distance.toFixed(2)})`,
            box.x + 5,
            box.y - 10
          );

          if (isMatch && matchStatus !== 'MATCH_FOUND') {
            triggerMatch();
          }
        });
      } else {
        // Just draw generic boxes if no reference
        faceapi.draw.drawDetections(canvas, resizedDetections);
      }

    }, 200); // 5 FPS
  };

  const triggerMatch = () => {
    setMatchStatus('MATCH_FOUND');
    if (socketRef.current) {
      socketRef.current.emit('MATCH_CONFIRMED', {
        cameraId: 'CAM-METRO-03',
        timestamp: new Date().toISOString(),
        location: 'Rajiv Chowk Metro Gate 3',
        coords: [28.6329, 77.2185]
      });
    }
    
    // Cooldown reset for demo purposes
    setTimeout(() => {
      setMatchStatus('SCANNING');
      setGateStatus('GREEN');
    }, 10000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 p-3 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-900/50 p-2 rounded border border-orange-700">
            <Target className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wider text-orange-400">AI SURVEILLANCE MODULE</h1>
            <p className="text-xs text-slate-400">FACIAL RECOGNITION & AFC GATE INTEGRATION</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 text-xs font-bold ${isModelLoaded ? 'text-green-400' : 'text-yellow-400'}`}>
            {isModelLoaded ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 animate-spin" />}
            {isModelLoaded ? 'AI CORE ONLINE' : 'LOADING NEURAL NETS...'}
          </div>
          <Link to="/" className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded transition-colors text-white">
            BACK TO PCR
          </Link>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        
        {/* Sidebar - Controls & Target */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-400 border-b border-slate-700 pb-2">TARGET DOSSIER</h2>
            
            <div 
              className="border-2 border-dashed border-slate-700 rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors relative overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {referenceImageUrl ? (
                <img src={referenceImageUrl} alt="Target" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-xs text-slate-400 text-center px-4">Click to load Target Reference Photo</p>
                </>
              )}
              <input type="file" ref={fileInputRef} onChange={handleTargetUpload} className="hidden" accept="image/*" />
            </div>

            <div className="bg-slate-950 p-2 rounded border border-slate-800 text-xs text-slate-400">
              <p>STATUS: {referenceDescriptor ? <span className="text-green-400 font-bold">FEATURES EXTRACTED</span> : <span className="text-red-400 font-bold">AWAITING TARGET</span>}</p>
            </div>
          </div>

          {/* Turnstile Widget */}
          <div className={`flex-1 rounded border-2 p-4 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${
            gateStatus === 'RED' 
              ? 'bg-red-950 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]' 
              : 'bg-slate-900 border-slate-700'
          }`}>
            <h2 className="text-sm font-bold text-slate-400 absolute top-4 left-4">AFC TURNSTILE GATE 03</h2>
            
            <div className="text-center mt-6">
              {gateStatus === 'GREEN' ? (
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center bg-green-500/10 mb-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-black tracking-widest text-green-500">OPEN</h3>
                  <p className="text-green-400/60 text-sm mt-1">NORMAL OPERATION</p>
                </div>
              ) : (
                <div className="flex flex-col items-center animate-pulse">
                  <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-500/20 mb-4 shadow-[0_0_20px_rgba(220,38,38,0.8)]">
                    <AlertOctagon className="w-12 h-12 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-black tracking-widest text-red-500">LOCKED</h3>
                  <p className="text-red-400/80 text-sm mt-1">EMERGENCY PROTOCOL ACTIVE</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Main Video Feed */}
        <div className="lg:col-span-9 bg-black rounded border border-slate-800 relative overflow-hidden flex flex-col">
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
            <span className="bg-black/50 text-white px-2 py-1 rounded text-xs font-bold uppercase backdrop-blur border border-white/10">
              CAM-METRO-03 (LIVE)
            </span>
          </div>

          <div className="flex-1 relative flex items-center justify-center">
            {!isModelLoaded ? (
              <div className="text-slate-500 flex flex-col items-center">
                <RefreshCw className="w-12 h-12 animate-spin mb-4 opacity-50" />
                <p>INITIALIZING AI MODELS...</p>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  onPlay={handleVideoPlay}
                  className="max-h-full max-w-full object-contain"
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                />
                {!videoRef.current?.srcObject && (
                  <button 
                    onClick={startVideo}
                    className="absolute z-30 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Video className="w-5 h-5" />
                    ENABLE CAMERA STREAM
                  </button>
                )}
              </>
            )}
          </div>
          
          {/* Match Alert Overlay */}
          {matchStatus === 'MATCH_FOUND' && (
            <div className="absolute bottom-0 w-full bg-red-600/90 backdrop-blur text-white p-4 border-t-4 border-red-500 flex items-center justify-between z-40">
              <div className="flex items-center gap-4">
                <ShieldAlert className="w-10 h-10 animate-bounce" />
                <div>
                  <h3 className="font-black text-xl tracking-widest">TARGET CONFIRMED</h3>
                  <p className="text-sm font-bold opacity-80">CONFIDENCE &gt; 85% &bull; EXECUTING LOCKDOWN</p>
                </div>
              </div>
              <div className="text-right font-mono text-sm">
                <p>{format(new Date(), 'HH:mm:ss')}</p>
                <p className="opacity-70">Rajiv Chowk Metro Gate 3</p>
              </div>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
