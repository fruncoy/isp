import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, MapPin, Building2, Banknote } from 'lucide-react';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSales(data);
    } catch (err) {
      console.error(err);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sales.filter(s => 
    s.customerName?.toLowerCase().includes(search.toLowerCase()) || 
    s.repName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sales Records</h1>
          <p>View all sales, installations, and package upgrades.</p>
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
            <p>Once sales reps start recording sales, they will appear here.</p>
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
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(s.date?.toDate()).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500 }}>{s.customerName}</td>
                    <td><span className="badge badge-muted">{s.type || 'New Install'}</span></td>
                    <td>{s.package}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>${s.amount?.toLocaleString()}</td>
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
