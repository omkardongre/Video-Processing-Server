export interface VideoChunkData {
  chunks: Buffer;
  filename: string;
}

export interface ProcessVideoData {
  userId: string;
  filename: string;
}

export interface VideoMetadata {
  userId: string;
  originalName: string;
  filetype: string;
  plan: string;
}

export interface VideoInfo {
  hasVideoStream: boolean;
  duration: number;
  format: string;
}
