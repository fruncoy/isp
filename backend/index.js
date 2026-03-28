const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const salesRoutes = require('./routes/sales');
const paymentRoutes = require('./routes/payments');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/payments', paymentRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('ISP Dashboard API is running');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
