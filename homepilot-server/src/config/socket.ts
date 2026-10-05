import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from '../config/env';
import { verifyAccessToken } from '../utils/jwt';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.['token'] as string | undefined;
      if (!token) {
        next(new Error('Authentication required'));
        return;
      }
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    // Every connected user auto-joins their personal room — this is how
    // NotificationService pushes 'newNotification' events without the
    // socket layer needing to know about home membership or conversations.
    socket.join(`user:${userId}`);

    socket.on('conversation:join', (conversationId: string) => {
      if (typeof conversationId === 'string') {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('conversation:leave', (conversationId: string) => {
      if (typeof conversationId === 'string') {
        socket.leave(`conversation:${conversationId}`);
      }
    });
  });

  return io;
}

/**
 * Returns the live Socket.IO server, or null if it hasn't been initialized
 * (e.g. in tests that build the Express app without starting an HTTP
 * server). Callers should treat emission as best-effort, not required.
 */
export function getIO(): Server | null {
  return io;
}
