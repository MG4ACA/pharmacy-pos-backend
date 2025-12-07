import express from 'express';
import BackupController from '../controllers/BackupController.js';

const router = express.Router();

// Create a new backup
router.post('/', BackupController.createBackup);

// List all backups
router.get('/', BackupController.listBackups);

// Download a specific backup
router.get('/download/:fileName', BackupController.downloadBackup);

// Delete a specific backup
router.delete('/:fileName', BackupController.deleteBackup);

export default router;
