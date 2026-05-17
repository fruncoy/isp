import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, Filter, Download, Plus, RefreshCw, Loader2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { BACKEND_URL } from '../../utils/config';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncRef, setSyncRef] = useState('');

  const handleForceSync = async () => {
    if (!syncRef) return toast.error('Please enter a Paystack reference');
    
    setIsSyncing(true);
    const toastId = toast.loading('Syncing transaction...');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/paystack/verify/${syncRef}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        toast.success('Transaction synced! Records created.', { id: toastId });
        setShowSyncModal(false);
        setSyncRef('');
      } else {
        toast.error(data.message || 'Transaction not found or already processed', { id: toastId });
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Connection error. Check backend.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    if (sales.length === 0) return toast.error('No data to export');
    
    const headers = ['Date', 'Customer Name', 'Package', 'Amount (KES)', 'Type', 'Rep Name'];
    const csvData = filtered.map(s => [
      s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : new Date(s.date).toLocaleString(),
      s.customerName,
      s.package,
      s.amount,
      s.type,
      s.repName
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ISP_Sales_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exporting sales data...');
  };

  useEffect(() => {
    // Listen to sales collection
    const salesCol = collection(db, 'sales');
    const unsub = onSnapshot(salesCol, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in JS to handle missing createdAt fields gracefully
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
        return dateB - dateA;
      });
      setSales(data);
      setLoading(false);
    }, (err) => {
      console.error('Firestore Sales Error:', err);
      setSales([]);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filtered = sales.filter(s => 
    s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.repName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sales Records</h1>
          <p>Total Sales: {sales.length}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowSyncModal(true)}
            style={{ 
              backgroundColor: 'var(--bg-surface)', 
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            <RefreshCw size={18} className={isSyncing ? 'spinner' : ''} />
            Force Sync
          </button>
          <button className="btn btn-primary" onClick={handleExport} style={{
            backgroundColor: 'var(--accent)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            <Download size={18} />
            Export Data
          </button>
        </div>
      </div>

      {/* Force Sync Modal */}
      {showSyncModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content" style={{ 
            maxWidth: '400px', 
            width: '90%',
            textAlign: 'center',
            backgroundColor: 'var(--bg-secondary)',
            padding: '32px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                backgroundColor: 'var(--accent-light)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px' 
              }}>
                <RefreshCw size={32} color="var(--accent)" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>Sync Records</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                Enter the Paystack Reference to recover missing records and activate the customer.
              </p>
            </div>

            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Paystack Reference
              </label>
              <input 
                type="text" 
                placeholder="e.g. T123456789012345"
                value={syncRef}
                onChange={(e) => setSyncRef(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn" 
                onClick={() => { setShowSyncModal(false); setSyncRef(''); }}
                disabled={isSyncing}
                style={{ 
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleForceSync}
                disabled={isSyncing || !syncRef}
                style={{ 
                  flex: 2,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isSyncing ? <Loader2 className="spinner" size={18} /> : 'Verify & Sync'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search by customer or rep name..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <input type="date" className="form-input" style={{ width: '150px' }} />
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : sales.length === 0 ? (
          <div className="empty-state">
            <Building2 size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <h3>No Sales Records</h3>
            <p>Once sales reps start recording sales, they will appear here instantly.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Sale Type</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Rep Name</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {s.date?.toDate ? new Date(s.date.toDate()).toLocaleDateString() : (s.date ? new Date(s.date).toLocaleDateString() : 'N/A')}
                    </td>
                    <td style={{ fontWeight: 500 }}>{s.customerName}</td>
                    <td><span className="badge badge-muted">{s.type || 'New Install'}</span></td>
                    <td>{s.package}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>KES {(s.amount || 0).toLocaleString()}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.repName}</td>
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
