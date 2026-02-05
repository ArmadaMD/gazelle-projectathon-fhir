import express from 'express';
import { getCapabilityStatement } from '../fhir/capability-statement.js';
import { PatientService } from '../services/patient-service.js';
import { authenticateToken } from '../middleware/auth.js';
import { operationOutcome } from '../fhir/utils.js';

export const fhirRouter = express.Router();

// Set FHIR content type for all responses
fhirRouter.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/fhir+json; charset=utf-8');
  next();
});

// ============================================================================
// CAPABILITY STATEMENT (No auth required - must be public per FHIR spec)
// ============================================================================
fhirRouter.get('/metadata', (req, res) => {
  const capability = getCapabilityStatement(req);
  res.json(capability);
});

// ============================================================================
// PATIENT RESOURCE - Protected endpoints
// ============================================================================

// Search patients: GET /fhir/Patient?name=Smith&birthdate=1990-01-01
fhirRouter.get('/Patient', authenticateToken, async (req, res, next) => {
  try {
    const searchParams = {
      _id: req.query._id,
      identifier: req.query.identifier,
      family: req.query.family,
      given: req.query.given,
      name: req.query.name,
      birthdate: req.query.birthdate,
      gender: req.query.gender,
      phone: req.query.phone,
      email: req.query.email,
      address: req.query.address,
      'address-city': req.query['address-city'],
      'address-state': req.query['address-state'],
      'address-postalcode': req.query['address-postalcode'],
      _count: parseInt(req.query._count) || 20,
      _offset: parseInt(req.query._offset) || 0,
    };

    const bundle = await PatientService.search(searchParams, req);
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

// Read patient: GET /fhir/Patient/123
fhirRouter.get('/Patient/:id', authenticateToken, async (req, res, next) => {
  try {
    const patient = await PatientService.read(req.params.id);

    if (!patient) {
      return res.status(404).json(operationOutcome(
        'error',
        'not-found',
        `Patient with id '${req.params.id}' not found`
      ));
    }

    res.setHeader('ETag', `W/"${patient.meta?.versionId || '1'}"`);
    res.setHeader('Last-Modified', patient.meta?.lastUpdated || new Date().toISOString());
    res.json(patient);
  } catch (error) {
    next(error);
  }
});

// Create patient: POST /fhir/Patient
fhirRouter.post('/Patient', authenticateToken, async (req, res, next) => {
  try {
    const patient = await PatientService.create(req.body);

    res.status(201);
    res.setHeader('Location', `${req.baseUrl}/Patient/${patient.id}`);
    res.setHeader('ETag', `W/"${patient.meta.versionId}"`);
    res.json(patient);
  } catch (error) {
    next(error);
  }
});

// Update patient: PUT /fhir/Patient/123
fhirRouter.put('/Patient/:id', authenticateToken, async (req, res, next) => {
  try {
    // Ensure ID in body matches URL
    if (req.body.id && req.body.id !== req.params.id) {
      return res.status(400).json(operationOutcome(
        'error',
        'invalid',
        'Resource id in body must match id in URL'
      ));
    }

    const patient = await PatientService.update(req.params.id, req.body);

    if (!patient) {
      return res.status(404).json(operationOutcome(
        'error',
        'not-found',
        `Patient with id '${req.params.id}' not found`
      ));
    }

    res.setHeader('ETag', `W/"${patient.meta.versionId}"`);
    res.setHeader('Last-Modified', patient.meta.lastUpdated);
    res.json(patient);
  } catch (error) {
    next(error);
  }
});

// Delete patient: DELETE /fhir/Patient/123
fhirRouter.delete('/Patient/:id', authenticateToken, async (req, res, next) => {
  try {
    const deleted = await PatientService.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json(operationOutcome(
        'error',
        'not-found',
        `Patient with id '${req.params.id}' not found`
      ));
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// FHIR $everything operation (Patient-level export)
// ============================================================================
fhirRouter.get('/Patient/:id/\\$everything', authenticateToken, async (req, res, next) => {
  try {
    const bundle = await PatientService.everything(req.params.id);

    if (!bundle) {
      return res.status(404).json(operationOutcome(
        'error',
        'not-found',
        `Patient with id '${req.params.id}' not found`
      ));
    }

    res.json(bundle);
  } catch (error) {
    next(error);
  }
});
