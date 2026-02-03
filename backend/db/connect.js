import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

const connectDB = async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log("Connected to in-memory MongoDB");
  } catch (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  console.log("Disconnected & memory server stopped");
};

export { connectDB, disconnectDB };