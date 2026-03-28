import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, MapPin, UserSquare2 } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(data);
    } catch (err) {
      console.error(err);
      // Fallback to empty if collection doesn't exist yet
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Customer Database</h1>
          <p>View all registered ISP customers across all sales reps.</p>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search customers by name or phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ width: '200px' }}>
            <option value="all">All Packages</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <UserSquare2 size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <h3>No Customers Yet</h3>
            <p>Customers registered by sales reps will appear here.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Package</th>
                  <th>Status</th>
                  <th>Registered By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.phone}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                        <MapPin size={14} /> {c.address}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{c.package || 'Unknown'}</span>
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {c.status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.repName || 'Unknown'}</td>
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
