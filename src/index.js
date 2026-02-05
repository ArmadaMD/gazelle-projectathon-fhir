import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { fhirRouter } from './routes/fhir.js';
import { authRouter } from './routes/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow FHIR JSON responses
}));

// CORS - allow Gazelle and testing tools
app.use(cors({
  origin: '*', // For Projectathon testing - restrict in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Prefer'],
  exposedHeaders: ['Location', 'ETag', 'Last-Modified'],
}));

// Body parsing
app.use(express.json({ type: ['application/json', 'application/fhir+json'] }));

// Request logging
app.use(requestLogger);

// Health check (not part of FHIR spec, but useful)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ArkPass FHIR Server',
    version: '1.0.1'
  });
});

// OAuth 2.0 endpoints
app.use('/auth', authRouter);

// Make base FHIR URL behave nicely: /fhir -> /fhir/metadata
app.get('/fhir', (req, res) => res.redirect(302, '/fhir/metadata'));

// FHIR R4 endpoints
app.use('/fhir', fhirRouter);

// Root redirect to capability statement
app.get('/', (req, res) => {
  res.redirect('/fhir/metadata');
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server (only when not in serverless environment like Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`
  ArkPass FHIR Server running on port ${PORT}

  Endpoints:
  - GET  /fhir/metadata     - CapabilityStatement
  - GET  /fhir/Patient      - Search patients
  - GET  /fhir/Patient/:id  - Read patient
  - POST /auth/token        - Get access token

  Ready for Projectathon testing!
    `);
  });
}

// Export for Vercel serverless
export default app;
