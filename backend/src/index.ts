import express from 'express';

import cors from 'cors';

import helmet from 'helmet';

import morgan from 'morgan';

import compression from 'compression';

import rateLimit from 'express-rate-limit';

import { createServer } from 'http';

import { Server as SocketIOServer } from 'socket.io';

import path from 'path';

import { initializeDatabase } from '@/utils/database';

import { UserService } from '@/services/userService';

import { setupSocketHandlers } from '@/handlers/socketHandlers';

import { errorHandler } from '@/middleware/errorHandler';

import { notFoundHandler } from '@/middleware/notFoundHandler';

// Routes

import uploadRoutes from '@/routes/uploadRoutes';

import dataRoutes from '@/routes/dataRoutes';

import chartRoutes from '@/routes/chartRoutes';

import projectRoutes from '@/routes/projectRoutes';

import exportRoutes from '@/routes/exportRoutes';

import userRoutes from '@/routes/userRoutes';

import batchRoutes from '@/routes/batchRoutes';

import analysisRoutes from '@/routes/analysisRoutes';

import dataFileRoutes from '@/routes/dataFileRoutes';


const app = express();

const server = createServer(app);

const io = new SocketIOServer(server, {

  cors: {

    origin: process.env.FRONTEND_URL || "http://localhost:3000",

    methods: ["GET", "POST"]

  },

  // 連接超時和心跳配置
  pingTimeout: 10000,        // 10秒無響應後斷開
  pingInterval: 25000,       // 每25秒發送心跳
  connectTimeout: 45000,     // 45秒連接超時
  maxHttpBufferSize: 1e6,    // 1MB
  transports: ['websocket', 'polling']

});

const PORT = process.env.PORT || 3001;

// 中間件設置

app.use(helmet());

app.use(cors({

  origin: process.env.FRONTEND_URL || "http://localhost:3000",

  credentials: true

}));

// 速率限制

const limiter = rateLimit({

  windowMs: 15 * 60 * 1000, // 15分鐘

  max: 1000, // 限制每個IP在windowMs時間內最多1000個請求

  message: 'Too many requests from this IP, please try again later.'

});

app.use(limiter);

app.use(compression());

app.use(morgan('combined'));

app.use(express.json({ limit: '50mb' }));

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 靜態文件服務

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/exports', express.static(path.join(__dirname, '../exports')));

// API路由

app.use('/api/upload', uploadRoutes);

app.use('/api/data', dataRoutes);

app.use('/api/charts', chartRoutes);

app.use('/api/projects', projectRoutes);

app.use('/api/export', exportRoutes);

app.use('/api/users', userRoutes);

app.use('/api/batch', batchRoutes);

app.use('/api/analysis', analysisRoutes);

app.use('/api/data-files', dataFileRoutes);

// 健康檢查端點

app.get('/health', (req, res) => {

  res.status(200).json({

    status: 'OK',

    timestamp: new Date().toISOString(),

    uptime: process.uptime()

  });

});

// Setup Socket.io handlers

setupSocketHandlers(io);

// 錯誤處理中間件

app.use(notFoundHandler);

app.use(errorHandler);

// 啟動服務器

async function startServer() {

  try {

    await initializeDatabase();

    console.log('Database initialization complete');

    await UserService.initializeTestUsers();

    console.log('Seeded development test users');

    server.listen(PORT, () => {

      console.log(`Server running on port ${PORT}`);

      console.log(`Health check: http://localhost:${PORT}/health`);

      console.log(`User API: http://localhost:${PORT}/api/users`);

    });

  } catch (error) {

    console.error('Failed to start server', error);

    process.exit(1);

  }

}


// 優雅關閉

process.on('SIGTERM', () => {

  console.log('Received SIGTERM signal, shutting down server...');

  server.close(() => {

    console.log('HTTP server closed');

    process.exit(0);

  });

});

process.on('SIGINT', () => {

  console.log('Received SIGINT signal, shutting down server...');

  server.close(() => {

    console.log('HTTP server closed');

    process.exit(0);

  });

});

startServer();

export { io };

