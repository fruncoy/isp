import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Search, MapPin, UserSquare2, Plus, Loader2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Customers() {
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [reps, setReps] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    package: '',
    repId: ''
  });

  useEffect(() => {
    // Listen to customers
    const qCust = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const unsubCust = onSnapshot(qCust, (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Listen to sales reps for assignment
    const qReps = query(collection(db, 'users'), where('role', '==', 'salesrep'));
    const unsubReps = onSnapshot(qReps, (snap) => {
      setReps(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });

    // Listen to packages
    const qPkgs = query(collection(db, 'packages'), orderBy('price', 'asc'));
    const unsubPkgs = onSnapshot(qPkgs, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setPackages(data);
      if (data.length > 0 && !formData.package) {
        setFormData(prev => ({ ...prev, package: data[0].name }));
      }
    });

    return () => {
      unsubCust();
      unsubReps();
      unsubPkgs();
    };
  }, []);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.repId) return toast.error('Please assign a sales representative');
    setIsSubmitting(true);

    try {
      const selectedRep = reps.find(r => r.id === formData.repId);
      
      await addDoc(collection(db, 'customers'), {
        ...formData,
        repName: selectedRep?.name || 'Admin',
        status: 'active',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'logs'), {
        action: 'customer_created_admin',
        adminId: userProfile.uid,
        adminName: userProfile.name,
        text: `Admin created and assigned customer ${formData.name} to ${selectedRep?.name}`,
        timestamp: serverTimestamp()
      });

      toast.success('Customer created and assigned');
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '', address: '', package: packages[0]?.name || '', repId: '' });
    } catch (err) {
      toast.error('Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassign = async (customerId, currentName) => {
    const newRepId = window.prompt(`Reassign customer? Select Rep ID from console or wait for UI dropdown (Mocking prompt for now). Currently assigned to: ${currentName}`);
    if (!newRepId) return;
    // Real implementation would use a small popover/modal
  };

  const filtered = customers.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.phone || '').includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Customer Database</h1>
          <p>Manage ISP customers and assign them to your sales team.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Add Customer
        </button>
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
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <UserSquare2 size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <h3>No Customers Yet</h3>
            <p>Ready to start onboarding? Use the button above to add your first customer.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th>Installation Address</th>
                  <th>Selected Package</th>
                  <th>Status</th>
                  <th>Assigned Rep</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{c.phone}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <MapPin size={12} /> {c.address}
                      </div>
                    </td>
                    <td><span className="badge badge-info">{c.package}</span></td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>{c.repName}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Register & Assign Customer</h2>
            <form onSubmit={handleCreateCustomer}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Installation Address</label>
                <textarea className="form-textarea" rows={2} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Internet Package</label>
                  <select className="form-select" value={formData.package} onChange={e => setFormData({ ...formData, package: e.target.value })} required>
                    {packages.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Sales Rep</label>
                  <select className="form-select" value={formData.repId} onChange={e => setFormData({ ...formData, repId: e.target.value })} required>
                    <option value="">-- Choose Sales Rep --</option>
                    {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={16} className="spinner-lucide" /> Creating...</> : <><Check size={16} /> Register Customer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

