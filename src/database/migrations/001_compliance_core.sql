-- Migration: 001_compliance_core.sql
-- Description: Core compliance tables including master toggle configuration
-- Author: Adverant Compliance Service
-- Date: 2025-12-31

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- COMPLIANCE TOGGLE CONFIGURATION
-- Master enable/disable switch for all compliance features with audit trail
-- ============================================================================

-- Compliance configuration table with JSONB for flexible module toggles
CREATE TABLE IF NOT EXISTS compliance_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,

    -- Master switch - disables ALL compliance features when false
    master_enabled BOOLEAN NOT NULL DEFAULT true,

    -- Module-level configuration stored as JSONB for flexibility
    module_config JSONB NOT NULL DEFAULT '{
        "gdpr": {
            "enabled": true,
            "dataExport": true,
            "dataErasure": true,
            "consentManagement": true,
            "dataPortability": true,
            "rectification": true,
            "restrictProcessing": true
        },
        "aiAct": {
            "enabled": true,
            "riskClassification": true,
            "humanOversight": true,
            "transparencyLogging": true,
            "technicalDocumentation": true,
            "friaAssessment": true
        },
        "nis2": {
            "enabled": true,
            "incidentReporting": true,
            "securityMonitoring": true,
            "supplyChainSecurity": true,
            "businessContinuity": true
        },
        "iso27001": {
            "enabled": true,
            "controlAssessment": true,
            "auditTrail": true,
            "riskManagement": true,
            "accessControl": true
        },
        "soc2": {
            "enabled": false,
            "securityControls": false,
            "availabilityControls": false,
            "confidentialityControls": false
        },
        "hipaa": {
            "enabled": false,
            "phiProtection": false,
            "auditControls": false,
            "accessManagement": false
        }
    }'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint per tenant
    CONSTRAINT uq_compliance_config_tenant UNIQUE (tenant_id)
);

-- Compliance configuration audit log - tracks all changes to toggle states
CREATE TABLE IF NOT EXISTS compliance_config_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES compliance_config(id) ON DELETE CASCADE,
    tenant_id VARCHAR(255) NOT NULL,

    -- Change tracking
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'TOGGLE_MASTER', 'TOGGLE_MODULE', 'TOGGLE_FEATURE')),
    changed_by VARCHAR(255) NOT NULL,
    change_reason TEXT NOT NULL,

    -- State snapshots
    previous_state JSONB,
    new_state JSONB NOT NULL,

    -- Specific change details
    module_affected VARCHAR(50),
    feature_affected VARCHAR(100),
    previous_value BOOLEAN,
    new_value BOOLEAN,

    -- Audit metadata
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast audit lookups
CREATE INDEX IF NOT EXISTS idx_compliance_config_audit_tenant ON compliance_config_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_config_audit_config ON compliance_config_audit(config_id);
CREATE INDEX IF NOT EXISTS idx_compliance_config_audit_created ON compliance_config_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_config_audit_action ON compliance_config_audit(action);

-- ============================================================================
-- COMPLIANCE FRAMEWORKS
-- Stores framework definitions (ISO 27001, GDPR, AI Act, NIS2, etc.)
-- ============================================================================

CREATE TYPE compliance_framework_category AS ENUM (
    'security',
    'privacy',
    'ai_governance',
    'cybersecurity',
    'healthcare',
    'financial'
);

CREATE TYPE compliance_jurisdiction AS ENUM (
    'eu',
    'us',
    'uk',
    'global',
    'apac',
    'latam'
);

CREATE TABLE IF NOT EXISTS compliance_frameworks (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500) NOT NULL,
    version VARCHAR(50) NOT NULL,
    effective_date DATE,
    description TEXT NOT NULL,
    category compliance_framework_category NOT NULL,
    jurisdiction compliance_jurisdiction NOT NULL,

    -- Framework metadata
    authority VARCHAR(255),
    official_url TEXT,
    documentation_url TEXT,

    -- Control counts
    total_controls INTEGER DEFAULT 0,
    critical_controls INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_updated DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- COMPLIANCE CONTROLS
-- Individual controls/requirements from each framework
-- ============================================================================

CREATE TYPE control_risk_category AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
);

CREATE TABLE IF NOT EXISTS compliance_controls (
    id VARCHAR(100) PRIMARY KEY,
    framework_id VARCHAR(50) NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,

    -- Control identification
    control_number VARCHAR(50) NOT NULL,
    domain VARCHAR(255),
    subdomain VARCHAR(255),
    title VARCHAR(500) NOT NULL,

    -- Control details
    description TEXT NOT NULL,
    objective TEXT,
    implementation_guidance TEXT,

    -- Requirements as JSONB for flexibility
    evidence_requirements JSONB DEFAULT '[]'::jsonb,
    testing_procedures JSONB DEFAULT '[]'::jsonb,

    -- Risk assessment
    risk_category control_risk_category NOT NULL DEFAULT 'medium',
    implementation_priority INTEGER NOT NULL DEFAULT 50 CHECK (implementation_priority BETWEEN 1 AND 100),

    -- Automation
    automated_test_available BOOLEAN NOT NULL DEFAULT false,
    automated_test_id VARCHAR(100),
    ai_assessment_prompt TEXT,

    -- Cross-framework mapping stored in separate table

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for framework lookups
CREATE INDEX IF NOT EXISTS idx_compliance_controls_framework ON compliance_controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_compliance_controls_domain ON compliance_controls(domain);
CREATE INDEX IF NOT EXISTS idx_compliance_controls_risk ON compliance_controls(risk_category);

-- ============================================================================
-- CONTROL MAPPINGS
-- Cross-framework control equivalencies
-- ============================================================================

CREATE TYPE control_mapping_type AS ENUM (
    'equivalent',
    'partial',
    'related',
    'supersedes'
);

CREATE TABLE IF NOT EXISTS control_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_control_id VARCHAR(100) NOT NULL REFERENCES compliance_controls(id) ON DELETE CASCADE,
    target_control_id VARCHAR(100) NOT NULL REFERENCES compliance_controls(id) ON DELETE CASCADE,
    mapping_type control_mapping_type NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    notes TEXT,
    mapped_by VARCHAR(50) DEFAULT 'system' CHECK (mapped_by IN ('system', 'manual', 'ai')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate mappings
    CONSTRAINT uq_control_mapping UNIQUE (source_control_id, target_control_id),
    -- Prevent self-mapping
    CONSTRAINT chk_no_self_mapping CHECK (source_control_id != target_control_id)
);

-- Index for mapping lookups
CREATE INDEX IF NOT EXISTS idx_control_mappings_source ON control_mappings(source_control_id);
CREATE INDEX IF NOT EXISTS idx_control_mappings_target ON control_mappings(target_control_id);

-- ============================================================================
-- COMPLIANCE ASSESSMENTS
-- Assessment records for compliance evaluations
-- ============================================================================

CREATE TYPE assessment_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
);

CREATE TYPE risk_level AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TABLE IF NOT EXISTS compliance_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,
    framework_id VARCHAR(50) NOT NULL REFERENCES compliance_frameworks(id),

    -- Target system information
    target_system_id VARCHAR(255) NOT NULL,
    target_system_name VARCHAR(255) NOT NULL,
    target_system_description TEXT,

    -- Assessment scope
    scope JSONB DEFAULT '[]'::jsonb,
    excluded_controls JSONB DEFAULT '[]'::jsonb,

    -- Status and results
    status assessment_status NOT NULL DEFAULT 'pending',
    overall_score DECIMAL(5,2) CHECK (overall_score BETWEEN 0 AND 100),
    risk_level risk_level,

    -- Finding counts
    total_controls_assessed INTEGER DEFAULT 0,
    compliant_controls INTEGER DEFAULT 0,
    non_compliant_controls INTEGER DEFAULT 0,
    partial_controls INTEGER DEFAULT 0,
    not_applicable_controls INTEGER DEFAULT 0,

    -- Severity breakdown
    critical_findings INTEGER DEFAULT 0,
    major_findings INTEGER DEFAULT 0,
    minor_findings INTEGER DEFAULT 0,
    observations INTEGER DEFAULT 0,

    -- AI assessment metadata
    ai_model_used VARCHAR(100),
    ai_confidence DECIMAL(3,2) CHECK (ai_confidence BETWEEN 0 AND 1),

    -- Human review
    human_reviewed BOOLEAN NOT NULL DEFAULT false,
    reviewer_id UUID,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,

    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for assessment queries
CREATE INDEX IF NOT EXISTS idx_assessments_tenant ON compliance_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assessments_framework ON compliance_assessments(framework_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON compliance_assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_target ON compliance_assessments(target_system_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created ON compliance_assessments(created_at DESC);

-- ============================================================================
-- CONTROL FINDINGS
-- Individual control assessment results
-- ============================================================================

CREATE TYPE finding_status AS ENUM (
    'compliant',
    'non_compliant',
    'partial',
    'not_applicable',
    'not_assessed'
);

CREATE TYPE finding_severity AS ENUM (
    'critical',
    'major',
    'minor',
    'observation'
);

CREATE TYPE remediation_status AS ENUM (
    'not_required',
    'pending',
    'in_progress',
    'completed',
    'accepted_risk',
    'deferred'
);

CREATE TABLE IF NOT EXISTS control_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES compliance_assessments(id) ON DELETE CASCADE,
    control_id VARCHAR(100) NOT NULL REFERENCES compliance_controls(id),
    tenant_id VARCHAR(255) NOT NULL,

    -- Finding details
    status finding_status NOT NULL DEFAULT 'not_assessed',
    severity finding_severity,
    finding_title VARCHAR(500),
    finding_description TEXT,

    -- Evidence
    evidence JSONB DEFAULT '[]'::jsonb,
    evidence_urls JSONB DEFAULT '[]'::jsonb,

    -- AI assessment
    ai_assessment TEXT,
    ai_confidence DECIMAL(5,4) CHECK (ai_confidence BETWEEN 0 AND 1),
    ai_reasoning TEXT,

    -- Remediation
    remediation_required BOOLEAN NOT NULL DEFAULT false,
    remediation_status remediation_status NOT NULL DEFAULT 'not_required',
    remediation_plan TEXT,
    remediation_owner VARCHAR(255),
    remediation_due_date DATE,
    remediation_completed_date DATE,
    remediation_notes TEXT,

    -- Human verification
    human_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for finding queries
CREATE INDEX IF NOT EXISTS idx_findings_assessment ON control_findings(assessment_id);
CREATE INDEX IF NOT EXISTS idx_findings_control ON control_findings(control_id);
CREATE INDEX IF NOT EXISTS idx_findings_tenant ON control_findings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON control_findings(status);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON control_findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_remediation ON control_findings(remediation_status);

-- ============================================================================
-- COMPLIANCE AUDIT LOG
-- General audit trail for all compliance operations
-- ============================================================================

CREATE TYPE audit_entity_type AS ENUM (
    'framework',
    'control',
    'assessment',
    'finding',
    'report',
    'config',
    'ai_system'
);

CREATE TYPE audit_action AS ENUM (
    'create',
    'read',
    'update',
    'delete',
    'export',
    'assess',
    'approve',
    'reject',
    'toggle'
);

CREATE TYPE audit_actor_type AS ENUM (
    'user',
    'system',
    'ai',
    'api'
);

CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,

    -- Entity reference
    entity_type audit_entity_type NOT NULL,
    entity_id VARCHAR(255) NOT NULL,

    -- Action details
    action audit_action NOT NULL,
    actor_id VARCHAR(255),
    actor_type audit_actor_type NOT NULL DEFAULT 'user',

    -- Change details
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_state JSONB,
    new_state JSONB,

    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    session_id VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON compliance_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON compliance_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON compliance_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON compliance_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON compliance_audit_log(created_at DESC);

-- Partition audit log by month for performance (optional - uncomment if needed)
-- CREATE TABLE compliance_audit_log_2025_01 PARTITION OF compliance_audit_log
--     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================================================
-- COMPLIANCE ALERTS
-- Continuous monitoring alerts
-- ============================================================================

CREATE TYPE alert_type AS ENUM (
    'drift',
    'expiration',
    'new_requirement',
    'risk_increase',
    'overdue_remediation',
    'failed_assessment',
    'compliance_breach'
);

CREATE TYPE alert_severity AS ENUM (
    'info',
    'warning',
    'error',
    'critical'
);

CREATE TABLE IF NOT EXISTS compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,

    -- Related entities
    assessment_id UUID REFERENCES compliance_assessments(id) ON DELETE SET NULL,
    control_id VARCHAR(100) REFERENCES compliance_controls(id) ON DELETE SET NULL,
    framework_id VARCHAR(50) REFERENCES compliance_frameworks(id) ON DELETE SET NULL,

    -- Alert details
    alert_type alert_type NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'warning',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,

    -- Resolution
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    acknowledge_notes TEXT,

    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    -- Notification tracking
    notifications_sent JSONB DEFAULT '[]'::jsonb,
    last_notification_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for alert queries
CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON compliance_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON compliance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON compliance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON compliance_alerts(acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_alerts_created ON compliance_alerts(created_at DESC);

-- ============================================================================
-- AI SYSTEM REGISTRY
-- Inventory of AI systems for EU AI Act compliance
-- ============================================================================

CREATE TYPE ai_risk_classification AS ENUM (
    'prohibited',
    'high_risk',
    'limited_risk',
    'minimal_risk',
    'gpai',
    'unclassified'
);

CREATE TYPE ai_system_status AS ENUM (
    'development',
    'testing',
    'staging',
    'production',
    'deprecated',
    'decommissioned'
);

CREATE TABLE IF NOT EXISTS ai_system_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,

    -- System identification
    system_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    version VARCHAR(50),

    -- Classification
    risk_classification ai_risk_classification NOT NULL DEFAULT 'unclassified',
    classification_rationale TEXT,
    classification_date DATE,
    classified_by VARCHAR(255),

    -- Provider information
    provider VARCHAR(255) NOT NULL,
    provider_contact VARCHAR(255),
    is_third_party BOOLEAN NOT NULL DEFAULT false,

    -- Deployment
    deployment_date DATE,
    status ai_system_status NOT NULL DEFAULT 'development',
    environments JSONB DEFAULT '[]'::jsonb,

    -- Data handling
    data_categories JSONB DEFAULT '[]'::jsonb,
    purpose_of_processing JSONB DEFAULT '[]'::jsonb,
    data_sources JSONB DEFAULT '[]'::jsonb,

    -- Oversight
    human_oversight_enabled BOOLEAN NOT NULL DEFAULT false,
    human_oversight_description TEXT,
    human_oversight_contact VARCHAR(255),

    -- Documentation paths
    technical_documentation_path TEXT,
    fria_path TEXT,
    dpia_path TEXT,
    risk_assessment_path TEXT,

    -- Compliance status
    last_assessment_id UUID REFERENCES compliance_assessments(id) ON DELETE SET NULL,
    last_assessment_date DATE,
    compliance_score DECIMAL(5,2),

    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique system per tenant
    CONSTRAINT uq_ai_system_tenant UNIQUE (tenant_id, system_id)
);

-- Indexes for AI system queries
CREATE INDEX IF NOT EXISTS idx_ai_systems_tenant ON ai_system_registry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_systems_classification ON ai_system_registry(risk_classification);
CREATE INDEX IF NOT EXISTS idx_ai_systems_status ON ai_system_registry(status);
CREATE INDEX IF NOT EXISTS idx_ai_systems_provider ON ai_system_registry(provider);

-- ============================================================================
-- COMPLIANCE REPORTS
-- Generated compliance reports
-- ============================================================================

CREATE TYPE report_format AS ENUM (
    'pdf',
    'html',
    'json',
    'excel',
    'markdown'
);

CREATE TYPE report_status AS ENUM (
    'generating',
    'completed',
    'failed',
    'expired'
);

CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,
    assessment_id UUID REFERENCES compliance_assessments(id) ON DELETE SET NULL,

    -- Report details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    report_type VARCHAR(100) NOT NULL,
    format report_format NOT NULL,

    -- Status
    status report_status NOT NULL DEFAULT 'generating',
    error_message TEXT,

    -- Content
    file_path TEXT,
    file_size_bytes BIGINT,
    checksum VARCHAR(64),

    -- Executive summary (cached for quick access)
    executive_summary JSONB,

    -- Access control
    is_public BOOLEAN NOT NULL DEFAULT false,
    access_token VARCHAR(255),
    expires_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,

    -- Generation metadata
    generated_by VARCHAR(255),
    generation_time_ms INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for report queries
CREATE INDEX IF NOT EXISTS idx_reports_tenant ON compliance_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_assessment ON compliance_reports(assessment_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON compliance_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON compliance_reports(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Tenant isolation for multi-tenancy
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE compliance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_config_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_system_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY tenant_isolation_config ON compliance_config
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_config_audit ON compliance_config_audit
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_assessments ON compliance_assessments
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_findings ON control_findings
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_audit ON compliance_audit_log
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_alerts ON compliance_alerts
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_ai_systems ON ai_system_registry
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_reports ON compliance_reports
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- ============================================================================
-- FUNCTIONS
-- Helper functions for compliance operations
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all relevant tables
CREATE TRIGGER update_compliance_config_updated_at
    BEFORE UPDATE ON compliance_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_frameworks_updated_at
    BEFORE UPDATE ON compliance_frameworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_controls_updated_at
    BEFORE UPDATE ON compliance_controls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_assessments_updated_at
    BEFORE UPDATE ON compliance_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_control_findings_updated_at
    BEFORE UPDATE ON control_findings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_alerts_updated_at
    BEFORE UPDATE ON compliance_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_system_registry_updated_at
    BEFORE UPDATE ON ai_system_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_reports_updated_at
    BEFORE UPDATE ON compliance_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if compliance module is enabled
CREATE OR REPLACE FUNCTION is_compliance_module_enabled(
    p_tenant_id VARCHAR(255),
    p_module VARCHAR(50),
    p_feature VARCHAR(100) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_config compliance_config%ROWTYPE;
    v_module_enabled BOOLEAN;
    v_feature_enabled BOOLEAN;
BEGIN
    -- Get config for tenant
    SELECT * INTO v_config FROM compliance_config WHERE tenant_id = p_tenant_id;

    -- If no config exists, return true (default enabled)
    IF NOT FOUND THEN
        RETURN true;
    END IF;

    -- Check master switch first
    IF NOT v_config.master_enabled THEN
        RETURN false;
    END IF;

    -- Check module enabled
    v_module_enabled := (v_config.module_config->p_module->>'enabled')::boolean;

    IF v_module_enabled IS NULL OR NOT v_module_enabled THEN
        RETURN false;
    END IF;

    -- If no specific feature requested, return module status
    IF p_feature IS NULL THEN
        RETURN true;
    END IF;

    -- Check specific feature
    v_feature_enabled := (v_config.module_config->p_module->>p_feature)::boolean;

    RETURN COALESCE(v_feature_enabled, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to log compliance toggle changes
CREATE OR REPLACE FUNCTION log_compliance_toggle_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log master toggle change
    IF OLD.master_enabled IS DISTINCT FROM NEW.master_enabled THEN
        INSERT INTO compliance_config_audit (
            config_id, tenant_id, action, changed_by, change_reason,
            previous_state, new_state, module_affected, feature_affected,
            previous_value, new_value
        ) VALUES (
            NEW.id, NEW.tenant_id, 'TOGGLE_MASTER',
            current_setting('app.current_user_id', true),
            current_setting('app.change_reason', true),
            row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb,
            'master', 'enabled',
            OLD.master_enabled, NEW.master_enabled
        );
    END IF;

    -- Log module config changes
    IF OLD.module_config IS DISTINCT FROM NEW.module_config THEN
        INSERT INTO compliance_config_audit (
            config_id, tenant_id, action, changed_by, change_reason,
            previous_state, new_state
        ) VALUES (
            NEW.id, NEW.tenant_id, 'TOGGLE_MODULE',
            current_setting('app.current_user_id', true),
            current_setting('app.change_reason', true),
            OLD.module_config, NEW.module_config
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger
CREATE TRIGGER audit_compliance_config_changes
    AFTER UPDATE ON compliance_config
    FOR EACH ROW EXECUTE FUNCTION log_compliance_toggle_change();

-- ============================================================================
-- SEED DATA
-- Initial framework data
-- ============================================================================

-- Insert core compliance frameworks
INSERT INTO compliance_frameworks (id, name, full_name, version, effective_date, description, category, jurisdiction, authority, total_controls)
VALUES
    ('iso27001', 'ISO 27001', 'ISO/IEC 27001:2022 Information Security Management', '2022', '2022-10-25',
     'International standard for information security management systems (ISMS)',
     'security', 'global', 'International Organization for Standardization', 93),

    ('iso27701', 'ISO 27701', 'ISO/IEC 27701:2019 Privacy Information Management', '2019', '2019-08-06',
     'Extension to ISO 27001 and 27002 for privacy information management',
     'privacy', 'global', 'International Organization for Standardization', 49),

    ('gdpr', 'GDPR', 'General Data Protection Regulation (EU) 2016/679', '2016/679', '2018-05-25',
     'EU regulation on data protection and privacy for individuals within the EU and EEA',
     'privacy', 'eu', 'European Parliament and Council', 99),

    ('ai_act', 'EU AI Act', 'Artificial Intelligence Act (EU) 2024/1689', '2024/1689', '2024-08-01',
     'EU regulation laying down harmonised rules on artificial intelligence',
     'ai_governance', 'eu', 'European Parliament and Council', 85),

    ('nis2', 'NIS2', 'Network and Information Security Directive (EU) 2022/2555', '2022/2555', '2024-10-17',
     'EU directive on measures for high common level of cybersecurity',
     'cybersecurity', 'eu', 'European Parliament and Council', 46),

    ('soc2', 'SOC 2', 'SOC 2 Type II Trust Services Criteria', '2017', '2017-01-01',
     'AICPA trust services criteria for service organizations',
     'security', 'us', 'American Institute of CPAs', 64)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    version = EXCLUDED.version,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Grant usage on all types
GRANT USAGE ON TYPE compliance_framework_category TO PUBLIC;
GRANT USAGE ON TYPE compliance_jurisdiction TO PUBLIC;
GRANT USAGE ON TYPE control_risk_category TO PUBLIC;
GRANT USAGE ON TYPE control_mapping_type TO PUBLIC;
GRANT USAGE ON TYPE assessment_status TO PUBLIC;
GRANT USAGE ON TYPE risk_level TO PUBLIC;
GRANT USAGE ON TYPE finding_status TO PUBLIC;
GRANT USAGE ON TYPE finding_severity TO PUBLIC;
GRANT USAGE ON TYPE remediation_status TO PUBLIC;
GRANT USAGE ON TYPE audit_entity_type TO PUBLIC;
GRANT USAGE ON TYPE audit_action TO PUBLIC;
GRANT USAGE ON TYPE audit_actor_type TO PUBLIC;
GRANT USAGE ON TYPE alert_type TO PUBLIC;
GRANT USAGE ON TYPE alert_severity TO PUBLIC;
GRANT USAGE ON TYPE ai_risk_classification TO PUBLIC;
GRANT USAGE ON TYPE ai_system_status TO PUBLIC;
GRANT USAGE ON TYPE report_format TO PUBLIC;
GRANT USAGE ON TYPE report_status TO PUBLIC;

-- Migration complete
COMMENT ON TABLE compliance_config IS 'Master compliance toggle configuration with module-level controls';
COMMENT ON TABLE compliance_config_audit IS 'Audit trail for all compliance configuration changes';
COMMENT ON TABLE compliance_frameworks IS 'Compliance framework definitions (ISO 27001, GDPR, etc.)';
COMMENT ON TABLE compliance_controls IS 'Individual controls from compliance frameworks';
COMMENT ON TABLE control_mappings IS 'Cross-framework control equivalencies and relationships';
COMMENT ON TABLE compliance_assessments IS 'Compliance assessment records';
COMMENT ON TABLE control_findings IS 'Individual control assessment findings';
COMMENT ON TABLE compliance_audit_log IS 'General audit trail for compliance operations';
COMMENT ON TABLE compliance_alerts IS 'Continuous monitoring alerts';
COMMENT ON TABLE ai_system_registry IS 'AI system inventory for EU AI Act compliance';
COMMENT ON TABLE compliance_reports IS 'Generated compliance reports';
