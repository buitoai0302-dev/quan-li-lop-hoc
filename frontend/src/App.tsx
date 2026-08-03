import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalRouteError from './components/GlobalRouteError';
import PageLoading from './components/common/PageLoading';
import PWAPrompt from './components/PWAPrompt';
import { appRoutes } from './routes';

const router = createBrowserRouter([
  {
    errorElement: <GlobalRouteError />,
    children: appRoutes,
  },
]);

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Toaster
          position="top-right"
          containerStyle={{ zIndex: 100000 }}
          toastOptions={{
            style: {
              zIndex: 100001,
            },
          }}
        />
        <PWAPrompt />
        <Suspense fallback={<PageLoading />}>
          <RouterProvider router={router} />
        </Suspense>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
