import React, { useState, useMemo } from 'react';
import api from '../services/api';

export default function TechQuery() {
  // [FIX] currentPeriod 移入元件內
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [period, setPeriod] = useState(currentPeriod);
  const [branch, setBranch] = useState('');
  const [data, setData] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('ranking');

  const search = async (p = 1) => {
    setLoading(true);
    setPage(p);
    try {
      if (tab === 'ranking') {
        const res = await api.getTechRanking(period, branch);
        setRanking(res);
      } else {
        const res = await api.getTechList({ period, branch, page: p, limit: 50 });
        setData(res);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">👨‍🔧 技師績效查詢</div>
          <div className="page-subtitle">技師工資/台數/美容統計</div>
        </div>
        <button className="btn btn-secondary" onClick={() => api.exportExcel('tech', period, branch)}>📥 匯出</button>
      </div>

      <div className="filter-bar">
        <label>期間</label>
        <input type="month" value={`${period.slice(0,4)}-${period.slice(4)}`}
          onChange={e => setPeriod(e.target.value.replace('-', ''))} style={{ colorScheme: 'dark' }} />
        <label>據點</label>
        <select value={branch} onChange={e => setBranch(e.target.value)}>
          <option value="">全部</option>
          <option value="AMA">AMA</option><option value="AMC">AMC</option><option value="AMD">AMD</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => search(1)}>查詢</button>
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'ranking' ? ' active' : ''}`} onClick={() => setTab('ranking')}>排名統計</button>
        <button className={`tab${tab === 'detail' ? ' active' : ''}`} onClick={() => setTab('detail')}>明細</button>
      </div>

      {loading && <div className="loading"><div className="spinner" /></div>}

      {!loading && tab === 'ranking' && ranking && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>技師</th><th className="num">台數</th><th className="num">標準工時</th>
                  <th className="num">總工資</th><th className="num">美容工資</th><th className="num">淨工資</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.tech_name_clean}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{r.tech_name_clean}</td>
                    <td className="num">{parseInt(r.car_count)}</td>
                    <td className="num">{parseFloat(r.total_hours).toFixed(1)}</td>
                    <td className="num fw-bold">{fmt(r.total_wage)}</td>
                    <td className="num text-yellow">{fmt(r.beauty_wage)}</td>
                    <td className="num text-green">{fmt(parseFloat(r.total_wage) - parseFloat(r.beauty_wage))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'detail' && data && (
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>共 {data.total} 筆</div>
          <div className="table-wrap" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>據點</th><th>出廠日</th><th>技師</th><th>工單號</th><th>工時代碼</th>
                  <th>作業內容</th><th className="num">標準工時</th><th className="num">工資</th>
                  <th>帳類</th><th>美容</th><th className="num">台數</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(r => (
                  <tr key={r.id}>
                    <td>{r.branch}</td>
                    <td style={{ fontSize: 12 }}>{r.dispatch_date?.slice(0, 10)}</td>
                    <td style={{ fontWeight: 600 }}>{r.tech_name_clean}</td>
                    <td style={{ fontSize: 12 }}>{r.work_order}</td>
                    <td style={{ fontSize: 12 }}>{r.work_code}</td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.task_content}</td>
                    <td className="num">{parseFloat(r.standard_hours).toFixed(1)}</td>
                    <td className="num">{fmt(r.wage)}</td>
                    <td>{r.account_type}</td>
                    <td className="text-center">{r.is_beauty ? '✅' : ''}</td>
                    <td className="num">{r.car_count_flag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => search(page - 1)}>上一頁</button>
            <span>第 {data.page} / {Math.ceil(data.total / data.limit)} 頁</span>
            <button disabled={page >= Math.ceil(data.total / data.limit)} onClick={() => search(page + 1)}>下一頁</button>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(val) { return parseFloat(val || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 }); }
