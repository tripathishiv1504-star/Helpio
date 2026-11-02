import mongoose from 'mongoose';
import env from './env.js';

let isConnected = false;
let mongodInstance = null;
let fallbackUri = null;

export async function connectDB(uri = env.MONGODB_URI) {
  if (isConnected) {
    return mongoose.connection;
  }

  // If we previously launched an in-memory instance, reuse it
  const targetUri = fallbackUri || uri;

  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log(`[DB] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (err) {
    console.warn(`[DB] Failed to connect to ${targetUri}: ${err.message}`);
    // If running in development or testing without a standalone MongoDB server,
    // spin up or reuse mongodb-memory-server
    try {
      if (!mongodInstance) {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        console.log('[DB] Starting in-memory MongoDB fallback...');
        mongodInstance = await MongoMemoryServer.create();
        fallbackUri = mongodInstance.getUri();
      }
      const conn = await mongoose.connect(fallbackUri);
      isConnected = true;
      console.log(`[DB] Connected to in-memory MongoDB at ${fallbackUri}`);
      return conn.connection;
    } catch (memErr) {
      console.error('[DB] Fallback in-memory MongoDB also unavailable:', memErr.message);
      throw err;
    }
  }
}

export async function disconnectDB(stopMemory = false) {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
  if (stopMemory && mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
    fallbackUri = null;
  }
}

export default { connectDB, disconnectDB };
