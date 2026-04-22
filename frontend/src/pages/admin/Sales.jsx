import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, MapPin, Building2 } from 'lucide-react';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSales(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setSales([]);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filtered = sales.filter(s => 
    s.customerName?.toLowerCase().includes(search.toLowerCase()) || 
    s.repName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sales Records</h1>
          <p>Live view of all sales, installations, and package upgrades.</p>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search by customer or rep name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
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
