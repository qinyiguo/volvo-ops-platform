import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ADMIN_TABS = [
  { key: 'tracking', label: '追蹤品項設定', icon: '🏷️' },
  { key: 'staff', label: '人員據點對照', icon: '👥' },
  { key: 'users', label: '使用者管理', icon: '🔒' },
  { key: 'promo', label: '促銷獎金參數', icon: '💰' },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('tracking');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ 後台管理</div>
          <div className="page-subtitle">系統設定與對照表維護</div>
        </div>
      </div>

      <div className="tabs">
        {ADMIN_TABS.map(t => (
          <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'tracking' && <TrackingItemsPanel />}
      {tab === 'staff' && <StaffMapPanel />}
      {tab === 'users' && <UsersPanel />}
      {tab === 'promo' && <PromoRulesPanel />}
    </div>
  );
}

// ==================== 追蹤品項設定 ====================
function TrackingItemsPanel() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadItems(); }, []);
  const loadItems = () => api.getTrackingItems().then(setItems).catch(console.error);

  const handleSave = async (formData) => {
    try {
      if (editing) {
        await api.updateTrackingItem(editing.id, formData);
      } else {
        await api.createTrackingItem(formData);
      }
      setShowForm(false);
      setEditing(null);
      loadItems();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('確定停用此品項？')) return;
    await api.deleteTrackingItem(id);
    loadItems();
  };

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>🏷️ 追蹤品項列表</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true); }}>+ 新增品項</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>排序</th><th>品項名稱</th><th>計數</th><th>比對規則</th>
                <th className="text-center">SA統計</th><th className="text-center">技師</th>
                <th className="text-center">美容</th><th className="text-center">鈑烤</th>
                <th className="text-center">四廠</th><th>狀態</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ opacity: item.is_active ? 1 : 0.4 }}>
                  <td className="text-muted">{item.sort_order}</td>
                  <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                  <td><span className="badge badge-blue">{item.count_method}</span></td>
                  <td style={{ fontSize: 11, maxWidth: 200 }}>
                    {(item.match_rules || []).map((r, i) => (
                      <div key={i} style={{ color: 'var(--text-muted)' }}>
                        {r.data_source === 'parts_sales' ? '零件: ' : '工單: '}
                        {r.match_type === 'category_code' && `類別=${r.category_code}`}
                        {r.match_type === 'function_code' && `功能碼=${r.function_code}`}
                        {r.match_type === 'both' && `類別=${r.category_code}+功能碼=${r.function_code}`}
                        {r.match_type === 'part_number' && `編號=${r.part_number}`}
                        {r.match_type === 'condition' && `${r.condition_field}=${r.condition_value}`}
                      </div>
                    ))}
                  </td>
                  <td className="text-center">{item.show_in_sa_summary ? '✅' : ''}</td>
                  <td className="text-center">{item.show_in_tech_summary ? '✅' : ''}</td>
                  <td className="text-center">{item.show_in_beauty ? '✅' : ''}</td>
                  <td className="text-center">{item.show_in_bodywork ? '✅' : ''}</td>
                  <td className="text-center">{item.show_in_branch_overview ? '✅' : ''}</td>
                  <td><span className={`badge ${item.is_active ? 'badge-green' : 'badge-red'}`}>{item.is_active ? '啟用' : '停用'}</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: 4 }} onClick={() => { setEditing(item); setShowForm(true); }}>編輯</button>
                    {item.is_active && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>停用</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <TrackingItemForm
          item={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// 追蹤品項表單（Modal）
function TrackingItemForm({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    item_name: item?.item_name || '',
    item_category: item?.item_category || '通用',
    count_method: item?.count_method || '數量',
    match_rules: item?.match_rules || [],
    show_in_sa_summary: item?.show_in_sa_summary || false,
    show_in_tech_summary: item?.show_in_tech_summary || false,
    show_in_beauty: item?.show_in_beauty || false,
    show_in_bodywork: item?.show_in_bodywork || false,
    show_in_branch_overview: item?.show_in_branch_overview || false,
    is_active: item?.is_active ?? true,
    sort_order: item?.sort_order || 0,
  });

  const addRule = () => {
    setForm({
      ...form,
      match_rules: [...form.match_rules, { data_source: 'parts_sales', match_type: 'category_code', category_code: '' }]
    });
  };

  const updateRule = (idx, field, value) => {
    const rules = [...form.match_rules];
    rules[idx] = { ...rules[idx], [field]: value };
    setForm({ ...form, match_rules: rules });
  };

  const removeRule = (idx) => {
    setForm({ ...form, match_rules: form.match_rules.filter((_, i) => i !== idx) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{item ? '編輯' : '新增'}追蹤品項</div>

        <div className="form-group">
          <label>品項名稱</label>
          <input className="form-input" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} placeholder="如：輪胎、銀護噴霧" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label>分類</label>
            <select className="form-input" value={form.item_category} onChange={e => setForm({ ...form, item_category: e.target.value })}>
              <option value="通用">通用</option><option value="SA追蹤">SA追蹤</option><option value="技師追蹤">技師追蹤</option>
            </select>
          </div>
          <div className="form-group">
            <label>計數方式</label>
            <select className="form-input" value={form.count_method} onChange={e => setForm({ ...form, count_method: e.target.value })}>
              <option value="數量">數量</option><option value="台數">台數</option><option value="金額">金額</option><option value="公升">公升</option>
            </select>
          </div>
          <div className="form-group">
            <label>排序</label>
            <input className="form-input" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
        </div>

        {/* 比對規則 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>比對規則（OR 邏輯）</label>
            <button className="btn btn-secondary btn-sm" onClick={addRule}>+ 新增規則</button>
          </div>
          {form.match_rules.map((rule, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 10, marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="form-input" style={{ width: 100 }} value={rule.data_source} onChange={e => updateRule(i, 'data_source', e.target.value)}>
                <option value="parts_sales">零件銷售</option>
                <option value="business_query">業務查詢</option>
              </select>

              {rule.data_source === 'parts_sales' && (
                <>
                  <select className="form-input" style={{ width: 110 }} value={rule.match_type} onChange={e => updateRule(i, 'match_type', e.target.value)}>
                    <option value="category_code">零件類別</option>
                    <option value="function_code">功能碼</option>
                    <option value="both">類別+功能碼</option>
                    <option value="part_number">零件編號</option>
                  </select>
                  {(rule.match_type === 'category_code' || rule.match_type === 'both') && (
                    <input className="form-input" style={{ width: 80 }} value={rule.category_code || ''} onChange={e => updateRule(i, 'category_code', e.target.value)} placeholder="類別碼" />
                  )}
                  {(rule.match_type === 'function_code' || rule.match_type === 'both') && (
                    <input className="form-input" style={{ width: 80 }} value={rule.function_code || ''} onChange={e => updateRule(i, 'function_code', e.target.value)} placeholder="功能碼" />
                  )}
                  {rule.match_type === 'part_number' && (
                    <input className="form-input" style={{ width: 120 }} value={rule.part_number || ''} onChange={e => updateRule(i, 'part_number', e.target.value)} placeholder="零件編號(可用%)" />
                  )}
                </>
              )}

              {rule.data_source === 'business_query' && (
                <>
                  <select className="form-input" style={{ width: 100 }} value={rule.condition_field || ''} onChange={e => updateRule(i, 'condition_field', e.target.value)}>
                    <option value="">選欄位</option>
                    <option value="repair_type">維修類型</option>
                    <option value="is_ev">電油車</option>
                    <option value="status">工單狀態</option>
                  </select>
                  <input className="form-input" style={{ width: 80 }} value={rule.condition_value || ''} onChange={e => updateRule(i, 'condition_value', e.target.value)} placeholder="值" />
                </>
              )}

              <button className="btn btn-danger btn-sm" onClick={() => removeRule(i)}>✕</button>
            </div>
          ))}
        </div>

        {/* 顯示位置 */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>顯示在哪些報表</label>
          {[
            { key: 'show_in_sa_summary', label: 'SA 綜合統計' },
            { key: 'show_in_tech_summary', label: '技師統計' },
            { key: 'show_in_beauty', label: '美容統計' },
            { key: 'show_in_bodywork', label: '鈑烤接待' },
            { key: 'show_in_branch_overview', label: '四廠整合' },
          ].map(opt => (
            <div key={opt.key} className="toggle-row">
              <input type="checkbox" checked={form[opt.key]} onChange={e => setForm({ ...form, [opt.key]: e.target.checked })} />
              <span style={{ fontSize: 13 }}>{opt.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>儲存</button>
        </div>
      </div>
    </div>
  );
}

// ==================== 人員據點對照 ====================
function StaffMapPanel() {
  const [staff, setStaff] = useState([]);
  const [branch, setBranch] = useState('');

  useEffect(() => { loadStaff(); }, [branch]);
  const loadStaff = () => api.getStaffMap(branch).then(setStaff).catch(console.error);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>👥 人員據點對照表</div>
        <select value={branch} onChange={e => setBranch(e.target.value)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: 6, fontSize: 13 }}>
          <option value="">全部</option>
          <option value="AMA">AMA</option><option value="AMC">AMC</option><option value="AMD">AMD</option>
        </select>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>姓名</th><th>代號</th><th>類型</th><th>據點</th><th>部門</th><th>狀態</th></tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.4 }}>
                <td style={{ fontWeight: 600 }}>{s.staff_name}</td>
                <td className="text-muted">{s.staff_code || '-'}</td>
                <td><span className="badge badge-blue">{s.staff_type}</span></td>
                <td>{s.branch}</td>
                <td>{s.department}</td>
                <td><span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>{s.is_active ? '在職' : '離職'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 使用者管理 ====================
function UsersPanel() {
  const [users, setUsers] = useState([]);

  useEffect(() => { api.getUsers().then(setUsers).catch(console.error); }, []);

  return (
    <div className="card">
      <div className="card-title">🔒 使用者管理</div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>帳號</th><th>顯示名稱</th><th>角色</th><th>據點</th><th>狀態</th><th>建立時間</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.username}</td>
                <td>{u.display_name}</td>
                <td><span className={`badge ${u.role === 'admin' ? 'badge-yellow' : 'badge-blue'}`}>{u.role === 'admin' ? '管理者' : '一般'}</span></td>
                <td>{u.branch || '全部'}</td>
                <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? '啟用' : '停用'}</span></td>
                <td className="text-muted" style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString('zh-TW')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 促銷獎金參數 ====================
function PromoRulesPanel() {
  const [rules, setRules] = useState([]);

  useEffect(() => { api.getPromoRules().then(setRules).catch(console.error); }, []);

  return (
    <div className="card">
      <div className="card-title">💰 促銷獎金參數</div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>規則名稱</th><th>適用類型</th><th className="num">折扣率下限</th><th className="num">折扣率上限</th><th className="num">獎金比率</th><th>狀態</th></tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.rule_name}</td>
                <td><span className="badge badge-blue">{r.applicable_types}</span></td>
                <td className="num">{(parseFloat(r.discount_min) * 100).toFixed(1)}%</td>
                <td className="num">{(parseFloat(r.discount_max) * 100).toFixed(1)}%</td>
                <td className="num text-green">{(parseFloat(r.bonus_rate) * 100).toFixed(1)}%</td>
                <td><span className={`badge ${r.is_active ? 'badge-green' : 'badge-red'}`}>{r.is_active ? '啟用' : '停用'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
