import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Search, Loader2, Users, Copy, Check, Eye, EyeOff, KeyRound, X } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRep, setNewRep] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Credentials display state (after creation)
  const [createdCreds, setCreatedCreds] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Real-time listener for sales reps and their performance
  useEffect(() => {
    const qReps = query(collection(db, 'users'), where('role', '==', 'salesrep'));
    
    // Monthly Target (Mock target for now)
    const MONTHLY_TARGET = 50000;

    let unsubSales = () => {};

    const unsubReps = onSnapshot(qReps, (repSnap) => {
      const repsData = repSnap.docs.map(d => ({ id: d.id, ...d.data(), performance: 0 }));
      
      unsubSales(); // Clean up previous sales listener
      unsubSales = onSnapshot(collection(db, 'sales'), (salesSnap) => {
        const salesByRep = {};
        salesSnap.docs.forEach(doc => {
          const s = doc.data();
          salesByRep[s.repId] = (salesByRep[s.repId] || 0) + (Number(s.amount) || 0);
        });

        const updatedReps = repsData.map(r => ({
          ...r,
          performance: salesByRep[r.id] || 0,
          targetProgress: Math.min(((salesByRep[r.id] || 0) / MONTHLY_TARGET) * 100, 100).toFixed(1)
        }));

        // Sort by performance descending
        updatedReps.sort((a, b) => b.performance - a.performance);
        setUsers(updatedReps);
        setLoading(false);
      });
    }, (err) => {
      toast.error('Failed to load team data');
      setLoading(false);
    });

    return () => {
      unsubReps();
      unsubSales();
    };
  }, []);

  const handleCreateRep = async (e) => {
    e.preventDefault();
    if (newRep.password.length < 6) return toast.error('Password must be at least 6 characters');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${BACKEND}/api/auth/create-rep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRep.name, email: newRep.email, password: newRep.password }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create user');

      // Store credentials to show to admin
      setCreatedCreds({ name: newRep.name, email: newRep.email, password: newRep.password });
      setIsModalOpen(false);
      setNewRep({ name: '', email: '', password: '' });
      // onSnapshot auto-refreshes the list
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'disabled' ? 'active' : 'disabled';
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Manage Sales Team</h1>
          <p>Create accounts for sales representatives. Credentials are shared manually.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Add Sales Rep
        </button>
      </div>

      {/* Credentials card shown after account creation */}
      {createdCreds && (
        <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--success)', background: 'rgba(34,197,94,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <KeyRound size={18} color="var(--success)" />
                <strong style={{ color: 'var(--success)' }}>Account Created — Share these credentials with {createdCreds.name}</strong>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {[{ label: 'Email', value: createdCreds.email, field: 'email' }, { label: 'Password', value: createdCreds.password, field: 'password' }].map(({ label, value, field }) => (
                  <div key={field} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', minWidth: '220px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>{value}</code>
                      <button
                        onClick={() => copyToClipboard(value, field)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedField === field ? 'var(--success)' : 'var(--text-muted)', padding: '2px' }}
                        title="Copy"
                      >
                        {copiedField === field ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setCreatedCreds(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={32} />
            <p>{users.length === 0 ? 'No sales representatives yet. Create one to get started.' : 'No results match your search.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name / Email</th>
                  <th>Status</th>
                  <th>Monthly Performance</th>
                  <th>Target Progress</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'disabled' ? 'badge-danger' : 'badge-success'}`}>
                          {u.status === 'disabled' ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>KES {u.performance?.toLocaleString()}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Base Target: KES 50,000</div>
                      </td>
                      <td style={{ minWidth: '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${u.targetProgress}%`, 
                              background: Number(u.targetProgress) > 70 ? 'var(--success)' : Number(u.targetProgress) > 30 ? 'var(--amber)' : 'var(--danger)',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{u.targetProgress}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ color: u.status === 'disabled' ? 'var(--success)' : 'var(--danger)' }}
                          onClick={() => handleToggleStatus(u.id, u.status)}
                        >
                          {u.status === 'disabled' ? 'Enable' : 'Disable'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add New Sales Rep</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Create an account. You will receive the credentials to share with the rep.
            </p>
            <form onSubmit={handleCreateRep}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={newRep.name} onChange={e => setNewRep({ ...newRep, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" value={newRep.email} onChange={e => setNewRep({ ...newRep, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={newRep.password}
                    onChange={e => setNewRep({ ...newRep, password: e.target.value })}
                    required minLength={6}
                    style={{ paddingRight: '44px' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={16} className="spinner-lucide" /> Creating...</> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
