import { User } from '../database/models/index.js';

class UserController {
  /**
   * Authenticate user with username and password
   */
  async login(username, password) {
    try {
      // Find user by username
      const user = await User.findOne({
        where: { username, status: 'active' },
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid username or password',
        };
      }

      // Verify password
      const isPasswordValid = await user.verifyPassword(password);

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid username or password',
        };
      }

      // Return user data (excluding password)
      const userData = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        status: user.status,
      };

      return {
        success: true,
        message: 'Login successful',
        user: userData,
        token: `token_${user.id}_${Date.now()}`, // Simple token for session
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login',
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      return {
        success: true,
        user: user.toJSON(),
      };
    } catch (error) {
      console.error('Get user error:', error);
      return {
        success: false,
        message: 'An error occurred while fetching user',
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Verify current password
      const isPasswordValid = await user.verifyPassword(currentPassword);

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }

      // Validate new password
      if (newPassword.length < 6) {
        return {
          success: false,
          message: 'New password must be at least 6 characters long',
        };
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'An error occurred while changing password',
      };
    }
  }

  /**
   * Check if this is first run (no users exist)
   */
  async checkFirstRun() {
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
      };
    }
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']],
      });

      const plainUsers = users.map((user) => user.toJSON());

      return {
        success: true,
        users: plainUsers,
      };
    } catch (error) {
      console.error('Get all users error:', error);
      return {
        success: false,
        message: 'An error occurred while fetching users',
      };
    }
  }
}

export default new UserController();
