import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
  activeClasses?: number;
  teachers?: number;
  students?: number;
  upcomingSessions?: number;
  enrolledClasses?: number;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col items-center justify-center transition-colors">
      <div className="text-center w-full max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('dashboard.title')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{t('dashboard.subtitle')}</p>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${user?.role === 'student' ? 'md:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-3'} gap-6 w-full`}>
            
            {/* Admin & Staff View */}
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg text-center shadow-sm">
                  <h3 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{stats?.activeClasses || 0}</h3>
                  <p className="text-blue-800 dark:text-blue-300 font-medium">{t('dashboard.activeClasses')}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-lg text-center shadow-sm">
                  <h3 className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">{stats?.teachers || 0}</h3>
                  <p className="text-green-800 dark:text-green-300 font-medium">{t('dashboard.teachers')}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-6 rounded-lg text-center shadow-sm">
                  <h3 className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">{stats?.students || 0}</h3>
                  <p className="text-purple-800 dark:text-purple-300 font-medium">{t('dashboard.students')}</p>
                </div>
              </>
            )}

            {/* Teacher View */}
            {user?.role === 'teacher' && (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg text-center shadow-sm">
                  <h3 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{stats?.activeClasses || 0}</h3>
                  <p className="text-blue-800 dark:text-blue-300 font-medium">{t('dashboard.myClasses')}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/30 p-6 rounded-lg text-center shadow-sm">
                  <h3 className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">{stats?.upcomingSessions || 0}</h3>
                  <p className="text-orange-800 dark:text-orange-300 font-medium">{t('dashboard.upcomingSessions')}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-6 rounded-lg text-center shadow-sm">
                  <h3 className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">{stats?.students || 0}</h3>
                  <p className="text-purple-800 dark:text-purple-300 font-medium">{t('dashboard.myStudents')}</p>
                </div>
              </>
            )}

            {/* Student View */}
            {user?.role === 'student' && (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg text-center shadow-sm">
                  <h3 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{stats?.enrolledClasses || 0}</h3>
                  <p className="text-blue-800 dark:text-blue-300 font-medium">{t('dashboard.enrolledClasses')}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/30 p-6 rounded-lg text-center shadow-sm">
                  <h3 className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">{stats?.upcomingSessions || 0}</h3>
                  <p className="text-orange-800 dark:text-orange-300 font-medium">{t('dashboard.upcomingSessions')}</p>
                </div>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
