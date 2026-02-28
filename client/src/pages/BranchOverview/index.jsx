import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';

const KPI_ROWS = [
  { key: 'car_count', label: '出廠台數', unit: '台' },
  { key: 'total_revenue', label: '全部營收', unit: 'K', divK: true },
  { key: 'effective_revenue', label: '389 有效營收', unit: 'K', divK: true },
  { key: 'engine_wage', label: '引電營收', unit: 'K', divK: true },
  { key: 'bodywork_revenue', label: '鈑烤收入', unit: 'K', divK: true },
  { key: 'parts_income', label: '零件收入', unit: 'K', divK: true },
  { key: 'accessories_income', label: '配件收入', unit: 'K', divK: true },
  { key: 'boutique_income', label: '精品收入', unit: 'K', divK: true },
  { key: 'parts_cost', label: '零件成本', unit: 'K', divK: true },
];

const BRANCHES = ['AMA', 'AMC', 'AMD', 'AM'];

export default function BranchOverview() {
  // [FIX] currentPeriod 移入元件內
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [period, setPeriod] = useState(currentPeriod);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!period) return;
    setLoading(true);
    api.getBranchOverview(period)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>;

  const fmtVal = (val, row) => {
    if (val === undefined || val === null) return '-';
    const v = row.divK ? val / 1000 : val;
    return Math.round(v).toLocaleString();
  };

  const calcRate = (actual, target) => {
    if (!target || target === 0) return null;
    return (actual / target * 100);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🏭 四廠整合</div>
          <div className="page-subtitle">跨據點 KPI 比較</div>
        </div>
      </div>

      <div className="filter-bar">
        <label>期間</label>
        <input type="month" value={`${period.slice(0,4)}-${period.slice(4)}`}
          onChange={e => setPeriod(e.target.value.replace('-', ''))}
          style={{ colorScheme: 'dark' }} />
      </div>

      {data && (
        <>
          {/* 售服營運進度 */}
          <div className="card">
            <div className="card-title">📈 售服營運進度</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 120 }}>指標</th>
                    {BRANCHES.map(b => (
                      <React.Fragment key={b}>
                        <th className="text-center" style={{ borderLeft: b !== 'AMA' ? '2px solid var(--border)' : '', minWidth: 70 }}>
                          {b} 目標
                        </th>
                        <th className="text-center" style={{ minWidth: 70 }}>{b} 數據</th>
                        <th className="text-center" style={{ minWidth: 60 }}>達成率</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KPI_ROWS.map(row => (
                    <tr key={row.key}>
                      <td style={{ fontWeight: 600 }}>{row.label}</td>
                      {BRANCHES.map(b => {
                        const actual = parseFloat(data.kpi?.[b]?.[row.key] || 0);
                        const target = data.targets?.[b]?.[row.key] || 0;
                        const rate = calcRate(actual, target);
                        const rateClass = rate === null ? 'text-muted' : rate >= 100 ? 'rate-high' : rate >= 80 ? 'rate-mid' : 'rate-low';
                        return (
                          <React.Fragment key={b}>
                            <td className="num" style={{ borderLeft: b !== 'AMA' ? '2px solid var(--border)' : '', color: 'var(--text-muted)' }}>
                              {target ? fmtVal(target, row) : '-'}
                            </td>
                            <td className="num">{fmtVal(actual, row)}</td>
                            <td className={`num ${rateClass}`}>{rate !== null ? `${rate.toFixed(0)}%` : '-'}</td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 電油車統計 */}
          {data.evStats && (
            <div className="card">
              <div className="card-title">🚗 電車/油車統計</div>
              <div className="kpi-grid">
                {['AMA', 'AMC', 'AMD'].map(b => {
                  const ev = data.evStats[b] || {};
                  const evCount = ev['電車'] || 0;
                  const gasCount = ev['油車'] || 0;
                  const total = evCount + gasCount;
                  return (
                    <div className="kpi-card" key={b}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{b}</div>
                      <div className="kpi-value">{total}</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        <span className="text-blue">電車 {evCount}</span>
                        <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>|</span>
                        <span className="text-yellow">油車 {gasCount}</span>
                      </div>
                      {total > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          電車占比 {(evCount / total * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 追蹤品項統計 */}
          {data.tracking?.length > 0 && (
            <div className="card">
              <div className="card-title">🏷️ 四廠追蹤品項統計</div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>品項</th>
                      <th className="text-center">AMA</th>
                      <th className="text-center">AMC</th>
                      <th className="text-center">AMD</th>
                      <th className="text-center fw-bold">AM 合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tracking.map(item => (
                      <tr key={item.item_id}>
                        <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                        <td className="num">{Math.round(item.branches.AMA || 0).toLocaleString()}</td>
                        <td className="num">{Math.round(item.branches.AMC || 0).toLocaleString()}</td>
                        <td className="num">{Math.round(item.branches.AMD || 0).toLocaleString()}</td>
                        <td className="num fw-bold">{Math.round(item.branches.AM || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
