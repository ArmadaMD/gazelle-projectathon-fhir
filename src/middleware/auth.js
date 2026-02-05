import jwt from 'jsonwebtoken';
import { operationOutcome } from '../fhir/utils.js';

/**
 * OAuth 2.0 Bearer Token Authentication Middleware
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401)
      .setHeader('WWW-Authenticate', 'Bearer realm="fhir"')
      .json(operationOutcome(
        'error',
        'security',
        'Authentication required. Provide Bearer token in Authorization header.'
      ));
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401)
      .setHeader('WWW-Authenticate', 'Bearer realm="fhir", error="invalid_request"')
      .json(operationOutcome(
        'error',
        'security',
        'Invalid authorization header format. Use: Bearer <token>'
      ));
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'projectathon-dev-secret-change-in-production'
    );

    // Attach token info to request for downstream use
    req.auth = {
      clientId: decoded.client_id,
      scope: decoded.scope,
      tokenId: decoded.jti,
      issuedAt: new Date(decoded.iat * 1000),
      expiresAt: new Date(decoded.exp * 1000)
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401)
        .setHeader('WWW-Authenticate', 'Bearer realm="fhir", error="invalid_token"')
        .json(operationOutcome('error', 'security', 'Access token has expired'));
    }

    return res.status(401)
      .setHeader('WWW-Authenticate', 'Bearer realm="fhir", error="invalid_token"')
      .json(operationOutcome('error', 'security', 'Invalid access token'));
  }
}
