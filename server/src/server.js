import app, { modulesLoadedPromise } from './app.js';
import { connectDB } from './config/db.js';
import env from './config/env.js';
import { runSeed } from './seed/index.js';

async function startServer() {
  try {
    await connectDB();
    await modulesLoadedPromise;

    // Auto-seed in-memory or fresh database so demo accounts exist
    try {
      await runSeed(false);
    } catch (seedErr) {
      console.warn('[Helpio Server] Auto-seed note:', seedErr.message);
    }

    app.listen(env.PORT, () => {
      console.log(`[Helpio Server] Running on http://localhost:${env.PORT}`);
      console.log(`[Helpio Server] Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('[Helpio Server] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
