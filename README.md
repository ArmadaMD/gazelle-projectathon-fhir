# ArkPass FHIR Server - Infoway Projectathon

A minimal FHIR R4 Data Recipient implementation for the Infoway Projectathon.

**Live URL:** https://gazelle-projectathon-fhir.vercel.app

## Documentation

- [Infoway Projectathon Submission](docs/INFOWAY-PROJECTATHON-SUBMISSION.md) - What to submit to Infoway
- [API Reference](docs/API-REFERENCE.md) - Complete endpoint documentation
- [Developer Guide](docs/DEVELOPER-GUIDE.md) - How to extend and modify

## Quick Start

```bash
# Install dependencies
npm install

# Start server (uses in-memory storage by default)
npm start

# Or with auto-reload for development
npm run dev
```

Server runs at `http://localhost:3000`

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/fhir/metadata` | GET | No | CapabilityStatement |
| `/fhir/Patient` | GET | Yes | Search patients |
| `/fhir/Patient/:id` | GET | Yes | Read patient |
| `/fhir/Patient` | POST | Yes | Create patient |
| `/fhir/Patient/:id` | PUT | Yes | Update patient |
| `/auth/token` | POST | No | Get access token |
| `/health` | GET | No | Health check |

## Authentication

Get an access token:

```bash
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=projectathon-test-client" \
  -d "client_secret=projectathon-test-secret"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "patient/*.read"
}
```

Use the token:
```bash
curl http://localhost:3000/fhir/Patient \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Test Data

The server comes pre-loaded with 5 test patients:

| ID | Name | Province |
|----|------|----------|
| test-patient-001 | Marie Tremblay | ON |
| test-patient-002 | Rajiv Singh | ON |
| test-patient-003 | Wei Lin Chen | BC |
| test-patient-004 | James MacDonald | QC |
| test-patient-005 | Sarah Wilson | AB |

## Search Examples

```bash
# Get all patients
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/fhir/Patient"

# Search by name
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/fhir/Patient?name=Singh"

# Search by city
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/fhir/Patient?address-city=Toronto"

# Search by birthdate
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/fhir/Patient?birthdate=1985-03-15"
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
# Server
PORT=3000
NODE_ENV=development

# JWT (change in production!)
JWT_SECRET=your-secure-random-secret-min-32-chars

# OAuth credentials for Projectathon testers
OAUTH_CLIENT_ID=projectathon-test-client
OAUTH_CLIENT_SECRET=your-secure-client-secret

# Optional: Supabase for persistent storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Deployment

### Fly.io (Recommended)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly launch
fly secrets set JWT_SECRET="your-production-secret"
fly secrets set OAUTH_CLIENT_SECRET="your-production-secret"
fly deploy
```

Your server will be at: `https://arkpass-fhir-projectathon.fly.dev`

### Docker

```bash
docker build -t arkpass-fhir .
docker run -p 3000:3000 -e JWT_SECRET=secret arkpass-fhir
```

## Projectathon Submission

After deploying, provide Infoway with:

1. **System URL**: `https://your-domain.fly.dev/fhir`
2. **CapabilityStatement**: `https://your-domain.fly.dev/fhir/metadata`
3. **Actor**: Data Recipient
4. **Profiles**: Patient (CA Baseline)
5. **Test Credentials**:
   - Token endpoint: `https://your-domain.fly.dev/auth/token`
   - Client ID: `projectathon-test-client`
   - Client Secret: (provide separately)

## FHIR Compliance

- FHIR R4 (4.0.1)
- Canadian Baseline Profile for Patient
- OAuth 2.0 client_credentials flow
- Proper OperationOutcome for errors
- Search parameters per spec
