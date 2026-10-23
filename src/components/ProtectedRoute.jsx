import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute() {
  const { authLoading, isAuthenticated, logoutInProgress } = useAuth();
  const location = useLocation();

  if (authLoading || logoutInProgress) {
    return (
      <main className="center-screen">
        <div className="loader" />
        <p>Checking your session...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
