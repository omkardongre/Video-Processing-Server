import { S3Client } from '@aws-sdk/client-s3';
import { AssemblyAI } from 'assemblyai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './environment';

export const s3 = new S3Client({
  credentials: {
    accessKeyId: env.ACCESS_KEY,
    secretAccessKey: env.SECRET_KEY,
  },
  region: env.BUCKET_REGION,
  maxAttempts: 10,
  requestHandler: {
    requestTimeout: 600000, // 10 minutes
    connectTimeout: 60000, // 1 minute
  },
});

export const assemblyClient = new AssemblyAI({
  apiKey: env.ASSEMBLY_AI_KEY,
});

export const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
