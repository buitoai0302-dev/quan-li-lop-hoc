import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { tenantMiddleware } from './middlewares/tenant.middleware';
import { authMiddleware } from './middlewares/auth.middleware';
import authRoutes from './routes/auth.routes';
import scheduleRoutes from './routes/schedule.routes';
import classRoutes from './routes/class.routes';
import branchRoutes from './routes/branch.routes';
import teacherRoutes from './routes/teacher.routes';
import roomRoutes from './routes/room.routes';
import tenantRoutes from './routes/tenant.routes';
import dashboardRoutes from './routes/dashboard.routes';
import studentRoutes from './routes/student.routes';
import importRoutes from './routes/import.routes';
import googleRoutes from './routes/google.routes';
import adminRoutes from './routes/admin.routes';
import planRoutes from './routes/plan.routes';
import attendanceRoutes from './routes/attendance.routes';
import tuitionRoutes from './routes/tuition.routes';
import billingRoutes from './routes/billing.routes';
import systemRoutes from './routes/system.routes';
import notificationRoutes from './routes/notification.routes';
import { initNotificationJobs } from './cron/notification.cron';
import { initBackupJobs } from './cron/backup.cron';
import boss from './cron/queue';

import { errorMiddleware } from './middlewares/error.middleware';
import { NotFoundError } from './utils/errors';

dotenv.config();

import { apiKeyMiddleware } from './middlewares/api.middleware';

const app = express();
const port = process.env.PORT || 5000;

// Security Headers (helmet)
app.use(
  helmet({
    // Cho phép Google OAuth popup hoạt động
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Tắt CSP — cần cấu hình riêng nếu bật
  })
);

// CORS — chỉ cho phép các domain đã xác định
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://eduschedule.vercel.app',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (server-to-server, Postman, mobile app)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin '${origin}' not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-api-key'],
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser()); // Parse httpOnly cookies

// 1. Public routes (No authentication or tenant context needed)
app.use('/api/auth', authRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/billing', billingRoutes); // Includes public webhook endpoints
app.use('/health', (req, res) => res.json({ status: 'ok' }));

// 2. Protected routes - Core Business Logic (Auth & Tenant required)
const protectedRoutes = express.Router();
protectedRoutes.use(apiKeyMiddleware, authMiddleware, tenantMiddleware);

protectedRoutes.use('/schedule', scheduleRoutes);
protectedRoutes.use('/classes', classRoutes);
protectedRoutes.use('/branches', branchRoutes);
protectedRoutes.use('/teachers', teacherRoutes);
protectedRoutes.use('/students', studentRoutes);
protectedRoutes.use('/rooms', roomRoutes);
protectedRoutes.use('/tenant', tenantRoutes);
protectedRoutes.use('/dashboard', dashboardRoutes);
protectedRoutes.use('/import', importRoutes);
protectedRoutes.use('/admin', adminRoutes);
protectedRoutes.use('/plans', planRoutes);
protectedRoutes.use('/attendance', attendanceRoutes);
protectedRoutes.use('/tuitions', tuitionRoutes);
protectedRoutes.use('/system', systemRoutes);
protectedRoutes.use('/notifications', notificationRoutes);

app.use('/api', protectedRoutes);

// Initialize pg-boss queue and background jobs
boss
  .start()
  .then(async () => {
    console.log('[pg-boss] Queue started successfully');
    await initNotificationJobs();
    await initBackupJobs();
  })
  .catch((err: Error) => {
    console.error('[pg-boss] Failed to start queue:', err);
  });

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
const rootDir = process.cwd();
const frontendDistPath = path.join(rootDir, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback for React Router (must be placed after all API routes)
app.get('/*path', (req, res, next) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        next(new NotFoundError('Frontend build not found or path incorrect'));
      }
    });
  } else {
    next(new NotFoundError());
  }
});

// Global error handler
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
