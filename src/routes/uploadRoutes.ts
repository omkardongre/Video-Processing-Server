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
};

tusServer.on(EVENTS.POST_FINISH, async (req, res, upload) => {

  console.log('POST_FINISH Request headers:', req.headers);


  const uploadPath = path.join(__dirname, '../../temp_upload', upload.id);
  let originalName: string | undefined;
  let metadata: VideoMetadata;

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
  } catch (error: any) {
    console.error('Upload processing failed:', error.message);
    await cleanupFailedUpload(uploadPath);
    if (originalName) await cleanupFailedUpload(originalName);
  }
});

// Configure TUS endpoint
router.all('/*', (req, res) => {
  tusServer.handle(req, res);
});

export const uploadRouter = router;
