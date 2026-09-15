const jwt = require('jsonwebtoken');

// Verifies the JWT and attaches { id, role } to req.user
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'apses_dev_jwt_secret_atbu_2026');
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Restricts a route to one or more roles: authorize('admin'), authorize('supervisor','panel')
// Academic reciprocity: supervisors and panel members are academic staff and share project supervision/evaluation duties.
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    const userRole = req.user.role;
    const effectiveRoles = (userRole === 'supervisor' || userRole === 'panel')
      ? [userRole, 'supervisor', 'panel']
      : [userRole];

    const hasAccess = allowedRoles.some(r => effectiveRoles.includes(r));
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = {
  authenticate,
  auth: authenticate,
  authorize,
  requireRole: authorize
};
