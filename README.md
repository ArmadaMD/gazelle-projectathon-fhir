# ArkPass FHIR Server - Infoway Projectathon

A minimal FHIR R4 Data Recipient implementation for the Infoway Projectathon.

## 🚀 Production URLs

| Endpoint | URL |
|----------|-----|
| **Production** | https://gazelle-projectathon-fhir.vercel.app |
| **FHIR Base URL** | https://gazelle-projectathon-fhir.vercel.app/fhir |
| **CapabilityStatement** | https://gazelle-projectathon-fhir.vercel.app/fhir/metadata |
| **SMART Config** | https://gazelle-projectathon-fhir.vercel.app/.well-known/smart-configuration |
| **Token Endpoint** | https://gazelle-projectathon-fhir.vercel.app/auth/token |
| **Health Check** | https://gazelle-projectathon-fhir.vercel.app/health |

## 📋 For Align Registration

**CapabilityStatement URL:**
```
https://gazelle-projectathon-fhir.vercel.app/fhir/metadata
```

**Base FHIR endpoint:**
```
https://gazelle-projectathon-fhir.vercel.app/fhir
```

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
| `/auth/token` | POST | No | Get access token |
| `/.well-known/smart-configuration` | GET | No | SMART discovery |
| `/health` | GET | No | Health check |

## Authentication

Get an access token:

```bash
curl -X POST https://gazelle-projectathon-fhir.vercel.app/auth/token \
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
curl https://gazelle-projectathon-fhir.vercel.app/fhir/Patient \
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
  "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient"

# Search by name
curl -H "Authorization: Bearer $TOKEN" \
  "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient?name=Singh"

# Search by city
curl -H "Authorization: Bearer $TOKEN" \
  "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient?address-city=Toronto"

# Search by birthdate
curl -H "Authorization: Bearer $TOKEN" \
  "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient?birthdate=1985-03-15"
```

## CapabilityStatement Summary

This server advertises:
- **Patient.read** - Read a Patient resource by ID
- **Patient.search-type** - Search for Patient resources

**No write operations (create/update/delete) are advertised.**

## FHIR Compliance

- FHIR R4 (4.0.1)
- Canadian Baseline Profile for Patient
- OAuth 2.0 client_credentials flow
- Proper OperationOutcome for errors
- Search parameters per spec

## Deployment

Deployed on Vercel. Auto-deploys on push to `main`.

**Vercel Dashboard:** https://vercel.com/armada-vercel/gazelle-projectathon-fhir

**GitHub Repo:** https://github.com/ArmadaMD/gazelle-projectathon-fhir
