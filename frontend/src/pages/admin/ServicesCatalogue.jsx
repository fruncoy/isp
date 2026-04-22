import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Loader2, Wifi, Trash2, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ServicesCatalogue() {
  const { userProfile } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    speed: '',
    price: '',
    tier: 'Standard'
  });

  useEffect(() => {
    const q = query(collection(db, 'packages'), orderBy('price', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPackages(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'packages', editingId), {
          ...formData,
          price: Number(formData.price),
          updatedAt: serverTimestamp()
        });
        
        await addDoc(collection(db, 'logs'), {
          action: 'package_updated',
          adminId: userProfile.uid,
          adminName: userProfile.name,
          text: `Updated package: ${formData.name}`,
          timestamp: serverTimestamp()
        });
        
        toast.success('Package updated');
      } else {
        await addDoc(collection(db, 'packages'), {
          ...formData,
          price: Number(formData.price),
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'logs'), {
          action: 'package_created',
          adminId: userProfile.uid,
          adminName: userProfile.name,
          text: `Created new package: ${formData.name}`,
          timestamp: serverTimestamp()
        });

        toast.success('Package added to catalogue');
      }
      setIsModalOpen(false);
      setFormData({ name: '', speed: '', price: '', tier: 'Standard' });
      setEditingId(null);
    } catch (err) {
      toast.error('Operation failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (pkg) => {
    setFormData({
      name: pkg.name,
      speed: pkg.speed,
      price: pkg.price,
      tier: pkg.tier || 'Standard'
    });
    setEditingId(pkg.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'packages', id));
      
      await addDoc(collection(db, 'logs'), {
        action: 'package_deleted',
        adminId: userProfile.uid,
        adminName: userProfile.name,
        text: `Deleted package: ${name}`,
        timestamp: serverTimestamp()
      });
      
      toast.success('Package removed');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Services Catalogue</h1>
          <p>Manage internet packages and pricing for your sales team.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setFormData({ name: '', speed: '', price: '', tier: 'Standard' });
          setIsModalOpen(true);
        }}>
          <Plus size={18} /> Add New Package
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : packages.length === 0 ? (
          <div className="empty-state">
            <Wifi size={32} />
            <p>Your catalogue is empty. Add your first internet package.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Speed</th>
                  <th>Tier</th>
                  <th>Monthly Price</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td><span className="badge badge-success">{p.speed}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{p.tier}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>KES {p.price?.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(p)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(p.id, p.name)} style={{ color: 'var(--danger)' }}>
                          <Trash2 size={14} />
                        </button>
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
            <h2>{editingId ? 'Edit Package' : 'Add New Package'}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Define the speed and weight of this package for the sales team.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Package Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g. Home Basic" 
                  required 
                />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Speed Level</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.speed} 
                    onChange={e => setFormData({ ...formData, speed: e.target.value })} 
                    placeholder="e.g. 10Mbps" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Price (KES)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.price} 
                    onChange={e => setFormData({ ...formData, price: e.target.value })} 
                    placeholder="2500" 
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tier / Category</label>
                <select 
                  className="form-select" 
                  value={formData.tier} 
                  onChange={e => setFormData({ ...formData, tier: e.target.value })}
                >
                  <option value="Basic">Basic</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                  <option value="Business">Business</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={16} className="spinner-lucide" /> Saving...</> : <><Check size={16} /> {editingId ? 'Update Package' : 'Add Package'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
