import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes - Apply auth middleware globally for API routes except auth
// authMiddleware will also set req.tenantId if present in token
app.use('/api', authMiddleware, tenantMiddleware);

// Routes
app.use('/api/schedule', scheduleRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import', importRoutes);

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
    res.status(404).json({ error: 'Not found' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
