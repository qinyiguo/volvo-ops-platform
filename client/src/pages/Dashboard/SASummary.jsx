import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function SASummary({ period, branch }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!period || !branch) return;
    setLoading(true);
    api.getSASummary(period, branch)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, branch]);

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>;
  if (!data.length) return <div className="empty"><div className="icon">📋</div>尚無資料，請先上傳該期間的資料</div>;

  // 收集所有人名
  const allPersons = [...new Set(data.flatMap(d => d.stats.map(s => s.person_name)))].sort();

  return (
    <div className="card">
      <div className="card-title">📋 SA 綜合統計 — {branch} {period.slice(0,4)}/{period.slice(4)}</div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 140 }}>追蹤品項</th>
              <th className="text-center" style={{ minWidth: 60 }}>單位</th>
              {allPersons.map(p => <th key={p} className="text-center" style={{ minWidth: 70 }}>{p}</th>)}
              <th className="text-center" style={{ minWidth: 70 }}>合計</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => {
              const statsMap = {};
              item.stats.forEach(s => { statsMap[s.person_name] = s.value; });
              const total = item.stats.reduce((sum, s) => sum + s.value, 0);
              return (
                <tr key={item.item_id}>
                  <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                  <td className="text-center text-muted">{item.count_method}</td>
                  {allPersons.map(p => (
                    <td key={p} className="num">{statsMap[p] ? formatNum(statsMap[p], item.count_method) : '-'}</td>
                  ))}
                  <td className="num fw-bold">{formatNum(total, item.count_method)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatNum(val, method) {
  if (method === '金額') return val.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
  if (method === '公升') return val.toFixed(1);
  return Math.round(val).toLocaleString();
}
