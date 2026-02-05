/**
 * FHIR R4 CapabilityStatement
 * This is the most important endpoint for Projectathon - it declares what your system can do
 */

export function getCapabilityStatement(req) {
  const baseUrl = process.env.FHIR_BASE_URL || `${req.protocol}://${req.get('host')}/fhir`;
  const serverName = process.env.FHIR_SERVER_NAME || 'ArkPass FHIR Server';
  const serverVersion = process.env.FHIR_SERVER_VERSION || '1.0.0';

  return {
    resourceType: 'CapabilityStatement',
    id: 'arkpass-fhir-capability',
    url: `${baseUrl}/metadata`,
    version: serverVersion,
    name: 'ArkPassFHIRCapabilityStatement',
    title: `${serverName} Capability Statement`,
    status: 'active',
    experimental: false,
    date: new Date().toISOString(),
    publisher: 'ArkPass / Armada Health',
    contact: [
      {
        name: 'ArkPass Support',
        telecom: [
          {
            system: 'email',
            value: 'support@arkpass.health'
          }
        ]
      }
    ],
    description: 'FHIR R4 Data Recipient implementation for Infoway Projectathon. Supports patient demographic queries and retrieval with OAuth 2.0 authentication.',
    jurisdiction: [
      {
        coding: [
          {
            system: 'urn:iso:std:iso:3166',
            code: 'CA',
            display: 'Canada'
          }
        ]
      }
    ],
    kind: 'instance',
    software: {
      name: serverName,
      version: serverVersion,
      releaseDate: new Date().toISOString().split('T')[0]
    },
    implementation: {
      description: `${serverName} - Infoway Projectathon Implementation`,
      url: baseUrl
    },
    fhirVersion: '4.0.1',
    format: ['json', 'application/fhir+json'],
    // IHE profiles we implement
    implementationGuide: [
      'http://hl7.org/fhir/uv/ipa/ImplementationGuide/hl7.fhir.uv.ipa', // International Patient Access
      'http://fhir.infoway-inforoute.ca/io/CA-Baseline' // Canadian Baseline
    ],
    rest: [
      {
        mode: 'server',
        documentation: 'RESTful FHIR server supporting Patient resource operations',
        security: {
          cors: true,
          service: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
                  code: 'OAuth',
                  display: 'OAuth'
                }
              ],
              text: 'OAuth 2.0 with client_credentials grant'
            }
          ],
          description: 'OAuth 2.0 Bearer token authentication required for all resource operations. Obtain token via POST /auth/token with client_credentials grant.',
          extension: [
            {
              url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
              extension: [
                {
                  url: 'token',
                  valueUri: `${baseUrl.replace('/fhir', '')}/auth/token`
                },
                {
                  url: 'authorize',
                  valueUri: `${baseUrl.replace('/fhir', '')}/auth/authorize`
                }
              ]
            }
          ]
        },
        resource: [
          {
            type: 'Patient',
            profile: 'http://hl7.org/fhir/StructureDefinition/Patient',
            supportedProfile: [
              'http://hl7.org/fhir/ca/baseline/StructureDefinition/profile-patient'
            ],
            documentation: 'Patient demographic information with Canadian baseline conformance',
            interaction: [
              {
                code: 'read',
                documentation: 'Read a Patient resource by ID'
              },
              {
                code: 'search-type',
                documentation: 'Search for Patient resources'
              },
              {
                code: 'create',
                documentation: 'Create a new Patient resource'
              },
              {
                code: 'update',
                documentation: 'Update an existing Patient resource'
              },
              {
                code: 'delete',
                documentation: 'Delete a Patient resource'
              }
            ],
            versioning: 'versioned',
            readHistory: false,
            updateCreate: false,
            conditionalCreate: false,
            conditionalRead: 'not-supported',
            conditionalUpdate: false,
            conditionalDelete: 'not-supported',
            searchInclude: [],
            searchRevInclude: [],
            searchParam: [
              {
                name: '_id',
                type: 'token',
                documentation: 'Logical ID of the patient'
              },
              {
                name: 'identifier',
                type: 'token',
                documentation: 'Patient identifier (e.g., health card number)'
              },
              {
                name: 'family',
                type: 'string',
                documentation: 'Family (last) name'
              },
              {
                name: 'given',
                type: 'string',
                documentation: 'Given (first) name'
              },
              {
                name: 'name',
                type: 'string',
                documentation: 'Any part of the name'
              },
              {
                name: 'birthdate',
                type: 'date',
                documentation: 'Date of birth'
              },
              {
                name: 'gender',
                type: 'token',
                documentation: 'Gender (male | female | other | unknown)'
              },
              {
                name: 'phone',
                type: 'token',
                documentation: 'Phone number'
              },
              {
                name: 'email',
                type: 'token',
                documentation: 'Email address'
              },
              {
                name: 'address',
                type: 'string',
                documentation: 'Any part of the address'
              },
              {
                name: 'address-city',
                type: 'string',
                documentation: 'City'
              },
              {
                name: 'address-state',
                type: 'string',
                documentation: 'Province/State'
              },
              {
                name: 'address-postalcode',
                type: 'string',
                documentation: 'Postal/ZIP code'
              }
            ],
            operation: [
              {
                name: 'everything',
                definition: 'http://hl7.org/fhir/OperationDefinition/Patient-everything',
                documentation: 'Return all resources related to a patient'
              }
            ]
          }
        ],
        interaction: [
          {
            code: 'search-system',
            documentation: 'System-level search is not supported'
          }
        ],
        operation: []
      }
    ]
  };
}
