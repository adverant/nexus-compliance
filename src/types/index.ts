/**
 * Nexus Compliance Engine - Type Definitions
 * EU Regulatory Compliance Types for GDPR, AI Act, NIS2, ISO 27001
 */

// ============================================================================
// COMPLIANCE CONFIGURATION TYPES
// ============================================================================

export interface ComplianceModuleConfig {
  enabled: boolean;
  [feature: string]: boolean;
}

export interface GDPRModuleConfig extends ComplianceModuleConfig {
  dataExport: boolean;
  dataErasure: boolean;
  consentManagement: boolean;
  dataPortability: boolean;
  rectification: boolean;
  restrictProcessing: boolean;
}

export interface AIActModuleConfig extends ComplianceModuleConfig {
  riskClassification: boolean;
  humanOversight: boolean;
  transparencyLogging: boolean;
  technicalDocumentation: boolean;
  friaAssessment: boolean;
}

export interface NIS2ModuleConfig extends ComplianceModuleConfig {
  incidentReporting: boolean;
  securityMonitoring: boolean;
  supplyChainSecurity: boolean;
  businessContinuity: boolean;
}

export interface ISO27001ModuleConfig extends ComplianceModuleConfig {
  controlAssessment: boolean;
  auditTrail: boolean;
  riskManagement: boolean;
  accessControl: boolean;
}

export interface SOC2ModuleConfig extends ComplianceModuleConfig {
  securityControls: boolean;
  availabilityControls: boolean;
  confidentialityControls: boolean;
}

export interface HIPAAModuleConfig extends ComplianceModuleConfig {
  phiProtection: boolean;
  auditControls: boolean;
  accessManagement: boolean;
}

export interface ModuleConfigMap {
  gdpr: GDPRModuleConfig;
  aiAct: AIActModuleConfig;
  nis2: NIS2ModuleConfig;
  iso27001: ISO27001ModuleConfig;
  soc2: SOC2ModuleConfig;
  hipaa: HIPAAModuleConfig;
}

export interface ComplianceConfig {
  id: string;
  tenantId: string;
  masterEnabled: boolean;
  moduleConfig: ModuleConfigMap;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceConfigAudit {
  id: string;
  configId: string;
  tenantId: string;
  action: 'CREATE' | 'UPDATE' | 'TOGGLE_MASTER' | 'TOGGLE_MODULE' | 'TOGGLE_FEATURE';
  changedBy: string;
  changeReason: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown>;
  moduleAffected?: string;
  featureAffected?: string;
  previousValue?: boolean;
  newValue?: boolean;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: Date;
}

// ============================================================================
// FRAMEWORK TYPES
// ============================================================================

export type FrameworkCategory =
  | 'security'
  | 'privacy'
  | 'ai_governance'
  | 'cybersecurity'
  | 'healthcare'
  | 'financial';

export type Jurisdiction = 'eu' | 'us' | 'uk' | 'global' | 'apac' | 'latam';

export interface ComplianceFramework {
  id: string;
  name: string;
  fullName: string;
  version: string;
  effectiveDate?: Date;
  description: string;
  category: FrameworkCategory;
  jurisdiction: Jurisdiction;
  authority?: string;
  officialUrl?: string;
  documentationUrl?: string;
  totalControls: number;
  criticalControls: number;
  isActive: boolean;
  lastUpdated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CONTROL TYPES
// ============================================================================

export type ControlRiskCategory = 'critical' | 'high' | 'medium' | 'low';
export type ControlMappingType = 'equivalent' | 'partial' | 'related' | 'supersedes';

export interface EvidenceRequirement {
  id: string;
  type: 'document' | 'screenshot' | 'log' | 'interview' | 'observation';
  description: string;
  mandatory: boolean;
}

export interface TestingProcedure {
  id: string;
  name: string;
  description: string;
  automated: boolean;
  expectedResult: string;
}

export interface ComplianceControl {
  id: string;
  frameworkId: string;
  controlNumber: string;
  domain?: string;
  subdomain?: string;
  title: string;
  description: string;
  objective?: string;
  implementationGuidance?: string;
  evidenceRequirements: EvidenceRequirement[];
  testingProcedures: TestingProcedure[];
  riskCategory: ControlRiskCategory;
  implementationPriority: number;
  automatedTestAvailable: boolean;
  automatedTestId?: string;
  aiAssessmentPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ControlMapping {
  id: string;
  sourceControlId: string;
  targetControlId: string;
  mappingType: ControlMappingType;
  confidenceScore?: number;
  notes?: string;
  mappedBy: 'system' | 'manual' | 'ai';
  createdAt: Date;
}

// ============================================================================
// ASSESSMENT TYPES
// ============================================================================

export type AssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'compliant' | 'non_compliant' | 'partial' | 'not_applicable' | 'not_assessed';
export type FindingSeverity = 'critical' | 'major' | 'minor' | 'observation';
export type RemediationStatus = 'not_required' | 'pending' | 'in_progress' | 'completed' | 'accepted_risk' | 'deferred';

export interface ComplianceAssessment {
  id: string;
  tenantId: string;
  frameworkId: string;
  targetSystemId: string;
  targetSystemName: string;
  targetSystemDescription?: string;
  scope: string[];
  excludedControls: string[];
  status: AssessmentStatus;
  overallScore?: number;
  riskLevel?: RiskLevel;
  totalControlsAssessed: number;
  compliantControls: number;
  nonCompliantControls: number;
  partialControls: number;
  notApplicableControls: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  observations: number;
  aiModelUsed?: string;
  aiConfidence?: number;
  humanReviewed: boolean;
  reviewerId?: string;
  reviewNotes?: string;
  reviewedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Evidence {
  type: 'document' | 'screenshot' | 'log' | 'interview' | 'observation' | 'code' | 'config';
  name: string;
  description: string;
  url?: string;
  content?: string;
  collectedAt: Date;
  collectedBy: string;
}

export interface ControlFinding {
  id: string;
  assessmentId: string;
  controlId: string;
  tenantId: string;
  status: FindingStatus;
  severity?: FindingSeverity;
  findingTitle?: string;
  findingDescription?: string;
  evidence: Evidence[];
  evidenceUrls: string[];
  aiAssessment?: string;
  aiConfidence?: number;
  aiReasoning?: string;
  remediationRequired: boolean;
  remediationStatus: RemediationStatus;
  remediationPlan?: string;
  remediationOwner?: string;
  remediationDueDate?: Date;
  remediationCompletedDate?: Date;
  remediationNotes?: string;
  humanVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// AI SYSTEM REGISTRY TYPES (EU AI Act)
// ============================================================================

export type AIRiskClassification =
  | 'prohibited'
  | 'high_risk'
  | 'limited_risk'
  | 'minimal_risk'
  | 'gpai'
  | 'unclassified';

export type AISystemStatus =
  | 'development'
  | 'testing'
  | 'staging'
  | 'production'
  | 'deprecated'
  | 'decommissioned';

export interface AISystem {
  id: string;
  tenantId: string;
  systemId: string;
  name: string;
  description: string;
  version?: string;
  riskClassification: AIRiskClassification;
  classificationRationale?: string;
  classificationDate?: Date;
  classifiedBy?: string;
  provider: string;
  providerContact?: string;
  isThirdParty: boolean;
  deploymentDate?: Date;
  status: AISystemStatus;
  environments: string[];
  dataCategories: string[];
  purposeOfProcessing: string[];
  dataSources: string[];
  humanOversightEnabled: boolean;
  humanOversightDescription?: string;
  humanOversightContact?: string;
  technicalDocumentationPath?: string;
  friaPath?: string;
  dpiaPath?: string;
  riskAssessmentPath?: string;
  lastAssessmentId?: string;
  lastAssessmentDate?: Date;
  complianceScore?: number;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export type AlertType =
  | 'drift'
  | 'expiration'
  | 'new_requirement'
  | 'risk_increase'
  | 'overdue_remediation'
  | 'failed_assessment'
  | 'compliance_breach';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ComplianceAlert {
  id: string;
  tenantId: string;
  assessmentId?: string;
  controlId?: string;
  frameworkId?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  details: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  acknowledgeNotes?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  notificationsSent: NotificationRecord[];
  lastNotificationAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRecord {
  channel: 'email' | 'slack' | 'webhook' | 'sms';
  recipient: string;
  sentAt: Date;
  status: 'sent' | 'failed' | 'delivered';
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export type ReportFormat = 'pdf' | 'html' | 'json' | 'excel' | 'markdown';
export type ReportStatus = 'generating' | 'completed' | 'failed' | 'expired';
export type ReportType =
  | 'executive_summary'
  | 'full_audit'
  | 'gap_analysis'
  | 'remediation_plan'
  | 'board_presentation';

export interface ExecutiveSummary {
  overallScore: number;
  riskLevel: RiskLevel;
  frameworksCovered: string[];
  keyFindings: string[];
  criticalGaps: number;
  immediateActions: string[];
  complianceTrend: 'improving' | 'stable' | 'declining';
  generatedAt: Date;
}

export interface ComplianceReport {
  id: string;
  tenantId: string;
  assessmentId?: string;
  title: string;
  description?: string;
  reportType: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  errorMessage?: string;
  filePath?: string;
  fileSizeBytes?: number;
  checksum?: string;
  executiveSummary?: ExecutiveSummary;
  isPublic: boolean;
  accessToken?: string;
  expiresAt?: Date;
  downloadCount: number;
  generatedBy?: string;
  generationTimeMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export type AuditEntityType =
  | 'framework'
  | 'control'
  | 'assessment'
  | 'finding'
  | 'report'
  | 'config'
  | 'ai_system';

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'assess'
  | 'approve'
  | 'reject'
  | 'toggle';

export type AuditActorType = 'user' | 'system' | 'ai' | 'api';

export interface ComplianceAuditLog {
  id: string;
  tenantId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorId?: string;
  actorType: AuditActorType;
  details: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  createdAt: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateAssessmentRequest {
  frameworkId: string;
  targetSystemId: string;
  targetSystemName: string;
  targetSystemDescription?: string;
  scope?: string[];
  excludedControls?: string[];
}

export interface RunAssessmentRequest {
  useAI: boolean;
  aiModel?: string;
  includeRecommendations?: boolean;
}

export interface RegisterAISystemRequest {
  systemId: string;
  name: string;
  description: string;
  version?: string;
  provider: string;
  providerContact?: string;
  isThirdParty?: boolean;
  environments?: string[];
  dataCategories?: string[];
  purposeOfProcessing?: string[];
  dataSources?: string[];
  humanOversightEnabled?: boolean;
  humanOversightDescription?: string;
  humanOversightContact?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ClassifyAISystemRequest {
  systemDescription?: string;
  useCases?: string[];
  dataCategories?: string[];
  affectedPersons?: string[];
  riskFactors?: string[];
}

export interface GenerateReportRequest {
  assessmentId?: string;
  reportType: ReportType;
  format: ReportFormat;
  includeEvidence?: boolean;
  includeRemediation?: boolean;
  recipientEmail?: string;
}

export interface ToggleModuleRequest {
  module: keyof ModuleConfigMap;
  enabled: boolean;
  reason: string;
  feature?: string;
}

export interface ToggleMasterRequest {
  enabled: boolean;
  reason: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface ComplianceDashboard {
  tenantId: string;
  overallScore: number;
  riskLevel: RiskLevel;
  frameworks: FrameworkStatus[];
  recentAssessments: AssessmentSummary[];
  activeAlerts: AlertSummary[];
  remediationProgress: RemediationProgress;
  aiSystemsSummary: AISystemsSummary;
  complianceTrend: TrendData[];
  lastUpdated: Date;
}

export interface FrameworkStatus {
  frameworkId: string;
  name: string;
  complianceScore: number;
  lastAssessmentDate?: Date;
  criticalGaps: number;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
}

export interface AssessmentSummary {
  id: string;
  frameworkName: string;
  targetSystem: string;
  score: number;
  status: AssessmentStatus;
  createdAt: Date;
}

export interface AlertSummary {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  createdAt: Date;
}

export interface RemediationProgress {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  percentage: number;
}

export interface AISystemsSummary {
  total: number;
  byRiskLevel: Record<AIRiskClassification, number>;
  requiresAction: number;
}

export interface TrendData {
  date: Date;
  score: number;
  assessmentsCompleted: number;
  findingsResolved: number;
}

// ============================================================================
// DATA SUBJECT REQUEST TYPES (GDPR)
// ============================================================================

export type DataSubjectRequestType =
  | 'access'
  | 'erasure'
  | 'rectification'
  | 'portability'
  | 'restriction'
  | 'objection';

export type DataSubjectRequestStatus =
  | 'received'
  | 'verified'
  | 'in_progress'
  | 'completed'
  | 'rejected';

export interface DataSubjectRequest {
  id: string;
  tenantId: string;
  requestType: DataSubjectRequestType;
  subjectId: string;
  subjectEmail?: string;
  requestDetails: string;
  status: DataSubjectRequestStatus;
  receivedAt: Date;
  verifiedAt?: Date;
  completedAt?: Date;
  dueDate: Date;
  assignedTo?: string;
  response?: string;
  rejectionReason?: string;
  auditTrail: DataSubjectRequestAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSubjectRequestAuditEntry {
  action: string;
  performedBy: string;
  performedAt: Date;
  details?: string;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface ComplianceServiceContext {
  tenantId: string;
  userId: string;
  requestId: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
