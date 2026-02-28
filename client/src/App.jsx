import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './styles.css';
import api from './services/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard/index';
import BranchOverview from './pages/BranchOverview/index';
import Upload from './pages/Upload';
import RepairQuery from './pages/RepairQuery';
import TechQuery from './pages/TechQuery';
import PartsQuery from './pages/PartsQuery';
import TargetSetup from './pages/Admin/TargetSetup';
import AdminPanel from './pages/Admin/index';

// Auth Context
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.setToken(token);
      api.getMe()
        .then(u => setUser(u))
        .catch(() => { api.setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // [FIX] 監聽 api.js 發出的 auth:unauthorized 事件，走 React Router 跳轉
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      api.setToken(null);
      navigate('/login');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate]);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    api.setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/branch-overview" element={<BranchOverview />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/repair" element={<RepairQuery />} />
          <Route path="/tech" element={<TechQuery />} />
          <Route path="/parts" element={<PartsQuery />} />
          <Route path="/targets" element={<TargetSetup />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
