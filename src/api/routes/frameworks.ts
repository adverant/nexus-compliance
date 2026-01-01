/**
 * Nexus Compliance Engine - Framework API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query, snakeToCamel, type DatabaseRow } from '../../database/client.js';
import { createLogger } from '../../utils/logger.js';
import type { ComplianceFramework, ComplianceControl, ControlMapping } from '../../types/index.js';

const logger = createLogger('framework-routes');

function getContext(request: FastifyRequest) {
  const tenantId = (request.headers['x-tenant-id'] as string) ||
    (request.headers['x-user-id'] as string) ||
    'default';
  const userId = (request.headers['x-user-id'] as string) || 'system';
  const requestId = (request.headers['x-request-id'] as string) || request.id;

  return { tenantId, userId, requestId };
}

const listQuerySchema = z.object({
  category: z.string().optional(),
  jurisdiction: z.string().optional(),
  active: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const controlsQuerySchema = z.object({
  domain: z.string().optional(),
  riskCategory: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  automatedOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

function mapRowToFramework(row: DatabaseRow): ComplianceFramework {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    fullName: row['full_name'] as string,
    version: row['version'] as string,
    effectiveDate: row['effective_date'] ? new Date(row['effective_date'] as string) : undefined,
    description: row['description'] as string,
    category: row['category'] as ComplianceFramework['category'],
    jurisdiction: row['jurisdiction'] as ComplianceFramework['jurisdiction'],
    authority: row['authority'] as string | undefined,
    officialUrl: row['official_url'] as string | undefined,
    documentationUrl: row['documentation_url'] as string | undefined,
    totalControls: row['total_controls'] as number,
    criticalControls: row['critical_controls'] as number,
    isActive: row['is_active'] as boolean,
    lastUpdated: row['last_updated'] ? new Date(row['last_updated'] as string) : undefined,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

function mapRowToControl(row: DatabaseRow): ComplianceControl {
  return {
    id: row['id'] as string,
    frameworkId: row['framework_id'] as string,
    controlNumber: row['control_number'] as string,
    domain: row['domain'] as string | undefined,
    subdomain: row['subdomain'] as string | undefined,
    title: row['title'] as string,
    description: row['description'] as string,
    objective: row['objective'] as string | undefined,
    implementationGuidance: row['implementation_guidance'] as string | undefined,
    evidenceRequirements: (typeof row['evidence_requirements'] === 'string'
      ? JSON.parse(row['evidence_requirements'] as string)
      : row['evidence_requirements']) as ComplianceControl['evidenceRequirements'],
    testingProcedures: (typeof row['testing_procedures'] === 'string'
      ? JSON.parse(row['testing_procedures'] as string)
      : row['testing_procedures']) as ComplianceControl['testingProcedures'],
    riskCategory: row['risk_category'] as ComplianceControl['riskCategory'],
    implementationPriority: row['implementation_priority'] as number,
    automatedTestAvailable: row['automated_test_available'] as boolean,
    automatedTestId: row['automated_test_id'] as string | undefined,
    aiAssessmentPrompt: row['ai_assessment_prompt'] as string | undefined,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

export async function frameworkRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/compliance/frameworks
   * List available compliance frameworks
   */
  fastify.get<{
    Querystring: {
      category?: string;
      jurisdiction?: string;
      active?: string;
      limit?: string;
      offset?: string;
    };
  }>('/frameworks', async (request, reply: FastifyReply) => {
    const context = getContext(request);

    try {
      const params = listQuerySchema.parse(request.query);

      let whereClause = 'WHERE 1=1';
      const queryParams: unknown[] = [];
      let paramIndex = 1;

      if (params.category) {
        whereClause += ` AND category = $${paramIndex}`;
        queryParams.push(params.category);
        paramIndex++;
      }

      if (params.jurisdiction) {
        whereClause += ` AND jurisdiction = $${paramIndex}`;
        queryParams.push(params.jurisdiction);
        paramIndex++;
      }

      if (params.active !== undefined) {
        whereClause += ` AND is_active = $${paramIndex}`;
        queryParams.push(params.active);
        paramIndex++;
      }

      // Count total
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM compliance_frameworks ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

      // Get frameworks
      const result = await query<DatabaseRow>(
        `SELECT * FROM compliance_frameworks
         ${whereClause}
         ORDER BY name ASC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, params.limit, params.offset]
      );

      const frameworks = result.rows.map(mapRowToFramework);

      return reply.status(200).send({
        success: true,
        data: frameworks,
        pagination: {
          total,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + frameworks.length < total,
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

      logger.error({ err: error }, 'Failed to list frameworks');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve frameworks',
      });
    }
  });

  /**
   * GET /api/v1/compliance/frameworks/:frameworkId
   * Get framework details
   */
  fastify.get<{
    Params: { frameworkId: string };
  }>('/frameworks/:frameworkId', async (request, reply: FastifyReply) => {
    const { frameworkId } = request.params;

    try {
      const result = await query<DatabaseRow>(
        `SELECT * FROM compliance_frameworks WHERE id = $1`,
        [frameworkId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: `Framework not found: ${frameworkId}`,
        });
      }

      const framework = mapRowToFramework(result.rows[0]!);

      // Get control count by domain
      const domainResult = await query<{ domain: string; count: string }>(
        `SELECT domain, COUNT(*) as count
         FROM compliance_controls
         WHERE framework_id = $1
         GROUP BY domain
         ORDER BY domain`,
        [frameworkId]
      );

      const domainBreakdown = domainResult.rows.map((row) => ({
        domain: row.domain,
        count: parseInt(row.count, 10),
      }));

      return reply.status(200).send({
        success: true,
        data: {
          ...framework,
          domainBreakdown,
        },
      });
    } catch (error) {
      logger.error({ err: error, frameworkId }, 'Failed to get framework');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve framework',
      });
    }
  });

  /**
   * GET /api/v1/compliance/frameworks/:frameworkId/controls
   * List controls for a framework
   */
  fastify.get<{
    Params: { frameworkId: string };
    Querystring: {
      domain?: string;
      riskCategory?: string;
      automatedOnly?: string;
      limit?: string;
      offset?: string;
    };
  }>('/frameworks/:frameworkId/controls', async (request, reply: FastifyReply) => {
    const { frameworkId } = request.params;

    try {
      const params = controlsQuerySchema.parse(request.query);

      let whereClause = 'WHERE framework_id = $1';
      const queryParams: unknown[] = [frameworkId];
      let paramIndex = 2;

      if (params.domain) {
        whereClause += ` AND domain = $${paramIndex}`;
        queryParams.push(params.domain);
        paramIndex++;
      }

      if (params.riskCategory) {
        whereClause += ` AND risk_category = $${paramIndex}`;
        queryParams.push(params.riskCategory);
        paramIndex++;
      }

      if (params.automatedOnly) {
        whereClause += ` AND automated_test_available = true`;
      }

      // Count total
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM compliance_controls ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

      // Get controls
      const result = await query<DatabaseRow>(
        `SELECT * FROM compliance_controls
         ${whereClause}
         ORDER BY control_number ASC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, params.limit, params.offset]
      );

      const controls = result.rows.map(mapRowToControl);

      return reply.status(200).send({
        success: true,
        data: controls,
        pagination: {
          total,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + controls.length < total,
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

      logger.error({ err: error, frameworkId }, 'Failed to list controls');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve controls',
      });
    }
  });

  /**
   * GET /api/v1/compliance/controls/:controlId
   * Get control details with cross-framework mappings
   */
  fastify.get<{
    Params: { controlId: string };
  }>('/controls/:controlId', async (request, reply: FastifyReply) => {
    const { controlId } = request.params;

    try {
      const result = await query<DatabaseRow>(
        `SELECT * FROM compliance_controls WHERE id = $1`,
        [controlId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: `Control not found: ${controlId}`,
        });
      }

      const control = mapRowToControl(result.rows[0]!);

      // Get cross-framework mappings
      const mappingsResult = await query<DatabaseRow>(
        `SELECT m.*, c.title as target_title, c.control_number as target_control_number, f.name as target_framework
         FROM control_mappings m
         JOIN compliance_controls c ON m.target_control_id = c.id
         JOIN compliance_frameworks f ON c.framework_id = f.id
         WHERE m.source_control_id = $1
         ORDER BY m.confidence_score DESC`,
        [controlId]
      );

      const mappings = mappingsResult.rows.map((row) => ({
        id: row['id'] as string,
        targetControlId: row['target_control_id'] as string,
        targetControlNumber: row['target_control_number'] as string,
        targetTitle: row['target_title'] as string,
        targetFramework: row['target_framework'] as string,
        mappingType: row['mapping_type'] as ControlMapping['mappingType'],
        confidenceScore: row['confidence_score'] as number | null,
        notes: row['notes'] as string | null,
      }));

      return reply.status(200).send({
        success: true,
        data: {
          ...control,
          crossFrameworkMappings: mappings,
        },
      });
    } catch (error) {
      logger.error({ err: error, controlId }, 'Failed to get control');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve control',
      });
    }
  });

  /**
   * GET /api/v1/compliance/controls/:controlId/guidance
   * Get AI-assisted implementation guidance for a control
   */
  fastify.get<{
    Params: { controlId: string };
    Querystring: { context?: string };
  }>('/controls/:controlId/guidance', async (request, reply: FastifyReply) => {
    const { controlId } = request.params;
    const { context: orgContext } = request.query;

    try {
      const result = await query<DatabaseRow>(
        `SELECT c.*, f.name as framework_name
         FROM compliance_controls c
         JOIN compliance_frameworks f ON c.framework_id = f.id
         WHERE c.id = $1`,
        [controlId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: `Control not found: ${controlId}`,
        });
      }

      const control = mapRowToControl(result.rows[0]!);
      const frameworkName = result.rows[0]!['framework_name'] as string;

      // For now, return structured guidance based on control data
      // In production, this would call the AI service for dynamic guidance
      const guidance = {
        control: {
          id: control.id,
          number: control.controlNumber,
          title: control.title,
          framework: frameworkName,
        },
        overview: control.description,
        objective: control.objective ?? 'Ensure compliance with regulatory requirements.',
        implementationSteps: [
          {
            step: 1,
            title: 'Assess Current State',
            description: `Review existing policies and procedures related to ${control.title.toLowerCase()}.`,
          },
          {
            step: 2,
            title: 'Identify Gaps',
            description: 'Compare current practices against control requirements to identify gaps.',
          },
          {
            step: 3,
            title: 'Develop Implementation Plan',
            description: 'Create a detailed plan addressing identified gaps with timelines and responsibilities.',
          },
          {
            step: 4,
            title: 'Implement Controls',
            description: control.implementationGuidance ?? 'Execute the implementation plan.',
          },
          {
            step: 5,
            title: 'Document Evidence',
            description: 'Collect and maintain evidence of control implementation.',
          },
          {
            step: 6,
            title: 'Monitor and Review',
            description: 'Establish ongoing monitoring and periodic review processes.',
          },
        ],
        evidenceRequired: control.evidenceRequirements,
        testingProcedures: control.testingProcedures,
        riskConsiderations: {
          riskCategory: control.riskCategory,
          priority: control.implementationPriority,
          failureImpact: `Non-compliance may result in regulatory penalties and increased ${control.riskCategory} risk exposure.`,
        },
        resources: [
          {
            type: 'documentation',
            title: `${frameworkName} Official Documentation`,
            url: '#',
          },
        ],
        generatedAt: new Date().toISOString(),
      };

      return reply.status(200).send({
        success: true,
        data: guidance,
      });
    } catch (error) {
      logger.error({ err: error, controlId }, 'Failed to get control guidance');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve control guidance',
      });
    }
  });
}
