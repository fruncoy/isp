const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const { repId, customerId } = req.query;
    let queryRef = db.collection('payments');
    
    if (repId) queryRef = queryRef.where('repId', '==', repId);
    if (customerId) queryRef = queryRef.where('customerId', '==', customerId);
    
    const snapshot = await queryRef.orderBy('date', 'desc').get();
    const payments = [];
    
    snapshot.forEach(doc => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    
    res.status(200).json(payments);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
