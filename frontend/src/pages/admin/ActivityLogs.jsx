import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { History, Search, User, Zap, Settings, ShoppingBag, ShieldCheck, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const handleExport = () => {
    if (logs.length === 0) return toast.error('No data to export');
    
    const headers = ['Timestamp', 'Action', 'User/Rep', 'Description'];
    const csvData = logs.map(l => [
      l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString() : 'N/A',
      l.action,
      l.repName || l.adminName || 'System',
      `"${l.text?.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ISP_Activity_Logs_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exporting activity logs...');
  };

  useEffect(() => {
    const q = query(collection(db, 'logs'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in JS to handle missing timestamp fields gracefully
      data.sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : (a.timestamp ? new Date(a.timestamp) : new Date(0));
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : (b.timestamp ? new Date(b.timestamp) : new Date(0));
        return dateB - dateA;
      });
      setLogs(data.slice(0, 100)); // Limit to latest 100
      setLoading(false);
    }, (err) => {
      console.error('Firestore Logs Error:', err);
      setLogs([]);
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
          <p>Real-time audit trail of all system actions and transactions.</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={18} /> Export Logs
        </button>
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
