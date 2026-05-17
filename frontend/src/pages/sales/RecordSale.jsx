import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Search, Filter, Download, ShoppingBag } from 'lucide-react';

export default function RecordSale() {
  const { userProfile } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userProfile?.uid) return;

    // Fetch sales records for this specific sales rep
    const q = query(collection(db, 'sales'), where('repId', '==', userProfile.uid));
    const unsub = onSnapshot(q, (snap) => {
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
  }, [userProfile]);

  const filtered = sales.filter(s => 
    s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.package?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    if (sales.length === 0) return toast.error('No data to export');
    
    const headers = ['Date', 'Customer Name', 'Package', 'Amount (KES)', 'Duration', 'Status'];
    const csvData = filtered.map(s => [
      s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : new Date(s.date).toLocaleString(),
      s.customerName,
      s.package,
      s.amount,
      s.duration,
      'Completed'
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `My_Sales_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exporting your sales records...');
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Sales Records</h1>
          <p>History of all installations and service sales you have recorded.</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={18} />
          Export My Sales
        </button>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search by customer or package..." 
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
            <ShoppingBag size={40} />
            <p>No sales records found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : new Date(s.date).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>
                    <td>{s.customerName}</td>
                    <td><span className="badge badge-info">{s.package}</span></td>
                    <td style={{ fontWeight: 600 }}>KES {s.amount?.toLocaleString()}</td>
                    <td>{s.duration} Month(s)</td>
                    <td><span className="badge badge-success">Completed</span></td>
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
