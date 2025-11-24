import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { User } from '../database/models/index.js';

class AuthController {
  /**
   * Login user and generate JWT token
   */
  static async login(username, password) {
    try {
      if (!username || !password) {
        return {
          success: false,
          message: 'Username and password are required',
        };
      }

      // Find user by username
      const user = await User.findOne({ where: { username } });

      if (!user) {
        return {
          success: false,
          message: 'Invalid username or password',
        };
      }

      // Check if user is active
      if (user.status !== 'active') {
        return {
          success: false,
          message: 'Your account has been deactivated',
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid username or password',
        };
      }

      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      };

      const token = jwt.sign(tokenPayload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
        algorithm: jwtConfig.algorithm,
      });

      // Update last login
      await user.update({ last_login: new Date() });

      // Return user data (without password) and token
      const userData = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      };

      return {
        success: true,
        message: 'Login successful',
        user: userData,
        token,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed',
        error: error.message,
      };
    }
  }

  /**
   * Logout user (client-side token removal)
   */
  static async logout() {
    try {
      // With JWT, logout is handled client-side by removing the token
      // This is just for consistency with the API
      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Logout failed',
      };
    }
  }

  /**
   * Get current user from token
   */
  static async getCurrentUser(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'full_name', 'role', 'status', 'created_at', 'last_login'],
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        message: 'Failed to get user information',
      };
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      if (!currentPassword || !newPassword) {
        return {
          success: false,
          message: 'Current password and new password are required',
        };
      }

      if (newPassword.length < 6) {
        return {
          success: false,
          message: 'New password must be at least 6 characters long',
        };
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await user.update({ password: hashedPassword });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Failed to change password',
        error: error.message,
      };
    }
  }

  /**
   * Check if this is first run (no users exist)
   */
  static async checkFirstRun() {
    try {
      const userCount = await User.count();

      return {
        success: true,
        isFirstRun: userCount === 0,
      };
    } catch (error) {
      console.error('Check first run error:', error);
      return {
        success: false,
        isFirstRun: false,
        error: error.message,
      };
    }
  }

  /**
   * Register new user (admin only)
   */
  static async register(userData) {
    try {
      const { username, password, full_name, role = 'user' } = userData;

      // Validate required fields
      if (!username || !password || !full_name) {
        return {
          success: false,
          message: 'Username, password, and full name are required',
        };
      }

      // Check if username already exists
      const existingUser = await User.findOne({ where: { username } });

      if (existingUser) {
        return {
          success: false,
          message: 'Username already exists',
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        username,
        password: hashedPassword,
        full_name,
        role,
        status: 'active',
      });

      return {
        success: true,
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: 'Failed to register user',
        error: error.message,
      };
    }
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret);
      return {
        success: true,
        decoded,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Generate new JWT token
   */
  static generateToken(payload) {
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
      algorithm: jwtConfig.algorithm,
    });
  }
}

export default AuthController;
