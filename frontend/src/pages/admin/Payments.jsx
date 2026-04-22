import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, CreditCard } from 'lucide-react';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setPayments([]);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filtered = payments.filter(p => 
    p.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payment Records</h1>
          <p>Live view of all collected payments from customers.</p>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search by customer name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <input type="month" className="form-input" style={{ width: '180px' }} />
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : payments.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <h3>No Payment Records</h3>
            <p>Payments collected by reps will be instantly logged here.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Payment Type</th>
                  <th>Amount</th>
                  <th>Collected By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {p.date?.toDate ? new Date(p.date.toDate()).toLocaleDateString() : (p.date ? new Date(p.date).toLocaleDateString() : 'N/A')}
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.customerName}</td>
                    <td>{p.method || 'Cash'}</td>
                    <td style={{ fontWeight: 600 }}>KES {(p.amount || 0).toLocaleString()}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.repName}</td>
                    <td>
                      <span className="badge badge-success">Completed</span>
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
