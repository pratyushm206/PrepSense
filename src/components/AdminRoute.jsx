import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AdminStats from '../pages/AdminStats.jsx';

export default function AdminRoute() {
  const { user } = useAuth();
  return user?.isAdmin ? <AdminStats /> : <Navigate to="/dashboard" replace />;
}
