import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Search, MapPin, UserSquare2 } from 'lucide-react';

export default function MyCustomers() {
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (userProfile?.uid) fetchMyCustomers();
  }, [userProfile]);

  const fetchMyCustomers = async () => {
    try {
      const q = query(
        collection(db, 'customers'), 
        where('repId', '==', userProfile.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(data);
    } catch (err) {
      console.error(err);
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
          <h1>My Customers</h1>
          <p>Customers you have acquired and registered.</p>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <UserSquare2 size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <h3>No Customers Found</h3>
            <p>You haven't registered any customers yet.</p>
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
                  <th>Registration Date</th>
                  <th>Status</th>
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
                      <span className="badge badge-info">{c.package}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {c.status || 'Active'}
                      </span>
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
