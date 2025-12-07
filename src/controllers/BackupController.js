import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execPromise = promisify(exec);

class BackupController {
  /**
   * Create a database backup
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createBackup(req, res) {
    try {
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '3306';
      const dbUser = process.env.DB_USER || 'root';
      const dbPassword = process.env.DB_PASSWORD || '1234';
      const dbName = process.env.DB_NAME || 'pharmacy_pos';

      // Create backups directory if it doesn't exist
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Generate backup filename with timestamp
      const timestamp =
        new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] +
        '_' +
        new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const backupFileName = `backup_${dbName}_${timestamp}.sql`;
      const backupFilePath = path.join(backupDir, backupFileName);

      // Build mysqldump command
      const mysqldumpCmd = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} ${
        dbPassword ? `-p${dbPassword}` : ''
      } ${dbName} > "${backupFilePath}"`;

      // Execute backup
      await execPromise(mysqldumpCmd);

      // Check if backup file was created
      if (!fs.existsSync(backupFilePath)) {
        throw new Error('Backup file was not created');
      }

      // Get file size
      const stats = fs.statSync(backupFilePath);
      const fileSizeInBytes = stats.size;
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

      res.json({
        success: true,
        message: 'Database backup created successfully',
        data: {
          fileName: backupFileName,
          filePath: backupFilePath,
          fileSize: fileSizeInMB + ' MB',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('BackupController.createBackup error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create database backup',
      });
    }
  }

  /**
   * Download a backup file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async downloadBackup(req, res) {
    try {
      const { fileName } = req.params;

      // Security: validate filename to prevent directory traversal
      if (
        !fileName ||
        fileName.includes('..') ||
        fileName.includes('/') ||
        fileName.includes('\\')
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename',
        });
      }

      const backupDir = path.join(process.cwd(), 'backups');
      const filePath = path.join(backupDir, fileName);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Backup file not found',
        });
      }

      // Send file for download
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Error downloading backup:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Failed to download backup file',
            });
          }
        }
      });
    } catch (error) {
      console.error('BackupController.downloadBackup error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to download backup',
      });
    }
  }

  /**
   * List all available backups
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async listBackups(req, res) {
    try {
      const backupDir = path.join(process.cwd(), 'backups');

      // Create directory if it doesn't exist
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        return res.json({
          success: true,
          data: [],
        });
      }

      // Read all files in backup directory
      const files = fs.readdirSync(backupDir);

      // Filter only .sql files and get their details
      const backups = files
        .filter((file) => file.endsWith('.sql'))
        .map((file) => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            fileName: file,
            fileSize: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by newest first

      res.json({
        success: true,
        data: backups,
      });
    } catch (error) {
      console.error('BackupController.listBackups error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to list backups',
      });
    }
  }

  /**
   * Delete a backup file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteBackup(req, res) {
    try {
      const { fileName } = req.params;

      // Security: validate filename to prevent directory traversal
      if (
        !fileName ||
        fileName.includes('..') ||
        fileName.includes('/') ||
        fileName.includes('\\')
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename',
        });
      }

      const backupDir = path.join(process.cwd(), 'backups');
      const filePath = path.join(backupDir, fileName);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Backup file not found',
        });
      }

      // Delete the file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        message: 'Backup deleted successfully',
      });
    } catch (error) {
      console.error('BackupController.deleteBackup error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete backup',
      });
    }
  }
}

export default new BackupController();
