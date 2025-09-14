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
import CommitteeManagementPage from './pages/CommitteeManagementPage.jsx';
import BallotAdminQRPage from './pages/BallotAdminQRPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

function App() {
  const [branding, setBranding] = useState({ bg_color: '', nav_color: '', text_color: '', fqdn: '', logo_path: '', icon_path: '' });

  useEffect(() => {
    fetch('/api/branding').then(res => res.json()).then(data => {
      if (data) setBranding(data);
    });
  }, []);

  useEffect(() => {
    if (branding.bg_color) document.body.style.background = branding.bg_color;
    if (branding.text_color) document.body.style.color = branding.text_color;

    // Dynamically set favicon to uploaded icon
    if (branding.icon_path) {
      let favicon = document.querySelector("link[rel='icon']");
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = `${branding.icon_path}`;
    }
  }, [branding.bg_color, branding.text_color, branding.icon_path]);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      background: branding.bg_color || '',
      overflowX: 'hidden',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        border: '8px solid #606060',
        borderRadius: '18px',
        margin: '0 auto',
        marginTop: '0',
        background: branding.bg_color || '',
        boxSizing: 'border-box',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Router>
          <div style={{width:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start'}}>
            {branding.logo_path && (
              <div style={{textAlign:'center', marginTop:'8px', marginBottom:'0'}}>
                <img src={`${branding.logo_path}`} alt="Logo" style={{maxHeight:'80px', marginBottom:'0'}} />
              </div>
            )}
            <div style={{width:'100%', marginTop:'0'}}>
              <NavBar branding={branding} />
            </div>
          </div>
          <div style={{flex:1, width:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start'}}>
            <Routes>
              <Route path="/" element={<LoginPage branding={branding} />} />
              <Route path="/register" element={<RegisterPage branding={branding} />} />
              <Route path="/ballots" element={<BallotListPage branding={branding} />} />
              <Route path="/ballots/:id" element={<BallotDetailPage branding={branding} />} />
              <Route path="/admin" element={<AdminDashboard branding={branding} />} />
              <Route path="/admin/create-ballot" element={<CreateBallotPage branding={branding} />} />
              <Route path="/admin/edit-ballot/:id" element={<EditBallotPage branding={branding} />} />
              <Route path="/admin/members" element={<MemberManagementPage branding={branding} />} />
              <Route path="/admin/branding" element={<BrandingPage branding={branding} />} />
              <Route path="/admin/committees" element={<CommitteeManagementPage branding={branding} />} />
              <Route path="/admin/ballot/:id/qr" element={<BallotAdminQRPage />} />
              <Route path="/change-password" element={<ChangePasswordPage branding={branding} />} />
            </Routes>
          </div>
        </Router>
      </div>
    </div>
  );
}

export default App;
