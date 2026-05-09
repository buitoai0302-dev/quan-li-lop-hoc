import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { appRoutes } from './routes';

const router = createBrowserRouter(appRoutes);

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Toaster position="top-right" />
        <RouterProvider router={router} />
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
