/**
 * Nexus Compliance Engine - Report Service
 * Generates compliance reports in various formats
 */

import { v4 as uuidv4 } from 'uuid';
import { query, type DatabaseRow } from '../database/client.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type {
  ComplianceReport,
  ComplianceAssessment,
  ControlFinding,
  GenerateReportRequest,
  ComplianceServiceContext,
  ReportType,
  ReportFormat,
  ExecutiveSummary,
  RiskLevel,
} from '../types/index.js';

const logger = createLogger('report-service');

function mapRowToReport(row: DatabaseRow): ComplianceReport {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    assessmentId: row['assessment_id'] as string | undefined,
    title: row['title'] as string,
    description: row['description'] as string | undefined,
    reportType: row['report_type'] as ReportType,
    format: row['format'] as ReportFormat,
    status: row['status'] as ComplianceReport['status'],
    errorMessage: row['error_message'] as string | undefined,
    filePath: row['file_path'] as string | undefined,
    fileSizeBytes: row['file_size_bytes'] as number | undefined,
    checksum: row['checksum'] as string | undefined,
    executiveSummary: (typeof row['executive_summary'] === 'string'
      ? JSON.parse(row['executive_summary'] as string)
      : row['executive_summary']) as ExecutiveSummary | undefined,
    isPublic: row['is_public'] as boolean,
    accessToken: row['access_token'] as string | undefined,
    expiresAt: row['expires_at'] ? new Date(row['expires_at'] as string) : undefined,
    downloadCount: row['download_count'] as number,
    generatedBy: row['generated_by'] as string | undefined,
    generationTimeMs: row['generation_time_ms'] as number | undefined,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

export class ReportService {
  /**
   * Generate a compliance report
   */
  async generateReport(
    context: ComplianceServiceContext,
    request: GenerateReportRequest
  ): Promise<ComplianceReport> {
    const startTime = Date.now();
    const id = uuidv4();

    // Get assessment if provided
    let assessment: ComplianceAssessment | null = null;
    let findings: ControlFinding[] = [];

    if (request.assessmentId) {
      const assessmentResult = await query<DatabaseRow>(
        `SELECT * FROM compliance_assessments
         WHERE id = $1 AND tenant_id = $2`,
        [request.assessmentId, context.tenantId]
      );

      if (assessmentResult.rows.length === 0) {
        throw new Error(`Assessment not found: ${request.assessmentId}`);
      }

      assessment = this.mapAssessmentRow(assessmentResult.rows[0]!);

      // Get findings
      const findingsResult = await query<DatabaseRow>(
        `SELECT f.*, c.title as control_title, c.control_number, c.domain
         FROM control_findings f
         JOIN compliance_controls c ON f.control_id = c.id
         WHERE f.assessment_id = $1 AND f.tenant_id = $2
         ORDER BY
           CASE f.severity
             WHEN 'critical' THEN 1
             WHEN 'major' THEN 2
             WHEN 'minor' THEN 3
             ELSE 4
           END,
           c.implementation_priority DESC`,
        [request.assessmentId, context.tenantId]
      );

      findings = findingsResult.rows.map((row) => this.mapFindingRow(row));
    }

    // Generate report content based on type
    const reportContent = await this.generateReportContent(
      request.reportType,
      request.format,
      assessment,
      findings,
      {
        includeEvidence: request.includeEvidence ?? false,
        includeRemediation: request.includeRemediation ?? true,
      }
    );

    // Create executive summary
    const executiveSummary = assessment
      ? this.generateExecutiveSummary(assessment, findings)
      : undefined;

    // Generate report title
    const title = this.generateReportTitle(
      request.reportType,
      assessment?.targetSystemName
    );

    // Store report metadata
    const result = await query<DatabaseRow>(
      `INSERT INTO compliance_reports (
        id, tenant_id, assessment_id, title, description, report_type, format,
        status, executive_summary, is_public, generated_by, generation_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        context.tenantId,
        request.assessmentId,
        title,
        `${request.reportType} report generated on ${new Date().toISOString()}`,
        request.reportType,
        request.format,
        'completed',
        executiveSummary ? JSON.stringify(executiveSummary) : null,
        false,
        context.userId,
        Date.now() - startTime,
      ]
    );

    const report = mapRowToReport(result.rows[0]!);

    logger.info({
      tenantId: context.tenantId,
      reportId: id,
      reportType: request.reportType,
      format: request.format,
      generationTimeMs: Date.now() - startTime,
    }, 'Report generated');

    return {
      ...report,
      content: reportContent,
    } as ComplianceReport & { content: string };
  }

  /**
   * Generate report content
   */
  private async generateReportContent(
    reportType: ReportType,
    format: ReportFormat,
    assessment: ComplianceAssessment | null,
    findings: ControlFinding[],
    options: {
      includeEvidence: boolean;
      includeRemediation: boolean;
    }
  ): Promise<string> {
    switch (format) {
      case 'markdown':
        return this.generateMarkdownReport(reportType, assessment, findings, options);
      case 'html':
        return this.generateHtmlReport(reportType, assessment, findings, options);
      case 'json':
        return this.generateJsonReport(reportType, assessment, findings, options);
      default:
        return this.generateMarkdownReport(reportType, assessment, findings, options);
    }
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(
    reportType: ReportType,
    assessment: ComplianceAssessment | null,
    findings: ControlFinding[],
    options: { includeEvidence: boolean; includeRemediation: boolean }
  ): string {
    const lines: string[] = [];
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Header
    lines.push(`# Compliance ${reportType.replace('_', ' ').toUpperCase()} Report`);
    lines.push('');
    lines.push(`**Generated:** ${date}`);
    lines.push(`**Report Type:** ${reportType}`);
    lines.push('');

    if (assessment) {
      // Executive Summary
      lines.push('## Executive Summary');
      lines.push('');
      lines.push(`| Metric | Value |`);
      lines.push(`|--------|-------|`);
      lines.push(`| Target System | ${assessment.targetSystemName} |`);
      lines.push(`| Framework | ${assessment.frameworkId.toUpperCase()} |`);
      lines.push(`| Overall Score | ${assessment.overallScore ?? 'N/A'}% |`);
      lines.push(`| Risk Level | ${assessment.riskLevel ?? 'N/A'} |`);
      lines.push(`| Assessment Date | ${assessment.completedAt?.toLocaleDateString() ?? 'Pending'} |`);
      lines.push('');

      // Control Statistics
      lines.push('## Control Assessment Summary');
      lines.push('');
      lines.push(`| Status | Count |`);
      lines.push(`|--------|-------|`);
      lines.push(`| Compliant | ${assessment.compliantControls} |`);
      lines.push(`| Non-Compliant | ${assessment.nonCompliantControls} |`);
      lines.push(`| Partial | ${assessment.partialControls} |`);
      lines.push(`| Not Applicable | ${assessment.notApplicableControls} |`);
      lines.push(`| **Total Assessed** | **${assessment.totalControlsAssessed}** |`);
      lines.push('');

      // Findings Summary
      if (assessment.criticalFindings + assessment.majorFindings + assessment.minorFindings > 0) {
        lines.push('## Findings by Severity');
        lines.push('');
        lines.push(`| Severity | Count |`);
        lines.push(`|----------|-------|`);
        if (assessment.criticalFindings > 0) {
          lines.push(`| Critical | ${assessment.criticalFindings} |`);
        }
        if (assessment.majorFindings > 0) {
          lines.push(`| Major | ${assessment.majorFindings} |`);
        }
        if (assessment.minorFindings > 0) {
          lines.push(`| Minor | ${assessment.minorFindings} |`);
        }
        if (assessment.observations > 0) {
          lines.push(`| Observations | ${assessment.observations} |`);
        }
        lines.push('');
      }

      // Detailed Findings
      if (findings.length > 0) {
        lines.push('## Detailed Findings');
        lines.push('');

        const nonCompliantFindings = findings.filter(
          (f) => f.status === 'non_compliant' || f.status === 'partial'
        );

        for (const finding of nonCompliantFindings) {
          const controlRow = findings.find((f) => f.id === finding.id);
          lines.push(`### ${finding.findingTitle ?? `Finding: ${finding.controlId}`}`);
          lines.push('');
          lines.push(`- **Control:** ${finding.controlId}`);
          lines.push(`- **Status:** ${finding.status}`);
          lines.push(`- **Severity:** ${finding.severity ?? 'Not assessed'}`);
          lines.push('');

          if (finding.findingDescription) {
            lines.push('**Description:**');
            lines.push(finding.findingDescription);
            lines.push('');
          }

          if (finding.aiAssessment) {
            lines.push('**AI Assessment:**');
            lines.push(finding.aiAssessment);
            lines.push('');
          }

          if (options.includeRemediation && finding.remediationPlan) {
            lines.push('**Remediation Plan:**');
            lines.push(finding.remediationPlan);
            lines.push('');
            if (finding.remediationOwner) {
              lines.push(`- **Owner:** ${finding.remediationOwner}`);
            }
            if (finding.remediationDueDate) {
              lines.push(`- **Due Date:** ${finding.remediationDueDate.toLocaleDateString()}`);
            }
            lines.push('');
          }

          lines.push('---');
          lines.push('');
        }
      }

      // Recommendations
      if (reportType === 'gap_analysis' || reportType === 'remediation_plan') {
        lines.push('## Recommendations');
        lines.push('');
        lines.push('Based on the assessment findings, the following actions are recommended:');
        lines.push('');
        lines.push('1. **Address Critical Findings Immediately** - Any critical severity findings should be remediated within 30 days.');
        lines.push('2. **Develop Remediation Plan** - Create detailed remediation plans for all non-compliant controls.');
        lines.push('3. **Assign Ownership** - Ensure each finding has a designated owner responsible for remediation.');
        lines.push('4. **Schedule Follow-up Assessment** - Plan a follow-up assessment within 90 days to verify remediation.');
        lines.push('5. **Update Documentation** - Ensure all policies and procedures are updated to address gaps.');
        lines.push('');
      }
    } else {
      lines.push('## Overview');
      lines.push('');
      lines.push('No assessment data available for this report.');
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*This report was generated by Nexus Compliance Engine.*');
    lines.push(`*Powered by Adverant - ${config.plugin.version}*`);

    return lines.join('\n');
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(
    reportType: ReportType,
    assessment: ComplianceAssessment | null,
    findings: ControlFinding[],
    options: { includeEvidence: boolean; includeRemediation: boolean }
  ): string {
    const markdownContent = this.generateMarkdownReport(
      reportType,
      assessment,
      findings,
      options
    );

    // Simple HTML wrapper - in production would use proper markdown-to-html conversion
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Report - ${reportType}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 2rem; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
    h2 { color: #374151; margin-top: 2rem; }
    h3 { color: #4b5563; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #d1d5db; padding: 0.75rem; text-align: left; }
    th { background: #f3f4f6; }
    .severity-critical { color: #dc2626; font-weight: bold; }
    .severity-major { color: #f59e0b; }
    .severity-minor { color: #3b82f6; }
    .status-compliant { color: #059669; }
    .status-non_compliant { color: #dc2626; }
    .status-partial { color: #f59e0b; }
    pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
  </style>
</head>
<body>
  <pre>${this.escapeHtml(markdownContent)}</pre>
</body>
</html>`;
  }

  /**
   * Generate JSON report
   */
  private generateJsonReport(
    reportType: ReportType,
    assessment: ComplianceAssessment | null,
    findings: ControlFinding[],
    options: { includeEvidence: boolean; includeRemediation: boolean }
  ): string {
    const report = {
      metadata: {
        reportType,
        generatedAt: new Date().toISOString(),
        generator: 'Nexus Compliance Engine',
        version: config.plugin.version,
      },
      assessment: assessment
        ? {
            id: assessment.id,
            frameworkId: assessment.frameworkId,
            targetSystem: {
              id: assessment.targetSystemId,
              name: assessment.targetSystemName,
              description: assessment.targetSystemDescription,
            },
            status: assessment.status,
            overallScore: assessment.overallScore,
            riskLevel: assessment.riskLevel,
            completedAt: assessment.completedAt?.toISOString(),
            summary: {
              totalControlsAssessed: assessment.totalControlsAssessed,
              compliant: assessment.compliantControls,
              nonCompliant: assessment.nonCompliantControls,
              partial: assessment.partialControls,
              notApplicable: assessment.notApplicableControls,
            },
            findingsBySeverity: {
              critical: assessment.criticalFindings,
              major: assessment.majorFindings,
              minor: assessment.minorFindings,
              observations: assessment.observations,
            },
          }
        : null,
      findings: findings.map((f) => ({
        id: f.id,
        controlId: f.controlId,
        status: f.status,
        severity: f.severity,
        title: f.findingTitle,
        description: f.findingDescription,
        aiAssessment: f.aiAssessment,
        aiConfidence: f.aiConfidence,
        remediation: options.includeRemediation
          ? {
              required: f.remediationRequired,
              status: f.remediationStatus,
              plan: f.remediationPlan,
              owner: f.remediationOwner,
              dueDate: f.remediationDueDate?.toISOString(),
            }
          : undefined,
        evidence: options.includeEvidence ? f.evidence : undefined,
      })),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    assessment: ComplianceAssessment,
    findings: ControlFinding[]
  ): ExecutiveSummary {
    const criticalGaps = findings.filter(
      (f) => f.severity === 'critical' || f.severity === 'major'
    ).length;

    const keyFindings = findings
      .filter((f) => f.status === 'non_compliant')
      .slice(0, 5)
      .map((f) => f.findingTitle ?? f.controlId);

    const immediateActions = [
      ...(criticalGaps > 0
        ? [`Address ${criticalGaps} critical/major findings immediately`]
        : []),
      'Review and validate AI-assisted assessments',
      'Develop remediation plans for non-compliant controls',
      'Schedule follow-up assessment',
    ];

    return {
      overallScore: assessment.overallScore ?? 0,
      riskLevel: assessment.riskLevel ?? 'critical',
      frameworksCovered: [assessment.frameworkId],
      keyFindings,
      criticalGaps,
      immediateActions,
      complianceTrend: 'stable',
      generatedAt: new Date(),
    };
  }

  /**
   * Generate report title
   */
  private generateReportTitle(reportType: ReportType, systemName?: string): string {
    const typeLabels: Record<ReportType, string> = {
      executive_summary: 'Executive Summary',
      full_audit: 'Full Audit Report',
      gap_analysis: 'Gap Analysis Report',
      remediation_plan: 'Remediation Plan',
      board_presentation: 'Board Presentation',
    };

    const label = typeLabels[reportType];
    return systemName ? `${label} - ${systemName}` : label;
  }

  /**
   * List reports for a tenant
   */
  async listReports(
    tenantId: string,
    options: {
      reportType?: ReportType;
      format?: ReportFormat;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ reports: ComplianceReport[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    let whereClause = 'WHERE tenant_id = $1';
    const queryParams: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.reportType) {
      whereClause += ` AND report_type = $${paramIndex}`;
      queryParams.push(options.reportType);
      paramIndex++;
    }

    if (options.format) {
      whereClause += ` AND format = $${paramIndex}`;
      queryParams.push(options.format);
      paramIndex++;
    }

    // Count total
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM compliance_reports ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // Get reports
    const result = await query<DatabaseRow>(
      `SELECT * FROM compliance_reports
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const reports = result.rows.map(mapRowToReport);

    return { reports, total };
  }

  /**
   * Get report by ID
   */
  async getReport(tenantId: string, reportId: string): Promise<ComplianceReport | null> {
    const result = await query<DatabaseRow>(
      `SELECT * FROM compliance_reports
       WHERE id = $1 AND tenant_id = $2`,
      [reportId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToReport(result.rows[0]!);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private mapAssessmentRow(row: DatabaseRow): ComplianceAssessment {
    return {
      id: row['id'] as string,
      tenantId: row['tenant_id'] as string,
      frameworkId: row['framework_id'] as string,
      targetSystemId: row['target_system_id'] as string,
      targetSystemName: row['target_system_name'] as string,
      targetSystemDescription: row['target_system_description'] as string | undefined,
      scope: [],
      excludedControls: [],
      status: row['status'] as ComplianceAssessment['status'],
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

  private mapFindingRow(row: DatabaseRow): ControlFinding {
    return {
      id: row['id'] as string,
      assessmentId: row['assessment_id'] as string,
      controlId: row['control_id'] as string,
      tenantId: row['tenant_id'] as string,
      status: row['status'] as ControlFinding['status'],
      severity: row['severity'] as ControlFinding['severity'],
      findingTitle: row['finding_title'] as string | undefined,
      findingDescription: row['finding_description'] as string | undefined,
      evidence: [],
      evidenceUrls: [],
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
}

export const reportService = new ReportService();
