import * as fs from 'fs/promises';
import path from 'path';

export const createUploadDirectory = async (): Promise<string> => {
  const uploadPath = path.join(__dirname, '../../temp_upload');
  try {
    await fs.access(uploadPath);
  } catch {
    await fs.mkdir(uploadPath);
  }
  return uploadPath;
};

export const cleanupFailedUpload = async (filePath?: string): Promise<void> => {
  if (!filePath) return;

  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Failed to cleanup failed upload', error);
  }
};
