import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import env from './config/env.js';
import { ok } from './utils/response.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security and standard middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || env.CORS_ORIGIN === '*') return callback(null, true);
      const allowed = env.CORS_ORIGIN.split(',').map((o) => o.trim());
      if (allowed.includes(origin)) return callback(null, true);
      // Permissive fallback for preview deployments
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (env.isDev && req.originalUrl !== '/api/health') {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  return ok(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

/**
 * Auto-loader: Scans modules/[name]/index.js and mounts them at /api + mountPath.
 * Calls module.init() if exported.
 */
export async function loadModules(targetApp = app) {
  const modulesDir = path.resolve(__dirname, 'modules');
  if (!fs.existsSync(modulesDir)) {
    return;
  }

  const entries = fs.readdirSync(modulesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const moduleIndexPath = path.join(modulesDir, entry.name, 'index.js');
      if (fs.existsSync(moduleIndexPath)) {
        try {
          const moduleUrl = pathToFileURL(moduleIndexPath).href;
          const mod = await import(moduleUrl);
          const mountPath = mod.mountPath !== undefined ? mod.mountPath : `/${entry.name}`;
          if (mod.router) {
            targetApp.use(`/api${mountPath}`, mod.router);
            console.log(`[Module] Mounted ${entry.name} at /api${mountPath}`);
          }
          if (typeof mod.init === 'function') {
            await mod.init(targetApp);
            console.log(`[Module] Initialized ${entry.name}`);
          }
        } catch (err) {
          console.error(`[Module] Failed to load module ${entry.name}:`, err);
        }
      }
    }
  }
}

// Top-level auto-load promise so modules are loaded
export const modulesLoadedPromise = loadModules(app).then(() => {
  // 404 handler for unmatched routes
  app.use((req, res) => {
    return res.status(404).json({
      success: false,
      data: null,
      error: `Cannot ${req.method} ${req.originalUrl}`,
    });
  });

  // Global error handler
  app.use(errorHandler);
});

export default app;
