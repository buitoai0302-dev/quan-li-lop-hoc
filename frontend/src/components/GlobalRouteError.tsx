import { useRouteError } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

const GlobalRouteError = () => {
  const error = useRouteError() as Error;
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    // Check if the error is the Vercel/Vite chunk loading error
    if (
      error?.name === 'TypeError' &&
      (error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed'))
    ) {
      console.warn('Chunk mismatch detected. Automatically reloading page to fetch new chunks...');
      
      // Use sessionStorage to prevent infinite reload loops just in case
      const reloadKey = 'app-reloaded-for-chunk-error';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true');
        setIsReloading(true);
        // Force reload from server to get new index.html and avoid cache
        window.location.reload();
      } else {
        // If it already reloaded once in this session and still failed, clear the flag
        // so the user can see the error or try again manually.
        sessionStorage.removeItem(reloadKey);
      }
    }
  }, [error]);

  if (isReloading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">
          Đang cập nhật phiên bản mới...
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Hệ thống vừa có bản nâng cấp, vui lòng chờ trong giây lát.
        </p>
      </div>
    );
  }

  // Fallback UI for other unexpected router errors (reusing the style from your existing ErrorBoundary)
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 p-10 text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-600 dark:text-rose-400">
          <AlertTriangle size={40} strokeWidth={2.5} />
        </div>

        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
          Oops! Something went wrong
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Đã có lỗi không mong muốn xảy ra khi tải trang. Dữ liệu của bạn vẫn an toàn. Vui lòng làm mới trang.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> Làm mới trang (Refresh)
          </button>

          <button
            onClick={() => (window.location.href = '/')}
            className="w-full py-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
          >
            <Home size={14} /> Về trang chủ
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mt-8 p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl text-left overflow-auto max-h-40 border border-rose-100 dark:border-rose-900/20">
            <p className="text-[10px] font-mono text-rose-600 dark:text-rose-400 break-words">
              {error.toString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalRouteError;
