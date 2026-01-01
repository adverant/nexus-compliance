/**
 * Nexus Compliance Engine - AI System Registry API Routes
 * For EU AI Act compliance
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction, type DatabaseRow } from '../../database/client.js';
import { createLogger } from '../../utils/logger.js';
import type { AISystem, AIRiskClassification, ComplianceServiceContext } from '../../types/index.js';

const logger = createLogger('ai-systems-routes');

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

const registerAISystemSchema = z.object({
  systemId: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  description: z.string().min(10),
  version: z.string().optional(),
  provider: z.string().min(1).max(255),
  providerContact: z.string().optional(),
  isThirdParty: z.boolean().default(false),
  environments: z.array(z.string()).default([]),
  dataCategories: z.array(z.string()).default([]),
  purposeOfProcessing: z.array(z.string()).default([]),
  dataSources: z.array(z.string()).default([]),
  humanOversightEnabled: z.boolean().default(false),
  humanOversightDescription: z.string().optional(),
  humanOversightContact: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});

const updateAISystemSchema = registerAISystemSchema.partial();

const classifyAISystemSchema = z.object({
  systemDescription: z.string().optional(),
  useCases: z.array(z.string()).optional(),
  dataCategories: z.array(z.string()).optional(),
  affectedPersons: z.array(z.string()).optional(),
  riskFactors: z.array(z.string()).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(['development', 'testing', 'staging', 'production', 'deprecated', 'decommissioned']).optional(),
  riskClassification: z.enum(['prohibited', 'high_risk', 'limited_risk', 'minimal_risk', 'gpai', 'unclassified']).optional(),
  provider: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

function mapRowToAISystem(row: DatabaseRow): AISystem {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    systemId: row['system_id'] as string,
    name: row['name'] as string,
    description: row['description'] as string,
    version: row['version'] as string | undefined,
    riskClassification: row['risk_classification'] as AIRiskClassification,
    classificationRationale: row['classification_rationale'] as string | undefined,
    classificationDate: row['classification_date'] ? new Date(row['classification_date'] as string) : undefined,
    classifiedBy: row['classified_by'] as string | undefined,
    provider: row['provider'] as string,
    providerContact: row['provider_contact'] as string | undefined,
    isThirdParty: row['is_third_party'] as boolean,
    deploymentDate: row['deployment_date'] ? new Date(row['deployment_date'] as string) : undefined,
    status: row['status'] as AISystem['status'],
    environments: (typeof row['environments'] === 'string'
      ? JSON.parse(row['environments'] as string)
      : row['environments'] ?? []) as string[],
    dataCategories: (typeof row['data_categories'] === 'string'
      ? JSON.parse(row['data_categories'] as string)
      : row['data_categories'] ?? []) as string[],
    purposeOfProcessing: (typeof row['purpose_of_processing'] === 'string'
      ? JSON.parse(row['purpose_of_processing'] as string)
      : row['purpose_of_processing'] ?? []) as string[],
    dataSources: (typeof row['data_sources'] === 'string'
      ? JSON.parse(row['data_sources'] as string)
      : row['data_sources'] ?? []) as string[],
    humanOversightEnabled: row['human_oversight_enabled'] as boolean,
    humanOversightDescription: row['human_oversight_description'] as string | undefined,
    humanOversightContact: row['human_oversight_contact'] as string | undefined,
    technicalDocumentationPath: row['technical_documentation_path'] as string | undefined,
    friaPath: row['fria_path'] as string | undefined,
    dpiaPath: row['dpia_path'] as string | undefined,
    riskAssessmentPath: row['risk_assessment_path'] as string | undefined,
    lastAssessmentId: row['last_assessment_id'] as string | undefined,
    lastAssessmentDate: row['last_assessment_date'] ? new Date(row['last_assessment_date'] as string) : undefined,
    complianceScore: row['compliance_score'] as number | undefined,
    tags: (typeof row['tags'] === 'string'
      ? JSON.parse(row['tags'] as string)
      : row['tags'] ?? []) as string[],
    metadata: (typeof row['metadata'] === 'string'
      ? JSON.parse(row['metadata'] as string)
      : row['metadata'] ?? {}) as Record<string, unknown>,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

// EU AI Act risk classification logic
function classifyRisk(
  system: {
    description: string;
    useCases?: string[];
    dataCategories?: string[];
    affectedPersons?: string[];
    riskFactors?: string[];
  }
): { classification: AIRiskClassification; rationale: string; confidence: number } {
  const desc = system.description.toLowerCase();
  const useCases = system.useCases?.map((u) => u.toLowerCase()) ?? [];
  const dataCategories = system.dataCategories?.map((d) => d.toLowerCase()) ?? [];
  const affectedPersons = system.affectedPersons?.map((p) => p.toLowerCase()) ?? [];
  const riskFactors = system.riskFactors?.map((r) => r.toLowerCase()) ?? [];

  // Prohibited AI systems (Article 5)
  const prohibitedIndicators = [
    'social scoring',
    'subliminal manipulation',
    'exploitation of vulnerabilities',
    'real-time biometric identification',
    'emotion recognition in workplace',
    'predictive policing',
    'untargeted facial recognition',
  ];

  for (const indicator of prohibitedIndicators) {
    if (desc.includes(indicator) || useCases.some((u) => u.includes(indicator))) {
      return {
        classification: 'prohibited',
        rationale: `System appears to involve ${indicator}, which is prohibited under EU AI Act Article 5.`,
        confidence: 0.85,
      };
    }
  }

  // High-risk AI systems (Annex III)
  const highRiskIndicators = {
    biometric: ['biometric identification', 'facial recognition', 'emotion detection'],
    criticalInfrastructure: ['critical infrastructure', 'energy grid', 'water supply', 'transport'],
    education: ['educational assessment', 'student evaluation', 'admission decision'],
    employment: ['recruitment', 'hiring decision', 'performance evaluation', 'termination'],
    essentialServices: ['credit scoring', 'loan decision', 'insurance pricing', 'social benefits'],
    lawEnforcement: ['law enforcement', 'criminal justice', 'recidivism prediction'],
    migration: ['visa processing', 'asylum', 'border control', 'migration decision'],
    justice: ['judicial decision', 'legal outcome', 'dispute resolution'],
  };

  for (const [category, indicators] of Object.entries(highRiskIndicators)) {
    for (const indicator of indicators) {
      if (
        desc.includes(indicator) ||
        useCases.some((u) => u.includes(indicator)) ||
        riskFactors.some((r) => r.includes(indicator))
      ) {
        return {
          classification: 'high_risk',
          rationale: `System involves ${category} use case (${indicator}), classified as high-risk under EU AI Act Annex III.`,
          confidence: 0.80,
        };
      }
    }
  }

  // Check for sensitive data processing
  const sensitiveDataIndicators = [
    'health data',
    'genetic data',
    'biometric data',
    'racial origin',
    'ethnic origin',
    'political opinion',
    'religious belief',
    'trade union',
    'sexual orientation',
    'criminal record',
  ];

  const processesSensitiveData = sensitiveDataIndicators.some(
    (indicator) =>
      dataCategories.some((d) => d.includes(indicator)) ||
      desc.includes(indicator)
  );

  if (processesSensitiveData) {
    return {
      classification: 'high_risk',
      rationale: 'System processes sensitive personal data categories, potentially requiring high-risk classification.',
      confidence: 0.75,
    };
  }

  // Check for vulnerable persons
  const vulnerablePersons = ['children', 'elderly', 'disabled', 'patients', 'employees', 'students'];
  const affectsVulnerable = vulnerablePersons.some(
    (person) =>
      affectedPersons.some((p) => p.includes(person)) ||
      desc.includes(person)
  );

  // General Purpose AI (GPAI)
  const gpaiIndicators = ['foundation model', 'large language model', 'general purpose', 'llm', 'gpt', 'claude'];
  const isGPAI = gpaiIndicators.some((indicator) => desc.includes(indicator));

  if (isGPAI) {
    return {
      classification: 'gpai',
      rationale: 'System appears to be a General Purpose AI system, subject to GPAI-specific requirements.',
      confidence: 0.70,
    };
  }

  // Limited risk (transparency obligations)
  const limitedRiskIndicators = [
    'chatbot',
    'virtual assistant',
    'content generation',
    'deepfake',
    'synthetic media',
    'recommendation system',
  ];

  for (const indicator of limitedRiskIndicators) {
    if (desc.includes(indicator) || useCases.some((u) => u.includes(indicator))) {
      return {
        classification: 'limited_risk',
        rationale: `System involves ${indicator}, classified as limited risk with transparency obligations.`,
        confidence: 0.70,
      };
    }
  }

  // If affects vulnerable persons but not otherwise high-risk
  if (affectsVulnerable) {
    return {
      classification: 'limited_risk',
      rationale: 'System may affect vulnerable persons, warranting additional transparency requirements.',
      confidence: 0.65,
    };
  }

  // Default to minimal risk
  return {
    classification: 'minimal_risk',
    rationale: 'Based on the provided information, the system does not appear to fall under prohibited, high-risk, or limited-risk categories.',
    confidence: 0.60,
  };
}

export async function aiSystemsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/compliance/ai-systems
   * List registered AI systems
   */
  fastify.get<{
    Querystring: {
      status?: string;
      riskClassification?: string;
      provider?: string;
      limit?: string;
      offset?: string;
    };
  }>('/ai-systems', async (request, reply: FastifyReply) => {
    const context = getContext(request);

    try {
      const params = listQuerySchema.parse(request.query);

      let whereClause = 'WHERE tenant_id = $1';
      const queryParams: unknown[] = [context.tenantId];
      let paramIndex = 2;

      if (params.status) {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(params.status);
        paramIndex++;
      }

      if (params.riskClassification) {
        whereClause += ` AND risk_classification = $${paramIndex}`;
        queryParams.push(params.riskClassification);
        paramIndex++;
      }

      if (params.provider) {
        whereClause += ` AND provider ILIKE $${paramIndex}`;
        queryParams.push(`%${params.provider}%`);
        paramIndex++;
      }

      // Count total
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ai_system_registry ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

      // Get systems
      const result = await query<DatabaseRow>(
        `SELECT * FROM ai_system_registry
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, params.limit, params.offset]
      );

      const systems = result.rows.map(mapRowToAISystem);

      // Calculate summary stats
      const statsResult = await query<{ classification: string; count: string }>(
        `SELECT risk_classification as classification, COUNT(*) as count
         FROM ai_system_registry
         WHERE tenant_id = $1
         GROUP BY risk_classification`,
        [context.tenantId]
      );

      const byClassification: Record<string, number> = {};
      for (const row of statsResult.rows) {
        byClassification[row.classification] = parseInt(row.count, 10);
      }

      return reply.status(200).send({
        success: true,
        data: systems,
        summary: {
          total,
          byClassification,
        },
        pagination: {
          total,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + systems.length < total,
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

      logger.error({ err: error, tenantId: context.tenantId }, 'Failed to list AI systems');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve AI systems',
      });
    }
  });

  /**
   * POST /api/v1/compliance/ai-systems
   * Register a new AI system
   */
  fastify.post('/ai-systems', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = getContext(request);

    try {
      const body = registerAISystemSchema.parse(request.body);

      // Check if system ID already exists for this tenant
      const existingResult = await query<{ id: string }>(
        `SELECT id FROM ai_system_registry WHERE tenant_id = $1 AND system_id = $2`,
        [context.tenantId, body.systemId]
      );

      if (existingResult.rows.length > 0) {
        return reply.status(409).send({
          success: false,
          error: `AI system with ID ${body.systemId} already exists`,
        });
      }

      const id = uuidv4();

      const result = await query<DatabaseRow>(
        `INSERT INTO ai_system_registry (
          id, tenant_id, system_id, name, description, version,
          provider, provider_contact, is_third_party,
          environments, data_categories, purpose_of_processing, data_sources,
          human_oversight_enabled, human_oversight_description, human_oversight_contact,
          tags, metadata, risk_classification, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
        RETURNING *`,
        [
          id,
          context.tenantId,
          body.systemId,
          body.name,
          body.description,
          body.version,
          body.provider,
          body.providerContact,
          body.isThirdParty,
          JSON.stringify(body.environments),
          JSON.stringify(body.dataCategories),
          JSON.stringify(body.purposeOfProcessing),
          JSON.stringify(body.dataSources),
          body.humanOversightEnabled,
          body.humanOversightDescription,
          body.humanOversightContact,
          JSON.stringify(body.tags),
          JSON.stringify(body.metadata),
          'unclassified',
          'development',
        ]
      );

      const system = mapRowToAISystem(result.rows[0]!);

      logger.info(
        { tenantId: context.tenantId, userId: context.userId, systemId: body.systemId },
        'AI system registered'
      );

      return reply.status(201).send({
        success: true,
        data: system,
        message: 'AI system registered successfully. Please classify the risk level.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      logger.error({ err: error, tenantId: context.tenantId }, 'Failed to register AI system');
      return reply.status(500).send({
        success: false,
        error: 'Failed to register AI system',
      });
    }
  });

  /**
   * GET /api/v1/compliance/ai-systems/:systemId
   * Get AI system details
   */
  fastify.get<{
    Params: { systemId: string };
  }>('/ai-systems/:systemId', async (request, reply: FastifyReply) => {
    const context = getContext(request);
    const { systemId } = request.params;

    try {
      const result = await query<DatabaseRow>(
        `SELECT * FROM ai_system_registry WHERE tenant_id = $1 AND (id = $2 OR system_id = $2)`,
        [context.tenantId, systemId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: `AI system not found: ${systemId}`,
        });
      }

      const system = mapRowToAISystem(result.rows[0]!);

      return reply.status(200).send({
        success: true,
        data: system,
      });
    } catch (error) {
      logger.error({ err: error, tenantId: context.tenantId, systemId }, 'Failed to get AI system');
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve AI system',
      });
    }
  });

  /**
   * PUT /api/v1/compliance/ai-systems/:systemId
   * Update AI system registration
   */
  fastify.put<{
    Params: { systemId: string };
  }>('/ai-systems/:systemId', async (request, reply: FastifyReply) => {
    const context = getContext(request);
    const { systemId } = request.params;

    try {
      const body = updateAISystemSchema.parse(request.body);

      // Check if system exists
      const existingResult = await query<DatabaseRow>(
        `SELECT * FROM ai_system_registry WHERE tenant_id = $1 AND (id = $2 OR system_id = $2)`,
        [context.tenantId, systemId]
      );

      if (existingResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: `AI system not found: ${systemId}`,
        });
      }

      const existing = mapRowToAISystem(existingResult.rows[0]!);

      // Build update query
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (body.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(body.name);
      }
      if (body.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(body.description);
      }
      if (body.version !== undefined) {
        updates.push(`version = $${paramIndex++}`);
        values.push(body.version);
      }
      if (body.provider !== undefined) {
        updates.push(`provider = $${paramIndex++}`);
        values.push(body.provider);
      }
      if (body.providerContact !== undefined) {
        updates.push(`provider_contact = $${paramIndex++}`);
        values.push(body.providerContact);
      }
      if (body.isThirdParty !== undefined) {
        updates.push(`is_third_party = $${paramIndex++}`);
        values.push(body.isThirdParty);
      }
      if (body.environments !== undefined) {
        updates.push(`environments = $${paramIndex++}`);
        values.push(JSON.stringify(body.environments));
      }
      if (body.dataCategories !== undefined) {
        updates.push(`data_categories = $${paramIndex++}`);
        values.push(JSON.stringify(body.dataCategories));
      }
      if (body.purposeOfProcessing !== undefined) {
        updates.push(`purpose_of_processing = $${paramIndex++}`);
        values.push(JSON.stringify(body.purposeOfProcessing));
      }
      if (body.dataSources !== undefined) {
        updates.push(`data_sources = $${paramIndex++}`);
        values.push(JSON.stringify(body.dataSources));
      }
      if (body.humanOversightEnabled !== undefined) {
        updates.push(`human_oversight_enabled = $${paramIndex++}`);
        values.push(body.humanOversightEnabled);
      }
      if (body.humanOversightDescription !== undefined) {
        updates.push(`human_oversight_description = $${paramIndex++}`);
        values.push(body.humanOversightDescription);
      }
      if (body.humanOversightContact !== undefined) {
        updates.push(`human_oversight_contact = $${paramIndex++}`);
        values.push(body.humanOversightContact);
      }
      if (body.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(JSON.stringify(body.tags));
      }
      if (body.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(body.metadata));
      }

      if (updates.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No valid fields to update',
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(existing.id);

      const result = await query<DatabaseRow>(
        `UPDATE ai_system_registry
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      const system = mapRowToAISystem(result.rows[0]!);

      logger.info(
        { tenantId: context.tenantId, userId: context.userId, systemId },
        'AI system updated'
      );

      return reply.status(200).send({
        success: true,
        data: system,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      logger.error({ err: error, tenantId: context.tenantId, systemId }, 'Failed to update AI system');
      return reply.status(500).send({
        success: false,
        error: 'Failed to update AI system',
      });
    }
  });

  /**
   * POST /api/v1/compliance/ai-systems/:systemId/classify
   * Classify AI system risk level per EU AI Act
   */
  fastify.post<{
    Params: { systemId: string };
  }>('/ai-systems/:systemId/classify', async (request, reply: FastifyReply) => {
    const context = getContext(request);
    const { systemId } = request.params;

    try {
      const body = classifyAISystemSchema.parse(request.body);

      // Get the system
      const existingResult = await query<DatabaseRow>(
        `SELECT * FROM ai_system_registry WHERE tenant_id = $1 AND (id = $2 OR system_id = $2)`,
        [context.tenantId, systemId]
      );

      if (existingResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: `AI system not found: ${systemId}`,
        });
      }

      const existing = mapRowToAISystem(existingResult.rows[0]!);

      // Perform classification
      const description = body.systemDescription ?? existing.description;
      const classificationResult = classifyRisk({
        description,
        useCases: body.useCases ?? existing.purposeOfProcessing,
        dataCategories: body.dataCategories ?? existing.dataCategories,
        affectedPersons: body.affectedPersons,
        riskFactors: body.riskFactors,
      });

      // Update the system
      const result = await query<DatabaseRow>(
        `UPDATE ai_system_registry
         SET risk_classification = $1,
             classification_rationale = $2,
             classification_date = NOW(),
             classified_by = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [
          classificationResult.classification,
          classificationResult.rationale,
          context.userId,
          existing.id,
        ]
      );

      const system = mapRowToAISystem(result.rows[0]!);

      logger.info(
        {
          tenantId: context.tenantId,
          userId: context.userId,
          systemId,
          classification: classificationResult.classification,
        },
        'AI system classified'
      );

      return reply.status(200).send({
        success: true,
        data: system,
        classification: {
          result: classificationResult.classification,
          rationale: classificationResult.rationale,
          confidence: classificationResult.confidence,
          requirements: getRequirements(classificationResult.classification),
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

      logger.error({ err: error, tenantId: context.tenantId, systemId }, 'Failed to classify AI system');
      return reply.status(500).send({
        success: false,
        error: 'Failed to classify AI system',
      });
    }
  });
}

function getRequirements(classification: AIRiskClassification): string[] {
  switch (classification) {
    case 'prohibited':
      return [
        'This AI system is PROHIBITED under Article 5 of the EU AI Act',
        'Immediate discontinuation is required',
        'Legal review recommended',
      ];
    case 'high_risk':
      return [
        'Risk management system required (Article 9)',
        'Data governance measures required (Article 10)',
        'Technical documentation required (Article 11)',
        'Record-keeping required (Article 12)',
        'Transparency and information to deployers (Article 13)',
        'Human oversight measures (Article 14)',
        'Accuracy, robustness, and cybersecurity (Article 15)',
        'Conformity assessment required before market placement',
        'Registration in EU database required',
      ];
    case 'limited_risk':
      return [
        'Transparency obligations (Article 52)',
        'Users must be informed they are interacting with AI',
        'AI-generated content must be disclosed if applicable',
      ];
    case 'gpai':
      return [
        'Technical documentation required',
        'Information for downstream providers',
        'Copyright policy compliance',
        'Summary of training data published',
        'If systemic risk: additional obligations apply',
      ];
    case 'minimal_risk':
      return [
        'No mandatory requirements',
        'Voluntary adoption of codes of conduct encouraged',
        'General transparency best practices recommended',
      ];
    default:
      return ['Classification required to determine applicable requirements'];
  }
}
