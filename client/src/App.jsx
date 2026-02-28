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

  // 監聽 auth:unauthorized 事件
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
    navigate('/dashboard');
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Routes>
        {/* 登入頁：已登入則跳管理首頁 */}
        <Route path="/login" element={user ? <Navigate to="/upload" /> : <Login />} />

        {/* 所有頁面共用 Layout，由 Layout 根據登入狀態決定 sidebar 內容 */}
        <Route element={<Layout />}>
          {/* ===== 公開檢視（免登入）===== */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/branch-overview" element={<BranchOverview />} />
          <Route path="/repair" element={<RepairQuery />} />
          <Route path="/tech" element={<TechQuery />} />
          <Route path="/parts" element={<PartsQuery />} />

          {/* ===== 管理功能（需登入）===== */}
          <Route path="/upload" element={user ? <Upload /> : <Navigate to="/login" />} />
          <Route path="/targets" element={user ? <TargetSetup /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user ? <AdminPanel /> : <Navigate to="/login" />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
