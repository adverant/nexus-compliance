# Nexus Compliance Engine

EU Regulatory Compliance Plugin for the Nexus Platform. AI-powered compliance assessment for GDPR, EU AI Act, NIS2, ISO 27001, and more.

## Features

- **GDPR Compliance**: Data subject rights management, consent tracking, breach notification workflows
- **EU AI Act**: AI system risk classification, registry management, conformity assessments
- **NIS2 Directive**: Security monitoring, incident reporting, supply chain risk management
- **ISO 27001**: Information security control assessment with 37 controls
- **AI-Powered Assessment**: Intelligent compliance evaluation via MageAgent integration
- **Report Generation**: Automated reports in PDF, Markdown, JSON, and HTML formats
- **Continuous Monitoring**: Real-time compliance status tracking and alerting
- **Audit Trail**: Complete history of assessments, changes, and remediation activities

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Docker (for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/adverant/nexus-compliance.git
cd nexus-compliance

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Environment Variables

```env
# Server
PORT=9300
HOST=0.0.0.0
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=nexus
POSTGRES_USER=nexus
POSTGRES_PASSWORD=your-password

# AI Services (optional)
ANTHROPIC_API_KEY=your-api-key
NEXUS_MAGEAGENT_URL=http://localhost:9001
```

## API Endpoints

### Health & Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness probe |
| `/live` | GET | Liveness probe |

### Compliance Configuration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/compliance/config` | GET | Get tenant compliance configuration |
| `/api/v1/compliance/config` | PUT | Update compliance configuration |

### Frameworks & Controls

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/compliance/frameworks` | GET | List all compliance frameworks |
| `/api/v1/compliance/frameworks/:id` | GET | Get framework details |
| `/api/v1/compliance/frameworks/:id/controls` | GET | List framework controls |
| `/api/v1/compliance/frameworks/:id/controls/:controlId` | GET | Get control details |

### AI Systems Registry (EU AI Act)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/compliance/ai-systems` | GET | List registered AI systems |
| `/api/v1/compliance/ai-systems` | POST | Register new AI system |
| `/api/v1/compliance/ai-systems/:id` | GET | Get AI system details |
| `/api/v1/compliance/ai-systems/:id/classify` | POST | Classify AI system risk level |

### Assessments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/compliance/assessments` | GET | List assessments |
| `/api/v1/compliance/assessments` | POST | Create new assessment |
| `/api/v1/compliance/assessments/:id` | GET | Get assessment details |
| `/api/v1/compliance/assessments/:id/run` | POST | Run assessment |

## Supported Frameworks

| Framework | Controls | Category |
|-----------|----------|----------|
| GDPR | 99 | Privacy |
| EU AI Act | 85 | AI Governance |
| NIS2 | 46 | Cybersecurity |
| ISO 27001 | 37 | Security |
| ISO 27701 | 49 | Privacy |
| SOC 2 | 64 | Security |

## Architecture

```
nexus-compliance/
├── src/
│   ├── api/routes/          # API route handlers
│   ├── config/              # Configuration management
│   ├── database/            # Database client and migrations
│   ├── services/            # Business logic services
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── Dockerfile               # Production container image
├── package.json
└── tsconfig.json
```

## Docker Deployment

```bash
# Build image
docker build -t nexus-compliance:latest .

# Run container
docker run -d \
  -p 9300:9300 \
  -e POSTGRES_HOST=your-db-host \
  -e POSTGRES_PASSWORD=your-password \
  nexus-compliance:latest
```

## Kubernetes Deployment

See [k8s/plugins/nexus-compliance-deployment.yaml](../../k8s/plugins/nexus-compliance-deployment.yaml) for Kubernetes manifests.

```bash
kubectl apply -f k8s/plugins/nexus-compliance-deployment.yaml -n nexus
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

**Adverant** - [https://adverant.ai](https://adverant.ai)
