const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// GET /api/sales
router.get('/', async (req, res) => {
  try {
    const { repId } = req.query;
    let queryRef = db.collection('sales');
    
    if (repId) {
      queryRef = queryRef.where('repId', '==', repId);
    }
    
    const snapshot = await queryRef.orderBy('date', 'desc').get();
    const sales = [];
    
    snapshot.forEach(doc => {
      sales.push({ id: doc.id, ...doc.data() });
    });
    
    res.status(200).json(sales);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
