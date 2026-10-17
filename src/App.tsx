import { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter, RouterProvider } from '@/lib/router';
import { initSmoothScroll, destroySmoothScroll, scrollToTop } from '@/lib/lenis';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import HomePage from '@/pages/HomePage';
import ChannelsPage from '@/pages/ChannelsPage';
import StartupsPage from '@/pages/StartupsPage';
import SubmitStartupPage from '@/pages/SubmitStartupPage';
import SubmitChannelPage from '@/pages/SubmitChannelPage';
import FeedbackPage from '@/pages/FeedbackPage';
import SlackSettingsPage from '@/pages/SlackSettingsPage';
import AdminPage from '@/pages/AdminPage';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-error-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8 text-error-500" />
            </div>
            <h1 className="text-2xl font-bold text-ink-900 mb-3">Something went wrong</h1>
            <p className="text-ink-500 mb-6">An unexpected error occurred. Please refresh the page to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFoundPage() {
  const { navigate } = useRouter();
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-8 h-8 text-ink-400" />
      </div>
      <h1 className="text-3xl font-bold text-ink-900 mb-3">Page not found</h1>
      <p className="text-ink-600 mb-8">The page you're looking for doesn't exist or has moved.</p>
      <button
        onClick={() => navigate('home')}
        className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 shadow-glow transition-all"
      >
        Go to homepage
      </button>
    </div>
  );
}

function AppContent() {
  const { view } = useRouter();

  useEffect(() => {
    initSmoothScroll();
    return () => destroySmoothScroll();
  }, []);

  useEffect(() => {
    scrollToTop(true);
  }, [view]);

  const renderPage = () => {
    switch (view) {
      case 'channels':
        return <ChannelsPage />;
      case 'startups':
        return <StartupsPage />;
      case 'submit-startup':
        return <SubmitStartupPage />;
      case 'submit-channel':
        return <SubmitChannelPage />;
      case 'feedback':
        return <FeedbackPage />;
      case 'slack-settings':
        return <SlackSettingsPage />;
      case 'admin':
        return <AdminPage />;
      case 'home':
        return <HomePage />;
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand-600 focus:text-white focus:font-semibold"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <PageTransition key={view}>{renderPage()}</PageTransition>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
