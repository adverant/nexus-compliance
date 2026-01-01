# Architecture

Technical deep-dive into Nexus Compliance Engine's design, components, and integration patterns.

---

## System Overview

Nexus Compliance Engine is a containerized microservice designed for AI-powered regulatory compliance assessment. It operates within the Nexus plugin ecosystem, leveraging shared infrastructure for authentication, data persistence, and AI capabilities.

```mermaid
flowchart TB
    subgraph Client Layer
        A[Nexus Dashboard]
        B[API Clients]
        C[CLI Tools]
    end

    subgraph API Gateway
        D[Nexus API Gateway]
        E[Authentication]
        F[Rate Limiting]
    end

    subgraph Nexus Compliance Engine
        G[REST API Layer]
        H[Assessment Engine]
        I[AI Classification Service]
        J[Report Generator]
        K[Control Library]
        L[Evidence Collector]
    end

    subgraph Data Layer
        M[(PostgreSQL)]
        N[(Framework Data)]
        O[(Report Storage)]
    end

    subgraph Nexus Services
        P[GraphRAG]
        Q[MageAgent]
        R[Anthropic API]
    end

    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G

    G --> H
    G --> I
    G --> J
    H --> K
    H --> L

    H --> M
    K --> N
    J --> O

    I --> R
    H --> P
    L --> Q
```

---

## Component Architecture

### Core Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **REST API Layer** | Request handling, validation, routing | Express.js, OpenAPI |
| **Assessment Engine** | Compliance evaluation logic | TypeScript, Rule Engine |
| **AI Classification** | EU AI Act risk classification | Anthropic Claude API |
| **Report Generator** | PDF/HTML report creation | Puppeteer, Handlebars |
| **Control Library** | Framework controls and mappings | JSON/YAML, PostgreSQL |
| **Evidence Collector** | Automated evidence gathering | Integration adapters |

### Assessment Engine Detail

```mermaid
flowchart LR
    subgraph Input
        A[Assessment Request]
        B[Framework ID]
        C[Target System]
        D[Scope Definition]
    end

    subgraph Processing
        E[Control Loader]
        F[Evidence Matcher]
        G[Gap Analyzer]
        H[Score Calculator]
        I[Recommendation Engine]
    end

    subgraph Output
        J[Compliance Score]
        K[Findings List]
        L[Remediation Plan]
        M[Audit Trail]
    end

    A --> E
    B --> E
    C --> F
    D --> E

    E --> F
    F --> G
    G --> H
    G --> I

    H --> J
    G --> K
    I --> L
    F --> M
```

---

## API Layer

### Endpoint Structure

Base path: `/api/v1/compliance`

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Configuration** | `GET/PUT /config`, `PUT /config/master` | Tenant compliance settings |
| **Frameworks** | `GET /frameworks`, `GET /frameworks/:id/controls` | Framework and control data |
| **Assessments** | `POST/GET /assessments`, `POST /assessments/:id/run` | Assessment lifecycle |
| **AI Systems** | `CRUD /ai-systems`, `POST /ai-systems/:id/classify` | EU AI Act registry |
| **Reports** | `POST /reports/generate`, `GET /reports/:id/download` | Report generation |
| **Monitoring** | `GET /dashboard`, `GET /alerts`, `GET /audit-log` | Operational views |

### Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant A as Auth Service
    participant R as Rate Limiter
    participant N as Nexus Compliance
    participant D as Database
    participant AI as Anthropic API

    C->>G: POST /assessments/:id/run
    G->>A: Validate JWT
    A->>G: Token valid + claims
    G->>R: Check rate limit
    R->>G: Allowed (5/minute)
    G->>N: Forward request

    N->>D: Load assessment config
    D->>N: Assessment + framework
    N->>D: Load target system data
    D->>N: System metadata

    loop For each control
        N->>N: Evaluate control
        N->>AI: AI-assisted analysis
        AI->>N: Assessment result
        N->>D: Store finding
    end

    N->>N: Calculate final score
    N->>D: Update assessment status
    N->>G: Return results
    G->>C: 200 OK + findings
```

---

## Data Model

### Core Entities

```mermaid
erDiagram
    TENANT ||--o{ ASSESSMENT : has
    TENANT ||--o{ AI_SYSTEM : registers
    TENANT ||--o{ COMPLIANCE_CONFIG : configures

    ASSESSMENT ||--o{ FINDING : contains
    ASSESSMENT }o--|| FRAMEWORK : uses

    FRAMEWORK ||--o{ CONTROL : defines
    CONTROL ||--o{ EVIDENCE : requires

    AI_SYSTEM ||--o{ CLASSIFICATION : receives

    FINDING }o--|| CONTROL : references
    FINDING ||--o{ REMEDIATION : suggests

    ASSESSMENT ||--o{ REPORT : generates

    TENANT {
        uuid id PK
        string name
        string plan
        jsonb settings
    }

    ASSESSMENT {
        uuid id PK
        uuid tenant_id FK
        string framework_id
        string target_system_id
        string status
        integer score
        timestamp created_at
        timestamp completed_at
    }

    FRAMEWORK {
        string id PK
        string name
        string version
        integer control_count
        jsonb metadata
    }

    CONTROL {
        string id PK
        string framework_id FK
        string domain
        string title
        text description
        string severity
        jsonb evidence_requirements
    }

    FINDING {
        uuid id PK
        uuid assessment_id FK
        string control_id FK
        string status
        string severity
        text details
        jsonb evidence
    }

    AI_SYSTEM {
        uuid id PK
        uuid tenant_id FK
        string name
        text description
        jsonb use_cases
        string risk_level
        timestamp registered_at
    }
```

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `compliance_assessments` | Assessment records | id, tenant_id, framework_id, status, score |
| `compliance_findings` | Individual control findings | assessment_id, control_id, status, severity |
| `compliance_ai_systems` | EU AI Act registry | tenant_id, name, risk_level, classification |
| `compliance_reports` | Generated reports | assessment_id, type, format, storage_path |
| `compliance_alerts` | Active compliance alerts | tenant_id, type, severity, acknowledged |
| `compliance_audit_log` | All compliance actions | tenant_id, action, actor, timestamp |

---

## Security Model

### Permission Structure

The plugin operates under Nexus's permission system with the following grants:

```yaml
permissions:
  database:
    - "database:read:compliance_*"    # Read all compliance tables
    - "database:write:compliance_*"   # Write all compliance tables

  network:
    - "network:internal:nexus-graphrag"   # Knowledge retrieval
    - "network:internal:nexus-mageagent"  # Workflow automation

  filesystem:
    - "filesystem:read:/data/frameworks"  # Framework definitions
    - "filesystem:write:/data/reports"    # Generated reports
```

### Role-Based Access Control

```mermaid
flowchart TD
    subgraph Roles
        A[Admin]
        B[Compliance Officer]
        C[Assessor]
        D[Auditor]
        E[Viewer]
    end

    subgraph Permissions
        F[Full Config Access]
        G[Run Assessments]
        H[Manage AI Systems]
        I[Generate Reports]
        J[View Dashboard]
        K[Access Audit Log]
    end

    A --> F
    A --> G
    A --> H
    A --> I
    A --> J
    A --> K

    B --> G
    B --> H
    B --> I
    B --> J
    B --> K

    C --> G
    C --> J

    D --> I
    D --> J
    D --> K

    E --> J
```

### Data Protection

| Measure | Implementation |
|---------|----------------|
| **Encryption at Rest** | PostgreSQL TDE, AES-256 |
| **Encryption in Transit** | TLS 1.3 for all connections |
| **Data Isolation** | Tenant-level row security |
| **Audit Logging** | All actions logged with actor |
| **GDPR Compliance** | Data residency options (EU/US) |
| **Key Management** | Kubernetes secrets, HashiCorp Vault |

---

## AI Integration

### Anthropic Claude Integration

The AI classification service uses Claude for intelligent compliance analysis:

```mermaid
sequenceDiagram
    participant NCE as Compliance Engine
    participant Cache as Response Cache
    participant API as Anthropic API

    NCE->>Cache: Check cached analysis
    alt Cache hit
        Cache->>NCE: Return cached result
    else Cache miss
        NCE->>API: Classification request
        Note over NCE,API: Model: claude-sonnet-4-20250514
        API->>NCE: Risk classification
        NCE->>Cache: Store result (TTL: 24h)
    end

    NCE->>NCE: Apply business rules
    NCE->>NCE: Generate recommendations
```

### AI-Powered Features

| Feature | AI Usage | Model |
|---------|----------|-------|
| **Risk Classification** | EU AI Act category determination | Claude Sonnet |
| **Control Guidance** | Context-aware implementation advice | Claude + GraphRAG |
| **Gap Analysis** | Intelligent gap prioritization | Claude Sonnet |
| **Report Narrative** | Executive summary generation | Claude Sonnet |

---

## Deployment Architecture

### Kubernetes Resources

```yaml
# Deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nexus-compliance
  namespace: nexus
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

### Resource Allocation

| Resource | Request | Limit |
|----------|---------|-------|
| **CPU** | 100m | 500m |
| **Memory** | 256Mi | 512Mi |
| **Disk** | 5Gi (reports) | 5Gi |

### Health Checks

| Endpoint | Purpose | Interval |
|----------|---------|----------|
| `/health` | Basic health | - |
| `/ready` | Readiness probe | 5s |
| `/live` | Liveness probe | 10s |

---

## Scaling Considerations

### Horizontal Scaling

```mermaid
flowchart LR
    subgraph Load Balancer
        LB[Ingress Controller]
    end

    subgraph Compliance Pods
        P1[Pod 1]
        P2[Pod 2]
        P3[Pod 3]
        P4[Pod 4]
        P5[Pod 5]
    end

    subgraph HPA
        H[HorizontalPodAutoscaler]
        H -->|Scale 1-5 pods| P1
        H -->|CPU > 70%| P2
        H -->|Memory > 80%| P3
    end

    LB --> P1
    LB --> P2
    LB --> P3
    LB --> P4
    LB --> P5
```

### Scaling Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Utilization | > 70% | Scale up |
| Memory Utilization | > 80% | Scale up |
| Request Latency | > 2s p99 | Scale up |
| Pod Count | Min: 1, Max: 5 | Auto-scale |

### Performance Optimization

- **Assessment Caching**: Results cached for 24 hours
- **Control Library**: In-memory cache with Redis fallback
- **Report Generation**: Async with webhook notification
- **Database**: Connection pooling (max 20 connections)

---

## Integration Points

### Nexus Service Dependencies

```mermaid
flowchart LR
    NCE[Nexus Compliance Engine]

    NCE -->|Knowledge queries| GR[GraphRAG]
    NCE -->|Workflow automation| MA[MageAgent]
    NCE -->|AI analysis| AN[Anthropic API]
    NCE -->|Data storage| PG[(PostgreSQL)]
    NCE -->|Report storage| FS[/data/reports]

    GR -->|Compliance knowledge| NCE
    MA -->|Remediation workflows| NCE
```

### External Integration Patterns

| Integration | Method | Use Case |
|-------------|--------|----------|
| **SIEM Systems** | Webhook | Incident ingestion for NIS2 |
| **GRC Platforms** | REST API | Bidirectional sync |
| **Ticketing Systems** | Webhook | Remediation tracking |
| **Identity Providers** | OIDC/SAML | SSO authentication |

---

## Monitoring & Observability

### Metrics Endpoint

Prometheus metrics available at `/metrics`:

```
# Assessment metrics
compliance_assessments_total{framework="gdpr",status="completed"}
compliance_assessment_duration_seconds{framework="ai_act"}
compliance_findings_total{severity="critical"}

# API metrics
http_requests_total{method="POST",path="/assessments"}
http_request_duration_seconds{method="GET",path="/dashboard"}

# AI metrics
ai_classification_requests_total
ai_classification_duration_seconds
```

### Logging

Structured JSON logs with correlation IDs:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "info",
  "service": "nexus-compliance",
  "correlationId": "req-abc123",
  "tenantId": "tenant-xyz",
  "action": "assessment.completed",
  "framework": "gdpr",
  "score": 78,
  "duration_ms": 4523
}
```

---

## Disaster Recovery

### Backup Strategy

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| PostgreSQL | Hourly | 30 days | S3/GCS |
| Reports | On generation | 1 year | S3/GCS |
| Framework Data | Daily | 90 days | Git |
| Audit Logs | Real-time | 7 years | S3/GCS |

### Recovery Objectives

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | 1 hour |
| **RTO** (Recovery Time Objective) | 4 hours |
| **SLA** (Enterprise tier) | 99.9% uptime |

---

## Development & Testing

### Local Development

```bash
# Clone and setup
git clone https://github.com/adverant/nexus-compliance
cd nexus-compliance
npm install

# Run with local dependencies
docker-compose up -d postgres
npm run dev

# Run tests
npm run test
npm run test:integration
```

### CI/CD Pipeline

```mermaid
flowchart LR
    A[Push] --> B[Lint & Type Check]
    B --> C[Unit Tests]
    C --> D[Integration Tests]
    D --> E[Build Image]
    E --> F[Security Scan]
    F --> G[Push to Registry]
    G --> H[Deploy to Staging]
    H --> I[E2E Tests]
    I --> J[Deploy to Production]
```

---

## Further Reading

- [API Reference](https://docs.adverant.ai/plugins/nexus-compliance/api) - Complete endpoint documentation
- [Framework Guides](https://docs.adverant.ai/plugins/nexus-compliance/frameworks) - Detailed framework information
- [Integration Guide](https://docs.adverant.ai/plugins/nexus-compliance/integrations) - Third-party integrations
- [Security Whitepaper](https://adverant.ai/security) - Security and compliance details
