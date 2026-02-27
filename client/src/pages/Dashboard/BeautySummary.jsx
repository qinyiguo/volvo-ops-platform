import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function BeautySummary({ period, branch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!period || !branch) return;
    setLoading(true);
    api.getBeauty(period, branch)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, branch]);

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>;
  if (!data) return <div className="empty"><div className="icon">✨</div>尚無資料</div>;

  const { beauty, tracking } = data;

  return (
    <div>
      {beauty?.length > 0 && (
        <div className="card">
          <div className="card-title">✨ 美容工資統計 — {branch}</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>技師/SA</th>
                  <th className="num">美容工資</th>
                  <th className="num">美容台數</th>
                </tr>
              </thead>
              <tbody>
                {beauty.map(b => (
                  <tr key={b.person_name}>
                    <td style={{ fontWeight: 600 }}>{b.person_name}</td>
                    <td className="num">{parseFloat(b.beauty_wage).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}</td>
                    <td className="num">{parseInt(b.beauty_car_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tracking?.length > 0 && (
        <div className="card">
          <div className="card-title">🏷️ 美容追蹤品項</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>品項</th>
                  {(() => {
                    const persons = [...new Set(tracking.flatMap(d => d.stats.map(s => s.person_name)))].sort();
                    return persons.map(p => <th key={p} className="text-center">{p}</th>);
                  })()}
                  <th className="text-center">合計</th>
                </tr>
              </thead>
              <tbody>
                {tracking.map(item => {
                  const persons = [...new Set(tracking.flatMap(d => d.stats.map(s => s.person_name)))].sort();
                  const map = {};
                  item.stats.forEach(s => { map[s.person_name] = s.value; });
                  const total = item.stats.reduce((sum, s) => sum + s.value, 0);
                  return (
                    <tr key={item.item_id}>
                      <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                      {persons.map(p => <td key={p} className="num">{map[p] ? Math.round(map[p]).toLocaleString() : '-'}</td>)}
                      <td className="num fw-bold">{Math.round(total).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
