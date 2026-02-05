# Infoway Projectathon Submission Documentation

## System Overview

**System Name:** ArkPass FHIR Server
**Organization:** Armada Health
**Actor Type:** Data Recipient
**FHIR Version:** R4 (4.0.1)
**Status:** Production Ready

---

## Live Endpoints

| Endpoint | URL |
|----------|-----|
| **Base URL** | `https://gazelle-projectathon-fhir.vercel.app` |
| **FHIR Base** | `https://gazelle-projectathon-fhir.vercel.app/fhir` |
| **CapabilityStatement** | `https://gazelle-projectathon-fhir.vercel.app/fhir/metadata` |
| **Token Endpoint** | `https://gazelle-projectathon-fhir.vercel.app/auth/token` |
| **SMART Configuration** | `https://gazelle-projectathon-fhir.vercel.app/auth/.well-known/smart-configuration` |

---

## Authentication

### OAuth 2.0 Client Credentials Flow

**Grant Type:** `client_credentials`

**Test Credentials:**
```
Client ID:     projectathon-test-client
Client Secret: projectathon-test-secret
```

### Getting an Access Token

```bash
curl -X POST https://gazelle-projectathon-fhir.vercel.app/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=projectathon-test-client" \
  -d "client_secret=projectathon-test-secret"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "patient/*.read"
}
```

### Using the Token

Include the token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer <access_token>" \
  https://gazelle-projectathon-fhir.vercel.app/fhir/Patient
```

---

## Supported Resources

### Patient Resource

**Profile:** Canadian Baseline Patient
**URL:** `http://hl7.org/fhir/ca/baseline/StructureDefinition/profile-patient`

#### Supported Interactions

| Interaction | Method | Endpoint | Description |
|-------------|--------|----------|-------------|
| read | GET | `/fhir/Patient/{id}` | Retrieve a single patient by ID |
| search | GET | `/fhir/Patient` | Search for patients |
| create | POST | `/fhir/Patient` | Create a new patient |
| update | PUT | `/fhir/Patient/{id}` | Update an existing patient |
| delete | DELETE | `/fhir/Patient/{id}` | Delete a patient |

#### Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `_id` | token | Logical ID of the patient |
| `identifier` | token | Health card number or other identifier |
| `family` | string | Family (last) name |
| `given` | string | Given (first) name |
| `name` | string | Any part of the name |
| `birthdate` | date | Date of birth (YYYY-MM-DD) |
| `gender` | token | male, female, other, unknown |
| `phone` | token | Phone number |
| `email` | token | Email address |
| `address` | string | Any part of address |
| `address-city` | string | City |
| `address-state` | string | Province/State code |
| `address-postalcode` | string | Postal/ZIP code |
| `_count` | number | Results per page (default: 20) |
| `_offset` | number | Pagination offset |

---

## Test Data

The system includes 5 synthetic Canadian patients for testing:

| ID | Name | Gender | DOB | Province | Health Card |
|----|------|--------|-----|----------|-------------|
| test-patient-001 | Marie Claire Tremblay | female | 1985-03-15 | ON | 1234-567-890-ON |
| test-patient-002 | Rajiv Singh | male | 1978-11-22 | ON | 9876-543-210-ON |
| test-patient-003 | Wei Lin Chen | female | 1992-07-08 | BC | 9123-456-789-BC |
| test-patient-004 | James Robert MacDonald | male | 1965-01-30 | QC | - |
| test-patient-005 | Sarah Wilson | female | 2001-12-05 | AB | 5678-901-234-AB |

---

## Example API Calls

### 1. Get CapabilityStatement (No Auth Required)

```bash
curl https://gazelle-projectathon-fhir.vercel.app/fhir/metadata
```

### 2. Search All Patients

```bash
curl -H "Authorization: Bearer <token>" \
  "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient"
```

### 3. Search by Name

```bash
curl -H "Authorization: Bearer <token>" \
  "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient?name=Singh"
```

### 4. Search by Province

```bash
curl -H "Authorization: Bearer <token>" \
  "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient?address-state=ON"
```

### 5. Search by Birth Date

```bash
curl -H "Authorization: Bearer <token>" \
  "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient?birthdate=1985-03-15"
```

### 6. Read Single Patient

```bash
curl -H "Authorization: Bearer <token>" \
  "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient/test-patient-001"
```

### 7. Create Patient

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/fhir+json" \
  -d '{
    "resourceType": "Patient",
    "name": [{"family": "Test", "given": ["New"]}],
    "gender": "male",
    "birthDate": "2000-01-01"
  }' \
  "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient"
```

---

## Response Formats

### Successful Search Response (Bundle)

```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 5,
  "link": [
    {
      "relation": "self",
      "url": "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient"
    }
  ],
  "entry": [
    {
      "fullUrl": "https://gazelle-projectathon-fhir.vercel.app/fhir/Patient/test-patient-001",
      "resource": {
        "resourceType": "Patient",
        "id": "test-patient-001",
        ...
      },
      "search": {
        "mode": "match"
      }
    }
  ]
}
```

### Error Response (OperationOutcome)

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "not-found",
      "details": {
        "text": "Patient with id 'invalid-id' not found"
      }
    }
  ]
}
```

---

## Conformance

### IHE Profiles

- International Patient Access (IPA)
- Canadian FHIR Baseline

### Security

- OAuth 2.0 Bearer Token authentication
- HTTPS enforced
- CORS enabled for cross-origin requests
- No PHI exposed at authentication edges

### Response Headers

All FHIR responses include:
- `Content-Type: application/fhir+json; charset=utf-8`
- `ETag` for versioning
- `Last-Modified` timestamp

---

## Contact Information

**Technical Contact:** support@arkpass.health
**Organization:** Armada Health
**System:** ArkPass FHIR Server v1.0.0
