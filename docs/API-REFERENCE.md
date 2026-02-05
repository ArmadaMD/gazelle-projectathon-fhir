# ArkPass FHIR Server - API Reference

**Base URL:** `https://gazelle-projectathon-fhir.vercel.app`

---

## Authentication

### POST /auth/token

Get an OAuth 2.0 access token.

**Request:**
```http
POST /auth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=projectathon-test-client&client_secret=projectathon-test-secret
```

**Alternative (Basic Auth):**
```http
POST /auth/token HTTP/1.1
Authorization: Basic cHJvamVjdGF0aG9uLXRlc3QtY2xpZW50OnByb2plY3RhdGhvbi10ZXN0LXNlY3JldA==
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "patient/*.read"
}
```

**Error (401):**
```json
{
  "error": "invalid_client",
  "error_description": "Invalid client credentials"
}
```

---

### POST /auth/introspect

Introspect a token (RFC 7662).

**Request:**
```http
POST /auth/introspect HTTP/1.1
Content-Type: application/x-www-form-urlencoded

token=eyJhbGciOiJIUzI1NiIs...
```

**Response (Active):**
```json
{
  "active": true,
  "client_id": "projectathon-test-client",
  "scope": "patient/*.read",
  "exp": 1770312210,
  "iat": 1770308610,
  "token_type": "Bearer"
}
```

**Response (Inactive):**
```json
{
  "active": false
}
```

---

### POST /auth/revoke

Revoke a token (RFC 7009).

**Request:**
```http
POST /auth/revoke HTTP/1.1
Content-Type: application/x-www-form-urlencoded

token=eyJhbGciOiJIUzI1NiIs...
```

**Response:** `200 OK` (always, per RFC 7009)

---

### GET /auth/.well-known/smart-configuration

SMART on FHIR discovery endpoint.

**Response:**
```json
{
  "issuer": "https://gazelle-projectathon-fhir.vercel.app",
  "token_endpoint": "https://gazelle-projectathon-fhir.vercel.app/auth/token",
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],
  "grant_types_supported": ["client_credentials"],
  "scopes_supported": ["patient/*.read", "patient/Patient.read", "system/*.read"]
}
```

---

## FHIR Endpoints

All FHIR endpoints (except `/fhir/metadata`) require authentication:

```http
Authorization: Bearer <access_token>
```

---

### GET /fhir/metadata

Returns the CapabilityStatement. **No authentication required.**

**Response:**
```json
{
  "resourceType": "CapabilityStatement",
  "status": "active",
  "fhirVersion": "4.0.1",
  "format": ["json", "application/fhir+json"],
  "rest": [{
    "mode": "server",
    "resource": [{
      "type": "Patient",
      "interaction": [
        {"code": "read"},
        {"code": "search-type"},
        {"code": "create"},
        {"code": "update"},
        {"code": "delete"}
      ]
    }]
  }]
}
```

---

### GET /fhir/Patient

Search for patients.

**Query Parameters:**

| Parameter | Type | Example |
|-----------|------|---------|
| `_id` | token | `test-patient-001` |
| `identifier` | token | `1234-567-890-ON` |
| `family` | string | `Tremblay` |
| `given` | string | `Marie` |
| `name` | string | `Marie` (searches both) |
| `birthdate` | date | `1985-03-15` |
| `gender` | token | `female` |
| `phone` | token | `416-555-0101` |
| `email` | token | `marie@example.com` |
| `address` | string | `Toronto` |
| `address-city` | string | `Toronto` |
| `address-state` | string | `ON` |
| `address-postalcode` | string | `M5V` |
| `_count` | number | `10` (default: 20) |
| `_offset` | number | `0` |

**Example:**
```http
GET /fhir/Patient?address-state=ON&_count=10 HTTP/1.1
Authorization: Bearer eyJ...
```

**Response (200):**
```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 2,
  "link": [{
    "relation": "self",
    "url": "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient?address-state=ON&_count=10"
  }],
  "entry": [{
    "fullUrl": "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient/test-patient-001",
    "resource": {
      "resourceType": "Patient",
      "id": "test-patient-001",
      "meta": {
        "versionId": "1",
        "lastUpdated": "2026-02-05T16:11:31.248Z"
      },
      "name": [{"family": "Tremblay", "given": ["Marie", "Claire"]}],
      "gender": "female",
      "birthDate": "1985-03-15"
    },
    "search": {"mode": "match"}
  }]
}
```

---

### GET /fhir/Patient/{id}

Read a single patient by ID.

**Example:**
```http
GET /fhir/Patient/test-patient-001 HTTP/1.1
Authorization: Bearer eyJ...
```

**Response Headers:**
```http
ETag: W/"1"
Last-Modified: 2026-02-05T16:11:31.248Z
Content-Type: application/fhir+json; charset=utf-8
```

**Response (200):**
```json
{
  "resourceType": "Patient",
  "id": "test-patient-001",
  "meta": {
    "versionId": "1",
    "lastUpdated": "2026-02-05T16:11:31.248Z",
    "profile": ["http://hl7.org/fhir/ca/baseline/StructureDefinition/profile-patient"]
  },
  "identifier": [{
    "use": "official",
    "system": "https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-patient-hcn",
    "value": "1234-567-890-ON"
  }],
  "name": [{
    "use": "official",
    "family": "Tremblay",
    "given": ["Marie", "Claire"]
  }],
  "gender": "female",
  "birthDate": "1985-03-15",
  "telecom": [
    {"system": "phone", "value": "416-555-0101", "use": "home"},
    {"system": "email", "value": "marie.tremblay@example.com"}
  ],
  "address": [{
    "use": "home",
    "type": "physical",
    "line": ["123 Maple Street", "Apt 4B"],
    "city": "Toronto",
    "state": "ON",
    "postalCode": "M5V 2T6",
    "country": "CA"
  }]
}
```

**Response (404):**
```json
{
  "resourceType": "OperationOutcome",
  "issue": [{
    "severity": "error",
    "code": "not-found",
    "details": {"text": "Patient with id 'invalid-id' not found"}
  }]
}
```

---

### POST /fhir/Patient

Create a new patient.

**Request:**
```http
POST /fhir/Patient HTTP/1.1
Authorization: Bearer eyJ...
Content-Type: application/fhir+json

{
  "resourceType": "Patient",
  "name": [{
    "family": "Doe",
    "given": ["John"]
  }],
  "gender": "male",
  "birthDate": "1990-05-15"
}
```

**Response Headers:**
```http
HTTP/1.1 201 Created
Location: /fhir/Patient/a1b2c3d4-e5f6-7890-abcd-ef1234567890
ETag: W/"1"
```

**Response (201):**
```json
{
  "resourceType": "Patient",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "meta": {
    "versionId": "1",
    "lastUpdated": "2026-02-05T17:00:00.000Z"
  },
  "name": [{"family": "Doe", "given": ["John"]}],
  "gender": "male",
  "birthDate": "1990-05-15"
}
```

**Validation Error (400):**
```json
{
  "resourceType": "OperationOutcome",
  "issue": [{
    "severity": "error",
    "code": "invalid",
    "details": {"text": "At least one name is required"}
  }]
}
```

---

### PUT /fhir/Patient/{id}

Update an existing patient.

**Request:**
```http
PUT /fhir/Patient/test-patient-001 HTTP/1.1
Authorization: Bearer eyJ...
Content-Type: application/fhir+json

{
  "resourceType": "Patient",
  "id": "test-patient-001",
  "name": [{
    "family": "Tremblay-Updated",
    "given": ["Marie", "Claire"]
  }],
  "gender": "female",
  "birthDate": "1985-03-15"
}
```

**Response (200):**
```json
{
  "resourceType": "Patient",
  "id": "test-patient-001",
  "meta": {
    "versionId": "2",
    "lastUpdated": "2026-02-05T17:30:00.000Z"
  },
  "name": [{"family": "Tremblay-Updated", "given": ["Marie", "Claire"]}]
}
```

---

### DELETE /fhir/Patient/{id}

Delete a patient.

**Request:**
```http
DELETE /fhir/Patient/test-patient-001 HTTP/1.1
Authorization: Bearer eyJ...
```

**Response:** `204 No Content`

---

### GET /fhir/Patient/{id}/$everything

Get all resources for a patient.

**Request:**
```http
GET /fhir/Patient/test-patient-001/$everything HTTP/1.1
Authorization: Bearer eyJ...
```

**Response (200):**
```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 1,
  "entry": [{
    "fullUrl": "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient/test-patient-001",
    "resource": {
      "resourceType": "Patient",
      "id": "test-patient-001"
    }
  }]
}
```

---

## Utility Endpoints

### GET /health

Health check endpoint. **No authentication required.**

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-05T16:00:00.000Z",
  "service": "ArkPass FHIR Server"
}
```

---

## Error Codes

| HTTP Code | FHIR Severity | FHIR Code | Description |
|-----------|---------------|-----------|-------------|
| 400 | error | invalid | Invalid request or validation error |
| 401 | error | security | Missing or invalid authentication |
| 403 | error | forbidden | Insufficient permissions |
| 404 | error | not-found | Resource not found |
| 500 | error | exception | Internal server error |

---

## Rate Limits

Currently no rate limits are enforced for Projectathon testing.

---

## CORS

The server accepts requests from all origins with the following methods:
- GET, POST, PUT, DELETE, OPTIONS

Allowed headers:
- Content-Type, Authorization, Accept, Prefer

Exposed headers:
- Location, ETag, Last-Modified
