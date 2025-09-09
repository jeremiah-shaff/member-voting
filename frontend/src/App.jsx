import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import BallotListPage from './pages/BallotListPage.jsx';
import BallotDetailPage from './pages/BallotDetailPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import CreateBallotPage from './pages/CreateBallotPage.jsx';

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
