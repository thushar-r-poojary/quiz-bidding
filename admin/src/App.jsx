import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-cyan-500 selection:text-white">
        <Routes>
          <Route path="/" element={<Navigate to="/admin/login" />} />
          <Route path="/admin/login" element={<Login />} />
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/create-quiz" 
            element={
              <ProtectedRoute>
                <CreateQuiz />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/edit-quiz/:id" 
            element={
              <ProtectedRoute>
                <CreateQuiz />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
