import { Router } from 'express';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';

export function createHealthRoutes() {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      // Check database connection
      const dbStatus = await checkDatabaseHealth();
      
      // Check memory usage
      const memoryStatus = checkMemoryHealth();
      
      // Get system metrics
      const metrics = getSystemMetrics();

      const status = {
        status: dbStatus.isHealthy && memoryStatus.isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          memory: memoryStatus
        },
        metrics
      };

      const statusCode = status.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(status);
    } catch (error: any) {
      logger.error('Health check failed', { error });
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message || 'Unknown error'
      });
    }
  });

  return router;
}

async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();
    await AppDataSource.query('SELECT 1');
    const latency = Date.now() - startTime;

    return {
      isHealthy: true,
      latency,
      connections: (AppDataSource.driver as any).pool?.size || 0
    };
  } catch (error: any) {
    return {
      isHealthy: false,
      error: error.message || 'Database check failed',
      connections: 0
    };
  }
}

function checkMemoryHealth() {
  const used = process.memoryUsage();
  const maxHeapMatch = process.env.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/);
  const maxHeapMB = maxHeapMatch ? parseInt(maxHeapMatch[1], 10) : 2048;
  const heapUsedPercent = (used.heapUsed / (maxHeapMB * 1024 * 1024)) * 100;

  return {
    isHealthy: heapUsedPercent < 90, // Alert if heap usage is above 90%
    metrics: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
      heapUsedPercent: Math.round(heapUsedPercent)
    }
  };
}

function getSystemMetrics() {
  return {
    uptime: process.uptime(),
    cpuUsage: process.cpuUsage(),
    resourceUsage: process.resourceUsage(),
    platform: process.platform,
    version: process.version,
    env: process.env.NODE_ENV
  };
} 