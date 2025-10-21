// [2025-10-09] - Authentication Middleware
// Simple JWT authentication middleware for protecting routes

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,  // Fixed: use userId consistently
      id: decoded.userId,      // Keep id for backwards compatibility
      email: decoded.email
    };
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

module.exports = {
  authenticateToken
};
