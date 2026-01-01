/**
 * Nexus Compliance Engine - Health Check Routes
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { healthCheck as dbHealthCheck } from '../../database/client.js';
import { config } from '../../config/index.js';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  buildId?: string;
  buildTimestamp?: string;
  uptime: number;
  checks: {
    database: boolean;
    ai?: boolean;
  };
  timestamp: string;
}

const startTime = Date.now();

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /health
   * General health check
   */
  fastify.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const dbHealthy = await dbHealthCheck();

    const status: HealthStatus = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      version: config.plugin.version,
      buildId: config.plugin.buildId,
      buildTimestamp: config.plugin.buildTimestamp,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks: {
        database: dbHealthy,
        ai: config.ai.enabled,
      },
      timestamp: new Date().toISOString(),
    };

    const statusCode = status.status === 'healthy' ? 200 : 503;
    return reply.status(statusCode).send(status);
  });

  /**
   * GET /ready
   * Readiness probe for Kubernetes
   */
  fastify.get('/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
    const dbHealthy = await dbHealthCheck();

    if (dbHealthy) {
      return reply.status(200).send({ ready: true });
    }

    return reply.status(503).send({ ready: false, reason: 'Database not available' });
  });

  /**
   * GET /live
   * Liveness probe for Kubernetes
   */
  fastify.get('/live', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Simple liveness - if we can respond, we're alive
    return reply.status(200).send({ alive: true });
  });

  /**
   * GET /info
   * Plugin information endpoint
   */
  fastify.get('/info', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      name: 'nexus-compliance',
      displayName: 'Nexus Compliance Engine',
      description: 'EU Regulatory Compliance Engine for GDPR, AI Act, NIS2, ISO 27001',
      version: config.plugin.version,
      buildId: config.plugin.buildId,
      buildTimestamp: config.plugin.buildTimestamp,
      gitCommit: config.plugin.gitCommit,
      features: {
        gdpr: true,
        aiAct: true,
        nis2: true,
        iso27001: true,
        soc2: config.features.aiAssessment,
        hipaa: config.features.aiAssessment,
        aiAssessment: config.features.aiAssessment,
        continuousMonitoring: config.features.continuousMonitoring,
        reportGeneration: config.features.reportGeneration,
      },
      frameworks: ['GDPR', 'EU AI Act', 'NIS2', 'ISO 27001', 'SOC 2', 'HIPAA'],
      documentation: 'https://docs.adverant.ai/plugins/compliance',
    });
  });
}
