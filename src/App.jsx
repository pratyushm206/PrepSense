import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Shell from './components/Shell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import HistoryDetail from './pages/HistoryDetail.jsx';
import Interview from './pages/Interview.jsx';
import InterviewSetup from './pages/InterviewSetup.jsx';
import Landing from './pages/Landing.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import PublicReport from './pages/PublicReport.jsx';
import Recommendations from './pages/Recommendations.jsx';
import Register from './pages/Register.jsx';
import Summary from './pages/Summary.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/report/:token" element={<PublicReport />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/interview/new" element={<InterviewSetup />} />
          <Route path="/interview/:sessionId" element={<Interview />} />
          <Route path="/interview/:sessionId/summary" element={<Summary />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:sessionId" element={<HistoryDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
