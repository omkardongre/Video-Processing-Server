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
    // Try to delete the file with .json extension
    const jsonPath = `${filePath}.json`;
    try {
      await fs.access(jsonPath);
      await fs.unlink(jsonPath);
    } catch (jsonError) {
      // If .json file doesn't exist, try the original path
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
      } catch (originalError) {
        console.error(`[CLEANUP ERROR] Failed to cleanup failed upload: filePath=${filePath} error=`, originalError);
      }
    }
  } catch (error) {
    console.error(`[CLEANUP ERROR] Failed to cleanup failed upload: filePath=${filePath} error=`, error);
  }
};
