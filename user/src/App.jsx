import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Join from './pages/Join';
import Game from './pages/Game';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-indigo-500 selection:text-white">
        <Routes>
          <Route path="/" element={<Navigate to="/user/join" />} />
          <Route path="/user/join" element={<Join />} />
          <Route path="/user/game" element={<Game />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
