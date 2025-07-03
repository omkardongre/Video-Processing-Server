import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import { VideoInfo } from '../types';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Set both paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

export const extractAudioFromVideo = async (
  videoPath: string
): Promise<string> => {
  // Always create a unique output path for audio
  const ext = path.extname(videoPath);
  const base = path.basename(videoPath, ext);
  const dir = path.dirname(videoPath);
  const audioPath = path.join(dir, `${base}_${uuidv4()}.mp3`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .toFormat('mp3')
      .on('end', () => resolve(audioPath))
      .on('error', reject)
      .save(audioPath);
  });
};

export const probeVideoFile = async (filePath: string): Promise<VideoInfo> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error(`[FFPROBE ERROR] filePath=${filePath} msg="${err?.message || err}" stack=${err?.stack}`);
        return reject(new Error('Invalid video file'));
      }

      if (!metadata?.streams || !metadata.format) {
        return reject(new Error('Invalid video metadata'));
      }

      resolve({
        hasVideoStream: metadata.streams.some(s => s.codec_type === 'video'),
        duration: metadata.format.duration || 0,
        format: metadata.format.format_name || 'unknown',
      });
    });
  });
};
