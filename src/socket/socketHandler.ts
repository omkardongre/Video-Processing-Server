import { Server, Socket } from 'socket.io';
import { createUploadDirectory } from '../utils/fileSystem';
import { handleVideoProcessing } from '../services/videoService';
import * as fsSync from 'fs';
import path from 'path';
import axios from 'axios';
import { VideoChunkData } from '../types';

export const setupSocketHandler = (io: Server) => {
  io.on('connection', async (socket: Socket) => {
    console.log('🟢 Socket connected');
    const uploadPath = await createUploadDirectory();
    const writeStreams = new Map<string, fsSync.WriteStream>();

    socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });

    socket.on('video-chunks', (data: VideoChunkData, callback) => {
      console.log('🎞️ Video chunk received');
      let writeStream = writeStreams.get(data.filename);
      if (!writeStream) {
        writeStream = fsSync.createWriteStream(
          path.join(uploadPath, data.filename),
          { flags: 'a' }
        );
        writeStreams.set(data.filename, writeStream);
      }

      try {
        writeStream.write(Buffer.from(data.chunks));
        callback(true);
      } catch (error) {
        console.error('Error writing chunk:', error);
        callback(false);
      }
    });

    socket.on('process-video', async data => {
      console.log('⌛ Processing video:', data);

      // Close write stream if exists
      const writeStream = writeStreams.get(data.filename);
      if (writeStream) {
        writeStream.end();
        writeStreams.delete(data.filename);
      }

      try {
        const processing = await axios.post(
          `${process.env.NEXT_API_HOST}/recording/${data.userId}/processing`,
          {
            filename: data.filename,
          }
        );

        if (processing.data.status !== 200) {
          throw new Error('❌ Error processing video');
        }

        await handleVideoProcessing(
          data.userId,
          data.filename,
          processing.data.plan
        );
      } catch (error) {
        console.error('🔴 Error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('📞 Socket disconnected:', socket.id);
      // Cleanup write streams
      for (const [_, stream] of writeStreams) {
        stream.end();
      }
      writeStreams.clear();
    });
  });
};
