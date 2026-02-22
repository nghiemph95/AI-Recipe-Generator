import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware: verify JWT and attach user to req.user
 * Expects: Authorization: Bearer <token>
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Optional middleware: require auth only if token present
 * Use for routes that behave differently for logged-in users
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    req.user = null;
    next();
  }
}
