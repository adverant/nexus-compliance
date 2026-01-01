/**
 * Nexus Compliance Engine - Configuration API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { complianceToggleService } from '../../services/compliance-toggle-service.js';
import { createLogger } from '../../utils/logger.js';
import type { ComplianceServiceContext, ModuleConfigMap } from '../../types/index.js';

const logger = createLogger('config-routes');

// Request validation schemas
const toggleMasterSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

const toggleModuleSchema = z.object({
  module: z.enum(['gdpr', 'aiAct', 'nis2', 'iso27001', 'soc2', 'hipaa']),
  enabled: z.boolean(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  feature: z.string().optional(),
});

const auditQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  action: z.string().optional(),
  module: z.string().optional(),
});

function getContext(request: FastifyRequest): ComplianceServiceContext {
  const tenantId = (request.headers['x-tenant-id'] as string) ||
    (request.headers['x-user-id'] as string) ||
    'default';
  const userId = (request.headers['x-user-id'] as string) || 'system';
  const requestId = (request.headers['x-request-id'] as string) || request.id;
  const sessionId = request.headers['x-session-id'] as string | undefined;
  const ipAddress = request.ip;
  const userAgent = request.headers['user-agent'];

  return { tenantId, userId, requestId, sessionId, ipAddress, userAgent };
}

export async function configRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/compliance/config
   * Get compliance configuration for the current tenant
   */
  fastify.get('/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = getContext(request);

    try {
      const config = await complianceToggleService.getConfig(context.tenantId);

      return reply.status(200).send({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error({ err: error, tenantId: context.tenantId }, 'Failed to get config');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve compliance configuration',
      });
    }
  });

  /**
   * PUT /api/v1/compliance/config/master
   * Toggle master compliance switch (requires admin role)
   */
  fastify.put(
    '/config/master',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const context = getContext(request);

      try {
        const body = toggleMasterSchema.parse(request.body);

        const config = await complianceToggleService.toggleMaster(context, body);

        logger.info(
          { tenantId: context.tenantId, userId: context.userId, enabled: body.enabled },
          'Master compliance toggle updated'
        );

        return reply.status(200).send({
          success: true,
          data: config,
          message: `Master compliance ${body.enabled ? 'enabled' : 'disabled'}`,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
        }

        logger.error({ err: error, tenantId: context.tenantId }, 'Failed to toggle master');
        return reply.status(500).send({
          success: false,
          error: 'Failed to update master compliance toggle',
        });
      }
    }
  );

  /**
   * PUT /api/v1/compliance/config
   * Toggle a specific compliance module or feature
   */
  fastify.put('/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = getContext(request);

    try {
      const body = toggleModuleSchema.parse(request.body);

      const config = await complianceToggleService.toggleModule(context, {
        module: body.module as keyof ModuleConfigMap,
        enabled: body.enabled,
        reason: body.reason,
        feature: body.feature,
      });

      const target = body.feature
        ? `${body.module}.${body.feature}`
        : body.module;

      logger.info(
        {
          tenantId: context.tenantId,
          userId: context.userId,
          module: body.module,
          feature: body.feature,
          enabled: body.enabled,
        },
        'Module toggle updated'
      );

      return reply.status(200).send({
        success: true,
        data: config,
        message: `Compliance module ${target} ${body.enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      logger.error({ err: error, tenantId: context.tenantId }, 'Failed to toggle module');
      return reply.status(500).send({
        success: false,
        error: 'Failed to update compliance module toggle',
      });
    }
  });

  /**
   * GET /api/v1/compliance/config/enabled/:module
   * Check if a specific module is enabled
   */
  fastify.get<{
    Params: { module: string };
    Querystring: { feature?: string };
  }>(
    '/config/enabled/:module',
    async (request, reply: FastifyReply) => {
      const context = getContext(request);
      const { module } = request.params;
      const { feature } = request.query;

      try {
        const validModules = ['gdpr', 'aiAct', 'nis2', 'iso27001', 'soc2', 'hipaa'];
        if (!validModules.includes(module)) {
          return reply.status(400).send({
            success: false,
            error: `Invalid module: ${module}`,
          });
        }

        const enabled = await complianceToggleService.isEnabled(
          context.tenantId,
          module as keyof ModuleConfigMap,
          feature
        );

        return reply.status(200).send({
          success: true,
          data: {
            module,
            feature: feature ?? null,
            enabled,
          },
        });
      } catch (error) {
        logger.error({ err: error, tenantId: context.tenantId, module }, 'Failed to check enabled status');
        return reply.status(500).send({
          success: false,
          error: 'Failed to check module enabled status',
        });
      }
    }
  );

  /**
   * GET /api/v1/compliance/config/audit
   * Get configuration audit log
   */
  fastify.get<{
    Querystring: {
      limit?: string;
      offset?: string;
      action?: string;
      module?: string;
    };
  }>('/config/audit', async (request, reply: FastifyReply) => {
    const context = getContext(request);

    try {
      const params = auditQuerySchema.parse(request.query);

      const { audits, total } = await complianceToggleService.getAuditLog(
        context.tenantId,
        params
      );

      return reply.status(200).send({
        success: true,
        data: audits,
        pagination: {
          total,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + audits.length < total,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      logger.error({ err: error, tenantId: context.tenantId }, 'Failed to get audit log');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve audit log',
      });
    }
  });
}
