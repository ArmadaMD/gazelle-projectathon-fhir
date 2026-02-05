import { v4 as uuidv4 } from 'uuid';
import { getSupabase, isSupabaseConfigured } from '../db/supabase.js';
import {
  createSearchBundle,
  createEverythingBundle,
  createMeta,
  dbToFhirPatient,
  fhirToDbPatient,
  validatePatient
} from '../fhir/utils.js';

// In-memory store for when Supabase is not configured
const inMemoryPatients = new Map();

// Seed some test patients for Projectathon
function seedTestPatients() {
  const testPatients = [
    {
      id: 'test-patient-001',
      resourceType: 'Patient',
      meta: createMeta('1'),
      identifier: [
        {
          use: 'official',
          system: 'https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-patient-hcn',
          value: '1234-567-890-ON'
        }
      ],
      name: [
        {
          use: 'official',
          family: 'Tremblay',
          given: ['Marie', 'Claire']
        }
      ],
      gender: 'female',
      birthDate: '1985-03-15',
      telecom: [
        { system: 'phone', value: '416-555-0101', use: 'home' },
        { system: 'email', value: 'marie.tremblay@example.com' }
      ],
      address: [
        {
          use: 'home',
          type: 'physical',
          line: ['123 Maple Street', 'Apt 4B'],
          city: 'Toronto',
          state: 'ON',
          postalCode: 'M5V 2T6',
          country: 'CA'
        }
      ]
    },
    {
      id: 'test-patient-002',
      resourceType: 'Patient',
      meta: createMeta('1'),
      identifier: [
        {
          use: 'official',
          system: 'https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-patient-hcn',
          value: '9876-543-210-ON'
        }
      ],
      name: [
        {
          use: 'official',
          family: 'Singh',
          given: ['Rajiv']
        }
      ],
      gender: 'male',
      birthDate: '1978-11-22',
      telecom: [
        { system: 'phone', value: '905-555-0202', use: 'mobile' },
        { system: 'email', value: 'rajiv.singh@example.com' }
      ],
      address: [
        {
          use: 'home',
          line: ['456 Oak Avenue'],
          city: 'Mississauga',
          state: 'ON',
          postalCode: 'L5B 3C7',
          country: 'CA'
        }
      ]
    },
    {
      id: 'test-patient-003',
      resourceType: 'Patient',
      meta: createMeta('1'),
      identifier: [
        {
          use: 'official',
          system: 'https://fhir.infoway-inforoute.ca/NamingSystem/ca-bc-patient-phn',
          value: '9123-456-789-BC'
        }
      ],
      name: [
        {
          use: 'official',
          family: 'Chen',
          given: ['Wei', 'Lin']
        }
      ],
      gender: 'female',
      birthDate: '1992-07-08',
      telecom: [
        { system: 'phone', value: '604-555-0303', use: 'home' }
      ],
      address: [
        {
          use: 'home',
          line: ['789 Pine Road'],
          city: 'Vancouver',
          state: 'BC',
          postalCode: 'V6B 1A1',
          country: 'CA'
        }
      ]
    },
    {
      id: 'test-patient-004',
      resourceType: 'Patient',
      meta: createMeta('1'),
      name: [
        {
          use: 'official',
          family: 'MacDonald',
          given: ['James', 'Robert']
        }
      ],
      gender: 'male',
      birthDate: '1965-01-30',
      telecom: [
        { system: 'phone', value: '514-555-0404', use: 'home' }
      ],
      address: [
        {
          use: 'home',
          line: ['321 Birch Lane'],
          city: 'Montreal',
          state: 'QC',
          postalCode: 'H3B 2Y5',
          country: 'CA'
        }
      ]
    },
    {
      id: 'test-patient-005',
      resourceType: 'Patient',
      meta: createMeta('1'),
      identifier: [
        {
          use: 'official',
          system: 'https://fhir.infoway-inforoute.ca/NamingSystem/ca-ab-patient-phn',
          value: '5678-901-234-AB'
        }
      ],
      name: [
        {
          use: 'official',
          family: 'Wilson',
          given: ['Sarah']
        },
        {
          use: 'nickname',
          given: ['Sally']
        }
      ],
      gender: 'female',
      birthDate: '2001-12-05',
      telecom: [
        { system: 'phone', value: '403-555-0505', use: 'mobile' },
        { system: 'email', value: 's.wilson@example.com' }
      ],
      address: [
        {
          use: 'home',
          line: ['555 Cedar Boulevard'],
          city: 'Calgary',
          state: 'AB',
          postalCode: 'T2P 1J9',
          country: 'CA'
        }
      ]
    }
  ];

  testPatients.forEach(p => inMemoryPatients.set(p.id, p));
  console.log(`Seeded ${testPatients.length} test patients for Projectathon`);
}

// Initialize test data
seedTestPatients();

export const PatientService = {
  /**
   * Search for patients
   */
  async search(params, req) {
    if (isSupabaseConfigured()) {
      return this.searchSupabase(params, req);
    }
    return this.searchInMemory(params, req);
  },

  searchInMemory(params, req) {
    let results = Array.from(inMemoryPatients.values());

    // Apply filters
    if (params._id) {
      results = results.filter(p => p.id === params._id);
    }

    if (params.identifier) {
      results = results.filter(p =>
        p.identifier?.some(id => id.value?.includes(params.identifier))
      );
    }

    if (params.family) {
      const family = params.family.toLowerCase();
      results = results.filter(p =>
        p.name?.some(n => n.family?.toLowerCase().includes(family))
      );
    }

    if (params.given) {
      const given = params.given.toLowerCase();
      results = results.filter(p =>
        p.name?.some(n => n.given?.some(g => g.toLowerCase().includes(given)))
      );
    }

    if (params.name) {
      const name = params.name.toLowerCase();
      results = results.filter(p =>
        p.name?.some(n =>
          n.family?.toLowerCase().includes(name) ||
          n.given?.some(g => g.toLowerCase().includes(name))
        )
      );
    }

    if (params.birthdate) {
      results = results.filter(p => p.birthDate === params.birthdate);
    }

    if (params.gender) {
      results = results.filter(p => p.gender === params.gender);
    }

    if (params['address-city']) {
      const city = params['address-city'].toLowerCase();
      results = results.filter(p =>
        p.address?.some(a => a.city?.toLowerCase().includes(city))
      );
    }

    if (params['address-state']) {
      results = results.filter(p =>
        p.address?.some(a => a.state === params['address-state'])
      );
    }

    if (params['address-postalcode']) {
      const postal = params['address-postalcode'].replace(/\s/g, '').toUpperCase();
      results = results.filter(p =>
        p.address?.some(a =>
          a.postalCode?.replace(/\s/g, '').toUpperCase().startsWith(postal)
        )
      );
    }

    const total = results.length;

    // Apply pagination
    const offset = params._offset || 0;
    const count = params._count || 20;
    results = results.slice(offset, offset + count);

    return createSearchBundle(results, total, params, req);
  },

  async searchSupabase(params, req) {
    const supabase = getSupabase();
    let query = supabase.from('patients').select('*', { count: 'exact' });

    if (params._id) query = query.eq('id', params._id);
    if (params.identifier) query = query.ilike('health_card_number', `%${params.identifier}%`);
    if (params.family) query = query.ilike('family_name', `%${params.family}%`);
    if (params.given) query = query.ilike('given_name', `%${params.given}%`);
    if (params.birthdate) query = query.eq('birth_date', params.birthdate);
    if (params.gender) query = query.eq('gender', params.gender);
    if (params['address-city']) query = query.ilike('city', `%${params['address-city']}%`);
    if (params['address-state']) query = query.eq('province', params['address-state']);
    if (params['address-postalcode']) query = query.ilike('postal_code', `${params['address-postalcode']}%`);

    // Pagination
    const offset = params._offset || 0;
    const count = params._count || 20;
    query = query.range(offset, offset + count - 1);

    const { data, error, count: total } = await query;

    if (error) throw error;

    const patients = data.map(dbToFhirPatient);
    return createSearchBundle(patients, total, params, req);
  },

  /**
   * Read a single patient by ID
   */
  async read(id) {
    if (isSupabaseConfigured()) {
      return this.readSupabase(id);
    }
    return inMemoryPatients.get(id) || null;
  },

  async readSupabase(id) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return dbToFhirPatient(data);
  },

  /**
   * Create a new patient
   */
  async create(patient) {
    const errors = validatePatient(patient);
    if (errors.length > 0) {
      const error = new Error('Validation failed');
      error.validationErrors = errors;
      throw error;
    }

    const id = patient.id || uuidv4();
    const now = new Date().toISOString();

    const newPatient = {
      ...patient,
      id,
      resourceType: 'Patient',
      meta: {
        versionId: '1',
        lastUpdated: now
      }
    };

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const row = fhirToDbPatient(newPatient);
      row.created_at = now;
      row.updated_at = now;

      const { error } = await supabase.from('patients').insert(row);
      if (error) throw error;
    } else {
      inMemoryPatients.set(id, newPatient);
    }

    return newPatient;
  },

  /**
   * Update an existing patient
   */
  async update(id, patient) {
    const existing = await this.read(id);
    if (!existing) return null;

    const errors = validatePatient(patient);
    if (errors.length > 0) {
      const error = new Error('Validation failed');
      error.validationErrors = errors;
      throw error;
    }

    const newVersion = parseInt(existing.meta?.versionId || '1') + 1;
    const now = new Date().toISOString();

    const updatedPatient = {
      ...patient,
      id,
      resourceType: 'Patient',
      meta: {
        versionId: String(newVersion),
        lastUpdated: now
      }
    };

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const row = fhirToDbPatient(updatedPatient);
      row.version = newVersion;
      row.updated_at = now;

      const { error } = await supabase
        .from('patients')
        .update(row)
        .eq('id', id);

      if (error) throw error;
    } else {
      inMemoryPatients.set(id, updatedPatient);
    }

    return updatedPatient;
  },

  /**
   * Delete a patient
   */
  async delete(id) {
    const existing = await this.read(id);
    if (!existing) return false;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } else {
      inMemoryPatients.delete(id);
    }

    return true;
  },

  /**
   * $everything operation - return patient and all related resources
   */
  async everything(id) {
    const patient = await this.read(id);
    if (!patient) return null;

    // For MVP, we only have Patient resources
    // In a full implementation, this would include:
    // - Observations, Conditions, MedicationRequests, etc.
    const relatedResources = [];

    return createEverythingBundle(patient, relatedResources, { protocol: 'https', get: () => 'localhost' });
  }
};
