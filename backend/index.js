const express = require('express');
const cors = require('cors');
const path = require('path');
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
const paystackRoutes = require('./routes/paystack');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/paystack', paystackRoutes);

// SERVE FRONTEND (One-Place Hosting)
// In production, we serve the built frontend files from the dist folder
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  // Root Endpoint for development
  app.get('/', (req, res) => {
    res.send('ISP Dashboard API is running (Development Mode)');
  });
}

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
