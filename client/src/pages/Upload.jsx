import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.getUploadHistory().then(setHistory).catch(console.error);
  }, []);

  const handleFiles = (fileList) => {
    setFiles(Array.from(fileList).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setResults([]);
    try {
      const res = await api.uploadFiles(files);
      setResults(res.results);
      setFiles([]);
      // 重新載入歷史
      const h = await api.getUploadHistory();
      setHistory(h);
    } catch (err) {
      setResults([{ filename: '上傳失敗', status: 'error', error: err.message }]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📤 資料上傳</div>
          <div className="page-subtitle">拖拉 DMS Excel 檔案，系統自動辨識並計算</div>
        </div>
      </div>

      {/* 上傳區 */}
      <div
        className={`upload-zone${dragover ? ' dragover' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={e => { e.preventDefault(); setDragover(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
      >
        <div className="icon">📁</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>拖拉 Excel 檔案到這裡</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>或點擊選擇檔案（最多 8 個）</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8 }}>
          支援：維修收入明細 / 技師績效報表 / 零件銷售明細 / 零配件比對 / 業務查詢
        </div>
        <input ref={fileRef} type="file" multiple accept=".xlsx,.xls" style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* 已選擇的檔案 */}
      {files.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">📎 已選擇 {files.length} 個檔案</div>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13 }}>{f.name}</span>
              <span className="text-muted" style={{ fontSize: 12 }}>{(f.size / 1024).toFixed(0)} KB</span>
            </div>
          ))}
          <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }}
            onClick={handleUpload} disabled={uploading}>
            {uploading ? '上傳處理中...' : `上傳 ${files.length} 個檔案`}
          </button>
        </div>
      )}

      {/* 上傳結果 */}
      {results.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">📋 上傳結果</div>
          {results.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13 }}>{r.filename}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {r.status === 'success' ? (
                  <>
                    <span className="badge badge-green">成功</span>
                    <span className="text-muted" style={{ fontSize: 11 }}>{r.fileType} / {r.branch} / {r.rowCount} 筆</span>
                  </>
                ) : (
                  <>
                    <span className="badge badge-red">失敗</span>
                    <span className="text-red" style={{ fontSize: 11 }}>{r.error}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 上傳歷史 */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">📜 上傳歷史</div>
        {history.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 13 }}>尚無上傳紀錄</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>時間</th>
                  <th>檔案名稱</th>
                  <th>類型</th>
                  <th>據點</th>
                  <th>期間</th>
                  <th className="num">筆數</th>
                  <th>狀態</th>
                  <th>上傳者</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 30).map(h => (
                  <tr key={h.id}>
                    <td style={{ fontSize: 12 }}>{new Date(h.created_at).toLocaleString('zh-TW')}</td>
                    <td style={{ fontSize: 12 }}>{h.file_name}</td>
                    <td><span className="badge badge-blue">{h.file_type}</span></td>
                    <td>{h.branch || '-'}</td>
                    <td>{h.period || '-'}</td>
                    <td className="num">{h.row_count?.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${h.status === 'success' ? 'badge-green' : 'badge-red'}`}>
                        {h.status === 'success' ? '成功' : '失敗'}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 12 }}>{h.uploaded_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
