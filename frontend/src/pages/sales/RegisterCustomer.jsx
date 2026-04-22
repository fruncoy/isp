import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Loader2, CheckCircle2, CreditCard, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function RegisterCustomer() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    packageId: '',
    notes: '',
    recordPayment: false,
    paymentAmount: '',
    paymentMethod: 'Mobile Money'
  });

  useEffect(() => {
    const q = query(collection(db, 'packages'), orderBy('price', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPackages(data);
      if (data.length > 0 && !formData.packageId) {
        setFormData(prev => ({ 
          ...prev, 
          packageId: data[0].id,
          paymentAmount: data[0].price
        }));
      }
      setLoadingPackages(false);
    });
    return () => unsub();
  }, []);

  const handlePackageChange = (e) => {
    const pkgId = e.target.value;
    const pkg = packages.find(p => p.id === pkgId);
    setFormData({
      ...formData,
      packageId: pkgId,
      paymentAmount: pkg ? pkg.price : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedPackage = packages.find(p => p.id === formData.packageId);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);

      // 1. Create Customer
      const customerRef = await addDoc(collection(db, 'customers'), {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        notes: formData.notes,
        currentPackage: selectedPackage?.name || '',
        currentSpeed: selectedPackage?.speed || '',
        currentPrice: selectedPackage?.price || 0,
        expiryDate: expiry,
        repId: userProfile.uid,
        repName: userProfile.name,
        status: 'active',
        createdAt: serverTimestamp()
      });

      // 2. Record Sale (New Installation)
      await addDoc(collection(db, 'sales'), {
        customerId: customerRef.id,
        customerName: formData.name,
        packageId: formData.packageId,
        package: selectedPackage?.name || '',
        amount: selectedPackage?.price || 0,
        type: 'New Install',
        repId: userProfile.uid,
        repName: userProfile.name,
        date: new Date(),
        createdAt: serverTimestamp()
      });

      // 3. Record Payment (Optional)
      if (formData.recordPayment && formData.paymentAmount) {
        await addDoc(collection(db, 'payments'), {
          customerId: customerRef.id,
          customerName: formData.name,
          amount: Number(formData.paymentAmount),
          method: formData.paymentMethod,
          repId: userProfile.uid,
          repName: userProfile.name,
          date: new Date(),
          createdAt: serverTimestamp()
        });
      }
      
      // 4. Log Action
      await addDoc(collection(db, 'logs'), {
        action: 'customer_registered',
        repId: userProfile.uid,
        repName: userProfile.name,
        text: `Registered and activated customer: ${formData.name} (${selectedPackage?.name})`,
        timestamp: serverTimestamp()
      });

      toast.success('Customer registered and activated successfully');
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
          <h1>Register & Activate Customer</h1>
          <p>Onboard a new subscriber and record their first service installation.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="nav-section-label" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} /> Basic Information
          </div>
          
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
              <label className="form-label">Phone Number (254...) *</label>
              <input 
                type="tel" 
                className="form-input" 
                required
                placeholder="254712345678"
                pattern="^254\d{9}$"
                title="Phone number must start with 254 followed by 9 digits"
                maxLength={12}
                value={formData.phone}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 12) setFormData({...formData, phone: val});
                }}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input 
                type="email" 
                className="form-input" 
                required
                placeholder="customer@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Installation Address *</label>
              <input 
                className="form-input" 
                required
                placeholder="Building, House No, Street"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
          </div>

          <div className="nav-section-label" style={{ margin: '24px 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={16} /> Service Activation
          </div>

          <div className="form-group">
            <label className="form-label">Initial Internet Package *</label>
            <select 
              className="form-select"
              value={formData.packageId}
              onChange={handlePackageChange}
              disabled={loadingPackages}
            >
              {loadingPackages ? <option>Loading packages...</option> : 
                packages.map(p => <option key={p.id} value={p.id}>{p.name} - {p.speed} (KES {p.price?.toLocaleString()})</option>)
              }
            </select>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Registration automatically records a "New Install" sale and sets a 30-day expiry.
            </p>
          </div>

          <div className="nav-section-label" style={{ margin: '24px 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={16} /> Initial Payment (Optional)
          </div>

          <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: formData.recordPayment ? '16px' : '0' }}>
              <input 
                type="checkbox" 
                checked={formData.recordPayment}
                onChange={e => setFormData({...formData, recordPayment: e.target.checked})}
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Collect Payment Now</span>
            </label>

            {formData.recordPayment && (
              <div className="form-grid" style={{ marginTop: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Amount (KES)</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={formData.paymentAmount}
                    onChange={e => setFormData({...formData, paymentAmount: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select 
                    className="form-select"
                    value={formData.paymentMethod}
                    onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                  >
                    <option value="Mobile Money">M-Pesa</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '32px -20px 24px' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => navigate('/sales/my-customers')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={16} className="spinner-lucide" /> Processing...</> : <><CheckCircle2 size={16} /> Register & Activate</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

