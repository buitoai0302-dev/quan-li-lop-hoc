import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
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
import { initCronJobs } from './cron/notification.cron';

import { errorMiddleware } from './middlewares/error.middleware';
import { NotFoundError } from './utils/errors';

dotenv.config();

import { apiKeyMiddleware } from './middlewares/api.middleware';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: true, // Cho phép tất cả các origin gửi yêu cầu (phù hợp khi deploy đa nền tảng)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-api-key']
}));
app.use(express.json({ limit: '2mb' }));

// 1. Public routes (No authentication or tenant context needed)
app.use('/api/auth', authRoutes);
app.use('/api/google', googleRoutes);
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

app.use('/api', protectedRoutes);

// Initialize background jobs
initCronJobs();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback for React Router (must be placed after all API routes)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  } else {
    next(new NotFoundError());
  }
});

// Global error handler
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
