import express from 'express';
import { Server, EVENTS } from '@tus/server';
import { FileStore } from '@tus/file-store';
import path from 'path';
import { cleanupFailedUpload } from '../utils/fileSystem';
import axios from 'axios';
import { VIDEO_CONFIG } from '../constants/video';
import { probeVideoFile } from '../utils/ffmpeg';
import { handleVideoProcessing } from '../services/videoService';
import { VideoInfo, VideoMetadata } from '../types';
import { promises as fs } from 'fs';

const router = express.Router();

// TUS Server setup
const store = new FileStore({
  directory: path.join(__dirname, '../../temp_upload'),
});

const tusServer = new Server({
  path: '/upload',
  relativeLocation: true,
  respectForwardedHeaders: true,
  datastore: store,
});

// Parse TUS metadata
const parseTusMetadata = (upload: any): VideoMetadata => {
  const metadata = upload.metadata || {};
  return {
    userId: metadata.userid,
    originalName: metadata.filename,
    filetype: metadata.filetype,
    plan: metadata.plan || 'basic',
  };
};

const validateUpload = async (
  upload: any,
  metadata: VideoMetadata,
  uploadPath: string
) => {
  try {
    if (!metadata.userId || !metadata.originalName || !metadata.filetype) {
      throw new Error('Invalid metadata format');
    }

    // Get plan limits
    const planLimits =
      VIDEO_CONFIG.planLimits[
        metadata.plan as keyof typeof VIDEO_CONFIG.planLimits
      ] || VIDEO_CONFIG.planLimits.basic;

    if (!VIDEO_CONFIG.allowedMimeTypes.has(metadata.filetype)) {
      throw new Error(`Disallowed MIME type: ${metadata.filetype}`);
    }

    const fileExt = path.extname(metadata.originalName).toLowerCase();
    if (!VIDEO_CONFIG.allowedExtensions.includes(fileExt)) {
      throw new Error(`Invalid file extension: ${fileExt}`);
    }

    if (upload.size > planLimits.maxFileSize) {
      const maxGb = planLimits.maxFileSize / (1024 * 1024 * 1024);
      throw new Error(
        `File size exceeds ${maxGb}GB limit for ${metadata.plan} plan`
      );
    }

    const videoInfo = (await probeVideoFile(uploadPath)) as VideoInfo;
    if (!videoInfo.hasVideoStream) {
      throw new Error('No video stream detected');
    }

    if (videoInfo.duration > planLimits.maxDuration) {
      const maxMinutes = planLimits.maxDuration / 60;
      throw new Error(
        `Video exceeds ${maxMinutes} minute limit for ${metadata.plan} plan`
      );
    }

    return videoInfo;
  } catch (error: any) {
    console.error(
      `[VALIDATE UPLOAD ERROR] userId=${
        metadata?.userId || 'unknown'
      } filename=${metadata?.originalName || 'unknown'} plan=${
        metadata?.plan || 'unknown'
      } msg="${error?.message}" stack=${error?.stack}`
    );
    throw error;
  }
};

tusServer.on(EVENTS.POST_FINISH, async (req, res, upload) => {
  const uploadPath = path.join(__dirname, '../../temp_upload', upload.id);
  let originalName: string | undefined;
  let metadata: VideoMetadata | undefined;

  try {
    metadata = parseTusMetadata(upload);
    await validateUpload(upload, metadata, uploadPath);

    originalName = path.join(
      __dirname,
      '../../temp_upload',
      metadata.originalName
    );
    await fs.rename(uploadPath, originalName);

    await axios.post(
      `${process.env.NEXT_API_HOST}/recording/${metadata.userId}/processing`,
      { filename: metadata.originalName }
    );

    await handleVideoProcessing(
      metadata.userId,
      metadata.originalName,
      metadata.plan
    );

    console.log(
      `[UPLOAD SUCCESS] userId=${metadata.userId} filename=${metadata.originalName} plan=${metadata.plan}`
    );
  } catch (error: any) {
    const userId = metadata?.userId || 'unknown';
    const filename = metadata?.originalName || 'unknown';
    const plan = metadata?.plan || 'unknown';

    if (error instanceof Error) {
      if (error.message?.includes('API key not valid')) {
        console.error(
          `[UPLOAD ERROR] [API_KEY_INVALID] userId=${userId} filename=${filename} plan=${plan} msg="${error.message}" stack=${error.stack}`
        );
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 400 &&
        error.response?.data?.error
      ) {
        console.error(
          `[UPLOAD ERROR] [API_RESPONSE] userId=${userId} filename=${filename} plan=${plan} msg="${error.response.data.error}" stack=${error.stack}`
        );
      } else {
        console.error(
          `[UPLOAD ERROR] [UNEXPECTED] userId=${userId} filename=${filename} plan=${plan} msg="${error.message}" stack=${error.stack}`
        );
      }
    } else {
      console.error(
        `[UPLOAD ERROR] [UNKNOWN] userId=${userId} filename=${filename} plan=${plan} error=`,
        error
      );
    }
    await cleanupFailedUpload(uploadPath);
    if (originalName) await cleanupFailedUpload(originalName);
    // --- Cascade addition: Clean up DB entry on failure ---
    try {
      await axios.delete(
        `${process.env.NEXT_API_HOST}/recording/${userId}/delete`,
        { data: { filename } }
      );
      console.log(`[UPLOAD CLEANUP] Deleted video entry from DB for userId=${userId} filename=${filename}`);
    } catch (cleanupErr) {
      console.error(`[UPLOAD CLEANUP ERROR] Failed to delete video entry from DB userId=${userId} filename=${filename} error=`, cleanupErr);
    }
  }
});

// Configure TUS endpoint
router.all('/*', (req, res) => {
  tusServer.handle(req, res);
});

export const uploadRouter = router;
