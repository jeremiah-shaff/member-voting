import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BallotListPage from './pages/BallotListPage';
import BallotDetailPage from './pages/BallotDetailPage';
import AdminDashboard from './pages/AdminDashboard';
import CreateBallotPage from './pages/CreateBallotPage';
import NavBar from './components/NavBar';

function App() {
  return (
    <Router>
  <NavBar />
      <Routes>
  <Route path="/" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/ballots" element={<BallotListPage />} />
  <Route path="/ballots/:id" element={<BallotDetailPage />} />
  <Route path="/admin" element={<AdminDashboard />} />
  <Route path="/admin/create-ballot" element={<CreateBallotPage />} />
      </Routes>
    </Router>
  );
}

export default App;
