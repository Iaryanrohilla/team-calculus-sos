import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CitizenPortal from './components/CitizenPortal';
import PCRDashboard from './components/PCRDashboard';
import SurveillanceDashboard from './components/SurveillanceDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CitizenPortal />} />
        <Route path="/pcr" element={<PCRDashboard />} />
        <Route path="/surveillance" element={<SurveillanceDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
