import dotenv from 'dotenv';

dotenv.config();

export const env = {
  VIDEO_SERVER_PORT: process.env.VIDEO_SERVER_PORT!,
  ACCESS_KEY: process.env.ACCESS_KEY!,
  SECRET_KEY: process.env.SECRET_KEY!,
  BUCKET_REGION: process.env.BUCKET_REGION!,
  BUCKET_NAME: process.env.BUCKET_NAME!,
  ASSEMBLY_AI_KEY: process.env.ASSEMBLY_AI_KEY!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  RECORDER_HOST: process.env.RECORDER_HOST!,
  NEXT_API_HOST: process.env.NEXT_API_HOST!,
};
