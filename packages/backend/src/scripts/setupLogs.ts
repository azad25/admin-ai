import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const LOGS_DIR = path.join(process.cwd(), 'logs');
const LOG_TYPES = ['error', 'combined', 'auth', 'metrics', 'exceptions', 'rejections'];

export function setupLogsDirectory(): void {
  try {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
      logger.info('Created logs directory');
    }

    // Set proper permissions (readable/writable by owner and group)
    fs.chmodSync(LOGS_DIR, 0o770);
    logger.info('Set permissions for logs directory');

    // Create placeholder files for each log type
    LOG_TYPES.forEach(type => {
      const currentDate = new Date().toISOString().split('T')[0];
      const logFile = path.join(LOGS_DIR, `${type}-${currentDate}.log`);
      
      if (!fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, '', { mode: 0o660 });
        logger.info(`Created log file: ${logFile}`);
      }
    });

    // Create .gitignore if it doesn't exist
    const gitignorePath = path.join(LOGS_DIR, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, '*.log\n');
      logger.info('Created .gitignore for logs directory');
    }

    logger.info('Logs directory setup completed successfully');
  } catch (error) {
    logger.error('Failed to set up logs directory:', error);
    throw error;
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupLogsDirectory();
} 