import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import { VideoInfo } from '../types';

// Set both paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

export const extractAudioFromVideo = async (
  videoPath: string
): Promise<string> => {
  const audioPath = videoPath.replace('.webm', '.mp3');

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
        console.error('FFprobe error:', err);
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
