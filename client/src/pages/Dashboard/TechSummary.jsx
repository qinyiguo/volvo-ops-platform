import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function TechSummary({ period, branch }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!period || !branch) return;
    setLoading(true);
    api.getTechSummary(period, branch)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, branch]);

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>;
  if (!data.length) return <div className="empty"><div className="icon">👨‍🔧</div>尚無資料</div>;

  const allPersons = [...new Set(data.flatMap(d => d.stats.map(s => s.person_name)))].sort();

  return (
    <div className="card">
      <div className="card-title">👨‍🔧 技師統計 — {branch}</div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 140 }}>追蹤品項</th>
              <th className="text-center">單位</th>
              {allPersons.map(p => <th key={p} className="text-center" style={{ minWidth: 60 }}>{p}</th>)}
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
                  <td className="text-center text-muted">{item.count_method}</td>
                  {allPersons.map(p => <td key={p} className="num">{map[p] ? Math.round(map[p]).toLocaleString() : '-'}</td>)}
                  <td className="num fw-bold">{Math.round(total).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
