export const VIDEO_CONFIG = {
  allowedMimeTypes: new Set([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
  ]),
  allowedExtensions: ['.mp4', '.webm', '.mov', '.avi'],
  planLimits: {
    basic: {
      maxFileSize: 1 * 1024 * 1024 * 1024, // 1GB in bytes
      maxDuration: 30 * 60, // 30 minutes in seconds
    },
    pro: {
      maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB in bytes
      maxDuration: 180 * 60, // 3 hours in seconds
    },
  },
};
