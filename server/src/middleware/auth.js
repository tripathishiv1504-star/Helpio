import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { User } from '../models/index.js';
import { fail } from '../utils/response.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return fail(res, 401, 'Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return fail(res, 401, 'Invalid or expired token');
    }

    const user = await User.findById(decoded.id).lean();
    if (!user) {
      return fail(res, 401, 'User no longer exists');
    }

    if (user.status === 'suspended') {
      return fail(res, 403, 'Account is suspended. Please contact support.');
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles || [],
      status: user.status,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return fail(
        res,
        403,
        `Forbidden: requires one of the following roles: [${roles.join(', ')}]`
      );
    }

    next();
  };
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return next();
    }

    const user = await User.findById(decoded.id).lean();
    if (user && user.status !== 'suspended') {
      req.user = {
        _id: user._id,
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.roles || [],
        status: user.status,
      };
    }

    next();
  } catch (err) {
    next(err);
  }
}

export default {
  requireAuth,
  requireRole,
  optionalAuth,
};
