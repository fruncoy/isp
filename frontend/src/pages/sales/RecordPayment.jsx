import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Search, Filter, Download, CreditCard } from 'lucide-react';

export default function RecordPayment() {
  const { userProfile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userProfile?.uid) return;

    // Fetch payment records for this specific sales rep
    const q = query(collection(db, 'payments'), where('repId', '==', userProfile.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in JS to handle missing createdAt fields gracefully
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
        return dateB - dateA;
      });
      setPayments(data);
      setLoading(false);
    }, (err) => {
      console.error('Firestore Payments Error:', err);
      setPayments([]);
      setLoading(false);
    });

    return () => unsub();
  }, [userProfile]);

  const filtered = payments.filter(p => 
    p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    if (payments.length === 0) return toast.error('No data to export');
    
    const headers = ['Date', 'Customer Name', 'Reference', 'Amount (KES)', 'Method', 'Status'];
    const csvData = filtered.map(p => [
      p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : new Date(p.date).toLocaleString(),
      p.customerName,
      p.reference,
      p.amount,
      p.method,
      'Success'
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `My_Payments_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exporting your payment records...');
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Payment Records</h1>
          <p>History of all customer payments you have processed.</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={18} />
          Export My Payments
        </button>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search by customer or reference..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary">
            <Filter size={16} />
            Filter
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={40} />
            <p>No payment records found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : new Date(p.date).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>
                    <td>{p.customerName}</td>
                    <td><code style={{ fontSize: '12px' }}>{p.reference}</code></td>
                    <td style={{ fontWeight: 600 }}>KES {p.amount?.toLocaleString()}</td>
                    <td>{p.method}</td>
                    <td><span className="badge badge-success">Success</span></td>
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
