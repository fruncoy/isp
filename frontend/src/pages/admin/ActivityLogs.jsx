import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { History, Search, User, Zap, Settings, ShoppingBag, ShieldCheck } from 'lucide-react';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getIcon = (action) => {
    if (action.includes('sale')) return <ShoppingBag size={14} color="var(--success)" />;
    if (action.includes('package')) return <Settings size={14} color="var(--accent)" />;
    if (action.includes('customer')) return <User size={14} color="var(--info)" />;
    if (action.includes('admin')) return <ShieldCheck size={14} color="var(--danger)" />;
    return <Zap size={14} color="var(--amber)" />;
  };

  const filtered = logs.filter(l => 
    l.text?.toLowerCase().includes(search.toLowerCase()) || 
    l.repName?.toLowerCase().includes(search.toLowerCase()) ||
    l.adminName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>System Activity Logs</h1>
          <p>Real-time audit trail of all major actions performed in the ISP portal.</p>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search logs by action or user..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <History size={32} />
            <p>No activity recorded yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Description</th>
                  <th>User</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getIcon(l.action || '')}
                        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {(l.action || 'Unknown').replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{l.text}</td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{l.repName || l.adminName || 'System'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l.repId || l.adminId || ''}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString() : 'Just now'}
                    </td>
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
