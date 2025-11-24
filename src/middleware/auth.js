import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format.',
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, jwtConfig.secret);

      // Attach user info to request
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

/**
 * Optional Authentication
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, jwtConfig.secret);
        req.user = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        };
      } catch (error) {
        // Invalid token, but continue without user
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
};

/**
 * Role-based Authorization Middleware
 * @param {string[]} roles - Array of allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
};

export default { authenticate, optionalAuthenticate, authorize };
