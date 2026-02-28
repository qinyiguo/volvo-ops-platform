import React, { useState, useMemo } from 'react';
import api from '../services/api';

export default function RepairQuery() {
  // [FIX] currentPeriod 移入元件內
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [period, setPeriod] = useState(currentPeriod);
  const [branch, setBranch] = useState('');
  const [accountType, setAccountType] = useState('');
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('detail');

  const search = async (p = 1) => {
    setLoading(true);
    setPage(p);
    try {
      if (tab === 'detail') {
        const res = await api.getRepairList({ period, branch, account_type: accountType, page: p, limit: 50 });
        setData(res);
      } else {
        const res = await api.getRepairSummary(period, branch);
        setSummary(res);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🔍 維修收入查詢</div>
          <div className="page-subtitle">依據點、帳類、SA 篩選明細</div>
        </div>
        <button className="btn btn-secondary" onClick={() => api.exportExcel('repair', period, branch)}>
          📥 匯出 Excel
        </button>
      </div>

      <div className="filter-bar">
        <label>期間</label>
        <input type="month" value={`${period.slice(0,4)}-${period.slice(4)}`}
          onChange={e => setPeriod(e.target.value.replace('-', ''))} style={{ colorScheme: 'dark' }} />
        <label>據點</label>
        <select value={branch} onChange={e => setBranch(e.target.value)}>
          <option value="">全部</option>
          <option value="AMA">AMA</option>
          <option value="AMC">AMC</option>
          <option value="AMD">AMD</option>
        </select>
        <label>帳類</label>
        <select value={accountType} onChange={e => setAccountType(e.target.value)}>
          <option value="">全部</option>
          {['一般','保固','延保','內結','票券','保險','VSA','善意維修'].map(t =>
            <option key={t} value={t}>{t}</option>
          )}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => search(1)}>查詢</button>
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'detail' ? ' active' : ''}`} onClick={() => { setTab('detail'); }}>明細</button>
        <button className={`tab${tab === 'summary' ? ' active' : ''}`} onClick={() => { setTab('summary'); }}>帳類彙總</button>
      </div>

      {loading && <div className="loading"><div className="spinner" /></div>}

      {!loading && tab === 'detail' && data && (
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>共 {data.total} 筆</div>
          <div className="table-wrap" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>據點</th><th>結算日</th><th>工單號</th><th>車牌</th><th>帳類</th>
                  <th>服務顧問</th><th className="num">零件</th><th className="num">配件</th>
                  <th className="num">精品</th><th className="num">工資</th><th className="num">鈑金</th>
                  <th className="num">合計(未稅)</th><th>自費鈑烤</th><th>延保</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(r => (
                  <tr key={r.id}>
                    <td>{r.branch}</td>
                    <td style={{ fontSize: 12 }}>{r.settle_date?.slice(0, 10)}</td>
                    <td style={{ fontSize: 12 }}>{r.work_order}</td>
                    <td>{r.plate_no}</td>
                    <td><span className="badge badge-blue">{r.account_type}</span></td>
                    <td>{r.service_advisor}</td>
                    <td className="num">{fmt(r.parts_income)}</td>
                    <td className="num">{fmt(r.accessories_income)}</td>
                    <td className="num">{fmt(r.boutique_income)}</td>
                    <td className="num">{fmt(r.engine_wage)}</td>
                    <td className="num">{fmt(parseFloat(r.bodywork_income || 0) + parseFloat(r.paint_income || 0))}</td>
                    <td className="num fw-bold">{fmt(r.total_untaxed)}</td>
                    <td className="text-center">{r.is_self_pay_bodywork ? '✅' : ''}</td>
                    <td className="text-center">{r.warranty_ext_flag ? '✅' : ''}</td>
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
                  <th>據點</th><th>帳類</th><th className="num">筆數</th><th className="num">合計(未稅)</th>
                  <th className="num">零件</th><th className="num">工資</th><th className="num">鈑烤</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s, i) => (
                  <tr key={i}>
                    <td>{s.branch}</td>
                    <td><span className="badge badge-blue">{s.account_type}</span></td>
                    <td className="num">{parseInt(s.count).toLocaleString()}</td>
                    <td className="num fw-bold">{fmt(s.total_untaxed)}</td>
                    <td className="num">{fmt(s.parts_income)}</td>
                    <td className="num">{fmt(s.engine_wage)}</td>
                    <td className="num">{fmt(s.bodywork_revenue)}</td>
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

function fmt(val) {
  const n = parseFloat(val || 0);
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}
