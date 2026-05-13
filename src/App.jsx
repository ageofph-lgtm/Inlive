import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Painel from './pages/Painel';
import AoVivo from './pages/AoVivo';

// Rota pública — sem auth
function PublicRoute({ children }) {
  return children;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Painel />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Rota pública fullscreen — sem auth, sem layout */}
        <Route path="/ao-vivo" element={
          <PublicRoute><AoVivo /></PublicRoute>
        } />

        {/* App principal autenticado */}
        <Route path="/*" element={
          <AuthProvider>
            <QueryClientProvider client={queryClientInstance}>
              <AuthenticatedApp />
              <Toaster />
            </QueryClientProvider>
          </AuthProvider>
        } />
      </Routes>
    </Router>
  );
}

export default App
