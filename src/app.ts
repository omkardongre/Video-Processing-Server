import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import { setupSocketHandler } from './socket/socketHandler';
import { uploadRouter } from './routes/uploadRoutes';
import { env } from './config/environment';

const app = express();

app.set('trust proxy', true);

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.RECORDER_HOST,
    methods: ['GET', 'POST'],
  },
});

setupSocketHandler(io);



app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] === 'https') {
    Object.defineProperty(req, 'protocol', {
      get() { return 'https'; }
    });
  }
  next();
});

app.use('/', uploadRouter);

export { server };
