import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

let io: SocketIOServer | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initSocket(httpServer: HTTPServer, frontendUrl: string): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: frontendUrl,
      credentials: true
    },
    auth: {
      token: (socket, callback) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return callback(new Error('未提供認證 token'));
        }
        try {
          const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
          (socket as AuthenticatedSocket).userId = decoded.userId;
          callback(null, true);
        } catch {
          callback(new Error('無效的認證 token'));
        }
      }
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('Client connected:', socket.id, 'User:', socket.userId);

    socket.on('join', (userId: string) => {
      if (socket.userId !== userId) {
        console.warn(`User ${socket.userId} attempted to join room for ${userId}`);
        return;
      }
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function broadcastDataUpdate(module: string, action: string, id: string) {
  if (io) {
    io.emit('data-update', { module, action, id });
    console.log(`Broadcast: ${module}/${action}/${id}`);
  }
}
