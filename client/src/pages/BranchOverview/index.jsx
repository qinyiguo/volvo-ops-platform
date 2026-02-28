import React, { useState, useMemo } from 'react';
import SASummary from './SASummary';
import SAEngine from './SAEngine';
import SABodywork from './SABodywork';
import TechSummary from './TechSummary';
import GROSales from './GROSales';
import BeautySummary from './BeautySummary';

const TABS = [
  { key: 'sa_summary', label: 'SA 綜合統計', icon: '📋' },
  { key: 'sa_engine', label: '接待業績(引擎)', icon: '🔧' },
  { key: 'sa_bodywork', label: '接待業績(鈑烤)', icon: '🎨' },
  { key: 'tech_summary', label: '技師統計', icon: '👨‍🔧' },
  { key: 'gro_sales', label: 'GRO 銷售', icon: '🛍️' },
  { key: 'beauty', label: '美容統計', icon: '✨' },
];

// [FIX] currentPeriod 移入元件內，避免模組載入時計算一次就不再更新
export default function Dashboard() {
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [tab, setTab] = useState('sa_summary');
  const [period, setPeriod] = useState(currentPeriod);
  const [branch, setBranch] = useState('AMA');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📊 即時戰報</div>
          <div className="page-subtitle">各維度即時績效統計</div>
        </div>
      </div>

      <div className="filter-bar">
        <label>期間</label>
        <input type="month" value={`${period.slice(0,4)}-${period.slice(4)}`}
          onChange={e => setPeriod(e.target.value.replace('-', ''))}
          style={{ colorScheme: 'dark' }} />
        <label>據點</label>
        <select value={branch} onChange={e => setBranch(e.target.value)}>
          <option value="AMA">AMA</option>
          <option value="AMC">AMC</option>
          <option value="AMD">AMD</option>
        </select>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'sa_summary' && <SASummary period={period} branch={branch} />}
      {tab === 'sa_engine' && <SAEngine period={period} branch={branch} />}
      {tab === 'sa_bodywork' && <SABodywork period={period} branch={branch} />}
      {tab === 'tech_summary' && <TechSummary period={period} branch={branch} />}
      {tab === 'gro_sales' && <GROSales period={period} branch={branch} />}
      {tab === 'beauty' && <BeautySummary period={period} branch={branch} />}
    </div>
  );
}
