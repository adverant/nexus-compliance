# Quick Start Guide

Get your organization compliant with EU regulations in minutes. Nexus Compliance Engine provides AI-powered assessment for GDPR, EU AI Act, NIS2, and ISO 27001.

## Prerequisites

Before starting, ensure you have:

- [ ] Active Nexus account with API access
- [ ] Admin or Compliance Officer role assigned
- [ ] At least one AI system or data processing activity to assess
- [ ] API key with `compliance:*` scopes

## Installation

### Option 1: Marketplace UI (Recommended)

1. Navigate to **Nexus Dashboard → Marketplace**
2. Search for "Nexus Compliance Engine"
3. Click **Install** and select your subscription tier
4. Configure initial settings when prompted

### Option 2: Nexus CLI

```bash
# Install the compliance plugin
nexus plugin install nexus-compliance

# Verify installation
nexus plugin status nexus-compliance
```

### Option 3: API Installation

```bash
curl -X POST "https://api.adverant.ai/v1/plugins/install" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pluginId": "nexus-compliance",
    "tier": "professional"
  }'
```

---

## Your First Compliance Assessment

### Via Dashboard

1. Navigate to **Plugins → Nexus Compliance Engine**
2. Click **New Assessment**
3. Select a framework (GDPR, AI Act, NIS2, or ISO 27001)
4. Choose the target system to assess
5. Click **Run Assessment**
6. View results when complete (typically 2-5 minutes)

### Via API

**Step 1: Get Available Frameworks**

```bash
curl "https://api.adverant.ai/proxy/nexus-compliance/api/v1/compliance/frameworks" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "frameworks": [
    {"id": "gdpr", "name": "GDPR", "controls": 87},
    {"id": "ai_act", "name": "EU AI Act", "controls": 52},
    {"id": "nis2", "name": "NIS2 Directive", "controls": 43},
    {"id": "iso27001", "name": "ISO 27001:2022", "controls": 114}
  ]
}
```

**Step 2: Create an Assessment**

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-compliance/api/v1/compliance/assessments" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "frameworkId": "gdpr",
    "targetSystemId": "sys_abc123",
    "scope": ["data-processing", "consent-management", "data-subject-rights"]
  }'
```

**Response:**
```json
{
  "assessmentId": "asmt_def456",
  "status": "created",
  "framework": "gdpr",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Step 3: Run the Assessment**

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-compliance/api/v1/compliance/assessments/asmt_def456/run" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Step 4: Get Assessment Results**

```bash
curl "https://api.adverant.ai/proxy/nexus-compliance/api/v1/compliance/assessments/asmt_def456" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "assessmentId": "asmt_def456",
  "status": "completed",
  "overallScore": 78,
  "findings": {
    "compliant": 68,
    "nonCompliant": 12,
    "partial": 7
  },
  "criticalGaps": [
    {
      "controlId": "GDPR-Art.17",
      "title": "Right to Erasure",
      "severity": "high",
      "recommendation": "Implement automated data deletion workflow"
    }
  ]
}
```

---

## SDK Examples

### TypeScript/JavaScript

```typescript
import { NexusClient } from '@adverant/nexus-sdk';

const client = new NexusClient({ apiKey: process.env.NEXUS_API_KEY });
const compliance = client.plugin('nexus-compliance');

// Run a GDPR assessment
const assessment = await compliance.assessCompliance({
  frameworkId: 'gdpr',
  targetSystemId: 'sys_abc123',
  scope: ['data-processing', 'consent-management']
});

console.log(`Compliance Score: ${assessment.overallScore}%`);
console.log(`Critical Gaps: ${assessment.criticalGaps.length}`);

// Generate executive report
const report = await compliance.generateReport({
  assessmentId: assessment.assessmentId,
  reportType: 'executive_summary',
  format: 'pdf'
});

console.log(`Report URL: ${report.downloadUrl}`);
```

### Python

```python
from nexus_sdk import NexusClient
import os

client = NexusClient(api_key=os.environ['NEXUS_API_KEY'])
compliance = client.plugin('nexus-compliance')

# Run an EU AI Act assessment
assessment = compliance.assess_compliance(
    framework_id='ai_act',
    target_system_id='ai_sys_789',
    scope=['risk-classification', 'transparency', 'human-oversight']
)

print(f"Compliance Score: {assessment.overall_score}%")
print(f"Risk Level: {assessment.ai_risk_level}")

# Classify AI system risk level
classification = compliance.classify_ai_system(
    system_id='ai_sys_789',
    system_description='Customer service chatbot with sentiment analysis',
    use_cases=['customer-support', 'sentiment-analysis'],
    data_categories=['customer-messages', 'interaction-logs']
)

print(f"AI Act Risk Category: {classification.risk_category}")
print(f"Required Actions: {classification.required_actions}")
```

---

## Rate Limits by Tier

| Tier | Assessments/Month | AI Systems | Reports/Month | Frameworks |
|------|-------------------|------------|---------------|------------|
| **Starter** (Free) | 2 | 5 | 2 | 2 (ISO 27001 + GDPR) |
| **Professional** ($149/mo) | 20 | 25 | 20 | 4 (+ AI Act, NIS2) |
| **Enterprise** ($499/mo) | Unlimited | Unlimited | Unlimited | All (+ SOC 2, HIPAA) |
| **Custom** | Unlimited | Unlimited | Unlimited | All + Custom |

---

## Verify Installation

Check that the plugin is running correctly:

```bash
# Health check
curl "https://api.adverant.ai/proxy/nexus-compliance/health"

# Expected response
{"status": "healthy", "version": "1.0.0"}

# Check your configuration
curl "https://api.adverant.ai/proxy/nexus-compliance/api/v1/compliance/config" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Configuration Options

### Enable/Disable Compliance Modules

```bash
curl -X PUT "https://api.adverant.ai/proxy/nexus-compliance/api/v1/compliance/config" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": {
      "gdpr": true,
      "aiAct": true,
      "nis2": false,
      "iso27001": true
    }
  }'
```

### Register an AI System (EU AI Act)

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-compliance/api/v1/compliance/ai-systems" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Sentiment Analyzer",
    "description": "ML model analyzing customer feedback sentiment",
    "useCases": ["sentiment-analysis", "customer-insights"],
    "dataCategories": ["customer-feedback", "survey-responses"],
    "riskLevel": "limited"
  }'
```

---

## Next Steps

- [Use Cases](USE-CASES.md) - See compliance scenarios for your industry
- [Architecture](ARCHITECTURE.md) - Understand the technical design
- [API Reference](https://docs.adverant.ai/plugins/nexus-compliance/api) - Full endpoint documentation
- [EU AI Act Guide](https://docs.adverant.ai/guides/eu-ai-act) - Understand AI Act requirements

---

## Need Help?

- **Documentation**: [docs.adverant.ai/plugins/nexus-compliance](https://docs.adverant.ai/plugins/nexus-compliance)
- **Discord**: [discord.gg/adverant](https://discord.gg/adverant)
- **Email**: support@adverant.ai
- **Enterprise Support**: Dedicated support channel with SLA guarantee
