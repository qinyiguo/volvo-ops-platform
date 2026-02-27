import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function GROSales({ period, branch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!period || !branch) return;
    setLoading(true);
    api.getGROSales(period, branch)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, branch]);

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>;
  if (!data?.sales?.length) return <div className="empty"><div className="icon">🛍️</div>尚無 GRO 銷售資料</div>;

  const { sales, targets } = data;
  const targetMap = {};
  targets?.forEach(t => {
    if (!targetMap[t.staff_name]) targetMap[t.staff_name] = {};
    targetMap[t.staff_name][t.metric_key] = parseFloat(t.individual_target);
  });

  return (
    <div className="card">
      <div className="card-title">🛍️ GRO 銷售 — {branch}</div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>銷售人員</th>
              <th className="num">精品目標 (K)</th>
              <th className="num">精品銷售 (K)</th>
              <th className="num">達成率</th>
              <th className="num">促銷獎金</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => {
              const target = targetMap[s.sales_person]?.boutique || 0;
              const actual = parseFloat(s.boutique_sales || 0);
              const rate = target > 0 ? (actual / target * 100) : 0;
              const rateClass = rate >= 100 ? 'rate-high' : rate >= 80 ? 'rate-mid' : 'rate-low';
              return (
                <tr key={s.sales_person}>
                  <td style={{ fontWeight: 600 }}>{s.sales_person}</td>
                  <td className="num text-muted">{target > 0 ? Math.round(target / 1000).toLocaleString() : '-'}</td>
                  <td className="num">{Math.round(actual / 1000).toLocaleString()}</td>
                  <td className={`num ${target > 0 ? rateClass : 'text-muted'}`}>{target > 0 ? `${rate.toFixed(0)}%` : '-'}</td>
                  <td className="num text-green">{parseFloat(s.promo_bonus || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
