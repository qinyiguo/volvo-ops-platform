import React, { useState } from 'react';
import api from '../services/api';

const now = new Date();
const currentPeriod = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

export default function PartsQuery() {
  const [period, setPeriod] = useState(currentPeriod);
  const [branch, setBranch] = useState('');
  const [department, setDepartment] = useState('');
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('detail');

  const search = async (p = 1) => {
    setLoading(true); setPage(p);
    try {
      if (tab === 'detail') {
        const res = await api.getPartsSales({ period, branch, department, page: p, limit: 50 });
        setData(res);
      } else {
        const res = await api.getPartsSummary(period, branch);
        setSummary(res);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🔩 零件銷售查詢</div>
          <div className="page-subtitle">零件/配件/精品銷售明細與彙總</div>
        </div>
        <button className="btn btn-secondary" onClick={() => api.exportExcel('parts', period, branch)}>📥 匯出</button>
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
        <label>部門</label>
        <select value={department} onChange={e => setDepartment(e.target.value)}>
          <option value="">全部</option>
          <option value="售服部">售服部</option><option value="業務部">業務部</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => search(1)}>查詢</button>
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'detail' ? ' active' : ''}`} onClick={() => setTab('detail')}>明細</button>
        <button className={`tab${tab === 'summary' ? ' active' : ''}`} onClick={() => setTab('summary')}>彙總</button>
      </div>

      {loading && <div className="loading"><div className="spinner" /></div>}

      {!loading && tab === 'detail' && data && (
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>共 {data.total} 筆</div>
          <div className="table-wrap" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>據點</th><th>零件編號</th><th>零件名稱</th><th>種類</th><th>類別</th>
                  <th>功能碼</th><th className="num">數量</th><th className="num">售價(未稅)</th>
                  <th className="num">成本</th><th className="num">折扣率</th><th>部門</th>
                  <th>銷售人員</th><th>延保</th><th className="num">獎金</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(r => (
                  <tr key={r.id}>
                    <td>{r.branch}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.part_number}</td>
                    <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.part_name}</td>
                    <td><span className="badge badge-blue">{r.part_type}</span></td>
                    <td style={{ fontSize: 12 }}>{r.category_code}</td>
                    <td style={{ fontSize: 12 }}>{r.function_code}</td>
                    <td className="num">{parseFloat(r.sale_qty)}</td>
                    <td className="num">{fmt(r.sale_price_untaxed)}</td>
                    <td className="num">{fmt(r.cost_untaxed)}</td>
                    <td className="num">{r.discount_rate ? (parseFloat(r.discount_rate) * 100).toFixed(1) + '%' : '-'}</td>
                    <td>{r.department}</td>
                    <td>{r.sales_person}</td>
                    <td className="text-center">{r.is_warranty_ext ? '✅' : ''}</td>
                    <td className="num text-green">{parseFloat(r.promo_bonus) > 0 ? fmt(r.promo_bonus) : ''}</td>
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

      {!loading && tab === 'summary' && summary && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>據點</th><th>部門</th><th>種類</th><th className="num">筆數</th>
                  <th className="num">總數量</th><th className="num">銷售額</th>
                  <th className="num">成本</th><th className="num">促銷獎金</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s, i) => (
                  <tr key={i}>
                    <td>{s.branch}</td>
                    <td>{s.department}</td>
                    <td><span className="badge badge-blue">{s.part_type}</span></td>
                    <td className="num">{parseInt(s.count).toLocaleString()}</td>
                    <td className="num">{parseFloat(s.total_qty).toLocaleString()}</td>
                    <td className="num fw-bold">{fmt(s.total_sales)}</td>
                    <td className="num">{fmt(s.total_cost)}</td>
                    <td className="num text-green">{fmt(s.total_bonus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(val) { return parseFloat(val || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 }); }
