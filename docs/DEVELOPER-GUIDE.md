# ArkPass FHIR Server - Developer Guide

## Architecture Overview

```
arkpass-fhir-projectathon/
├── src/
│   ├── index.js              # Express app entry point
│   ├── routes/
│   │   ├── fhir.js           # FHIR REST endpoints
│   │   └── auth.js           # OAuth 2.0 token endpoints
│   ├── fhir/
│   │   ├── capability-statement.js  # CapabilityStatement generator
│   │   └── utils.js          # FHIR helpers (Bundle, OperationOutcome)
│   ├── services/
│   │   └── patient-service.js # Patient CRUD operations
│   ├── middleware/
│   │   ├── auth.js           # JWT Bearer token validation
│   │   ├── error-handler.js  # FHIR error responses
│   │   └── request-logger.js # Request logging
│   └── db/
│       └── supabase.js       # Database connection (optional)
├── scripts/
│   └── setup-database.js     # DB schema setup
├── docs/                     # Documentation
├── vercel.json               # Vercel deployment config
├── fly.toml                  # Fly.io deployment config
├── Dockerfile                # Docker deployment
└── package.json
```

---

## Quick Start

### Local Development

```bash
# Clone and install
cd gazelle:projectathon
npm install

# Start development server (with auto-reload)
npm run dev

# Or start production server
npm start
```

Server runs at `http://localhost:3000`

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment |
| `JWT_SECRET` | Yes (prod) | dev-secret | Token signing key |
| `OAUTH_CLIENT_ID` | No | projectathon-test-client | OAuth client ID |
| `OAUTH_CLIENT_SECRET` | No | projectathon-test-secret | OAuth client secret |
| `SUPABASE_URL` | No | - | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | - | Supabase anon key |
| `FHIR_BASE_URL` | No | auto-detected | Base URL for FHIR responses |

---

## Data Storage

### In-Memory (Default)

By default, the server uses in-memory storage with 5 pre-seeded test patients. Data resets on server restart.

### Supabase (Persistent)

To enable persistent storage:

1. Create a Supabase project at https://supabase.com
2. Run the schema SQL from `scripts/setup-database.js`
3. Set environment variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # Optional, for admin operations
```

### Database Schema

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  health_card_number VARCHAR(50),
  family_name VARCHAR(100) NOT NULL,
  given_name VARCHAR(100),
  gender VARCHAR(20),
  birth_date DATE,
  phone VARCHAR(20),
  email VARCHAR(255),
  address_line VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(10),
  postal_code VARCHAR(10),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Adding New Resources

### 1. Create Service

```javascript
// src/services/observation-service.js
export const ObservationService = {
  async search(params, req) { ... },
  async read(id) { ... },
  async create(observation) { ... }
};
```

### 2. Create Route

```javascript
// src/routes/observation.js
import express from 'express';
import { ObservationService } from '../services/observation-service.js';
import { authenticateToken } from '../middleware/auth.js';

export const observationRouter = express.Router();

observationRouter.get('/', authenticateToken, async (req, res, next) => {
  const bundle = await ObservationService.search(req.query, req);
  res.json(bundle);
});
```

### 3. Register Route

```javascript
// src/index.js
import { observationRouter } from './routes/observation.js';

app.use('/fhir/Observation', observationRouter);
```

### 4. Update CapabilityStatement

```javascript
// src/fhir/capability-statement.js
// Add to rest[0].resource array:
{
  type: 'Observation',
  interaction: [
    { code: 'read' },
    { code: 'search-type' }
  ],
  searchParam: [...]
}
```

---

## Authentication Flow

```
Client                          Server
  |                               |
  |  POST /auth/token             |
  |  client_id, client_secret     |
  |------------------------------>|
  |                               |
  |  { access_token: "..." }      |
  |<------------------------------|
  |                               |
  |  GET /fhir/Patient            |
  |  Authorization: Bearer <token>|
  |------------------------------>|
  |                               |
  |  { resourceType: "Bundle" }   |
  |<------------------------------|
```

### Adding New Auth Methods

Edit `src/routes/auth.js`:

```javascript
// Add authorization_code grant
authRouter.post('/token', (req, res) => {
  if (grant_type === 'authorization_code') {
    // Handle code exchange
  }
});
```

---

## Error Handling

All errors return FHIR OperationOutcome:

```javascript
import { operationOutcome } from '../fhir/utils.js';

// Return 404
res.status(404).json(operationOutcome(
  'error',      // severity: fatal | error | warning | information
  'not-found',  // code: see HL7 issue-type
  'Patient not found'
));
```

### Error Codes

| HTTP | FHIR Code | Use Case |
|------|-----------|----------|
| 400 | invalid | Validation error |
| 401 | security | Authentication required |
| 403 | forbidden | Insufficient scope |
| 404 | not-found | Resource not found |
| 500 | exception | Server error |

---

## Testing

### Run Tests

```bash
npm test
```

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health

# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=projectathon-test-client" \
  -d "client_secret=projectathon-test-secret" | jq -r '.access_token')

# Search patients
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/fhir/Patient
```

---

## Deployment

### Vercel (Current)

```bash
# Deploy to production
vercel --prod

# Set environment variables
vercel env add JWT_SECRET production
```

### Fly.io (Alternative)

```bash
fly launch
fly secrets set JWT_SECRET=your-secret
fly deploy
```

### Docker

```bash
docker build -t arkpass-fhir .
docker run -p 3000:3000 -e JWT_SECRET=secret arkpass-fhir
```

---

## Extending for Production

### 1. Add Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

app.use('/fhir', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per window
}));
```

### 2. Add Request Validation

```javascript
import Ajv from 'ajv';
const ajv = new Ajv();

// Validate against FHIR Patient schema
const validate = ajv.compile(patientSchema);
if (!validate(req.body)) {
  return res.status(400).json(operationOutcome('error', 'invalid', validate.errors));
}
```

### 3. Add Audit Logging

```javascript
// Log all data access for HIPAA compliance
async function auditLog(action, resourceType, resourceId, actorId) {
  await supabase.from('audit_log').insert({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    actor_id: actorId,
    timestamp: new Date()
  });
}
```

### 4. Add SMART on FHIR

```javascript
// Add authorization endpoint
authRouter.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, scope, state } = req.query;
  // Show login/consent UI
});
```

---

## Troubleshooting

### Token Invalid

- Check JWT_SECRET matches between token creation and validation
- Verify token hasn't expired (default: 1 hour)
- Ensure Authorization header format: `Bearer <token>`

### CORS Errors

- Server allows all origins by default
- For production, restrict to specific domains in `src/index.js`

### Database Connection

- Verify SUPABASE_URL and keys are correct
- Check Supabase dashboard for connection limits
- Fallback to in-memory if not configured
