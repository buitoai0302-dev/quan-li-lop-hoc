import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ResendVerification from './pages/ResendVerification';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Classes from './pages/Classes';
import Teachers from './pages/Teachers';
import Students from './pages/Students';
import Rooms from './pages/Rooms';
import Branches from './pages/Branches';
import Settings from './pages/Settings';
import ImportData from './pages/ImportData';
import Help from './pages/Help';
import Subscription from './pages/Subscription';
import AdminTenants from './pages/AdminTenants';
import AdminPlans from './pages/AdminPlans';
import AdminPlanRequests from './pages/AdminPlanRequests';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/resend-verification" element={<ResendVerification />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/schedule" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="classes" element={<Classes />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="students" element={<Students />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="branches" element={<Branches />} />
            <Route path="/import" element={<ProtectedRoute roles={['admin', 'staff', 'super_admin']}><ImportData /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute roles={['admin', 'staff', 'teacher', 'student', 'super_admin']}><Help /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute roles={['admin', 'super_admin']}><Subscription /></ProtectedRoute>} />
            <Route path="/admin/tenants" element={<ProtectedRoute roles={['super_admin']}><AdminTenants /></ProtectedRoute>} />
            <Route path="/admin/requests" element={<ProtectedRoute roles={['super_admin']}><AdminPlanRequests /></ProtectedRoute>} />
            <Route path="/admin/plans" element={<ProtectedRoute roles={['super_admin']}><AdminPlans /></ProtectedRoute>} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
