import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function SABodywork({ period, branch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!period || !branch) return;
    setLoading(true);
    api.getSABodywork(period, branch)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, branch]);

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>;
  if (!data?.performance?.length) return <div className="empty"><div className="icon">🎨</div>尚無鈑烤資料</div>;

  const { performance, tracking } = data;

  return (
    <div>
      <div className="card">
        <div className="card-title">🎨 接待業績（鈑烤）— {branch}</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>服務顧問</th>
                <th className="num">接車數</th>
                <th className="num">鈑烤收入</th>
                <th className="num">美容收入</th>
                <th className="num">精品收入</th>
              </tr>
            </thead>
            <tbody>
              {performance.map(sa => (
                <tr key={sa.service_advisor}>
                  <td style={{ fontWeight: 600 }}>{sa.service_advisor}</td>
                  <td className="num">{parseInt(sa.car_count).toLocaleString()}</td>
                  <td className="num">{Math.round(sa.bodywork_revenue / 1000).toLocaleString()}K</td>
                  <td className="num">{Math.round(sa.beauty_revenue / 1000).toLocaleString()}K</td>
                  <td className="num">{Math.round(sa.boutique_income / 1000).toLocaleString()}K</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {tracking?.length > 0 && (
        <div className="card">
          <div className="card-title">🏷️ 鈑烤追蹤品項</div>
          <TrackingTable data={tracking} />
        </div>
      )}
    </div>
  );
}

function TrackingTable({ data }) {
  const allPersons = [...new Set(data.flatMap(d => d.stats.map(s => s.person_name)))].sort();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>品項</th>
            {allPersons.map(p => <th key={p} className="text-center">{p}</th>)}
            <th className="text-center">合計</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => {
            const map = {};
            item.stats.forEach(s => { map[s.person_name] = s.value; });
            const total = item.stats.reduce((sum, s) => sum + s.value, 0);
            return (
              <tr key={item.item_id}>
                <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                {allPersons.map(p => <td key={p} className="num">{map[p] ? Math.round(map[p]).toLocaleString() : '-'}</td>)}
                <td className="num fw-bold">{Math.round(total).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
