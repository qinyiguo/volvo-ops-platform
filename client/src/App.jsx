import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard/index';
import BranchOverview from './pages/BranchOverview/index';
import Upload from './pages/Upload';
import RepairQuery from './pages/RepairQuery';
import TechQuery from './pages/TechQuery';
import PartsQuery from './pages/PartsQuery';
import TargetSetup from './pages/Admin/TargetSetup';
import AdminPanel from './pages/Admin/index';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/branch-overview" element={<BranchOverview />} />
        <Route path="/repair" element={<RepairQuery />} />
        <Route path="/tech" element={<TechQuery />} />
        <Route path="/parts" element={<PartsQuery />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/targets" element={<TargetSetup />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Route>
    </Routes>
  );
}

export default App;
