import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Shell from './components/Shell.jsx';
import { LoadingState } from './components/Status.jsx';
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const AdminRoute = lazy(() => import('./components/AdminRoute.jsx'));
import History from './pages/History.jsx';
import HistoryDetail from './pages/HistoryDetail.jsx';
import Interview from './pages/Interview.jsx';
import InterviewSetup from './pages/InterviewSetup.jsx';
import Landing from './pages/Landing.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
const PublicReport = lazy(() => import('./pages/PublicReport.jsx'));
import Recommendations from './pages/Recommendations.jsx';
const ResumeAnalyzer = lazy(() => import('./pages/ResumeAnalyzer.jsx'));
import Register from './pages/Register.jsx';
import Summary from './pages/Summary.jsx';

export default function App() {
  return (
    <Suspense fallback={<main className="page" role="status"><LoadingState message="Loading page…" /></main>}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/report/:token" element={<PublicReport />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/interview/new" element={<InterviewSetup />} />
          <Route path="/interview/:sessionId" element={<Interview />} />
          <Route path="/interview/:sessionId/summary" element={<Summary />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:sessionId" element={<HistoryDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
  );
}
