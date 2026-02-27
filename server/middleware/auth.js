const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'volvo-ops-secret-key-change-in-production';

// 驗證 JWT Token
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未提供認證 Token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token 無效或已過期' });
  }
};

// 限制管理者
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '需要管理者權限' });
  }
  next();
};

// 產生 Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, branch: user.branch },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = { authenticate, adminOnly, generateToken, JWT_SECRET };
