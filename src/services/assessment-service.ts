/**
 * Nexus Compliance Engine - Assessment Service
 * Manages compliance assessments and AI-powered control evaluation
 */

import { v4 as uuidv4 } from 'uuid';
import {
  query,
  transaction,
  type DatabaseRow,
} from '../database/client.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type {
  ComplianceAssessment,
  ControlFinding,
  CreateAssessmentRequest,
  RunAssessmentRequest,
  ComplianceServiceContext,
  AssessmentStatus,
  FindingStatus,
  FindingSeverity,
  RiskLevel,
  PaginationParams,
  PaginatedResponse,
} from '../types/index.js';

const logger = createLogger('assessment-service');

function mapRowToAssessment(row: DatabaseRow): ComplianceAssessment {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    frameworkId: row['framework_id'] as string,
    targetSystemId: row['target_system_id'] as string,
    targetSystemName: row['target_system_name'] as string,
    targetSystemDescription: row['target_system_description'] as string | undefined,
    scope: (typeof row['scope'] === 'string'
      ? JSON.parse(row['scope'] as string)
      : row['scope'] ?? []) as string[],
    excludedControls: (typeof row['excluded_controls'] === 'string'
      ? JSON.parse(row['excluded_controls'] as string)
      : row['excluded_controls'] ?? []) as string[],
    status: row['status'] as AssessmentStatus,
    overallScore: row['overall_score'] as number | undefined,
    riskLevel: row['risk_level'] as RiskLevel | undefined,
    totalControlsAssessed: row['total_controls_assessed'] as number,
    compliantControls: row['compliant_controls'] as number,
    nonCompliantControls: row['non_compliant_controls'] as number,
    partialControls: row['partial_controls'] as number,
    notApplicableControls: row['not_applicable_controls'] as number,
    criticalFindings: row['critical_findings'] as number,
    majorFindings: row['major_findings'] as number,
    minorFindings: row['minor_findings'] as number,
    observations: row['observations'] as number,
    aiModelUsed: row['ai_model_used'] as string | undefined,
    aiConfidence: row['ai_confidence'] as number | undefined,
    humanReviewed: row['human_reviewed'] as boolean,
    reviewerId: row['reviewer_id'] as string | undefined,
    reviewNotes: row['review_notes'] as string | undefined,
    reviewedAt: row['reviewed_at'] ? new Date(row['reviewed_at'] as string) : undefined,
    startedAt: row['started_at'] ? new Date(row['started_at'] as string) : undefined,
    completedAt: row['completed_at'] ? new Date(row['completed_at'] as string) : undefined,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

function mapRowToFinding(row: DatabaseRow): ControlFinding {
  return {
    id: row['id'] as string,
    assessmentId: row['assessment_id'] as string,
    controlId: row['control_id'] as string,
    tenantId: row['tenant_id'] as string,
    status: row['status'] as FindingStatus,
    severity: row['severity'] as FindingSeverity | undefined,
    findingTitle: row['finding_title'] as string | undefined,
    findingDescription: row['finding_description'] as string | undefined,
    evidence: (typeof row['evidence'] === 'string'
      ? JSON.parse(row['evidence'] as string)
      : row['evidence'] ?? []) as ControlFinding['evidence'],
    evidenceUrls: (typeof row['evidence_urls'] === 'string'
      ? JSON.parse(row['evidence_urls'] as string)
      : row['evidence_urls'] ?? []) as string[],
    aiAssessment: row['ai_assessment'] as string | undefined,
    aiConfidence: row['ai_confidence'] as number | undefined,
    aiReasoning: row['ai_reasoning'] as string | undefined,
    remediationRequired: row['remediation_required'] as boolean,
    remediationStatus: row['remediation_status'] as ControlFinding['remediationStatus'],
    remediationPlan: row['remediation_plan'] as string | undefined,
    remediationOwner: row['remediation_owner'] as string | undefined,
    remediationDueDate: row['remediation_due_date'] ? new Date(row['remediation_due_date'] as string) : undefined,
    remediationCompletedDate: row['remediation_completed_date'] ? new Date(row['remediation_completed_date'] as string) : undefined,
    remediationNotes: row['remediation_notes'] as string | undefined,
    humanVerified: row['human_verified'] as boolean,
    verifiedBy: row['verified_by'] as string | undefined,
    verifiedAt: row['verified_at'] ? new Date(row['verified_at'] as string) : undefined,
    verificationNotes: row['verification_notes'] as string | undefined,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 90) return 'low';
  if (score >= 70) return 'medium';
  if (score >= 50) return 'high';
  return 'critical';
}

export class AssessmentService {
  /**
   * Create a new compliance assessment
   */
  async createAssessment(
    context: ComplianceServiceContext,
    request: CreateAssessmentRequest
  ): Promise<ComplianceAssessment> {
    const id = uuidv4();

    // Verify framework exists
    const frameworkResult = await query<{ id: string }>(
      `SELECT id FROM compliance_frameworks WHERE id = $1 AND is_active = true`,
      [request.frameworkId]
    );

    if (frameworkResult.rows.length === 0) {
      throw new Error(`Framework not found or inactive: ${request.frameworkId}`);
    }

    const result = await query<DatabaseRow>(
      `INSERT INTO compliance_assessments (
        id, tenant_id, framework_id, target_system_id, target_system_name,
        target_system_description, scope, excluded_controls, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        context.tenantId,
        request.frameworkId,
        request.targetSystemId,
        request.targetSystemName,
        request.targetSystemDescription,
        JSON.stringify(request.scope ?? []),
        JSON.stringify(request.excludedControls ?? []),
        'pending',
      ]
    );

    const assessment = mapRowToAssessment(result.rows[0]!);

    logger.info({
      tenantId: context.tenantId,
      assessmentId: id,
      frameworkId: request.frameworkId,
      targetSystemId: request.targetSystemId,
    }, 'Assessment created');

    return assessment;
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(
    tenantId: string,
    assessmentId: string
  ): Promise<ComplianceAssessment | null> {
    const result = await query<DatabaseRow>(
      `SELECT * FROM compliance_assessments
       WHERE id = $1 AND tenant_id = $2`,
      [assessmentId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToAssessment(result.rows[0]!);
  }

  /**
   * List assessments for a tenant
   */
  async listAssessments(
    tenantId: string,
    options: {
      frameworkId?: string;
      targetSystemId?: string;
      status?: AssessmentStatus;
    } & PaginationParams
  ): Promise<PaginatedResponse<ComplianceAssessment>> {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE tenant_id = $1';
    const queryParams: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.frameworkId) {
      whereClause += ` AND framework_id = $${paramIndex}`;
      queryParams.push(options.frameworkId);
      paramIndex++;
    }

    if (options.targetSystemId) {
      whereClause += ` AND target_system_id = $${paramIndex}`;
      queryParams.push(options.targetSystemId);
      paramIndex++;
    }

    if (options.status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(options.status);
      paramIndex++;
    }

    const validSortFields = ['created_at', 'updated_at', 'overall_score', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Count total
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM compliance_assessments ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // Get assessments
    const result = await query<DatabaseRow>(
      `SELECT * FROM compliance_assessments
       ${whereClause}
       ORDER BY ${sortField} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const assessments = result.rows.map(mapRowToAssessment);
    const totalPages = Math.ceil(total / limit);

    return {
      data: assessments,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Run an assessment
   */
  async runAssessment(
    context: ComplianceServiceContext,
    assessmentId: string,
    options: RunAssessmentRequest
  ): Promise<ComplianceAssessment> {
    return transaction(async (client) => {
      // Get assessment
      const assessmentResult = await client.query<DatabaseRow>(
        `SELECT * FROM compliance_assessments
         WHERE id = $1 AND tenant_id = $2
         FOR UPDATE`,
        [assessmentId, context.tenantId]
      );

      if (assessmentResult.rows.length === 0) {
        throw new Error(`Assessment not found: ${assessmentId}`);
      }

      const assessment = mapRowToAssessment(assessmentResult.rows[0]!);

      if (assessment.status !== 'pending' && assessment.status !== 'failed') {
        throw new Error(`Assessment cannot be run in status: ${assessment.status}`);
      }

      // Update status to in_progress
      await client.query(
        `UPDATE compliance_assessments
         SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [assessmentId]
      );

      // Get controls for the framework
      let controlsQuery = `
        SELECT * FROM compliance_controls
        WHERE framework_id = $1
      `;
      const controlParams: unknown[] = [assessment.frameworkId];

      if (assessment.scope.length > 0) {
        controlsQuery += ` AND domain = ANY($2)`;
        controlParams.push(assessment.scope);
      }

      if (assessment.excludedControls.length > 0) {
        const paramNum = assessment.scope.length > 0 ? 3 : 2;
        controlsQuery += ` AND id != ALL($${paramNum})`;
        controlParams.push(assessment.excludedControls);
      }

      controlsQuery += ` ORDER BY implementation_priority DESC`;

      const controlsResult = await client.query<DatabaseRow>(controlsQuery, controlParams);
      const controls = controlsResult.rows;

      // Create findings for each control
      let compliant = 0;
      let nonCompliant = 0;
      let partial = 0;
      let notApplicable = 0;
      let critical = 0;
      let major = 0;
      let minor = 0;
      let observations = 0;

      for (const control of controls) {
        const findingId = uuidv4();

        // Simulate assessment (in production, this would use AI)
        let status: FindingStatus;
        let severity: FindingSeverity | null = null;
        let aiAssessment: string | null = null;
        let aiConfidence = 0.75;

        if (options.useAI && config.ai.enabled) {
          // AI-powered assessment would go here
          // For now, simulate based on control priority
          const priority = control['implementation_priority'] as number;
          const random = Math.random();

          if (random < 0.6) {
            status = 'compliant';
            compliant++;
          } else if (random < 0.75) {
            status = 'partial';
            partial++;
            severity = 'minor';
            minor++;
          } else if (random < 0.9) {
            status = 'non_compliant';
            nonCompliant++;
            severity = priority > 80 ? 'major' : 'minor';
            if (severity === 'major') major++;
            else minor++;
          } else {
            status = 'not_applicable';
            notApplicable++;
          }

          aiAssessment = `AI-assisted evaluation of ${control['title']}. `;
          aiAssessment += status === 'compliant'
            ? 'Control appears to be effectively implemented.'
            : `Gaps identified in control implementation. Remediation recommended.`;
        } else {
          // Manual assessment - mark as not assessed
          status = 'not_assessed';
          aiConfidence = 0;
        }

        await client.query(
          `INSERT INTO control_findings (
            id, assessment_id, control_id, tenant_id, status, severity,
            finding_title, finding_description, ai_assessment, ai_confidence,
            remediation_required, remediation_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            findingId,
            assessmentId,
            control['id'],
            context.tenantId,
            status,
            severity,
            status !== 'compliant' ? `${control['title']} - ${status}` : null,
            status !== 'compliant' ? `Review and remediate ${control['control_number']}` : null,
            aiAssessment,
            options.useAI ? aiConfidence : null,
            status === 'non_compliant' || status === 'partial',
            status === 'non_compliant' || status === 'partial' ? 'pending' : 'not_required',
          ]
        );
      }

      // Calculate overall score
      const totalAssessed = compliant + nonCompliant + partial;
      const overallScore = totalAssessed > 0
        ? Math.round((compliant / totalAssessed) * 100 + (partial / totalAssessed) * 50)
        : 0;

      const riskLevel = calculateRiskLevel(overallScore);

      // Update assessment with results
      const finalResult = await client.query<DatabaseRow>(
        `UPDATE compliance_assessments
         SET status = 'completed',
             completed_at = NOW(),
             overall_score = $1,
             risk_level = $2,
             total_controls_assessed = $3,
             compliant_controls = $4,
             non_compliant_controls = $5,
             partial_controls = $6,
             not_applicable_controls = $7,
             critical_findings = $8,
             major_findings = $9,
             minor_findings = $10,
             observations = $11,
             ai_model_used = $12,
             ai_confidence = $13,
             updated_at = NOW()
         WHERE id = $14
         RETURNING *`,
        [
          overallScore,
          riskLevel,
          controls.length,
          compliant,
          nonCompliant,
          partial,
          notApplicable,
          critical,
          major,
          minor,
          observations,
          options.useAI ? (options.aiModel ?? config.ai.model) : null,
          options.useAI ? 0.75 : null,
          assessmentId,
        ]
      );

      const finalAssessment = mapRowToAssessment(finalResult.rows[0]!);

      logger.info({
        tenantId: context.tenantId,
        assessmentId,
        overallScore,
        riskLevel,
        controlsAssessed: controls.length,
        useAI: options.useAI,
      }, 'Assessment completed');

      return finalAssessment;
    });
  }

  /**
   * Get findings for an assessment
   */
  async getFindings(
    tenantId: string,
    assessmentId: string,
    options: {
      status?: FindingStatus;
      severity?: FindingSeverity;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<ControlFinding>> {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE assessment_id = $1 AND tenant_id = $2';
    const queryParams: unknown[] = [assessmentId, tenantId];
    let paramIndex = 3;

    if (options.status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(options.status);
      paramIndex++;
    }

    if (options.severity) {
      whereClause += ` AND severity = $${paramIndex}`;
      queryParams.push(options.severity);
      paramIndex++;
    }

    // Count total
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM control_findings ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // Get findings with control details
    const result = await query<DatabaseRow>(
      `SELECT f.*, c.title as control_title, c.control_number, c.domain
       FROM control_findings f
       JOIN compliance_controls c ON f.control_id = c.id
       ${whereClause}
       ORDER BY
         CASE f.severity
           WHEN 'critical' THEN 1
           WHEN 'major' THEN 2
           WHEN 'minor' THEN 3
           WHEN 'observation' THEN 4
           ELSE 5
         END,
         c.implementation_priority DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const findings = result.rows.map(mapRowToFinding);
    const totalPages = Math.ceil(total / limit);

    return {
      data: findings,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Update a finding
   */
  async updateFinding(
    context: ComplianceServiceContext,
    findingId: string,
    updates: Partial<{
      status: FindingStatus;
      severity: FindingSeverity;
      findingTitle: string;
      findingDescription: string;
      remediationPlan: string;
      remediationOwner: string;
      remediationDueDate: Date;
      remediationStatus: ControlFinding['remediationStatus'];
      verificationNotes: string;
    }>
  ): Promise<ControlFinding> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClauses.push(`updated_at = NOW()`);

    if (updates.status && updates.status !== 'not_assessed') {
      setClauses.push(`human_verified = true`);
      setClauses.push(`verified_by = $${paramIndex}`);
      values.push(context.userId);
      paramIndex++;
      setClauses.push(`verified_at = NOW()`);
    }

    values.push(findingId);
    values.push(context.tenantId);

    const result = await query<DatabaseRow>(
      `UPDATE control_findings
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Finding not found: ${findingId}`);
    }

    return mapRowToFinding(result.rows[0]!);
  }
}

export const assessmentService = new AssessmentService();
