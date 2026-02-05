/**
 * Request logging middleware for FHIR audit trail
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      clientId: req.auth?.clientId || 'anonymous',
      userAgent: req.get('User-Agent')?.slice(0, 100)
    };

    // Color-coded console output
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(
      `${statusColor}${log.method}\x1b[0m ${log.path} - ${log.status} (${log.duration})`
    );
  });

  next();
}
