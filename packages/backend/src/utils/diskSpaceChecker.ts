import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);

interface DiskSpace {
  size: number;
  free: number;
  path: string;
}

export async function checkDiskSpace(path: string): Promise<DiskSpace> {
  try {
    // For Unix-like systems (Linux, macOS)
    const { stdout } = await execAsync(`df -k "${path}"`);
    const lines = stdout.trim().split('\n');
    const stats = lines[1].split(/\s+/);
    
    // Convert from KB to bytes
    const size = parseInt(stats[1], 10) * 1024;
    const free = parseInt(stats[3], 10) * 1024;

    return {
      size,
      free,
      path
    };
  } catch (error) {
    logger.error('Failed to check disk space:', error);
    // Return default values
    return {
      size: 0,
      free: 0,
      path
    };
  }
} 