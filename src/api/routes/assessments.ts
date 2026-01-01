/**
 * Nexus Compliance Engine - Assessment API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { assessmentService } from '../../services/assessment-service.js';
import { reportService } from '../../services/report-service.js';
import { createLogger } from '../../utils/logger.js';
import type { ComplianceServiceContext } from '../../types/index.js';

const logger = createLogger('assessment-routes');

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

const createAssessmentSchema = z.object({
  frameworkId: z.string().min(1),
  targetSystemId: z.string().min(1),
  targetSystemName: z.string().min(1),
  targetSystemDescription: z.string().optional(),
  scope: z.array(z.string()).optional(),
  excludedControls: z.array(z.string()).optional(),
});

const runAssessmentSchema = z.object({
  useAI: z.boolean().default(true),
  aiModel: z.string().optional(),
  includeRecommendations: z.boolean().default(true),
});

const listQuerySchema = z.object({
  frameworkId: z.string().optional(),
  targetSystemId: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const findingsQuerySchema = z.object({
  status: z.enum(['compliant', 'non_compliant', 'partial', 'not_applicable', 'not_assessed']).optional(),
  severity: z.enum(['critical', 'major', 'minor', 'observation']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const generateReportSchema = z.object({
  assessmentId: z.string().optional(),
  reportType: z.enum(['executive_summary', 'full_audit', 'gap_analysis', 'remediation_plan', 'board_presentation']),
  format: z.enum(['pdf', 'html', 'markdown', 'json']),
  includeEvidence: z.boolean().default(false),
  includeRemediation: z.boolean().default(true),
  recipientEmail: z.string().email().optional(),
});

export async function assessmentRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/compliance/assessments
   * Create a new compliance assessment
   */
  fastify.post('/assessments', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = getContext(request);

    try {
      const body = createAssessmentSchema.parse(request.body);

      const assessment = await assessmentService.createAssessment(context, body);

      return reply.status(201).send({
        success: true,
        data: assessment,
        message: 'Assessment created. Use POST /assessments/:id/run to execute.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      logger.error({ err: error, tenantId: context.tenantId }, 'Failed to create assessment');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create assessment',
      });
    }
  });

  /**
   * GET /api/v1/compliance/assessments
   * List assessments for tenant
   */
  fastify.get<{
    Querystring: {
      frameworkId?: string;
      targetSystemId?: string;
      status?: string;
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: string;
    };
  }>('/assessments', async (request, reply: FastifyReply) => {
    const context = getContext(request);

    try {
      const params = listQuerySchema.parse(request.query);

      const result = await assessmentService.listAssessments(context.tenantId, params);

      return reply.status(200).send({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      logger.error({ err: error, tenantId: context.tenantId }, 'Failed to list assessments');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve assessments',
      });
    }
  });

  /**
   * GET /api/v1/compliance/assessments/:assessmentId
   * Get assessment details
   */
  fastify.get<{
    Params: { assessmentId: string };
  }>('/assessments/:assessmentId', async (request, reply: FastifyReply) => {
    const context = getContext(request);
    const { assessmentId } = request.params;

    try {
      const assessment = await assessmentService.getAssessment(
        context.tenantId,
        assessmentId
      );

      if (!assessment) {
        return reply.status(404).send({
          success: false,
          error: `Assessment not found: ${assessmentId}`,
        });
      }

      return reply.status(200).send({
        success: true,
        data: assessment,
      });
    } catch (error) {
      logger.error({ err: error, tenantId: context.tenantId, assessmentId }, 'Failed to get assessment');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve assessment',
      });
    }
  });

  /**
   * POST /api/v1/compliance/assessments/:assessmentId/run
   * Execute a compliance assessment
   */
  fastify.post<{
    Params: { assessmentId: string };
  }>('/assessments/:assessmentId/run', async (request, reply: FastifyReply) => {
    const context = getContext(request);
    const { assessmentId } = request.params;

    try {
      const body = runAssessmentSchema.parse(request.body ?? {});

      const assessment = await assessmentService.runAssessment(
        context,
        assessmentId,
        body
      );

      return reply.status(200).send({
        success: true,
        data: assessment,
        message: `Assessment completed with score: ${assessment.overallScore}%`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      logger.error({ err: error, tenantId: context.tenantId, assessmentId }, 'Failed to run assessment');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run assessment',
      });
    }
  });

  /**
   * GET /api/v1/compliance/assessments/:assessmentId/findings
   * Get findings for an assessment
   */
  fastify.get<{
    Params: { assessmentId: string };
    Querystring: {
      status?: string;
      severity?: string;
      page?: string;
      limit?: string;
    };
  }>('/assessments/:assessmentId/findings', async (request, reply: FastifyReply) => {
    const context = getContext(request);
    const { assessmentId } = request.params;

    try {
      const params = findingsQuerySchema.parse(request.query);

      const result = await assessmentService.getFindings(
        context.tenantId,
        assessmentId,
        params
      );

      return reply.status(200).send({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      logger.error({ err: error, tenantId: context.tenantId, assessmentId }, 'Failed to get findings');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve findings',
      });
    }
  });

  /**
   * POST /api/v1/compliance/reports/generate
   * Generate a compliance report
   */
  fastify.post('/reports/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = getContext(request);

    try {
      const body = generateReportSchema.parse(request.body);

      const report = await reportService.generateReport(context, body);

      return reply.status(201).send({
        success: true,
        data: report,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      logger.error({ err: error, tenantId: context.tenantId }, 'Failed to generate report');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  });

  /**
   * GET /api/v1/compliance/reports
   * List generated reports
   */
  fastify.get<{
    Querystring: {
      reportType?: string;
      format?: string;
      limit?: string;
      offset?: string;
    };
  }>('/reports', async (request, reply: FastifyReply) => {
    const context = getContext(request);

    try {
      const { reportType, format, limit = '20', offset = '0' } = request.query;

      const result = await reportService.listReports(context.tenantId, {
        reportType: reportType as any,
        format: format as any,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

      return reply.status(200).send({
        success: true,
        data: result.reports,
        total: result.total,
      });
    } catch (error) {
      logger.error({ err: error, tenantId: context.tenantId }, 'Failed to list reports');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve reports',
      });
    }
  });

  /**
   * GET /api/v1/compliance/reports/:reportId
   * Get report details
   */
  fastify.get<{
    Params: { reportId: string };
  }>('/reports/:reportId', async (request, reply: FastifyReply) => {
    const context = getContext(request);
    const { reportId } = request.params;

    try {
      const report = await reportService.getReport(context.tenantId, reportId);

      if (!report) {
        return reply.status(404).send({
          success: false,
          error: `Report not found: ${reportId}`,
        });
      }

      return reply.status(200).send({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error({ err: error, tenantId: context.tenantId, reportId }, 'Failed to get report');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve report',
      });
    }
  });
}
