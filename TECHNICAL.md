# Nexus Compliance Engine - Technical Documentation

## API Reference

### Base URL

```
https://api.adverant.ai/proxy/nexus-compliance/api/v1/compliance
```

### Authentication

All API requests require a Bearer token in the Authorization header:

```bash
Authorization: Bearer YOUR_API_KEY
```

#### Required Scopes

| Scope | Description |
|-------|-------------|
| `compliance:read` | Read compliance data and configurations |
| `compliance:write` | Modify configurations and run assessments |
| `compliance:admin` | Full administrative access |
| `compliance:audit` | Access audit logs and reports |

#### Role-Based Access

| Role | Capabilities |
|------|--------------|
| `admin` | Full access to all features |
| `compliance-officer` | Manage assessments, AI systems, reports |
| `assessor` | Run assessments, view findings |
| `auditor` | View reports and audit logs |
| `viewer` | Read-only access |

---

## API Endpoints

### Configuration Management

#### Get Compliance Configuration

```http
GET /config
```

**Rate Limit:** 30 requests/minute

**Response:**

```json
{
  "tenantId": "tenant_abc123",
  "masterEnabled": true,
  "modules": {
    "gdpr": {
      "enabled": true,
      "settings": {
        "dataProcessingInventory": true,
        "consentManagement": true,
        "breachNotification": true,
        "subjectRightsAutomation": true
      }
    },
    "aiAct": {
      "enabled": true,
      "settings": {
        "aiSystemRegistry": true,
        "riskClassification": true,
        "conformityAssessment": true
      }
    },
    "nis2": {
      "enabled": true,
      "settings": {
        "incidentReporting": true,
        "supplyChainRisk": true,
        "securityMonitoring": true
      }
    },
    "iso27001": {
      "enabled": true,
      "settings": {
        "controlAssessment": true,
        "riskTreatment": true,
        "continuousImprovement": true
      }
    }
  },
  "notifications": {
    "email": true,
    "webhook": "https://api.yourcompany.com/compliance-alerts",
    "slack": {
      "enabled": true,
      "channel": "#compliance"
    }
  },
  "retention": {
    "assessmentHistoryDays": 365,
    "auditLogDays": 730
  },
  "updated_at": "2025-01-15T10:00:00Z"
}
```

#### Update Compliance Configuration

```http
PUT /config
```

**Required Roles:** `admin`, `compliance-officer`

**Rate Limit:** 10 requests/minute

**Request Body:**

```json
{
  "modules": {
    "gdpr": {
      "enabled": true,
      "settings": {
        "dataProcessingInventory": true,
        "consentManagement": true
      }
    }
  },
  "reason": "Enabling GDPR module for Q1 compliance initiative"
}
```

#### Toggle Master Compliance Switch

```http
PUT /config/master
```

**Required Roles:** `admin`

**Rate Limit:** 5 requests/minute

**Request Body:**

```json
{
  "enabled": true,
  "reason": "Activating compliance engine for production"
}
```

### Frameworks

#### List Compliance Frameworks

```http
GET /frameworks
```

**Rate Limit:** 60 requests/minute

**Response:**

```json
{
  "frameworks": [
    {
      "frameworkId": "gdpr",
      "name": "General Data Protection Regulation",
      "shortName": "GDPR",
      "version": "2016/679",
      "jurisdiction": "European Union",
      "category": "privacy",
      "controlsCount": 99,
      "domains": [
        "Data Protection Principles",
        "Rights of Data Subjects",
        "Controller Obligations",
        "Processor Obligations",
        "Transfers to Third Countries"
      ],
      "enabled": true,
      "lastAssessment": "2025-01-10T14:30:00Z",
      "complianceScore": 85
    },
    {
      "frameworkId": "ai_act",
      "name": "EU Artificial Intelligence Act",
      "shortName": "EU AI Act",
      "version": "2024",
      "jurisdiction": "European Union",
      "category": "ai_governance",
      "controlsCount": 85,
      "domains": [
        "Risk Classification",
        "Prohibited Practices",
        "High-Risk Requirements",
        "Transparency Obligations",
        "Governance"
      ],
      "enabled": true,
      "lastAssessment": null,
      "complianceScore": null
    },
    {
      "frameworkId": "nis2",
      "name": "Network and Information Security Directive 2",
      "shortName": "NIS2",
      "version": "2022/2555",
      "jurisdiction": "European Union",
      "category": "cybersecurity",
      "controlsCount": 46,
      "domains": [
        "Risk Management",
        "Incident Handling",
        "Business Continuity",
        "Supply Chain Security",
        "Governance"
      ],
      "enabled": true,
      "lastAssessment": "2025-01-08T09:15:00Z",
      "complianceScore": 72
    },
    {
      "frameworkId": "iso27001",
      "name": "ISO/IEC 27001:2022",
      "shortName": "ISO 27001",
      "version": "2022",
      "jurisdiction": "International",
      "category": "security",
      "controlsCount": 37,
      "domains": [
        "Organizational Controls",
        "People Controls",
        "Physical Controls",
        "Technological Controls"
      ],
      "enabled": true,
      "lastAssessment": "2025-01-12T11:00:00Z",
      "complianceScore": 91
    }
  ],
  "summary": {
    "totalFrameworks": 4,
    "enabledFrameworks": 4,
    "totalControls": 267,
    "averageComplianceScore": 82.7
  }
}
```

#### Get Framework Details

```http
GET /frameworks/:frameworkId
```

**Response:**

```json
{
  "frameworkId": "gdpr",
  "name": "General Data Protection Regulation",
  "shortName": "GDPR",
  "version": "2016/679",
  "effectiveDate": "2018-05-25",
  "jurisdiction": "European Union",
  "regulatoryBody": "European Data Protection Board",
  "category": "privacy",
  "description": "The General Data Protection Regulation is a regulation in EU law on data protection and privacy for all individuals within the European Union and the European Economic Area.",
  "controlsCount": 99,
  "domains": [
    {
      "domainId": "gdpr_principles",
      "name": "Data Protection Principles",
      "description": "Fundamental principles for processing personal data",
      "controlsCount": 7,
      "articles": ["Art. 5"]
    },
    {
      "domainId": "gdpr_rights",
      "name": "Rights of Data Subjects",
      "description": "Rights granted to individuals regarding their personal data",
      "controlsCount": 12,
      "articles": ["Art. 12-23"]
    },
    {
      "domainId": "gdpr_controller",
      "name": "Controller Obligations",
      "description": "Obligations for data controllers",
      "controlsCount": 35,
      "articles": ["Art. 24-43"]
    }
  ],
  "penalties": {
    "tier1": {
      "maxAmount": 10000000,
      "maxPercentage": 2,
      "description": "Up to €10M or 2% of annual global turnover"
    },
    "tier2": {
      "maxAmount": 20000000,
      "maxPercentage": 4,
      "description": "Up to €20M or 4% of annual global turnover"
    }
  },
  "complianceStatus": {
    "lastAssessment": "2025-01-10T14:30:00Z",
    "score": 85,
    "findings": {
      "critical": 0,
      "high": 2,
      "medium": 8,
      "low": 12
    }
  }
}
```

#### List Framework Controls

```http
GET /frameworks/:frameworkId/controls
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `domain` | string | Filter by domain |
| `status` | string | `compliant`, `non_compliant`, `partial`, `not_assessed` |
| `severity` | string | Filter by finding severity |
| `search` | string | Search control name/description |

**Response:**

```json
{
  "frameworkId": "gdpr",
  "controls": [
    {
      "controlId": "GDPR-Art.5.1.a",
      "name": "Lawfulness, fairness and transparency",
      "article": "Article 5(1)(a)",
      "domain": "Data Protection Principles",
      "description": "Personal data shall be processed lawfully, fairly and in a transparent manner in relation to the data subject.",
      "requirements": [
        "Identify valid legal basis for all processing activities",
        "Provide clear and accessible privacy information",
        "Ensure processing is fair and expected by data subjects"
      ],
      "evidence": [
        "Privacy policy documents",
        "Processing activity records",
        "Consent mechanisms"
      ],
      "status": "compliant",
      "score": 95,
      "lastAssessed": "2025-01-10T14:30:00Z",
      "findings": [
        {
          "findingId": "find_001",
          "severity": "low",
          "description": "Privacy policy needs update for new service",
          "remediation": "Update privacy policy to include new AI assistant service"
        }
      ]
    }
  ],
  "summary": {
    "total": 99,
    "compliant": 75,
    "partial": 15,
    "nonCompliant": 5,
    "notAssessed": 4
  }
}
```

### AI Systems Registry (EU AI Act)

#### List Registered AI Systems

```http
GET /ai-systems
```

**Rate Limit:** 30 requests/minute

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `riskLevel` | string | `minimal`, `limited`, `high`, `unacceptable` |
| `status` | string | `draft`, `registered`, `deployed`, `deprecated` |
| `category` | string | AI system category |

**Response:**

```json
{
  "aiSystems": [
    {
      "systemId": "ai_sys_001",
      "name": "Customer Support Chatbot",
      "version": "2.3.1",
      "description": "AI-powered customer support assistant for handling inquiries",
      "status": "deployed",
      "classification": {
        "riskLevel": "limited",
        "category": "customer_interaction",
        "transparencyObligations": ["disclosure_required"],
        "classifiedAt": "2025-01-05T10:00:00Z",
        "classifiedBy": "ai_assessment"
      },
      "provider": {
        "name": "Internal Development",
        "type": "internal"
      },
      "dataProcessed": ["customer_queries", "interaction_history"],
      "humanOversight": {
        "required": true,
        "mechanism": "escalation_to_human_agent"
      },
      "complianceStatus": {
        "assessed": true,
        "lastAssessment": "2025-01-10T14:30:00Z",
        "score": 88,
        "gaps": 3
      }
    }
  ],
  "summary": {
    "totalSystems": 12,
    "byRiskLevel": {
      "minimal": 5,
      "limited": 4,
      "high": 3,
      "unacceptable": 0
    },
    "requiresAction": 2
  }
}
```

#### Register AI System

```http
POST /ai-systems
```

**Required Roles:** `admin`, `compliance-officer`

**Rate Limit:** 10 requests/minute

**Request Body:**

```json
{
  "name": "Document Analysis AI",
  "version": "1.0.0",
  "description": "AI system for analyzing legal documents and extracting key information",
  "purpose": "Automated document review and information extraction for legal team",
  "provider": {
    "name": "Internal Development",
    "type": "internal"
  },
  "technology": {
    "modelType": "large_language_model",
    "trainingData": ["legal_documents", "contract_templates"],
    "inferenceLocation": "cloud_eu"
  },
  "dataProcessed": {
    "categories": ["legal_documents", "contracts", "client_data"],
    "personalData": true,
    "specialCategories": false
  },
  "intendedUse": {
    "domain": "legal_services",
    "users": ["legal_team", "compliance_officers"],
    "geography": ["EU", "UK"]
  },
  "humanOversight": {
    "required": true,
    "mechanism": "human_review_of_outputs",
    "description": "All AI-extracted information reviewed by legal professional before use"
  },
  "risks": {
    "identified": [
      "Misinterpretation of legal clauses",
      "Data privacy concerns with client documents"
    ],
    "mitigations": [
      "Human review requirement",
      "Data encryption and access controls"
    ]
  }
}
```

**Response:**

```json
{
  "systemId": "ai_sys_015",
  "name": "Document Analysis AI",
  "status": "draft",
  "classification": {
    "riskLevel": "pending",
    "requiresClassification": true
  },
  "nextSteps": [
    "Complete risk classification",
    "Conduct conformity assessment",
    "Document technical specifications"
  ],
  "created_at": "2025-01-15T10:00:00Z"
}
```

#### Classify AI System Risk Level

```http
POST /ai-systems/:systemId/classify
```

**Required Roles:** `admin`, `compliance-officer`

**Rate Limit:** 5 requests/minute

**Request Body:**

```json
{
  "useCases": [
    "Document analysis",
    "Contract review",
    "Legal research assistance"
  ],
  "impactAreas": ["legal_decisions", "professional_services"],
  "autonomyLevel": "assistive",
  "targetUsers": ["professionals"],
  "dataCategories": ["legal_documents", "business_contracts"]
}
```

**Response:**

```json
{
  "systemId": "ai_sys_015",
  "classification": {
    "riskLevel": "high",
    "confidence": 0.85,
    "reasoning": [
      "System provides input for legal decisions (Annex III, point 8)",
      "Processes professional service data requiring high accuracy",
      "Output influences contract interpretation"
    ],
    "annexReference": "Annex III, point 8(b)",
    "requirements": [
      "Establish risk management system (Art. 9)",
      "Ensure data quality and governance (Art. 10)",
      "Maintain technical documentation (Art. 11)",
      "Enable human oversight (Art. 14)",
      "Achieve appropriate accuracy and robustness (Art. 15)"
    ],
    "obligations": {
      "conformityAssessment": true,
      "registration": true,
      "transparencyDisclosure": true,
      "humanOversight": true,
      "loggingRequired": true
    }
  },
  "assessmentDetails": {
    "criteria": [
      { "criterion": "Fundamental rights impact", "result": "medium", "weight": 0.3 },
      { "criterion": "Decision autonomy", "result": "assistive", "weight": 0.2 },
      { "criterion": "Sector sensitivity", "result": "high", "weight": 0.3 },
      { "criterion": "Data sensitivity", "result": "medium", "weight": 0.2 }
    ]
  },
  "classifiedAt": "2025-01-15T10:05:00Z"
}
```

### Assessments

#### Create Assessment

```http
POST /assessments
```

**Required Roles:** `admin`, `compliance-officer`, `assessor`

**Rate Limit:** 10 requests/minute

**Request Body:**

```json
{
  "name": "Q1 2025 GDPR Assessment",
  "frameworkId": "gdpr",
  "targetSystemId": "system_main_platform",
  "type": "comprehensive | targeted | follow_up",
  "scope": {
    "domains": ["Data Protection Principles", "Rights of Data Subjects"],
    "excludedControls": [],
    "dataCategories": ["customer_data", "employee_data"]
  },
  "settings": {
    "aiAssisted": true,
    "autoRemediation": false,
    "evidenceRequired": true
  },
  "schedule": {
    "startDate": "2025-01-20",
    "dueDate": "2025-02-20"
  },
  "assignees": ["user_compliance_officer", "user_assessor_1"]
}
```

**Response:**

```json
{
  "assessmentId": "assess_abc123",
  "name": "Q1 2025 GDPR Assessment",
  "status": "created",
  "frameworkId": "gdpr",
  "controlsInScope": 45,
  "schedule": {
    "startDate": "2025-01-20",
    "dueDate": "2025-02-20"
  },
  "created_at": "2025-01-15T10:00:00Z"
}
```

#### List Assessments

```http
GET /assessments
```

**Rate Limit:** 30 requests/minute

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `created`, `in_progress`, `completed`, `cancelled` |
| `frameworkId` | string | Filter by framework |
| `from_date` | string | Start date filter |
| `to_date` | string | End date filter |

#### Get Assessment Details

```http
GET /assessments/:assessmentId
```

**Response:**

```json
{
  "assessmentId": "assess_abc123",
  "name": "Q1 2025 GDPR Assessment",
  "status": "completed",
  "frameworkId": "gdpr",
  "frameworkName": "General Data Protection Regulation",
  "type": "comprehensive",
  "scope": {
    "domains": ["Data Protection Principles", "Rights of Data Subjects"],
    "controlsInScope": 45,
    "controlsAssessed": 45
  },
  "results": {
    "overallScore": 85,
    "grade": "B+",
    "findings": {
      "critical": 0,
      "high": 2,
      "medium": 8,
      "low": 12
    },
    "controlsByStatus": {
      "compliant": 35,
      "partial": 7,
      "nonCompliant": 3
    }
  },
  "detailedFindings": [
    {
      "findingId": "find_001",
      "controlId": "GDPR-Art.17",
      "controlName": "Right to erasure",
      "severity": "high",
      "status": "open",
      "description": "Erasure request processing exceeds 30-day deadline",
      "evidence": [
        "Average processing time: 45 days",
        "3 requests exceeded 60 days in Q4"
      ],
      "rootCause": "Manual process bottleneck",
      "remediation": {
        "recommendation": "Implement automated erasure workflow",
        "effort": "medium",
        "priority": "high",
        "dueDate": "2025-03-01"
      }
    }
  ],
  "timeline": {
    "created": "2025-01-15T10:00:00Z",
    "started": "2025-01-20T09:00:00Z",
    "completed": "2025-02-10T16:30:00Z"
  },
  "assessors": ["user_compliance_officer", "user_assessor_1"],
  "aiAssisted": true,
  "reports": ["report_exec_001", "report_full_001"]
}
```

#### Run Assessment

```http
POST /assessments/:assessmentId/run
```

**Required Roles:** `admin`, `compliance-officer`, `assessor`

**Rate Limit:** 5 requests/minute

**Request Body:**

```json
{
  "mode": "full | incremental | specific_controls",
  "controls": [],
  "options": {
    "useAI": true,
    "collectEvidence": true,
    "generateRemediation": true
  }
}
```

**Response:**

```json
{
  "assessmentId": "assess_abc123",
  "status": "in_progress",
  "progress": {
    "controlsTotal": 45,
    "controlsAssessed": 0,
    "percentComplete": 0
  },
  "estimatedDuration": 1800,
  "startedAt": "2025-01-15T10:05:00Z"
}
```

### Reports

#### Generate Report

```http
POST /reports/generate
```

**Required Roles:** `admin`, `compliance-officer`, `auditor`

**Rate Limit:** 5 requests/minute

**Request Body:**

```json
{
  "assessmentId": "assess_abc123",
  "reportType": "executive_summary | full_audit | gap_analysis | remediation_plan | board_presentation",
  "format": "pdf | html | markdown | json",
  "options": {
    "includeEvidence": true,
    "includeRemediation": true,
    "includeTimeline": true,
    "confidentiality": "confidential | internal | public"
  },
  "branding": {
    "logo": true,
    "companyName": "Your Company"
  }
}
```

**Response:**

```json
{
  "reportId": "report_xyz789",
  "assessmentId": "assess_abc123",
  "reportType": "executive_summary",
  "format": "pdf",
  "status": "generating",
  "estimatedTime": 30,
  "created_at": "2025-01-15T10:00:00Z"
}
```

#### Get Report

```http
GET /reports/:reportId
```

**Response:**

```json
{
  "reportId": "report_xyz789",
  "assessmentId": "assess_abc123",
  "reportType": "executive_summary",
  "format": "pdf",
  "status": "ready",
  "metadata": {
    "title": "Q1 2025 GDPR Compliance Assessment - Executive Summary",
    "framework": "GDPR",
    "assessmentDate": "2025-02-10",
    "overallScore": 85,
    "pages": 12,
    "fileSize": "2.4 MB"
  },
  "summary": {
    "complianceLevel": "Substantial",
    "criticalFindings": 0,
    "highFindings": 2,
    "keyRecommendations": 5
  },
  "created_at": "2025-01-15T10:00:30Z"
}
```

#### Download Report

```http
GET /reports/:reportId/download
```

**Rate Limit:** 10 requests/minute

**Response:** Binary file download

### Dashboard

#### Get Compliance Dashboard

```http
GET /dashboard
```

**Rate Limit:** 60 requests/minute

**Response:**

```json
{
  "overview": {
    "overallScore": 82,
    "trend": "+3",
    "lastUpdated": "2025-01-15T10:00:00Z"
  },
  "byFramework": [
    {
      "frameworkId": "gdpr",
      "name": "GDPR",
      "score": 85,
      "trend": "+2",
      "criticalFindings": 0,
      "openItems": 22
    },
    {
      "frameworkId": "iso27001",
      "name": "ISO 27001",
      "score": 91,
      "trend": "+5",
      "criticalFindings": 0,
      "openItems": 8
    }
  ],
  "recentActivity": [
    {
      "type": "assessment_completed",
      "description": "Q1 GDPR Assessment completed",
      "timestamp": "2025-01-15T09:30:00Z"
    }
  ],
  "upcomingDeadlines": [
    {
      "type": "remediation_due",
      "description": "Erasure workflow automation",
      "dueDate": "2025-03-01",
      "priority": "high"
    }
  ],
  "aiSystems": {
    "total": 12,
    "highRisk": 3,
    "pendingClassification": 2
  },
  "alerts": {
    "critical": 0,
    "warning": 3,
    "info": 8
  }
}
```

### Audit Log

#### Get Audit Log

```http
GET /audit-log
```

**Required Roles:** `admin`, `compliance-officer`, `auditor`

**Rate Limit:** 30 requests/minute

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `from_date` | string | Start date |
| `to_date` | string | End date |
| `action` | string | Filter by action type |
| `user_id` | string | Filter by user |
| `resource` | string | Filter by resource type |

**Response:**

```json
{
  "entries": [
    {
      "entryId": "audit_001",
      "timestamp": "2025-01-15T10:00:00Z",
      "user": {
        "userId": "user_abc123",
        "name": "John Smith",
        "role": "compliance-officer"
      },
      "action": "assessment.created",
      "resource": {
        "type": "assessment",
        "id": "assess_abc123",
        "name": "Q1 2025 GDPR Assessment"
      },
      "details": {
        "frameworkId": "gdpr",
        "controlsInScope": 45
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 50,
    "offset": 0
  }
}
```

---

## MCP Tools

### assess_compliance

Run AI-powered compliance assessment against a framework.

**Input Schema:**

```json
{
  "frameworkId": "gdpr | ai_act | nis2 | iso27001 | soc2 | hipaa",
  "targetSystemId": "string",
  "scope": ["domain1", "domain2"],
  "excludedControls": ["GDPR-Art.XX"]
}
```

### classify_ai_system

Classify AI system risk level per EU AI Act.

**Input Schema:**

```json
{
  "systemId": "string",
  "systemDescription": "string",
  "useCases": ["string"],
  "dataCategories": ["string"]
}
```

### generate_report

Generate compliance report in various formats.

**Input Schema:**

```json
{
  "assessmentId": "string",
  "reportType": "executive_summary | full_audit | gap_analysis | remediation_plan | board_presentation",
  "format": "pdf | html | markdown | json",
  "includeEvidence": true
}
```

### get_control_guidance

Get AI-assisted guidance for implementing a specific control.

**Input Schema:**

```json
{
  "controlId": "ISO27001-A.5.1 | GDPR-Art.17",
  "context": "Organization context for tailored guidance"
}
```

### process_data_subject_request

Process GDPR data subject rights request.

**Input Schema:**

```json
{
  "requestType": "access | erasure | rectification | portability | restriction | objection",
  "subjectId": "string",
  "requestDetails": "string"
}
```

---

## Rate Limits

| Tier | Config/min | Assessments/min | Reports/min | AI Classification/min |
|------|------------|-----------------|-------------|----------------------|
| Starter | 10 | 5 | 2 | 2 |
| Professional | 30 | 20 | 10 | 10 |
| Enterprise | 100 | 50 | 30 | 30 |

---

## Data Models

### Assessment

```typescript
interface Assessment {
  assessmentId: string;
  name: string;
  status: 'created' | 'in_progress' | 'completed' | 'cancelled';
  frameworkId: string;
  type: 'comprehensive' | 'targeted' | 'follow_up';
  scope: AssessmentScope;
  results?: AssessmentResults;
  findings: Finding[];
  timeline: AssessmentTimeline;
  assignees: string[];
  aiAssisted: boolean;
  reports: string[];
  created_at: string;
  updated_at: string;
}

interface AssessmentScope {
  domains: string[];
  excludedControls: string[];
  controlsInScope: number;
  controlsAssessed: number;
}

interface AssessmentResults {
  overallScore: number;
  grade: string;
  findings: FindingSummary;
  controlsByStatus: ControlStatusSummary;
}

interface Finding {
  findingId: string;
  controlId: string;
  controlName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  description: string;
  evidence: string[];
  rootCause?: string;
  remediation: RemediationPlan;
}
```

### AISystem

```typescript
interface AISystem {
  systemId: string;
  name: string;
  version: string;
  description: string;
  status: 'draft' | 'registered' | 'deployed' | 'deprecated';
  classification: AIClassification;
  provider: ProviderInfo;
  technology: TechnologyInfo;
  dataProcessed: DataProcessingInfo;
  intendedUse: IntendedUseInfo;
  humanOversight: OversightInfo;
  risks: RiskInfo;
  complianceStatus: ComplianceStatus;
  created_at: string;
  updated_at: string;
}

interface AIClassification {
  riskLevel: 'minimal' | 'limited' | 'high' | 'unacceptable' | 'pending';
  category: string;
  annexReference?: string;
  transparencyObligations: string[];
  requirements: string[];
  classifiedAt?: string;
  classifiedBy: 'manual' | 'ai_assessment';
}
```

---

## SDK Integration

### JavaScript/TypeScript

```typescript
import { NexusClient } from '@adverant/nexus-sdk';

const client = new NexusClient({
  apiKey: process.env.NEXUS_API_KEY
});

// Get compliance dashboard
const dashboard = await client.compliance.dashboard();
console.log(`Overall compliance score: ${dashboard.overview.overallScore}%`);

// Create an assessment
const assessment = await client.compliance.assessments.create({
  name: 'Q1 2025 GDPR Assessment',
  frameworkId: 'gdpr',
  targetSystemId: 'system_main',
  type: 'comprehensive'
});

// Run the assessment
await client.compliance.assessments.run(assessment.assessmentId, {
  mode: 'full',
  options: { useAI: true }
});

// Register an AI system
const aiSystem = await client.compliance.aiSystems.create({
  name: 'Document Analysis AI',
  description: 'AI for legal document analysis',
  provider: { name: 'Internal', type: 'internal' }
});

// Classify the AI system
const classification = await client.compliance.aiSystems.classify(aiSystem.systemId, {
  useCases: ['Document analysis', 'Contract review'],
  dataCategories: ['legal_documents']
});

console.log(`Risk Level: ${classification.classification.riskLevel}`);

// Generate report
const report = await client.compliance.reports.generate({
  assessmentId: assessment.assessmentId,
  reportType: 'executive_summary',
  format: 'pdf'
});
```

### Python

```python
from nexus_sdk import NexusClient

client = NexusClient(api_key=os.environ["NEXUS_API_KEY"])

# Get frameworks
frameworks = client.compliance.frameworks.list()
for fw in frameworks["frameworks"]:
    print(f"{fw['shortName']}: {fw['complianceScore']}% compliant")

# Create assessment
assessment = client.compliance.assessments.create(
    name="Q1 2025 ISO 27001 Assessment",
    framework_id="iso27001",
    target_system_id="system_main",
    type="comprehensive"
)

# Run assessment with AI assistance
result = client.compliance.assessments.run(
    assessment_id=assessment["assessmentId"],
    mode="full",
    options={"use_ai": True}
)

# Get findings
details = client.compliance.assessments.get(assessment["assessmentId"])
for finding in details["detailedFindings"]:
    print(f"[{finding['severity']}] {finding['controlName']}: {finding['description']}")

# Generate board presentation
report = client.compliance.reports.generate(
    assessment_id=assessment["assessmentId"],
    report_type="board_presentation",
    format="pdf"
)
```

---

## Webhook Events

| Event | Description |
|-------|-------------|
| `assessment.created` | New assessment created |
| `assessment.started` | Assessment execution started |
| `assessment.completed` | Assessment completed |
| `assessment.finding` | New finding discovered |
| `ai_system.registered` | AI system registered |
| `ai_system.classified` | AI system risk classified |
| `report.generated` | Report ready for download |
| `alert.triggered` | Compliance alert triggered |
| `deadline.approaching` | Remediation deadline approaching |

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `FRAMEWORK_NOT_FOUND` | 404 | Framework does not exist |
| `ASSESSMENT_NOT_FOUND` | 404 | Assessment does not exist |
| `AI_SYSTEM_NOT_FOUND` | 404 | AI system not registered |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required role |
| `ASSESSMENT_IN_PROGRESS` | 400 | Assessment already running |
| `LIMIT_EXCEEDED` | 402 | Tier limit exceeded |
| `CLASSIFICATION_FAILED` | 500 | AI classification error |

---

## Deployment Requirements

### Container Specifications

| Resource | Value |
|----------|-------|
| CPU | 1000m (1 core) |
| Memory | 2048 MB |
| Disk | 5 GB |
| Timeout | 120,000 ms (2 min) |
| Isolation Level | 3 (hardened) |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_HOST` | Yes | PostgreSQL host |
| `POSTGRES_PORT` | Yes | PostgreSQL port |
| `POSTGRES_DB` | Yes | Database name |
| `POSTGRES_USER` | Yes | Database user |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `ANTHROPIC_API_KEY` | Optional | For AI-powered assessments |
| `NEXUS_MAGEAGENT_URL` | Yes | MageAgent service URL |
| `NEXUS_GRAPHRAG_URL` | Yes | GraphRAG service URL |

### Health Checks

| Endpoint | Purpose |
|----------|---------|
| `/health` | General health check |
| `/ready` | Readiness probe |
| `/live` | Liveness probe |

---

## Supported Frameworks

| Framework | Controls | Category |
|-----------|----------|----------|
| GDPR | 99 | Privacy |
| EU AI Act | 85 | AI Governance |
| NIS2 | 46 | Cybersecurity |
| ISO 27001 | 37 | Security |
| ISO 27701 | 49 | Privacy |
| SOC 2 | 64 | Security |
| HIPAA | 54 | Healthcare |

---

## Quotas and Limits

### By Pricing Tier

| Limit | Starter | Professional | Enterprise |
|-------|---------|--------------|------------|
| Assessments/month | 2 | 20 | Unlimited |
| AI Systems | 5 | 25 | Unlimited |
| Reports/month | 2 | 20 | Unlimited |
| Frameworks | 2 | 4 | All |
| Controls Assessed | 50 | 500 | Unlimited |
| Storage | 1 GB | 10 GB | 100 GB |
| AI-Powered Assessments | - | Yes | Yes |
| Continuous Monitoring | - | - | Yes |
| Custom Frameworks | - | - | Yes |

### Pricing

| Tier | Monthly | Annual |
|------|---------|--------|
| Starter | $0 | $0 |
| Professional | $149 | $1,490 |
| Enterprise | $499 | $4,990 |
| Custom | Contact | Contact |

---

## Support

- **Documentation**: [docs.adverant.ai/plugins/compliance](https://docs.adverant.ai/plugins/compliance)
- **Discord**: [discord.gg/adverant](https://discord.gg/adverant)
- **Email**: support@adverant.ai
