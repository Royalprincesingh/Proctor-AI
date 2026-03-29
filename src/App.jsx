import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import CreateExam from './components/CreateExam';
import ExamTaking from './components/ExamTaking';
import ProfileSettings from './components/ProfileSettings';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected User Routes (students) */}
        <Route path="/dashboard" element={
          <ProtectedRoute requiredRole="user">
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute requiredRole="user">
            <ProfileSettings />
          </ProtectedRoute>
        } />
        <Route path="/exam/:examId" element={
          <ProtectedRoute requiredRole="user">
            <ExamTaking />
          </ProtectedRoute>
        } />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-exam" element={
          <ProtectedRoute requiredRole="admin">
            <CreateExam />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
