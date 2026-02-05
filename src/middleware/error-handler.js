import { operationOutcome } from '../fhir/utils.js';

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
  res.status(404)
    .setHeader('Content-Type', 'application/fhir+json')
    .json(operationOutcome(
      'error',
      'not-found',
      `Endpoint not found: ${req.method} ${req.path}`
    ));
}

/**
 * Global error handler
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Validation errors
  if (err.validationErrors) {
    return res.status(400)
      .setHeader('Content-Type', 'application/fhir+json')
      .json({
        resourceType: 'OperationOutcome',
        issue: err.validationErrors.map(msg => ({
          severity: 'error',
          code: 'invalid',
          details: { text: msg }
        }))
      });
  }

  // Database errors
  if (err.code && err.code.startsWith('PG')) {
    return res.status(500)
      .setHeader('Content-Type', 'application/fhir+json')
      .json(operationOutcome('error', 'exception', 'Database error'));
  }

  // Default server error
  res.status(500)
    .setHeader('Content-Type', 'application/fhir+json')
    .json(operationOutcome(
      'error',
      'exception',
      process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    ));
}
