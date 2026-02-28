import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../App';

// 檢視者看到的導覽（免登入）
const viewerNav = [
  { section: '戰報' },
  { path: '/dashboard', icon: '📊', label: '即時戰報' },
  { path: '/branch-overview', icon: '🏭', label: '四廠整合' },
  { section: '查詢' },
  { path: '/repair', icon: '🔍', label: '維修收入查詢' },
  { path: '/tech', icon: '👨‍🔧', label: '技師績效查詢' },
  { path: '/parts', icon: '🔩', label: '零件銷售查詢' },
];

// 管理者額外看到的導覽（需登入）
const adminNav = [
  { section: '戰報' },
  { path: '/dashboard', icon: '📊', label: '即時戰報' },
  { path: '/branch-overview', icon: '🏭', label: '四廠整合' },
  { section: '查詢' },
  { path: '/repair', icon: '🔍', label: '維修收入查詢' },
  { path: '/tech', icon: '👨‍🔧', label: '技師績效查詢' },
  { path: '/parts', icon: '🔩', label: '零件銷售查詢' },
  { section: '管理' },
  { path: '/upload', icon: '📤', label: '資料上傳' },
  { path: '/targets', icon: '🎯', label: '目標設定' },
  { path: '/admin', icon: '⚙️', label: '後台管理' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const isAdmin = !!user; // 有登入就是管理者
  const navItems = isAdmin ? adminNav : viewerNav;

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <h2>VOLVO 營運平台</h2>
          <span>售後服務管理系統</span>
        </div>

        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="sidebar-section">{item.section}</div>;
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}

        {/* 管理者：底部顯示身份 + 登出 */}
        {isAdmin && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              {user?.display_name}（管理者）
            </div>
            <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={logout}>
              登出
            </button>
          </div>
        )}
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
