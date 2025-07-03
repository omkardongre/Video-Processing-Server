import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '../config/services';
import { env } from '../config/environment';
import { handleProFeatures } from './transcriptionService';
import * as fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

export const handleVideoProcessing = async (
  userId: string,
  filename: string,
  plan: string
): Promise<void> => {
  const filePath = path.join(__dirname, '../../temp_upload', filename);

  try {
    const file = await fs.readFile(filePath);

    const s3Response = await s3.send(
      new PutObjectCommand({
        Key: filename,
        Bucket: env.BUCKET_NAME,
        ContentType: 'video/webm',
        Body: file,
      })
    );

    if (s3Response['$metadata'].httpStatusCode !== 200) {
      throw new Error('S3 upload failed');
    }

    console.log('✅ Video uploaded to AWS for plan:', plan);

    if (plan === 'PRO') {
      const stats = await fs.stat(filePath);
      if (stats.size < 25000000) {
        await handleProFeatures(filePath, filename, userId);
      }
    }

    await axios.post(`${env.NEXT_API_HOST}/recording/${userId}/complete`, {
      filename,
    });

    await fs.unlink(filePath);
    console.log(`🗑️ ${filename} deleted successfully`);
  } catch (error: any) {
    if (error?.message?.includes('API key not valid')) {
      console.error(`[VIDEO PROCESSING ERROR] [API_KEY_INVALID] userId=${userId} filename=${filename} plan=${plan} msg="${error.message}" stack=${error.stack}`);
    } else if (error?.response?.status === 400 && error?.response?.data?.error) {
      console.error(`[VIDEO PROCESSING ERROR] [API_RESPONSE] userId=${userId} filename=${filename} plan=${plan} msg="${error.response.data.error}" stack=${error.stack}`);
    } else {
      console.error(`[VIDEO PROCESSING ERROR] [UNEXPECTED] userId=${userId} filename=${filename} plan=${plan} msg="${error.message}" stack=${error.stack}`);
    }
    // --- Cascade addition: Clean up DB entry on failure ---
    try {
      await axios.delete(
        `${env.NEXT_API_HOST}/recording/${userId}/delete`,
        { data: { filename } }
      );
      console.log(`[VIDEO PROCESSING CLEANUP] Deleted video entry from DB for userId=${userId} filename=${filename}`);
    } catch (cleanupErr) {
      console.error(`[VIDEO PROCESSING CLEANUP ERROR] Failed to delete video entry from DB userId=${userId} filename=${filename} error=`, cleanupErr);
    }
    throw error;
  }
};
