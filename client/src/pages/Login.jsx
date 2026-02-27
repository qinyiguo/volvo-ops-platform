import React, { useState } from 'react';
import { useAuth } from '../App';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>🚗 VOLVO 營運平台</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>帳號</label>
            <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="請輸入帳號" autoFocus />
          </div>
          <div className="form-group">
            <label>密碼</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="請輸入密碼" />
          </div>
          {error && <div style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button className="btn btn-primary" style={{ width: '100%', padding: '10px', fontSize: 14 }} disabled={loading}>
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
}
