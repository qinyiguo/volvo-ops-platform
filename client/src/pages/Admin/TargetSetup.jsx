import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const METRIC_OPTIONS = [
  { key: 'car_count', name: '出廠台數' },
  { key: 'total_revenue', name: '全部營收' },
  { key: 'effective_revenue', name: '389營收' },
  { key: 'engine_revenue', name: '引電營收' },
  { key: 'bodywork_revenue', name: '鈑烤收入' },
  { key: 'maintenance_count', name: '保養台數' },
  { key: 'parts_cost', name: '零件成本' },
  { key: 'accessories_cost', name: '配件成本' },
  { key: 'boutique', name: '精品銷售' },
  { key: 'beauty', name: '美容銷售' },
  { key: 'warranty_ext', name: '延保' },
];

export default function TargetSetup() {
  const [tab, setTab] = useState('annual');
  const [year, setYear] = useState(new Date().getFullYear());
  const [branch, setBranch] = useState('AMA');
  const [targets, setTargets] = useState([]);
  const [weights, setWeights] = useState([]);
  const [staffWeights, setStaffWeights] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (tab === 'annual') loadTargets();
    if (tab === 'monthly') loadWeights();
    if (tab === 'staff') loadStaffWeights();
  }, [tab, year, branch]);

  const loadTargets = async () => {
    try {
      const res = await api.getAnnualTargets(year, branch);
      setTargets(res);
    } catch (err) { console.error(err); }
  };

  const loadWeights = async () => {
    try {
      const res = await api.getMonthlyWeights(year, branch);
      // 補齊 12 個月
      const full = Array.from({ length: 12 }, (_, i) => {
        const existing = res.find(w => w.month === i + 1);
        return { year, branch, month: i + 1, weight: existing?.weight || 1.000 };
      });
      setWeights(full);
    } catch (err) { console.error(err); }
  };

  const loadStaffWeights = async () => {
    try {
      const res = await api.getStaffWeights(year, branch);
      setStaffWeights(res);
    } catch (err) { console.error(err); }
  };

  const saveWeights = async () => {
    setLoading(true);
    try {
      await api.saveMonthlyWeights(weights);
      setMsg('月權重已儲存');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg('儲存失敗: ' + err.message); }
    finally { setLoading(false); }
  };

  const loadPreview = async (month) => {
    try {
      const res = await api.previewTargets(year, month, branch);
      setPreview(res);
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🎯 目標設定</div>
          <div className="page-subtitle">年度目標、月權重、人員權重管理</div>
        </div>
      </div>

      <div className="filter-bar">
        <label>年度</label>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <label>據點</label>
        <select value={branch} onChange={e => setBranch(e.target.value)}>
          <option value="AMA">AMA</option><option value="AMC">AMC</option><option value="AMD">AMD</option>
        </select>
        {msg && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>{msg}</span>}
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'annual' ? ' active' : ''}`} onClick={() => setTab('annual')}>年度目標</button>
        <button className={`tab${tab === 'monthly' ? ' active' : ''}`} onClick={() => setTab('monthly')}>月權重</button>
        <button className={`tab${tab === 'staff' ? ' active' : ''}`} onClick={() => setTab('staff')}>人員權重</button>
        <button className={`tab${tab === 'preview' ? ' active' : ''}`} onClick={() => setTab('preview')}>預覽分配</button>
      </div>

      {/* 年度目標 */}
      {tab === 'annual' && (
        <div className="card">
          <div className="card-title">📊 {branch} {year} 年度目標</div>
          {targets.length === 0 ? (
            <div className="empty">尚未設定目標，請從 Excel 匯入或手動新增</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>指標</th>
                    {Array.from({ length: 12 }, (_, i) => <th key={i} className="num">{i + 1}月</th>)}
                  </tr>
                </thead>
                <tbody>
                  {METRIC_OPTIONS.map(m => {
                    const rowData = targets.filter(t => t.metric_key === m.key);
                    return (
                      <tr key={m.key}>
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const val = rowData.find(t => t.month === i + 1)?.target_value;
                          return <td key={i} className="num">{val ? parseFloat(val).toLocaleString() : '-'}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 月權重 */}
      {tab === 'monthly' && (
        <div className="card">
          <div className="card-title">📅 月權重（12 個月合計應為 12.0）</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            {weights.map((w, i) => (
              <div key={i}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{w.month} 月</label>
                <input className="form-input" type="number" step="0.01" value={w.weight}
                  onChange={e => {
                    const newW = [...weights];
                    newW[i] = { ...newW[i], weight: parseFloat(e.target.value) || 0 };
                    setWeights(newW);
                  }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 13 }}>
              合計: <strong style={{ color: Math.abs(weights.reduce((s, w) => s + parseFloat(w.weight || 0), 0) - 12) < 0.01 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {weights.reduce((s, w) => s + parseFloat(w.weight || 0), 0).toFixed(3)}
              </strong>
            </span>
            <button className="btn btn-primary" onClick={saveWeights} disabled={loading}>
              {loading ? '儲存中...' : '儲存月權重'}
            </button>
          </div>
        </div>
      )}

      {/* 人員權重 */}
      {tab === 'staff' && (
        <div className="card">
          <div className="card-title">👤 人員權重 — {branch}</div>
          {staffWeights.length === 0 ? (
            <div className="empty">尚未設定人員權重</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>姓名</th><th>類型</th><th className="num">權重</th><th>月份</th></tr>
                </thead>
                <tbody>
                  {staffWeights.map(sw => (
                    <tr key={sw.id}>
                      <td style={{ fontWeight: 600 }}>{sw.staff_name}</td>
                      <td><span className="badge badge-blue">{sw.staff_type}</span></td>
                      <td className="num">{parseFloat(sw.weight).toFixed(2)}</td>
                      <td className="text-muted">{sw.period_month ? `${sw.period_month}月` : '全年'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 預覽分配結果 */}
      {tab === 'preview' && (
        <div className="card">
          <div className="card-title">🔍 預覽個人目標分配</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <select onChange={e => loadPreview(parseInt(e.target.value))} defaultValue="">
              <option value="" disabled>選擇月份</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1} 月</option>)}
            </select>
          </div>
          {preview && preview.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>姓名</th><th>類型</th><th>指標</th><th className="num">據點目標</th><th className="num">權重</th><th className="num">個人目標</th></tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{p.staff_name}</td>
                      <td><span className="badge badge-blue">{p.staff_type}</span></td>
                      <td>{p.metric_name}</td>
                      <td className="num">{parseFloat(p.branch_target).toLocaleString()}</td>
                      <td className="num">{parseFloat(p.staff_weight).toFixed(2)}</td>
                      <td className="num fw-bold text-green">{parseFloat(p.individual_target).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted">請選擇月份查看分配結果</div>
          )}
        </div>
      )}
    </div>
  );
}
