
const User = require('../models/User');

// authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header received:', authHeader); // Debug log
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted:', token); // Debug log

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded); // Debug log

    req.user = decoded;
    next();
  } catch (error) {
    console.log('Token verification error:', error); // Debug log
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authenticateUser;
