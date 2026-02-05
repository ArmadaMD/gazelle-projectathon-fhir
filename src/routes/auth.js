import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export const authRouter = express.Router();

// In-memory token store (use Redis/DB in production)
const tokenStore = new Map();

// OAuth 2.0 Token Endpoint
// POST /auth/token
// Supports: client_credentials grant (for system-to-system)
authRouter.post('/token', express.urlencoded({ extended: true }), (req, res) => {
  const { grant_type, client_id, client_secret, scope } = req.body;

  // Also support Basic auth header
  let authClientId = client_id;
  let authClientSecret = client_secret;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [headerClientId, headerClientSecret] = credentials.split(':');
    authClientId = authClientId || headerClientId;
    authClientSecret = authClientSecret || headerClientSecret;
  }

  // Validate grant type
  if (grant_type !== 'client_credentials') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Only client_credentials grant type is supported'
    });
  }

  // Validate client credentials - use hardcoded defaults for Projectathon
  const validClientId = 'projectathon-test-client';
  const validClientSecret = 'projectathon-test-secret';

  if (authClientId !== validClientId || authClientSecret !== validClientSecret) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Invalid client credentials'
    });
  }

  // Generate access token
  const tokenId = uuidv4();
  const expiresIn = parseInt(process.env.JWT_EXPIRES_IN) || 3600;

  const payload = {
    jti: tokenId,
    client_id: authClientId,
    scope: scope || 'patient/*.read',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'projectathon-dev-secret-change-in-production',
    { algorithm: 'HS256' }
  );

  // Store token for potential revocation
  tokenStore.set(tokenId, {
    clientId: authClientId,
    scope: payload.scope,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  });

  // Return OAuth 2.0 compliant response with cache prevention headers
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: payload.scope,
  });
});

// Token introspection (RFC 7662) - useful for debugging
// POST /auth/introspect
authRouter.post('/introspect', express.urlencoded({ extended: true }), (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.json({ active: false });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'projectathon-dev-secret-change-in-production'
    );

    res.json({
      active: true,
      client_id: decoded.client_id,
      scope: decoded.scope,
      exp: decoded.exp,
      iat: decoded.iat,
      jti: decoded.jti,
      token_type: 'Bearer',
    });
  } catch (error) {
    res.json({ active: false });
  }
});

// Token revocation (RFC 7009)
// POST /auth/revoke
authRouter.post('/revoke', express.urlencoded({ extended: true }), (req, res) => {
  const { token } = req.body;

  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.jti) {
        tokenStore.delete(decoded.jti);
      }
    } catch (e) {
      // Ignore decode errors
    }
  }

  // Always return 200 per RFC 7009
  res.status(200).end();
});

// Note: /.well-known/smart-configuration is mounted at app root level in index.js
