import { v4 as uuidv4 } from 'uuid';

/**
 * Create a FHIR OperationOutcome resource
 * Used for error responses
 */
export function operationOutcome(severity, code, message, diagnostics = null) {
  const outcome = {
    resourceType: 'OperationOutcome',
    id: uuidv4(),
    issue: [
      {
        severity,  // fatal | error | warning | information
        code,      // See https://www.hl7.org/fhir/valueset-issue-type.html
        details: {
          text: message
        }
      }
    ]
  };

  if (diagnostics) {
    outcome.issue[0].diagnostics = diagnostics;
  }

  return outcome;
}

/**
 * Create a FHIR Bundle for search results
 */
export function createSearchBundle(resources, total, searchParams, req) {
  const baseUrl = process.env.FHIR_BASE_URL || `${req.protocol}://${req.get('host')}/fhir`;

  // Build self link with search params
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  }

  const selfUrl = `${baseUrl}/Patient${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

  return {
    resourceType: 'Bundle',
    id: uuidv4(),
    type: 'searchset',
    timestamp: new Date().toISOString(),
    total,
    link: [
      {
        relation: 'self',
        url: selfUrl
      }
    ],
    entry: resources.map(resource => ({
      fullUrl: `${baseUrl}/Patient/${resource.id}`,
      resource,
      search: {
        mode: 'match'
      }
    }))
  };
}

/**
 * Create a FHIR Bundle for $everything operation
 */
export function createEverythingBundle(patient, relatedResources, req) {
  const baseUrl = process.env.FHIR_BASE_URL || `${req.protocol}://${req.get('host')}/fhir`;

  const entries = [
    {
      fullUrl: `${baseUrl}/Patient/${patient.id}`,
      resource: patient
    },
    ...relatedResources.map(resource => ({
      fullUrl: `${baseUrl}/${resource.resourceType}/${resource.id}`,
      resource
    }))
  ];

  return {
    resourceType: 'Bundle',
    id: uuidv4(),
    type: 'searchset',
    timestamp: new Date().toISOString(),
    total: entries.length,
    link: [
      {
        relation: 'self',
        url: `${baseUrl}/Patient/${patient.id}/$everything`
      }
    ],
    entry: entries
  };
}

/**
 * Generate FHIR-compliant meta element
 */
export function createMeta(versionId = '1') {
  return {
    versionId,
    lastUpdated: new Date().toISOString(),
    profile: ['http://hl7.org/fhir/ca/baseline/StructureDefinition/profile-patient']
  };
}

/**
 * Validate required fields for Patient resource
 */
export function validatePatient(patient) {
  const errors = [];

  if (!patient.resourceType || patient.resourceType !== 'Patient') {
    errors.push('resourceType must be "Patient"');
  }

  // Name is required per Canadian baseline
  if (!patient.name || !Array.isArray(patient.name) || patient.name.length === 0) {
    errors.push('At least one name is required');
  }

  // Validate gender if present
  const validGenders = ['male', 'female', 'other', 'unknown'];
  if (patient.gender && !validGenders.includes(patient.gender)) {
    errors.push(`gender must be one of: ${validGenders.join(', ')}`);
  }

  // Validate birthDate format if present
  if (patient.birthDate && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(patient.birthDate)) {
    errors.push('birthDate must be in format YYYY, YYYY-MM, or YYYY-MM-DD');
  }

  return errors;
}

/**
 * Convert database row to FHIR Patient resource
 */
export function dbToFhirPatient(row) {
  const patient = {
    resourceType: 'Patient',
    id: row.id,
    meta: {
      versionId: String(row.version || 1),
      lastUpdated: row.updated_at || row.created_at
    },
    identifier: [],
    name: [],
    telecom: [],
    address: []
  };

  // Add identifier (e.g., health card)
  if (row.health_card_number) {
    patient.identifier.push({
      use: 'official',
      system: 'https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-patient-hcn',
      value: row.health_card_number
    });
  }

  // Add name
  if (row.family_name || row.given_name) {
    patient.name.push({
      use: 'official',
      family: row.family_name,
      given: row.given_name ? [row.given_name] : []
    });
  }

  // Add gender
  if (row.gender) {
    patient.gender = row.gender;
  }

  // Add birthDate
  if (row.birth_date) {
    patient.birthDate = row.birth_date;
  }

  // Add phone
  if (row.phone) {
    patient.telecom.push({
      system: 'phone',
      value: row.phone,
      use: 'home'
    });
  }

  // Add email
  if (row.email) {
    patient.telecom.push({
      system: 'email',
      value: row.email
    });
  }

  // Add address
  if (row.address_line || row.city || row.province || row.postal_code) {
    patient.address.push({
      use: 'home',
      type: 'physical',
      line: row.address_line ? [row.address_line] : [],
      city: row.city,
      state: row.province,
      postalCode: row.postal_code,
      country: 'CA'
    });
  }

  // Clean up empty arrays
  if (patient.identifier.length === 0) delete patient.identifier;
  if (patient.telecom.length === 0) delete patient.telecom;
  if (patient.address.length === 0) delete patient.address;

  return patient;
}

/**
 * Convert FHIR Patient to database row
 */
export function fhirToDbPatient(patient) {
  const row = {
    id: patient.id,
    version: patient.meta?.versionId ? parseInt(patient.meta.versionId) : 1
  };

  // Extract health card number
  const healthCardId = patient.identifier?.find(id =>
    id.system?.includes('hcn') || id.use === 'official'
  );
  if (healthCardId) {
    row.health_card_number = healthCardId.value;
  }

  // Extract name
  const officialName = patient.name?.find(n => n.use === 'official') || patient.name?.[0];
  if (officialName) {
    row.family_name = officialName.family;
    row.given_name = officialName.given?.[0];
  }

  // Gender
  row.gender = patient.gender;

  // Birth date
  row.birth_date = patient.birthDate;

  // Phone
  const phone = patient.telecom?.find(t => t.system === 'phone');
  row.phone = phone?.value;

  // Email
  const email = patient.telecom?.find(t => t.system === 'email');
  row.email = email?.value;

  // Address
  const address = patient.address?.[0];
  if (address) {
    row.address_line = address.line?.[0];
    row.city = address.city;
    row.province = address.state;
    row.postal_code = address.postalCode;
  }

  return row;
}
