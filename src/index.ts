/**
 * Nexus Compliance Engine
 * EU Regulatory Compliance Plugin for GDPR, AI Act, NIS2, ISO 27001
 *
 * @author Adverant
 * @license MIT
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config/index.js';
import { createLogger } from './utils/logger.js';
import { closePool, getPool } from './database/client.js';
import {
  healthRoutes,
  configRoutes,
  frameworkRoutes,
  aiSystemsRoutes,
  assessmentRoutes,
} from './api/routes/index.js';

const logger = createLogger('main');

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: false, // We use our own logger
    requestIdHeader: 'x-request-id',
    trustProxy: true,
  });

  // Register plugins
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  await server.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Request logging
  server.addHook('onRequest', async (request, _reply) => {
    logger.debug({
      method: request.method,
      url: request.url,
      requestId: request.id,
      userId: request.headers['x-user-id'],
    }, 'Incoming request');
  });

  server.addHook('onResponse', async (request, reply) => {
    logger.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      requestId: request.id,
    }, 'Request completed');
  });

  // Error handler
  server.setErrorHandler((error: Error & { statusCode?: number; code?: string }, _request, reply) => {
    logger.error({ err: error }, 'Request error');

    reply.status(error.statusCode ?? 500).send({
      success: false,
      error: error.message ?? 'Internal server error',
      code: error.code,
    });
  });

  // Register routes
  await server.register(healthRoutes);
  await server.register(configRoutes, { prefix: '/api/v1/compliance' });
  await server.register(frameworkRoutes, { prefix: '/api/v1/compliance' });
  await server.register(aiSystemsRoutes, { prefix: '/api/v1/compliance' });
  await server.register(assessmentRoutes, { prefix: '/api/v1/compliance' });

  // Root endpoint
  server.get('/', async (_request, reply) => {
    return reply.send({
      name: 'nexus-compliance',
      displayName: 'Nexus Compliance Engine',
      version: config.plugin.version,
      status: 'running',
    });
  });

  return server;
}

async function start(): Promise<void> {
  logger.info({
    version: config.plugin.version,
    buildId: config.plugin.buildId,
    nodeEnv: config.server.nodeEnv,
  }, 'Starting Nexus Compliance Engine');

  try {
    // Initialize database connection
    const pool = getPool();
    await pool.query('SELECT 1');
    logger.info('Database connection established');

    // Build and start server
    const server = await buildServer();

    await server.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info({
      host: config.server.host,
      port: config.server.port,
    }, 'Nexus Compliance Engine started');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');

      try {
        await server.close();
        await closePool();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

start();
