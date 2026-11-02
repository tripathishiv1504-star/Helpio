import env from '../config/env.js';

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (env.isDev && status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  return res.status(status).json({
    success: false,
    data: null,
    error: message,
    ...(env.isDev && err.stack ? { stack: err.stack } : {}),
  });
}

export default errorHandler;
