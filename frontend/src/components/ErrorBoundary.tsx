import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
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
              We've encountered an unexpected error. Don't worry, your data is safe. Please try
              refreshing the page or going back home.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> Refresh Page
              </button>

              <button
                onClick={() => (window.location.href = '/')}
                className="w-full py-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
              >
                <Home size={14} /> Back to Home
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl text-left overflow-auto max-h-40 border border-rose-100 dark:border-rose-900/20">
                <p className="text-[10px] font-mono text-rose-600 dark:text-rose-400 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
