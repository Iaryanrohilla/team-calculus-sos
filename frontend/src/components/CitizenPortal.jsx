import React from 'react';
import IntakeForm from './IntakeForm';
import EmergencyFeed from './EmergencyFeed';
import { ShieldAlert, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CitizenPortal() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-slate-900 text-white py-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">Team Calculus</h1>
              <p className="text-xs text-slate-300 font-medium tracking-wider">Emergency Network &bull; Incident Response Platform</p>
            </div>
          </div>
          <Link to="/pcr" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <LinkIcon className="w-4 h-4" /> PCR Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 xl:col-span-8">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Citizen Intake Form
              </h2>
              <p className="text-sm text-slate-300 mt-1">Submit a missing person report. Information will be broadcasted to emergency responders.</p>
            </div>
            <div className="p-6">
              <IntakeForm />
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <section className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden flex-1 flex flex-col">
            <div className="bg-red-600 p-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Active Emergencies
              </h2>
            </div>
            <div className="p-4 flex-1 bg-slate-900">
              <EmergencyFeed />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
