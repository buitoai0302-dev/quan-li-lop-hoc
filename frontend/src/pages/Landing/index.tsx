import React, { useEffect } from 'react';
import Header from './Header';
import Hero from './Hero';
import Features from './Features';
import Pricing from './Pricing';
import Footer from './Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

const LandingPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to Dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate(ROUTES.SCHEDULE);
    }
  }, [user, loading, navigate]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] font-sans selection:bg-primary/30 selection:text-primary-900 dark:selection:text-primary-100 overflow-x-hidden">
      <Header />
      <main>
        <Hero />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
