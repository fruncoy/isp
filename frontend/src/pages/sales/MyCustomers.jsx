import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Search, MapPin, UserSquare2, UserPlus, Settings2, Clock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MyCustomers() {
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(
      collection(db, 'customers'), 
      where('repId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setCustomers([]);
      setLoading(false);
    });

    return () => unsub();
  }, [userProfile]);

  const filtered = customers.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  );

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { label: 'Unknown', color: 'var(--text-muted)' };
    const date = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
    const now = new Date();
    const diff = (date - now) / (1000 * 60 * 60 * 24);

    if (diff < 0) return { label: 'Expired', color: 'var(--danger)' };
    if (diff < 3) return { label: 'Expiring Soon', color: 'var(--warning)' };
    return { label: 'Active', color: 'var(--success)' };
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Customers</h1>
          <p>Live view of customers you have acquired and registered.</p>
        </div>
        <Link to="/sales/register-customer" className="btn btn-primary">
          <UserPlus size={18} /> Register New Customer
        </Link>
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
                  <th>Speed</th>
                  <th>Expiry Date</th>
                  <th>Location</th>
                  <th>Package</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const status = getExpiryStatus(c.expiryDate);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.phone}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Zap size={14} color="var(--accent)" /> {c.currentSpeed || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: status.color, fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} /> {c.expiryDate?.toDate ? c.expiryDate.toDate().toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          <MapPin size={14} /> {c.address}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{c.currentPackage || 'N/A'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/sales/manage-customer/${c.id}`} className="btn btn-sm btn-ghost" style={{ color: 'var(--accent)' }}>
                          <Settings2 size={16} /> Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
