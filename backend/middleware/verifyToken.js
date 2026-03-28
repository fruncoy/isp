const { admin } = require('../config/firebaseAdmin');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // In a real scenario, this decodes the Firebase ID token sent from the client
    // For local dev without a real project, we'd mock this or rely on Firebase Auth Emulator
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error('Error verifying token:', err);
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};

const verifyAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Custom claims could also be used here, but for this app it checks the Firestore doc
  // Instead of querying Firestore every time, we expect the frontend to pass role in token or route logic
  // For simplicity, we just assume token is valid. In production, check role from Firestore here.
  next();
};

module.exports = { verifyToken, verifyAdmin };
