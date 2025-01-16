import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import { setupSocketHandler } from './socket/socketHandler';
import { uploadRouter } from './routes/uploadRoutes';
import { env } from './config/environment';

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.RECORDER_HOST,
    methods: ['GET', 'POST'],
  },
});

setupSocketHandler(io);

app.use('/', uploadRouter);

export { server };
