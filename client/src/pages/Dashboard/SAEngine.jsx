import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const METRICS = [
  { key: 'car_count', label: '出廠車輛總數', field: 'car_count', unit: '台' },
  { key: 'total_revenue', label: '全部營收目標', field: 'total_revenue', unit: 'K', divK: true },
  { key: 'effective_revenue', label: '389營收目標', field: 'effective_revenue', unit: 'K', divK: true },
  { key: 'engine_wage', label: '引電營收', field: 'engine_wage', unit: 'K', divK: true },
  { key: 'bodywork_revenue', label: '鈑烤收入', field: 'bodywork_revenue', unit: 'K', divK: true },
  { key: 'parts_income', label: '零件收入', field: 'parts_income', unit: 'K', divK: true },
  { key: 'accessories_income', label: '配件收入', field: 'accessories_income', unit: 'K', divK: true },
  { key: 'boutique_income', label: '精品收入', field: 'boutique_income', unit: 'K', divK: true },
];

export default function SAEngine({ period, branch }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!period || !branch) return;
    setLoading(true);
    api.getSAEngine(period, branch)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, branch]);

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>;
  if (!data.length) return <div className="empty"><div className="icon">🔧</div>尚無資料</div>;

  return (
    <div className="card">
      <div className="card-title">🔧 接待業績（引擎）— {branch}</div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>指標</th>
              {data.map(sa => (
                <th key={sa.service_advisor} colSpan={3} className="text-center" style={{ borderLeft: '2px solid var(--border)' }}>
                  {sa.service_advisor}
                </th>
              ))}
            </tr>
            <tr>
              <th></th>
              {data.map(sa => (
                <React.Fragment key={sa.service_advisor}>
                  <th className="text-center" style={{ fontSize: 11, borderLeft: '2px solid var(--border)' }}>目標</th>
                  <th className="text-center" style={{ fontSize: 11 }}>實績</th>
                  <th className="text-center" style={{ fontSize: 11 }}>達成率</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(m => (
              <tr key={m.key}>
                <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label}</td>
                {data.map(sa => {
                  const actual = parseFloat(sa[m.field] || 0);
                  const target = sa.targets?.[m.key] || 0;
                  const displayActual = m.divK ? Math.round(actual / 1000) : Math.round(actual);
                  const displayTarget = m.divK ? Math.round(target / 1000) : Math.round(target);
                  const rate = target > 0 ? (actual / target * 100) : 0;
                  const rateClass = rate >= 100 ? 'rate-high' : rate >= 80 ? 'rate-mid' : 'rate-low';

                  return (
                    <React.Fragment key={sa.service_advisor}>
                      <td className="num" style={{ borderLeft: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                        {target > 0 ? displayTarget.toLocaleString() : '-'}
                      </td>
                      <td className="num">{displayActual.toLocaleString()}</td>
                      <td className={`num ${target > 0 ? rateClass : 'text-muted'}`}>
                        {target > 0 ? `${rate.toFixed(0)}%` : '-'}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
