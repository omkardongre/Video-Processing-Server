import { server } from './app';
import { env } from './config/environment';

server.listen(env.VIDEO_SERVER_PORT, () => {
  console.log(`✅ Server listening on port ${env.VIDEO_SERVER_PORT}`);
});
