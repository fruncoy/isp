import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function RecordPayment() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    amount: '',
    method: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (userProfile?.uid) fetchCustomers();
  }, [userProfile]);

  const fetchCustomers = async () => {
    try {
      const q = query(collection(db, 'customers'), where('repId', '==', userProfile.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const cust = customers.find(c => c.id === custId);
    setFormData({
      ...formData,
      customerId: custId,
      customerName: cust ? cust.name : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId) return toast.error('Please select a customer');

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'payments'), {
        ...formData,
        amount: Number(formData.amount),
        repId: userProfile.uid,
        repName: userProfile.name,
        date: new Date(formData.date),
        createdAt: serverTimestamp()
      });
      
      toast.success('Payment recorded successfully');
      navigate('/sales/dashboard');
    } catch (err) {
      toast.error('Failed to record payment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Record Payment Collection</h1>
          <p>Log a payment collected from your customer.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Customer *</label>
            <select 
              className="form-select"
              required
              value={formData.customerId}
              onChange={handleCustomerChange}
            >
              <option value="">-- Choose a customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Amount Collected ($) *</label>
              <input 
                type="number" 
                className="form-input" 
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select 
                className="form-select"
                value={formData.method}
                onChange={e => setFormData({...formData, method: e.target.value})}
              >
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money M-Pesa</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Collection Date *</label>
            <input 
              type="date" 
              className="form-input" 
              required
              style={{ maxWidth: '300px' }}
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label">Receipt Notes (Optional)</label>
            <textarea 
              className="form-textarea" 
              rows={2}
              placeholder="e.g. Cleared balance for March"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
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
              {isSubmitting ? <><Loader2 size={16} className="spinner-lucide" /> Recording...</> : <><CheckCircle2 size={16} /> Record Payment</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
