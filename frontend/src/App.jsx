import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import BallotListPage from './pages/BallotListPage.jsx';
import BallotDetailPage from './pages/BallotDetailPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import CreateBallotPage from './pages/CreateBallotPage.jsx';
import EditBallotPage from './pages/EditBallotPage.jsx';
import MemberManagementPage from './pages/MemberManagementPage.jsx';
import BrandingPage from './pages/BrandingPage.jsx';

function App() {
  const [branding, setBranding] = useState({ bg_color: '', nav_color: '', text_color: '', fqdn: '', logo_path: '', icon_path: '' });

  useEffect(() => {
    fetch('http://localhost:4000/api/branding').then(res => res.json()).then(data => {
      if (data) setBranding(data);
    });
  }, []);

  useEffect(() => {
    if (branding.bg_color) document.body.style.background = branding.bg_color;
    if (branding.text_color) document.body.style.color = branding.text_color;
  }, [branding.bg_color, branding.text_color]);

  return (
    <Router>
      <NavBar branding={branding} />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/ballots" element={<BallotListPage />} />
        <Route path="/ballots/:id" element={<BallotDetailPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/create-ballot" element={<CreateBallotPage />} />
        <Route path="/admin/edit-ballot/:id" element={<EditBallotPage />} />
        <Route path="/admin/members" element={<MemberManagementPage />} />
        <Route path="/admin/branding" element={<BrandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
