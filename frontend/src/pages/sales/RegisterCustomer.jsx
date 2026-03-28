import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function RegisterCustomer() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    package: 'Basic 10Mbps',
    notes: ''
  });

  const packages = ['Basic 10Mbps', 'Standard 25Mbps', 'Premium 50Mbps', 'Business 100Mbps'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'customers'), {
        ...formData,
        repId: userProfile.uid,
        repName: userProfile.name,
        status: 'active',
        createdAt: serverTimestamp()
      });
      
      toast.success('Customer registered successfully');
      navigate('/sales/my-customers');
    } catch (err) {
      toast.error('Failed to register customer: ' + err.message);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Register New Customer</h1>
          <p>Fill out the details below to onboard a new ISP subscriber.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input 
                type="text" 
                className="form-input" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input 
                type="tel" 
                className="form-input" 
                required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Optional)</label>
            <input 
              type="email" 
              className="form-input" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Installation Address *</label>
            <textarea 
              className="form-textarea" 
              required
              rows={2}
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label">Internet Package Selected *</label>
            <select 
              className="form-select"
              value={formData.package}
              onChange={e => setFormData({...formData, package: e.target.value})}
            >
              {packages.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 -20px 24px' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => navigate('/sales/dashboard')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={16} className="spinner-lucide" /> Processing...</> : <><CheckCircle2 size={16} /> Complete Registration</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
