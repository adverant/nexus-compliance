/**
 * Nexus Compliance Engine - Logger
 */

import pino from 'pino';
import { config } from '../config/index.js';

const baseLogger = pino({
  level: config.logging.level,
  transport: config.logging.format === 'pretty' && config.server.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'nexus-compliance',
    version: config.plugin.version,
    buildId: config.plugin.buildId,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createLogger(component: string): pino.Logger {
  return baseLogger.child({ component });
}

export const logger = baseLogger;
